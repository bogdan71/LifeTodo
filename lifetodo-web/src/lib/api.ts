export type Priority = 'Low' | 'Normal' | 'High'

export interface Todo {
  id: number
  title: string
  notes: string | null
  category: string
  priority: Priority
  dueDate: string | null
  isCompleted: boolean
  completedAt: string | null
  recurrenceRule: string | null
  recurrenceLabel: string
  createdAt: string
}

export interface TodoInput {
  title: string
  notes?: string | null
  category?: string
  priority?: Priority
  dueDate?: string | null
  recurrenceRule?: string | null
}

export interface ScheduleEvent {
  id: number
  title: string
  notes: string | null
  location: string | null
  start: string
  end: string
  allDay: boolean
  color: string
  recurrenceRule: string | null
  recurrenceLabel: string
  createdAt: string
}

export interface ScheduleEventInput {
  title: string
  notes?: string | null
  location?: string | null
  start: string
  end: string
  allDay?: boolean
  color?: string
  recurrenceRule?: string | null
}

export interface EventOccurrence {
  id: string
  eventId: number
  title: string
  notes: string | null
  location: string | null
  start: string
  end: string
  allDay: boolean
  color: string
  recurring: boolean
}

export interface Reminder {
  id: number
  title: string
  notes: string | null
  remindAt: string
  todoItemId: number | null
  isAcknowledged: boolean
  acknowledgedAt: string | null
  notifiedAt: string | null
  recurrenceRule: string | null
  createdAt: string
}

export interface ReminderInput {
  title: string
  notes?: string | null
  remindAt: string
  todoItemId?: number | null
  recurrenceRule?: string | null
}

export interface DayPoint {
  date: string
  label: string
  count: number
}

export interface CategoryPoint {
  category: string
  open: number
  completed: number
}

export interface UpcomingItem {
  title: string
  kind: string
  when: string
}

export interface Stats {
  openTodos: number
  completedToday: number
  completedThisWeek: number
  completedThisMonth: number
  dueToday: number
  overdue: number
  currentStreak: number
  bestStreak: number
  totalCompletions: number
  completionRate: number
  activity: DayPoint[]
  byCategory: CategoryPoint[]
  upcoming: UpcomingItem[]
}

export interface RecurrencePreview {
  label: string
  next: string[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const body = (await response.json()) as { message?: string; title?: string }
      message = body.message ?? body.title ?? message
    } catch {
      // keep the status text
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

const json = (body: unknown) => JSON.stringify(body)

export const api = {
  todos: () => request<Todo[]>('/api/todos'),
  createTodo: (input: TodoInput) =>
    request<Todo>('/api/todos', { method: 'POST', body: json(input) }),
  updateTodo: (id: number, input: TodoInput) =>
    request<Todo>(`/api/todos/${id}`, { method: 'PUT', body: json(input) }),
  toggleTodo: (id: number) => request<Todo>(`/api/todos/${id}/toggle`, { method: 'POST' }),
  deleteTodo: (id: number) => request<void>(`/api/todos/${id}`, { method: 'DELETE' }),

  events: () => request<ScheduleEvent[]>('/api/events'),
  occurrences: (from: string, to: string) =>
    request<EventOccurrence[]>(
      `/api/events/occurrences?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),
  createEvent: (input: ScheduleEventInput) =>
    request<ScheduleEvent>('/api/events', { method: 'POST', body: json(input) }),
  updateEvent: (id: number, input: ScheduleEventInput) =>
    request<ScheduleEvent>(`/api/events/${id}`, { method: 'PUT', body: json(input) }),
  deleteEvent: (id: number) => request<void>(`/api/events/${id}`, { method: 'DELETE' }),

  reminders: () => request<Reminder[]>('/api/reminders'),
  createReminder: (input: ReminderInput) =>
    request<Reminder>('/api/reminders', { method: 'POST', body: json(input) }),
  updateReminder: (id: number, input: ReminderInput) =>
    request<Reminder>(`/api/reminders/${id}`, { method: 'PUT', body: json(input) }),
  acknowledgeReminder: (id: number) =>
    request<Reminder>(`/api/reminders/${id}/ack`, { method: 'POST' }),
  deleteReminder: (id: number) => request<void>(`/api/reminders/${id}`, { method: 'DELETE' }),

  stats: () => request<Stats>('/api/stats'),

  recurrencePreview: (start: string, rule: string) =>
    request<RecurrencePreview>(
      `/api/recurrence/preview?start=${encodeURIComponent(start)}&rule=${encodeURIComponent(rule)}`,
    ),
}
