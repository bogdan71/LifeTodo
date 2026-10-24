using LifeTodo.Db;
using LifeTodo.Db.Models;
using LifeTodo.Api.Contracts;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;

namespace LifeTodo.Api.Services;

/// <summary>
/// Polls for due reminders and pushes them to every connected browser over SignalR.
/// It also rolls recurring reminders forward instead of firing them forever.
/// </summary>
public sealed class ReminderBackgroundService(
    IServiceScopeFactory scopeFactory,
    IHubContext<Hubs.TodoHub> hub,
    RecurrenceEngine recurrence,
    ILogger<ReminderBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Reminder checker started (poll every {Seconds}s)", PollInterval.TotalSeconds);

        using var timer = new PeriodicTimer(PollInterval);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Reminder check failed");
            }

            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task CheckAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LifeTodoDbContext>();
        var now = DateTime.Now;

        var due = await db.Reminders
            .Where(r => !r.IsAcknowledged && r.NotifiedAt == null && r.RemindAt <= now)
            .OrderBy(r => r.RemindAt)
            .ToListAsync(cancellationToken);

        if (due.Count == 0)
        {
            return;
        }

        foreach (var reminder in due)
        {
            reminder.NotifiedAt = now;

            if (!string.IsNullOrWhiteSpace(reminder.RecurrenceRule))
            {
                var next = recurrence.NextOccurrence(reminder.RecurrenceRule, reminder.RemindAt, now);
                if (next is not null)
                {
                    db.Reminders.Add(new Reminder
                    {
                        Title = reminder.Title,
                        Notes = reminder.Notes,
                        RemindAt = next.Value,
                        RecurrenceRule = reminder.RecurrenceRule,
                        CreatedAt = now
                    });
                }
            }

            await hub.Clients.All.SendAsync("reminderDue", ReminderDto.From(reminder), cancellationToken);
            logger.LogInformation("Pushed reminder {Title} due {RemindAt}", reminder.Title, reminder.RemindAt);
        }

        await db.SaveChangesAsync(cancellationToken);
        await hub.Clients.All.SendAsync("remindersChanged", cancellationToken);
    }
}
