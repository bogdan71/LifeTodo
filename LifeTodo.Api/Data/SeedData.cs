using LifeTodo.Db;
using LifeTodo.Db.Models;
using Microsoft.EntityFrameworkCore;

namespace LifeTodo.Api.Data;

public static class SeedData
{
    public static async Task EnsureSeededAsync(LifeTodoDbContext db)
    {
        if (await db.Todos.AnyAsync() || await db.Events.AnyAsync())
        {
            return;
        }

        var today = DateTime.Today;
        var now = DateTime.Now;

        db.Todos.AddRange(
            new TodoItem
            {
                Title = "Morning routine: water, stretch, 10 min walk",
                Notes = "The small stuff that keeps the engine running.",
                Category = "Health",
                Priority = Priority.High,
                DueDate = today.AddHours(9),
                RecurrenceRule = "FREQ=DAILY",
                CreatedAt = now.AddDays(-21)
            },
            new TodoItem
            {
                Title = "Gym session",
                Category = "Health",
                Priority = Priority.High,
                DueDate = today.AddHours(18),
                RecurrenceRule = "FREQ=WEEKLY;BYDAY=MO,WE,FR",
                CreatedAt = now.AddDays(-20)
            },
            new TodoItem
            {
                Title = "Pay the electricity bill",
                Notes = "Due on the 1st. Autopay is off since the card changed.",
                Category = "Admin",
                Priority = Priority.High,
                DueDate = new DateTime(today.Year, today.Month, 1).AddMonths(1).AddHours(10),
                RecurrenceRule = "FREQ=MONTHLY;BYMONTHDAY=1",
                CreatedAt = now.AddDays(-15)
            },
            new TodoItem
            {
                Title = "Weekly review + plan next week",
                Notes = "Inbox zero, budget check, pick three priorities.",
                Category = "Planning",
                Priority = Priority.Normal,
                DueDate = NextWeekday(DayOfWeek.Sunday, today).AddHours(19),
                RecurrenceRule = "FREQ=WEEKLY;BYDAY=SU",
                CreatedAt = now.AddDays(-18)
            },
            new TodoItem
            {
                Title = "Call Mum",
                Category = "People",
                Priority = Priority.Normal,
                DueDate = today.AddHours(20),
                CreatedAt = now.AddDays(-2)
            },
            new TodoItem
            {
                Title = "Water the plants",
                Category = "Home",
                Priority = Priority.Low,
                DueDate = today.AddHours(8).AddDays(-1),
                RecurrenceRule = "FREQ=WEEKLY;BYDAY=TU,SA",
                CreatedAt = now.AddDays(-10)
            },
            new TodoItem
            {
                Title = "Book dentist appointment",
                Category = "Health",
                Priority = Priority.Normal,
                DueDate = today.AddDays(3).AddHours(12),
                CreatedAt = now.AddDays(-3)
            });

        var mondayThisWeek = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));

        db.Events.AddRange(
            new ScheduleEvent
            {
                Title = "Deep work block",
                Notes = "Phone in the drawer. One thing only.",
                Location = "Home office",
                Start = mondayThisWeek.AddDays(-56).AddHours(10),
                End = mondayThisWeek.AddDays(-56).AddHours(12),
                Color = "#6366f1",
                RecurrenceRule = "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
                CreatedAt = now.AddDays(-30)
            },
            new ScheduleEvent
            {
                Title = "Team sync",
                Location = "Meet / online",
                Start = mondayThisWeek.AddDays(-28).AddDays(1).AddHours(14),
                End = mondayThisWeek.AddDays(-28).AddDays(1).AddHours(15),
                Color = "#0ea5e9",
                RecurrenceRule = "FREQ=WEEKLY;BYDAY=TU,TH",
                CreatedAt = now.AddDays(-25)
            },
            new ScheduleEvent
            {
                Title = "Spanish class",
                Location = "Language school",
                Start = NextWeekday(DayOfWeek.Wednesday, today).AddHours(18),
                End = NextWeekday(DayOfWeek.Wednesday, today).AddHours(19.5),
                Color = "#f59e0b",
                RecurrenceRule = "FREQ=WEEKLY;BYDAY=WE",
                CreatedAt = now.AddDays(-14)
            },
            new ScheduleEvent
            {
                Title = "Monthly budget check",
                Start = new DateTime(today.Year, today.Month, 1).AddMonths(1).AddHours(17),
                End = new DateTime(today.Year, today.Month, 1).AddMonths(1).AddHours(18),
                Color = "#10b981",
                RecurrenceRule = "FREQ=MONTHLY;BYMONTHDAY=1",
                CreatedAt = now.AddDays(-40)
            });

        db.Reminders.AddRange(
            new Reminder
            {
                Title = "Take the bins out",
                Notes = "Collection is early tomorrow morning.",
                RemindAt = today.AddHours(21),
                CreatedAt = now
            },
            new Reminder
            {
                Title = "Weekly review starts in 30 minutes",
                RemindAt = NextWeekday(DayOfWeek.Sunday, today).AddHours(18.5),
                CreatedAt = now
            });

        // A little completion history so the streak widget has something to show.
        for (var i = 6; i >= 0; i--)
        {
            if (i is 4 or 2)
            {
                continue;
            }

            db.Completions.Add(new Completion
            {
                Title = "Gym session",
                Category = "Health",
                CompletedAt = i == 0 ? now.AddMinutes(-45) : today.AddDays(-i).AddHours(18)
            });
        }

        await db.SaveChangesAsync();
    }

    private static DateTime NextWeekday(DayOfWeek target, DateTime from)
    {
        var days = ((int)target - (int)from.DayOfWeek + 7) % 7;
        return from.Date.AddDays(days);
    }
}
