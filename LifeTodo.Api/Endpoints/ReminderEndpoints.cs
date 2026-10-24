using LifeTodo.Api.Contracts;
using LifeTodo.Api.Hubs;
using LifeTodo.Api.Services;
using LifeTodo.Db;
using LifeTodo.Db.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace LifeTodo.Api.Endpoints;

public static class ReminderEndpoints
{
    public static void MapReminderEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/reminders", async (LifeTodoDbContext db, bool? includeAcknowledged) =>
        {
            var query = db.Reminders.AsNoTracking();
            if (includeAcknowledged != true)
            {
                query = query.Where(r => !r.IsAcknowledged);
            }

            var items = await query.OrderBy(r => r.RemindAt).ToListAsync();
            return Results.Ok(items.Select(ReminderDto.From));
        });

        app.MapPost("/api/reminders", async (
            ReminderRequest request,
            LifeTodoDbContext db,
            RecurrenceEngine engine,
            IHubContext<TodoHub> hub) =>
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return Results.BadRequest(new ErrorResponse("A title is required."));
            }

            if (request.RemindAt is null)
            {
                return Results.BadRequest(new ErrorResponse("A remind-at time is required."));
            }

            if (!RecurrenceEngine.IsValid(request.RecurrenceRule))
            {
                return Results.BadRequest(new ErrorResponse("That recurrence rule could not be parsed."));
            }

            var reminder = new Reminder
            {
                Title = request.Title.Trim(),
                Notes = request.Notes?.Trim(),
                RemindAt = request.RemindAt.Value,
                TodoItemId = request.TodoItemId,
                RecurrenceRule = string.IsNullOrWhiteSpace(request.RecurrenceRule) ? null : request.RecurrenceRule.Trim(),
                CreatedAt = DateTime.Now
            };

            db.Reminders.Add(reminder);
            await db.SaveChangesAsync();
            await hub.Clients.All.SendAsync("remindersChanged");

            return Results.Created($"/api/reminders/{reminder.Id}", ReminderDto.From(reminder));
        });

        app.MapPut("/api/reminders/{id:int}", async (
            int id,
            ReminderRequest request,
            LifeTodoDbContext db,
            IHubContext<TodoHub> hub) =>
        {
            var reminder = await db.Reminders.FindAsync(id);
            if (reminder is null)
            {
                return Results.NotFound(new ErrorResponse("Reminder not found."));
            }

            if (string.IsNullOrWhiteSpace(request.Title) || request.RemindAt is null)
            {
                return Results.BadRequest(new ErrorResponse("A title and remind-at time are required."));
            }

            reminder.Title = request.Title.Trim();
            reminder.Notes = request.Notes?.Trim();
            reminder.RemindAt = request.RemindAt.Value;
            reminder.TodoItemId = request.TodoItemId;
            reminder.RecurrenceRule = string.IsNullOrWhiteSpace(request.RecurrenceRule) ? null : request.RecurrenceRule.Trim();
            reminder.NotifiedAt = null;

            await db.SaveChangesAsync();
            await hub.Clients.All.SendAsync("remindersChanged");

            return Results.Ok(ReminderDto.From(reminder));
        });

        app.MapPost("/api/reminders/{id:int}/ack", async (int id, LifeTodoDbContext db, IHubContext<TodoHub> hub) =>
        {
            var reminder = await db.Reminders.FindAsync(id);
            if (reminder is null)
            {
                return Results.NotFound(new ErrorResponse("Reminder not found."));
            }

            reminder.IsAcknowledged = true;
            reminder.AcknowledgedAt = DateTime.Now;

            await db.SaveChangesAsync();
            await hub.Clients.All.SendAsync("remindersChanged");

            return Results.Ok(ReminderDto.From(reminder));
        });

        app.MapDelete("/api/reminders/{id:int}", async (int id, LifeTodoDbContext db, IHubContext<TodoHub> hub) =>
        {
            var reminder = await db.Reminders.FindAsync(id);
            if (reminder is null)
            {
                return Results.NotFound(new ErrorResponse("Reminder not found."));
            }

            db.Reminders.Remove(reminder);
            await db.SaveChangesAsync();
            await hub.Clients.All.SendAsync("remindersChanged");

            return Results.NoContent();
        });

        app.MapGet("/api/stats", async (StatsService stats) => Results.Ok(await stats.CalculateAsync()));
    }
}
