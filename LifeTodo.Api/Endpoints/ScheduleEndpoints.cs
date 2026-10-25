using LifeTodo.Api.Contracts;
using LifeTodo.Api.Hubs;
using LifeTodo.Api.Services;
using LifeTodo.Db;
using LifeTodo.Db.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace LifeTodo.Api.Endpoints;

public static class ScheduleEndpoints
{
    public static void MapScheduleEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/events", async (LifeTodoDbContext db) =>
        {
            var items = await db.Events.AsNoTracking().OrderBy(e => e.Start).ToListAsync();
            return Results.Ok(items.Select(EventDto.From));
        });

        /// <summary>Concrete occurrences for a calendar window (recurrence expanded server-side).</summary>
        app.MapGet("/api/events/occurrences", async (
            LifeTodoDbContext db,
            RecurrenceEngine engine,
            DateTime? from,
            DateTime? to) =>
        {
            var rangeStart = from ?? DateTime.Today.AddDays(-7);
            var rangeEnd = to ?? DateTime.Today.AddDays(30);
            if (rangeEnd < rangeStart)
            {
                return Results.BadRequest(new ErrorResponse("'to' must be after 'from'."));
            }

            if ((rangeEnd - rangeStart).TotalDays > 370)
            {
                rangeEnd = rangeStart.AddDays(370);
            }

            var events = await db.Events.AsNoTracking().ToListAsync();
            var overrides = await db.EventOverrides.AsNoTracking().ToListAsync();

            return Results.Ok(OccurrenceBuilder.Build(events, overrides, engine, rangeStart, rangeEnd));
        });

        /// <summary>
        /// Moves a single occurrence of a repeating event, leaving the rest of the series
        /// where it is. The series slot it came from stays the identity of this occurrence.
        /// </summary>
        app.MapPut("/api/events/{id:int}/occurrences", async (
            int id,
            OccurrenceMoveRequest request,
            LifeTodoDbContext db,
            IHubContext<TodoHub> hub) =>
        {
            var item = await db.Events.FindAsync(id);
            if (item is null)
            {
                return Results.NotFound(new ErrorResponse("Event not found."));
            }

            if (string.IsNullOrWhiteSpace(item.RecurrenceRule))
            {
                return Results.BadRequest(new ErrorResponse("Only a repeating event has occurrences to move."));
            }

            if (request.OriginalStart is not DateTime originalStart || request.Start is not DateTime start)
            {
                return Results.BadRequest(new ErrorResponse("The occurrence and its new start are both required."));
            }

            var duration = item.End - item.Start;
            if (duration <= TimeSpan.Zero)
            {
                duration = TimeSpan.FromMinutes(30);
            }

            var end = request.End ?? start + duration;
            if (end <= start)
            {
                end = start + duration;
            }

            var existing = await db.EventOverrides.FirstOrDefaultAsync(o =>
                o.ScheduleEventId == id && o.OriginalStart == originalStart);

            if (existing is null)
            {
                db.EventOverrides.Add(new EventOverride
                {
                    ScheduleEventId = id,
                    OriginalStart = originalStart,
                    Start = start,
                    End = end,
                    AllDay = request.AllDay ?? item.AllDay
                });
            }
            else
            {
                existing.Start = start;
                existing.End = end;
                existing.AllDay = request.AllDay ?? item.AllDay;
            }

            await db.SaveChangesAsync();
            await hub.Clients.All.SendAsync("eventsChanged");

            return Results.NoContent();
        });

        app.MapPost("/api/events", async (
            EventRequest request,
            LifeTodoDbContext db,
            IHubContext<TodoHub> hub) =>
        {
            var title = request.Title?.Trim();
            if (string.IsNullOrWhiteSpace(title))
            {
                return Results.BadRequest(new ErrorResponse("A title is required."));
            }

            if (!RecurrenceEngine.IsValid(request.RecurrenceRule))
            {
                return Results.BadRequest(new ErrorResponse("That recurrence rule could not be parsed."));
            }

            var start = request.Start ?? DateTime.Now;
            var end = request.End ?? start.AddHours(1);
            if (end <= start)
            {
                end = start.AddHours(1);
            }

            var item = new ScheduleEvent
            {
                Title = title,
                Notes = request.Notes?.Trim(),
                Location = request.Location?.Trim(),
                Start = start,
                End = end,
                AllDay = request.AllDay ?? false,
                Color = NormalizeColor(request.Color),
                RecurrenceRule = NormalizeRule(request.RecurrenceRule),
                CreatedAt = DateTime.Now
            };

            db.Events.Add(item);
            await db.SaveChangesAsync();
            await hub.Clients.All.SendAsync("eventsChanged");

            return Results.Created($"/api/events/{item.Id}", EventDto.From(item));
        });

        app.MapPut("/api/events/{id:int}", async (
            int id,
            EventRequest request,
            LifeTodoDbContext db,
            IHubContext<TodoHub> hub) =>
        {
            var item = await db.Events.FindAsync(id);
            if (item is null)
            {
                return Results.NotFound(new ErrorResponse("Event not found."));
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return Results.BadRequest(new ErrorResponse("A title is required."));
            }

            var start = request.Start ?? item.Start;
            var end = request.End ?? item.End;
            if (end <= start)
            {
                end = start.AddHours(1);
            }

            var rule = NormalizeRule(request.RecurrenceRule);
            var seriesMoved = item.Start != start || item.RecurrenceRule != rule;

            item.Title = request.Title.Trim();
            item.Notes = request.Notes?.Trim();
            item.Location = request.Location?.Trim();
            item.Start = start;
            item.End = end;
            item.AllDay = request.AllDay ?? item.AllDay;
            item.Color = NormalizeColor(request.Color);
            item.RecurrenceRule = rule;

            // Re-timing the series moves its slots, so per-occurrence moves no longer apply.
            if (seriesMoved)
            {
                db.EventOverrides.RemoveRange(db.EventOverrides.Where(o => o.ScheduleEventId == id));
            }

            await db.SaveChangesAsync();
            await hub.Clients.All.SendAsync("eventsChanged");

            return Results.Ok(EventDto.From(item));
        });

        app.MapDelete("/api/events/{id:int}", async (int id, LifeTodoDbContext db, IHubContext<TodoHub> hub) =>
        {
            var item = await db.Events.FindAsync(id);
            if (item is null)
            {
                return Results.NotFound(new ErrorResponse("Event not found."));
            }

            db.Events.Remove(item);
            await db.SaveChangesAsync();
            await hub.Clients.All.SendAsync("eventsChanged");

            return Results.NoContent();
        });

        /// <summary>Preview used by the recurrence builder in the UI.</summary>
        app.MapGet("/api/recurrence/preview", (RecurrenceEngine engine, DateTime? start, string? rule) =>
        {
            var anchor = start ?? DateTime.Now;
            if (string.IsNullOrWhiteSpace(rule))
            {
                return Results.Ok(new { label = "One-off", next = new[] { anchor } });
            }

            if (!RecurrenceEngine.IsValid(rule))
            {
                return Results.BadRequest(new ErrorResponse("That recurrence rule could not be parsed."));
            }

            var next = engine.Expand(rule, anchor, anchor.AddSeconds(-1), anchor.AddYears(2), 5);
            return Results.Ok(new { label = RecurrenceEngine.Describe(rule), next });
        });
    }

    private static string NormalizeColor(string? color) =>
        string.IsNullOrWhiteSpace(color) ? "#6366f1" : color.Trim();

    private static string? NormalizeRule(string? rule) =>
        string.IsNullOrWhiteSpace(rule) ? null : rule.Trim();
}
