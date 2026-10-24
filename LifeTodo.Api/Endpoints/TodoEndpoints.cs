using LifeTodo.Api.Contracts;
using LifeTodo.Api.Hubs;
using LifeTodo.Api.Services;
using LifeTodo.Db;
using LifeTodo.Db.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace LifeTodo.Api.Endpoints;

public static class TodoEndpoints
{
    public static void MapTodoEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/todos", async (LifeTodoDbContext db, RecurrenceEngine engine, string? view) =>
        {
            var query = db.Todos.AsNoTracking();

            if (string.Equals(view, "open", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(t => !t.IsCompleted);
            }
            else if (string.Equals(view, "done", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(t => t.IsCompleted);
            }

            var items = await query
                .OrderBy(t => t.IsCompleted)
                .ThenBy(t => t.DueDate == null)
                .ThenBy(t => t.DueDate)
                .ThenByDescending(t => t.Priority)
                .ToListAsync();

            return Results.Ok(items.Select(t => TodoDto.From(t, engine)));
        });

        app.MapPost("/api/todos", async (
            TodoRequest request,
            LifeTodoDbContext db,
            RecurrenceEngine engine,
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

            var todo = new TodoItem
            {
                Title = title,
                Notes = request.Notes?.Trim(),
                Category = string.IsNullOrWhiteSpace(request.Category) ? "Personal" : request.Category.Trim(),
                Priority = ParsePriority(request.Priority),
                DueDate = request.DueDate ?? (string.IsNullOrWhiteSpace(request.RecurrenceRule) ? null : DateTime.Now),
                RecurrenceRule = NormalizeRule(request.RecurrenceRule),
                CreatedAt = DateTime.Now
            };

            db.Todos.Add(todo);
            await db.SaveChangesAsync();
            await hub.Clients.All.SendAsync("todosChanged");

            return Results.Created($"/api/todos/{todo.Id}", TodoDto.From(todo, engine));
        });

        app.MapPut("/api/todos/{id:int}", async (
            int id,
            TodoRequest request,
            LifeTodoDbContext db,
            RecurrenceEngine engine,
            IHubContext<TodoHub> hub) =>
        {
            var todo = await db.Todos.FindAsync(id);
            if (todo is null)
            {
                return Results.NotFound(new ErrorResponse("Todo not found."));
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return Results.BadRequest(new ErrorResponse("A title is required."));
            }

            todo.Title = request.Title.Trim();
            todo.Notes = request.Notes?.Trim();
            todo.Category = string.IsNullOrWhiteSpace(request.Category) ? "Personal" : request.Category.Trim();
            todo.Priority = ParsePriority(request.Priority);
            todo.DueDate = request.DueDate;
            todo.RecurrenceRule = NormalizeRule(request.RecurrenceRule);

            await db.SaveChangesAsync();
            await hub.Clients.All.SendAsync("todosChanged");

            return Results.Ok(TodoDto.From(todo, engine));
        });

        app.MapPost("/api/todos/{id:int}/toggle", async (
            int id,
            LifeTodoDbContext db,
            RecurrenceEngine engine,
            IHubContext<TodoHub> hub) =>
        {
            var todo = await db.Todos.FindAsync(id);
            if (todo is null)
            {
                return Results.NotFound(new ErrorResponse("Todo not found."));
            }

            var now = DateTime.Now;

            if (todo.IsCompleted)
            {
                todo.IsCompleted = false;
                todo.CompletedAt = null;
            }
            else
            {
                db.Completions.Add(new Completion
                {
                    TodoItemId = todo.Id,
                    Title = todo.Title,
                    Category = todo.Category,
                    CompletedAt = now
                });

                if (!string.IsNullOrWhiteSpace(todo.RecurrenceRule))
                {
                    // Recurring todos never fully complete: log the completion and
                    // roll the due date to the next occurrence.
                    var anchor = todo.DueDate ?? now;
                    var reference = anchor > now ? anchor : now;
                    todo.DueDate = engine.NextOccurrence(todo.RecurrenceRule, anchor, reference) ?? anchor.AddDays(1);
                    todo.IsCompleted = false;
                    todo.CompletedAt = null;
                }
                else
                {
                    todo.IsCompleted = true;
                    todo.CompletedAt = now;
                }
            }

            await db.SaveChangesAsync();
            await hub.Clients.All.SendAsync("todosChanged");

            return Results.Ok(TodoDto.From(todo, engine));
        });

        app.MapDelete("/api/todos/{id:int}", async (int id, LifeTodoDbContext db, IHubContext<TodoHub> hub) =>
        {
            var todo = await db.Todos.FindAsync(id);
            if (todo is null)
            {
                return Results.NotFound(new ErrorResponse("Todo not found."));
            }

            db.Todos.Remove(todo);
            await db.SaveChangesAsync();
            await hub.Clients.All.SendAsync("todosChanged");

            return Results.NoContent();
        });
    }

    private static Priority ParsePriority(string? value) => value?.ToLowerInvariant() switch
    {
        "high" => Priority.High,
        "low" => Priority.Low,
        _ => Priority.Normal
    };

    private static string? NormalizeRule(string? rule) =>
        string.IsNullOrWhiteSpace(rule) ? null : rule.Trim().TrimStart(':');
}
