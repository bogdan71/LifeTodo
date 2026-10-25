namespace LifeTodo.Db.Models;

/// <summary>
/// One occurrence of a recurring event that was moved on its own. The series keeps
/// generating its original slot; this record replaces that slot with a new time.
/// </summary>
public class EventOverride
{
    public int Id { get; set; }

    public int ScheduleEventId { get; set; }
    public ScheduleEvent? Event { get; set; }

    /// <summary>The start the series would have produced for this occurrence.</summary>
    public DateTime OriginalStart { get; set; }

    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public bool AllDay { get; set; }
}
