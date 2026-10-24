namespace LifeTodo.Api.Services;

/// <summary>
/// A small, dependency-free RFC 5545 RRULE engine. It supports the parts people
/// actually use for personal planning:
///   FREQ=DAILY|WEEKLY|MONTHLY|YEARLY, INTERVAL, BYDAY, BYMONTHDAY, BYMONTH,
///   COUNT and UNTIL.
/// All DateTimes are local wall-clock values, so "every Monday at 09:00" stays at
/// 09:00 across daylight-saving changes.
/// </summary>
public sealed class RecurrenceEngine
{
    private sealed record ParsedRule(
        string Freq,
        int Interval,
        IReadOnlyList<DayOfWeek> ByDay,
        IReadOnlyList<int> ByMonthDay,
        IReadOnlyList<int> ByMonth,
        int? Count,
        DateTime? Until);

    public static bool IsValid(string? rrule) => Parse(rrule) is not null || string.IsNullOrWhiteSpace(rrule);

    public IReadOnlyList<DateTime> Expand(string? rrule, DateTime start, DateTime from, DateTime to, int maxResults = 1000)
    {
        if (string.IsNullOrWhiteSpace(rrule))
        {
            return start >= from && start <= to ? [start] : [];
        }

        var rule = Parse(rrule);
        if (rule is null)
        {
            return start >= from && start <= to ? [start] : [];
        }

        var results = new List<DateTime>();
        var emitted = 0;   // occurrences from DTSTART, used for COUNT
        var scanned = 0;   // hard guard against runaway loops

        foreach (var candidate in Candidates(rule, start))
        {
            if (++scanned > 50_000)
            {
                break;
            }

            if (rule.Count is int count && emitted >= count)
            {
                break;
            }

            if (rule.Until is DateTime until && candidate > until)
            {
                break;
            }

            if (candidate > to)
            {
                break;
            }

            emitted++;

            if (candidate >= from)
            {
                results.Add(candidate);
                if (results.Count >= maxResults)
                {
                    break;
                }
            }
        }

        return results;
    }

    /// <summary>First occurrence strictly after <paramref name="after"/>.</summary>
    public DateTime? NextOccurrence(string? rrule, DateTime start, DateTime after)
    {
        if (string.IsNullOrWhiteSpace(rrule))
        {
            return null;
        }

        var next = Expand(rrule, start, after.AddSeconds(1), after.AddYears(5), 1);
        return next.Count > 0 ? next[0] : null;
    }

    /// <summary>Human readable summary for the UI ("Weekly on Mon, Wed, Fri").</summary>
    public static string Describe(string? rrule)
    {
        var rule = Parse(rrule);
        if (rule is null)
        {
            return "One-off";
        }

        var days = rule.ByDay.Count > 0
            ? " on " + string.Join(", ", rule.ByDay.Select(d => d.ToString()[..3]))
            : "";

        return rule.Freq switch
        {
            "DAILY" => rule.Interval == 1 ? "Daily" : $"Every {rule.Interval} days",
            "WEEKLY" => (rule.Interval == 1 ? "Weekly" : $"Every {rule.Interval} weeks") + days,
            "MONTHLY" => (rule.Interval == 1 ? "Monthly" : $"Every {rule.Interval} months") +
                         (rule.ByMonthDay.Count > 0
                             ? " on the " + string.Join(", ", rule.ByMonthDay.Select(Ordinal))
                             : ""),
            "YEARLY" => rule.Interval == 1 ? "Yearly" : $"Every {rule.Interval} years",
            _ => rrule ?? "One-off"
        };
    }

    private static string Ordinal(int day) => (day % 10) switch
    {
        1 when day % 100 != 11 => $"{day}st",
        2 when day % 100 != 12 => $"{day}nd",
        3 when day % 100 != 13 => $"{day}rd",
        _ => $"{day}th"
    };

    private static ParsedRule? Parse(string? rrule)
    {
        if (string.IsNullOrWhiteSpace(rrule))
        {
            return null;
        }

        var body = rrule.Trim();
        var colon = body.IndexOf(':');
        if (body.StartsWith("RRULE", StringComparison.OrdinalIgnoreCase) && colon > 0)
        {
            body = body[(colon + 1)..];
        }

        var parts = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var part in body.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var kv = part.Split('=', 2);
            if (kv.Length == 2)
            {
                parts[kv[0].Trim()] = kv[1].Trim();
            }
        }

        if (!parts.TryGetValue("FREQ", out var freqRaw))
        {
            return null;
        }

        var freq = freqRaw.ToUpperInvariant();
        if (freq is not ("DAILY" or "WEEKLY" or "MONTHLY" or "YEARLY"))
        {
            return null;
        }

        var interval = parts.TryGetValue("INTERVAL", out var intervalRaw) && int.TryParse(intervalRaw, out var parsedInterval)
            ? Math.Max(1, parsedInterval)
            : 1;

        var byDay = new List<DayOfWeek>();
        if (parts.TryGetValue("BYDAY", out var byDayRaw))
        {
            foreach (var token in byDayRaw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var code = new string(token.Where(char.IsLetter).ToArray()).ToUpperInvariant();
                var day = code switch
                {
                    "MO" => DayOfWeek.Monday,
                    "TU" => DayOfWeek.Tuesday,
                    "WE" => DayOfWeek.Wednesday,
                    "TH" => DayOfWeek.Thursday,
                    "FR" => DayOfWeek.Friday,
                    "SA" => DayOfWeek.Saturday,
                    "SU" => DayOfWeek.Sunday,
                    _ => (DayOfWeek?)null
                };
                if (day is not null && !byDay.Contains(day.Value))
                {
                    byDay.Add(day.Value);
                }
            }
        }

        var byMonthDay = ParseIntList(parts, "BYMONTHDAY");
        var byMonth = ParseIntList(parts, "BYMONTH");

        int? count = null;
        if (parts.TryGetValue("COUNT", out var countRaw) && int.TryParse(countRaw, out var parsedCount) && parsedCount > 0)
        {
            count = parsedCount;
        }

        DateTime? until = null;
        if (parts.TryGetValue("UNTIL", out var untilRaw) && TryParseUntil(untilRaw, out var parsedUntil))
        {
            until = parsedUntil;
        }

        return new ParsedRule(freq, interval, byDay, byMonthDay, byMonth, count, until);
    }

    private static List<int> ParseIntList(Dictionary<string, string> parts, string key)
    {
        var values = new List<int>();
        if (!parts.TryGetValue(key, out var raw))
        {
            return values;
        }

        foreach (var token in raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (int.TryParse(token, out var value) && value != 0)
            {
                values.Add(value);
            }
        }

        return values;
    }

    private static bool TryParseUntil(string raw, out DateTime value)
    {
        value = default;
        var text = raw.Trim();
        if (text.EndsWith('Z'))
        {
            text = text[..^1];
        }

        if (DateTime.TryParseExact(text, ["yyyyMMdd'T'HHmmss", "yyyyMMdd"], null,
                System.Globalization.DateTimeStyles.None, out value))
        {
            return true;
        }

        return DateTime.TryParse(text, out value);
    }

    private static IEnumerable<DateTime> Candidates(ParsedRule rule, DateTime start)
    {
        var time = start.TimeOfDay;
        var interval = rule.Interval;

        switch (rule.Freq)
        {
            case "DAILY":
                for (var date = start.Date; ; date = date.AddDays(interval))
                {
                    if (rule.ByDay.Count == 0 || rule.ByDay.Contains(date.DayOfWeek))
                    {
                        yield return date + time;
                    }
                }

            case "WEEKLY":
            {
                List<DayOfWeek> days = rule.ByDay.Count > 0
                    ? rule.ByDay.Distinct().OrderBy(WeekIndex).ToList()
                    : new List<DayOfWeek> { start.DayOfWeek };

                // Weeks start on Monday, matching the default WKST of RFC 5545.
                var weekStart = start.Date.AddDays(-WeekIndex(start.DayOfWeek));

                for (var week = weekStart; ; week = week.AddDays(7 * interval))
                {
                    foreach (var day in days)
                    {
                        var candidate = week.AddDays(WeekIndex(day)) + time;
                        if (candidate >= start)
                        {
                            yield return candidate;
                        }
                    }
                }
            }

            case "MONTHLY":
            {
                var anchor = new DateTime(start.Year, start.Month, 1);

                for (var month = anchor; ; month = month.AddMonths(interval))
                {
                    var daysInMonth = DateTime.DaysInMonth(month.Year, month.Month);
                    List<int> monthDays = rule.ByMonthDay.Count > 0
                        ? rule.ByMonthDay.Where(d => d >= 1 && d <= daysInMonth).OrderBy(d => d).ToList()
                        : start.Day <= daysInMonth ? new List<int> { start.Day } : new List<int>();

                    foreach (var day in monthDays)
                    {
                        var candidate = new DateTime(month.Year, month.Month, day) + time;
                        if (candidate >= start)
                        {
                            yield return candidate;
                        }
                    }
                }
            }

            case "YEARLY":
            {
                List<int> months = rule.ByMonth.Count > 0 ? rule.ByMonth.OrderBy(m => m).ToList() : new List<int> { start.Month };

                for (var year = start.Year; ; year += interval)
                {
                    foreach (var month in months.Where(m => m is >= 1 and <= 12))
                    {
                        var daysInMonth = DateTime.DaysInMonth(year, month);
                        List<int> days = rule.ByMonthDay.Count > 0
                            ? rule.ByMonthDay.Where(d => d >= 1 && d <= daysInMonth).OrderBy(d => d).ToList()
                            : start.Day <= daysInMonth ? new List<int> { start.Day } : new List<int>();

                        foreach (var day in days)
                        {
                            var candidate = new DateTime(year, month, day) + time;
                            if (candidate >= start)
                            {
                                yield return candidate;
                            }
                        }
                    }
                }
            }
        }
    }

    private static int WeekIndex(DayOfWeek day) => ((int)day + 6) % 7;
}
