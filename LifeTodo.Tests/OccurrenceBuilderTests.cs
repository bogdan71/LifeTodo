using LifeTodo.Api.Services;
using LifeTodo.Db.Models;

namespace LifeTodo.Tests;

public class OccurrenceBuilderTests
{
    private readonly RecurrenceEngine _engine = new();

    private static readonly DateTime Wednesday = new(2026, 10, 21, 18, 0, 0);
    private static readonly DateTime WindowStart = new(2026, 10, 14);
    private static readonly DateTime WindowEnd = new(2026, 11, 12);

    private static ScheduleEvent Series() => new()
    {
        Id = 3,
        Title = "Spanish class",
        Location = "Language school",
        Start = Wednesday,
        End = Wednesday.AddMinutes(90),
        Color = "#f59e0b",
        RecurrenceRule = "FREQ=WEEKLY;BYDAY=WE"
    };

    private static EventOverride Moved(DateTime original, DateTime start, DateTime end) => new()
    {
        ScheduleEventId = 3,
        OriginalStart = original,
        Start = start,
        End = end
    };

    [Fact]
    public void Moved_occurrence_replaces_its_slot_instead_of_adding_a_second_one()
    {
        var occurrences = OccurrenceBuilder.Build(
            [Series()],
            [Moved(Wednesday.AddDays(7), new DateTime(2026, 10, 29, 12, 0, 0), new DateTime(2026, 10, 29, 13, 30, 0))],
            _engine,
            WindowStart,
            WindowEnd);

        Assert.Equal(4, occurrences.Count);
        Assert.DoesNotContain(occurrences, o => o.Start == Wednesday.AddDays(7));

        var moved = Assert.Single(occurrences, o => o.Detached);
        Assert.Equal(new DateTime(2026, 10, 29, 12, 0, 0), moved.Start);
        Assert.Equal(new DateTime(2026, 10, 29, 13, 30, 0), moved.End);
        // The series slot stays the identity, so the same instance can be moved again.
        Assert.Equal("3:20261028T180000", moved.Id);
        Assert.Equal(Wednesday.AddDays(7), moved.OriginalStart);
    }

    [Fact]
    public void Occurrence_moved_out_of_the_window_leaves_the_window()
    {
        var occurrences = OccurrenceBuilder.Build(
            [Series()],
            [Moved(Wednesday.AddDays(7), new DateTime(2026, 12, 20, 10, 0, 0), new DateTime(2026, 12, 20, 11, 0, 0))],
            _engine,
            WindowStart,
            WindowEnd);

        Assert.Equal(3, occurrences.Count);
        Assert.DoesNotContain(occurrences, o => o.Detached);
        Assert.DoesNotContain(occurrences, o => o.Start.Date == new DateTime(2026, 10, 28));
    }

    [Fact]
    public void Occurrence_moved_into_the_window_from_outside_still_shows()
    {
        var occurrences = OccurrenceBuilder.Build(
            [Series()],
            [Moved(new DateTime(2026, 12, 2, 18, 0, 0), new DateTime(2026, 10, 29, 9, 0, 0), new DateTime(2026, 10, 29, 10, 30, 0))],
            _engine,
            WindowStart,
            WindowEnd);

        var moved = Assert.Single(occurrences, o => o.Detached);
        Assert.Equal(new DateTime(2026, 10, 29, 9, 0, 0), moved.Start);
        Assert.Equal(new DateTime(2026, 12, 2, 18, 0, 0), moved.OriginalStart);
        Assert.Equal("3:20261202T180000", moved.Id);
    }

    [Fact]
    public void Several_occurrences_can_be_detached_independently()
    {
        var occurrences = OccurrenceBuilder.Build(
            [Series()],
            [
                Moved(Wednesday, new DateTime(2026, 10, 22, 8, 0, 0), new DateTime(2026, 10, 22, 9, 30, 0)),
                Moved(Wednesday.AddDays(14), new DateTime(2026, 11, 4, 20, 0, 0), new DateTime(2026, 11, 4, 21, 30, 0))
            ],
            _engine,
            WindowStart,
            WindowEnd);

        Assert.Equal(4, occurrences.Count);
        Assert.Equal(2, occurrences.Count(o => o.Detached));
        Assert.Contains(occurrences, o => o.Start == new DateTime(2026, 10, 22, 8, 0, 0));
        Assert.Contains(occurrences, o => o.Start == new DateTime(2026, 11, 4, 20, 0, 0));
        Assert.Contains(occurrences, o => o.Start == Wednesday.AddDays(7));
        Assert.Contains(occurrences, o => o.Start == Wednesday.AddDays(21));
    }

    [Fact]
    public void One_off_events_keep_their_single_occurrence()
    {
        var single = new ScheduleEvent
        {
            Id = 9,
            Title = "Dentist",
            Start = new DateTime(2026, 10, 20, 9, 0, 0),
            End = new DateTime(2026, 10, 20, 10, 0, 0),
            Color = "#0ea5e9"
        };

        var occurrence = Assert.Single(OccurrenceBuilder.Build([single], [], _engine, WindowStart, WindowEnd));

        Assert.False(occurrence.Detached);
        Assert.False(occurrence.Recurring);
        Assert.Equal(occurrence.Start, occurrence.OriginalStart);
        Assert.Equal(single.Start, occurrence.Start);
        Assert.Equal(single.End, occurrence.End);
    }
}
