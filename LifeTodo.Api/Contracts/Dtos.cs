using LifeTodo.Api.Services;
using LifeTodo.Db.Models;

namespace LifeTodo.Api.Contracts;

public record TodoDto(
    int Id,
    string Title,
    string? Notes,
    string Category,
    string Priority,
    DateTime? DueDate,
    bool IsCompleted,
    DateTime? CompletedAt,
    string? RecurrenceRule,
    string RecurrenceLabel,
    DateTime CreatedAt)
{
    public static TodoDto From(TodoItem todo, RecurrenceEngine engine) => new(
        todo.Id,
        todo.Title,
        todo.Notes,
        todo.Category,
        todo.Priority.ToString(),
        todo.DueDate,
        todo.IsCompleted,
        todo.CompletedAt,
        todo.RecurrenceRule,
        RecurrenceEngine.Describe(todo.RecurrenceRule),
        todo.CreatedAt);
}

public record TodoRequest(
    string? Title,
    string? Notes,
    string? Category,
    string? Priority,
    DateTime? DueDate,
    string? RecurrenceRule);

public record EventDto(
    int Id,
    string Title,
    string? Notes,
    string? Location,
    DateTime Start,
    DateTime End,
    bool AllDay,
    string Color,
    string? RecurrenceRule,
    string RecurrenceLabel,
    DateTime CreatedAt)
{
    public static EventDto From(ScheduleEvent item) => new(
        item.Id,
        item.Title,
        item.Notes,
        item.Location,
        item.Start,
        item.End,
        item.AllDay,
        item.Color,
        item.RecurrenceRule,
        RecurrenceEngine.Describe(item.RecurrenceRule),
        item.CreatedAt);
}

public record EventRequest(
    string? Title,
    string? Notes,
    string? Location,
    DateTime? Start,
    DateTime? End,
    bool? AllDay,
    string? Color,
    string? RecurrenceRule);

public record ReminderDto(
    int Id,
    string Title,
    string? Notes,
    DateTime RemindAt,
    int? TodoItemId,
    bool IsAcknowledged,
    DateTime? AcknowledgedAt,
    DateTime? NotifiedAt,
    string? RecurrenceRule,
    DateTime CreatedAt)
{
    public static ReminderDto From(Reminder reminder) => new(
        reminder.Id,
        reminder.Title,
        reminder.Notes,
        reminder.RemindAt,
        reminder.TodoItemId,
        reminder.IsAcknowledged,
        reminder.AcknowledgedAt,
        reminder.NotifiedAt,
        reminder.RecurrenceRule,
        reminder.CreatedAt);
}

public record ReminderRequest(
    string? Title,
    string? Notes,
    DateTime? RemindAt,
    int? TodoItemId,
    string? RecurrenceRule);

/// <summary>A single, concrete instance of a possibly recurring event.</summary>
public record EventOccurrenceDto(
    string Id,
    int EventId,
    string Title,
    string? Notes,
    string? Location,
    DateTime Start,
    DateTime End,
    bool AllDay,
    string Color,
    bool Recurring);

public record DayPoint(string Date, string Label, int Count);

public record CategoryPoint(string Category, int Open, int Completed);

public record UpcomingDto(string Title, string Kind, DateTime When);

public record StatsDto(
    int OpenTodos,
    int CompletedToday,
    int CompletedThisWeek,
    int CompletedThisMonth,
    int DueToday,
    int Overdue,
    int CurrentStreak,
    int BestStreak,
    int TotalCompletions,
    double CompletionRate,
    IReadOnlyList<DayPoint> Activity,
    IReadOnlyList<CategoryPoint> ByCategory,
    IReadOnlyList<UpcomingDto> Upcoming);

public record ErrorResponse(string Message);
