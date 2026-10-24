namespace LifeTodo.Db.Models;

public enum Priority
{
    Low = 0,
    Normal = 1,
    High = 2
}

public class TodoItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Category { get; set; } = "Personal";
    public Priority Priority { get; set; } = Priority.Normal;

    /// <summary>Local wall-clock due date. Null means "someday / no due date".</summary>
    public DateTime? DueDate { get; set; }

    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }

    /// <summary>RFC 5545 RRULE body, e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR. DueDate acts as DTSTART.</summary>
    public string? RecurrenceRule { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public List<Completion> Completions { get; set; } = [];
}
