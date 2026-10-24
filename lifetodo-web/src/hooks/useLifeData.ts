import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  api,
  type ReminderInput,
  type ScheduleEventInput,
  type TodoInput,
} from '@/lib/api'
import { addDays, startOfWeek, toLocalIso } from '@/lib/dates'

export const queryKeys = {
  todos: ['todos'] as const,
  events: ['events'] as const,
  reminders: ['reminders'] as const,
  stats: ['stats'] as const,
  occurrences: (from: string, to: string) => ['occurrences', from, to] as const,
}

/** Calendar window: a bit of the past so "last week" still shows, plenty of future. */
export function calendarWindow(): { from: string; to: string } {
  const today = new Date()
  const from = addDays(startOfWeek(today), -84)
  const to = addDays(today, 240)
  return { from: toLocalIso(from), to: toLocalIso(to) }
}

export function useTodos() {
  return useQuery({ queryKey: queryKeys.todos, queryFn: api.todos })
}

export function useEvents() {
  return useQuery({ queryKey: queryKeys.events, queryFn: api.events })
}

export function useOccurrences() {
  const { from, to } = calendarWindow()
  return useQuery({
    queryKey: queryKeys.occurrences(from, to),
    queryFn: () => api.occurrences(from, to),
  })
}

export function useReminders() {
  return useQuery({ queryKey: queryKeys.reminders, queryFn: api.reminders })
}

export function useStats() {
  return useQuery({ queryKey: queryKeys.stats, queryFn: api.stats })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return (keys: (readonly string[] | string[])[]) => {
    for (const key of keys) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }
}

export function useTodoMutations() {
  const invalidate = useInvalidate()

  const refresh = () => invalidate([queryKeys.todos, queryKeys.stats])

  const create = useMutation({
    mutationFn: (input: TodoInput) => api.createTodo(input),
    onSuccess: () => {
      refresh()
      toast.success('Task added')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TodoInput }) => api.updateTodo(id, input),
    onSuccess: () => {
      refresh()
      toast.success('Task updated')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const toggle = useMutation({
    mutationFn: (id: number) => api.toggleTodo(id),
    onSuccess: () => refresh(),
    onError: (error: Error) => {
      toast.error(error.message)
      refresh()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteTodo(id),
    onSuccess: () => {
      refresh()
      toast.success('Task deleted')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return { create, update, toggle, remove }
}

export function useEventMutations() {
  const invalidate = useInvalidate()
  const refresh = () =>
    invalidate([queryKeys.events, ['occurrences'], queryKeys.stats])

  const create = useMutation({
    mutationFn: (input: ScheduleEventInput) => api.createEvent(input),
    onSuccess: () => {
      refresh()
      toast.success('Event added to your schedule')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: number; input: ScheduleEventInput }) =>
      api.updateEvent(id, input),
    onSuccess: () => {
      refresh()
      toast.success('Event updated')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteEvent(id),
    onSuccess: () => {
      refresh()
      toast.success('Event deleted')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return { create, update, remove }
}

export function useReminderMutations() {
  const invalidate = useInvalidate()
  const refresh = () => invalidate([queryKeys.reminders, queryKeys.stats])

  const create = useMutation({
    mutationFn: (input: ReminderInput) => api.createReminder(input),
    onSuccess: () => {
      refresh()
      toast.success('Reminder set')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const acknowledge = useMutation({
    mutationFn: (id: number) => api.acknowledgeReminder(id),
    onSuccess: () => refresh(),
    onError: (error: Error) => toast.error(error.message),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteReminder(id),
    onSuccess: () => {
      refresh()
      toast.success('Reminder removed')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return { create, acknowledge, remove }
}
