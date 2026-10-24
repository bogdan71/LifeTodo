using LifeTodo.Db;
using LifeTodo.Db.Models;
using Microsoft.EntityFrameworkCore;

namespace LifeTodo.Api.Services;

public sealed class StatsService(LifeTodoDbContext db)
{
    public async Task<Contracts.StatsDto> CalculateAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.Now;
        var today = now.Date;
        var weekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var monthStart = new DateTime(today.Year, today.Month, 1);

        var todos = await db.Todos.AsNoTracking().ToListAsync(cancellationToken);
        var completions = await db.Completions.AsNoTracking().ToListAsync(cancellationToken);

        var completionDays = completions
            .Select(c => c.CompletedAt.Date)
            .Distinct()
            .OrderBy(d => d)
            .ToList();
        var daySet = completionDays.ToHashSet();

        var currentStreak = 0;
        var cursor = daySet.Contains(today) ? today : today.AddDays(-1);
        while (daySet.Contains(cursor))
        {
            currentStreak++;
            cursor = cursor.AddDays(-1);
        }

        var bestStreak = 0;
        var run = 0;
        DateTime? previous = null;
        foreach (var day in completionDays)
        {
            run = previous is not null && (day - previous.Value).TotalDays == 1 ? run + 1 : 1;
            bestStreak = Math.Max(bestStreak, run);
            previous = day;
        }

        var openTodos = todos.Where(t => !t.IsCompleted).ToList();
        var completedLast30 = completions.Count(c => c.CompletedAt >= today.AddDays(-29));
        var completionRate = completedLast30 + openTodos.Count == 0
            ? 0
            : Math.Round(100.0 * completedLast30 / (completedLast30 + openTodos.Count), 0);

        var activity = new List<Contracts.DayPoint>();
        for (var i = 13; i >= 0; i--)
        {
            var day = today.AddDays(-i);
            activity.Add(new Contracts.DayPoint(
                day.ToString("yyyy-MM-dd"),
                day.ToString("ddd"),
                completions.Count(c => c.CompletedAt.Date == day)));
        }

        var byCategory = todos
            .GroupBy(t => string.IsNullOrWhiteSpace(t.Category) ? "Personal" : t.Category)
            .Select(g => new Contracts.CategoryPoint(
                g.Key,
                g.Count(t => !t.IsCompleted),
                g.Count(t => t.IsCompleted)))
            .OrderByDescending(c => c.Open + c.Completed)
            .ToList();

        var upcoming = new List<Contracts.UpcomingDto>();
        upcoming.AddRange(openTodos
            .Where(t => t.DueDate is not null)
            .OrderBy(t => t.DueDate)
            .Take(4)
            .Select(t => new Contracts.UpcomingDto(t.Title, "Todo", t.DueDate!.Value)));

        var dueReminders = await db.Reminders.AsNoTracking()
            .Where(r => !r.IsAcknowledged)
            .OrderBy(r => r.RemindAt)
            .Take(3)
            .ToListAsync(cancellationToken);
        upcoming.AddRange(dueReminders.Select(r => new Contracts.UpcomingDto(r.Title, "Reminder", r.RemindAt)));

        return new Contracts.StatsDto(
            OpenTodos: openTodos.Count,
            CompletedToday: completions.Count(c => c.CompletedAt.Date == today),
            CompletedThisWeek: completions.Count(c => c.CompletedAt.Date >= weekStart),
            CompletedThisMonth: completions.Count(c => c.CompletedAt.Date >= monthStart),
            DueToday: openTodos.Count(t => t.DueDate?.Date == today),
            Overdue: openTodos.Count(t => t.DueDate?.Date < today),
            CurrentStreak: currentStreak,
            BestStreak: bestStreak,
            TotalCompletions: completions.Count,
            CompletionRate: completionRate,
            Activity: activity,
            ByCategory: byCategory,
            Upcoming: upcoming.OrderBy(u => u.When).Take(5).ToList());
    }
}
