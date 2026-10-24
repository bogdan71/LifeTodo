using LifeTodo.Api.Services;

namespace LifeTodo.Tests;

public class RecurrenceEngineTests
{
    private readonly RecurrenceEngine _engine = new();

    private static readonly DateTime Monday = new(2026, 10, 19, 9, 0, 0);

    [Fact]
    public void Daily_returns_occurrences_inside_window_only()
    {
        var results = _engine.Expand("FREQ=DAILY", Monday, Monday.AddDays(2), Monday.AddDays(4));

        Assert.Equal([Monday.AddDays(2), Monday.AddDays(3), Monday.AddDays(4)], results);
    }

    [Fact]
    public void Weekly_byday_produces_mon_wed_fri()
    {
        var start = new DateTime(2026, 10, 19, 18, 0, 0); // Monday
        var results = _engine.Expand("FREQ=WEEKLY;BYDAY=MO,WE,FR", start, start, start.AddDays(6));

        Assert.Equal(3, results.Count);
        Assert.All(results, r => Assert.Equal(18, r.Hour));
        Assert.Equal([DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday], results.Select(r => r.DayOfWeek));
    }

    [Fact]
    public void Monthly_bymonthday_goes_to_the_first()
    {
        var start = new DateTime(2026, 1, 1, 10, 0, 0);
        var results = _engine.Expand("FREQ=MONTHLY;BYMONTHDAY=1", start,
            new DateTime(2026, 3, 1), new DateTime(2026, 5, 31));

        Assert.Equal([new DateTime(2026, 3, 1, 10, 0, 0), new DateTime(2026, 4, 1, 10, 0, 0), new DateTime(2026, 5, 1, 10, 0, 0)], results);
    }

    [Fact]
    public void Monthly_31st_skips_short_months()
    {
        var start = new DateTime(2026, 1, 31, 8, 0, 0);
        var results = _engine.Expand("FREQ=MONTHLY;BYMONTHDAY=31", start,
            new DateTime(2026, 1, 31), new DateTime(2026, 7, 31, 23, 59, 59));

        Assert.Equal([1, 3, 5, 7], results.Select(r => r.Month));
    }

    [Fact]
    public void Count_limits_total_occurrences()
    {
        var results = _engine.Expand("FREQ=DAILY;COUNT=3", Monday, Monday, Monday.AddDays(30));

        Assert.Equal(3, results.Count);
    }

    [Fact]
    public void Until_stops_the_series()
    {
        var results = _engine.Expand("FREQ=DAILY;UNTIL=20261021T090000", Monday, Monday, Monday.AddDays(10));

        Assert.Equal(3, results.Count);
        Assert.Equal(new DateTime(2026, 10, 21, 9, 0, 0), results[^1]);
    }

    [Fact]
    public void Interval_two_weekly_lands_on_alternate_weeks()
    {
        var results = _engine.Expand("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", Monday, Monday, Monday.AddDays(35));

        Assert.Equal(3, results.Count);
        Assert.Equal([Monday, Monday.AddDays(14), Monday.AddDays(28)], results);
    }

    [Fact]
    public void Next_occurrence_is_strictly_after_the_reference_point()
    {
        var next = _engine.NextOccurrence("FREQ=DAILY", Monday, Monday);

        Assert.Equal(Monday.AddDays(1), next);
    }

    [Fact]
    public void Yearly_keeps_month_and_day()
    {
        var start = new DateTime(2026, 3, 14, 12, 0, 0);
        var results = _engine.Expand("FREQ=YEARLY", start, start, start.AddYears(3));

        Assert.Equal(4, results.Count);
        Assert.All(results, r => Assert.Equal((3, 14), (r.Month, r.Day)));
    }

    [Fact]
    public void One_off_event_has_a_single_occurrence()
    {
        var results = _engine.Expand(null, Monday, Monday.AddDays(-1), Monday.AddDays(1));

        Assert.Single(results);
        Assert.Equal(Monday, results[0]);
    }
}
