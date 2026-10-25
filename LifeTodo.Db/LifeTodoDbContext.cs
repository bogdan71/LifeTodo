using LifeTodo.Db.Models;
using Microsoft.EntityFrameworkCore;

namespace LifeTodo.Db;

public class LifeTodoDbContext(DbContextOptions<LifeTodoDbContext> options) : DbContext(options)
{
    public DbSet<TodoItem> Todos => Set<TodoItem>();
    public DbSet<ScheduleEvent> Events => Set<ScheduleEvent>();
    public DbSet<EventOverride> EventOverrides => Set<EventOverride>();
    public DbSet<Reminder> Reminders => Set<Reminder>();
    public DbSet<Completion> Completions => Set<Completion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TodoItem>(entity =>
        {
            entity.Property(t => t.Title).HasMaxLength(300).IsRequired();
            entity.Property(t => t.Category).HasMaxLength(80).IsRequired();
            entity.Property(t => t.Priority).HasConversion<string>().HasMaxLength(16);
            entity.HasIndex(t => t.IsCompleted);
            entity.HasIndex(t => t.DueDate);
        });

        modelBuilder.Entity<ScheduleEvent>(entity =>
        {
            entity.Property(e => e.Title).HasMaxLength(300).IsRequired();
            entity.HasIndex(e => e.Start);
        });

        modelBuilder.Entity<EventOverride>(entity =>
        {
            entity.HasIndex(o => new { o.ScheduleEventId, o.OriginalStart }).IsUnique();
            entity.HasOne(o => o.Event)
                .WithMany()
                .HasForeignKey(o => o.ScheduleEventId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Reminder>(entity =>
        {
            entity.Property(r => r.Title).HasMaxLength(300).IsRequired();
            entity.HasIndex(r => new { r.RemindAt, r.IsAcknowledged });
            entity.HasOne(r => r.TodoItem)
                .WithMany()
                .HasForeignKey(r => r.TodoItemId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Completion>(entity =>
        {
            entity.HasIndex(c => c.CompletedAt);
            entity.HasOne(c => c.TodoItem)
                .WithMany(t => t.Completions)
                .HasForeignKey(c => c.TodoItemId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
