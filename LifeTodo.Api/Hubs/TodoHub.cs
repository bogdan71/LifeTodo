using Microsoft.AspNetCore.SignalR;

namespace LifeTodo.Api.Hubs;

/// <summary>
/// Server-to-client push channel. Clients listen for:
///   reminderDue, remindersChanged, todosChanged, eventsChanged
/// </summary>
public sealed class TodoHub : Hub
{
}
