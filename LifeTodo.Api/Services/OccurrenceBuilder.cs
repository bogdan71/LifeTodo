using LifeTodo.Api.Contracts;
using LifeTodo.Db.Models;

namespace LifeTodo.Api.Services;

/// <summary>
/// Turns stored events, plus the occurrences that were moved on their own, into the
/// concrete instances the calendar shows. Kept free of EF so it can be tested directly.
/// </summary>
public static class OccurrenceBuilder
{
    public static IReadOnlyList<EventOccurrenceDto> Build(
        IEnumerable<ScheduleEvent> events,
        IEnumerable<EventOverride> overrides,
        RecurrenceEngine engine,
        DateTime rangeStart,
        DateTime rangeEnd)
    {
        var byEvent = overrides.ToLookup(o => o.ScheduleEventId);
        var occurrences = new List<EventOccurrenceDto>();

        foreach (var item in events)
        {
            var duration = item.End - item.Start;
            if (duration <= TimeSpan.Zero)
            {
                duration = TimeSpan.FromMinutes(30);
            }

            var recurring = !string.IsNullOrWhiteSpace(item.RecurrenceRule);
            var moved = byEvent[item.Id].ToDictionary(o => o.OriginalStart, o => o);
            var emitted = new HashSet<DateTime>();

            foreach (var start in engine.Expand(item.RecurrenceRule, item.Start, rangeStart, rangeEnd))
            {
                if (!emitted.Add(start))
                {
                    continue;
                }

                Add(start, moved.GetValueOrDefault(start));
            }

            // An occurrence moved into this window from outside it still belongs here.
            foreach (var entry in moved.Values)
            {
                if (emitted.Add(entry.OriginalStart))
                {
                    Add(entry.OriginalStart, entry);
                }
            }

            void Add(DateTime originalStart, EventOverride? entry)
            {
                var occurrence = Build(item, originalStart, duration, entry, recurring);

                // A moved occurrence leaves the window when it is dragged past either end.
                if (occurrence.Start >= rangeStart && occurrence.Start <= rangeEnd)
                {
                    occurrences.Add(occurrence);
                }
            }
        }

        return occurrences.OrderBy(o => o.Start).ToList();
    }

    private static EventOccurrenceDto Build(
        ScheduleEvent item,
        DateTime originalStart,
        TimeSpan duration,
        EventOverride? moved,
        bool recurring)
    {
        var start = moved?.Start ?? originalStart;
        var end = moved?.End ?? start + duration;
        if (end <= start)
        {
            end = start + duration;
        }

        return new EventOccurrenceDto(
            // The series slot stays in the id, so a moved occurrence can be moved again.
            $"{item.Id}:{originalStart:yyyyMMddTHHmmss}",
            item.Id,
            item.Title,
            item.Notes,
            item.Location,
            start,
            end,
            moved?.AllDay ?? item.AllDay,
            item.Color,
            recurring,
            originalStart,
            moved is not null);
    }
}
