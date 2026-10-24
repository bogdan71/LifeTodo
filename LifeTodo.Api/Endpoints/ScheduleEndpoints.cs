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
            var occurrences = new List<EventOccurrenceDto>();

            foreach (var item in events)
            {
                var duration = item.End - item.Start;
                if (duration < TimeSpan.Zero)
                {
                    duration = TimeSpan.FromMinutes(30);
                }

                var starts = engine.Expand(item.RecurrenceRule, item.Start, rangeStart, rangeEnd);

                foreach (var start in starts)
                {
                    occurrences.Add(new EventOccurrenceDto(
                        $"{item.Id}:{start:yyyyMMddTHHmmss}",
                        item.Id,
                        item.Title,
                        item.Notes,
                        item.Location,
                        start,
                        start + duration,
                        item.AllDay,
                        item.Color,
                        !string.IsNullOrWhiteSpace(item.RecurrenceRule)));
                }
            }

            return Results.Ok(occurrences.OrderBy(o => o.Start));
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

            item.Title = request.Title.Trim();
            item.Notes = request.Notes?.Trim();
            item.Location = request.Location?.Trim();
            item.Start = start;
            item.End = end;
            item.AllDay = request.AllDay ?? item.AllDay;
            item.Color = NormalizeColor(request.Color);
            item.RecurrenceRule = NormalizeRule(request.RecurrenceRule);

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
