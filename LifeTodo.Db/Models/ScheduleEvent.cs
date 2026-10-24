namespace LifeTodo.Db.Models;

public class ScheduleEvent
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? Location { get; set; }

    /// <summary>Local wall-clock start.</summary>
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public bool AllDay { get; set; }
    public string Color { get; set; } = "#6366f1";

    /// <summary>RFC 5545 RRULE body. Start acts as DTSTART.</summary>
    public string? RecurrenceRule { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
