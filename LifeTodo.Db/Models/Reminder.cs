namespace LifeTodo.Db.Models;

public class Reminder
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Notes { get; set; }

    /// <summary>Local wall-clock time the reminder should fire.</summary>
    public DateTime RemindAt { get; set; }

    public int? TodoItemId { get; set; }
    public TodoItem? TodoItem { get; set; }

    public bool IsAcknowledged { get; set; }
    public DateTime? AcknowledgedAt { get; set; }

    /// <summary>Set by the background checker when the push was delivered.</summary>
    public DateTime? NotifiedAt { get; set; }

    /// <summary>Optional RRULE, for repeating nudges (daily stand-up, weekly review...).</summary>
    public string? RecurrenceRule { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
