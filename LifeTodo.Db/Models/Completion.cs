namespace LifeTodo.Db.Models;

/// <summary>
/// Immutable record of one completion. Kept even when the todo is deleted so
/// streaks and statistics survive cleanup.
/// </summary>
public class Completion
{
    public int Id { get; set; }
    public int? TodoItemId { get; set; }
    public TodoItem? TodoItem { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "Personal";
    public DateTime CompletedAt { get; set; } = DateTime.Now;
}
