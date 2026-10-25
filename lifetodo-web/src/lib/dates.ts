const pad = (value: number) => String(value).padStart(2, '0')

/** "2026-10-26T09:00:00" — no timezone, so the server and browser agree on wall-clock time. */
export function toLocalIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function parseLocal(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value
}

export function dateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function timeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function combineDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0)
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function startOfWeek(date: Date): Date {
  const day = startOfDay(date)
  const offset = (day.getDay() + 6) % 7
  return addDays(day, -offset)
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isToday(value?: string | Date | null): boolean {
  if (!value) return false
  return isSameDay(parseLocal(value), new Date())
}

export function isOverdue(value?: string | null): boolean {
  if (!value) return false
  const due = parseLocal(value)
  return due.getTime() < new Date().getTime() && !isToday(due)
}

export function formatTime(value?: string | Date | null): string {
  if (!value) return ''
  return parseLocal(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatDay(value?: string | Date | null): string {
  if (!value) return ''
  return parseLocal(value).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function relativeDay(value?: string | null): string {
  if (!value) return 'Someday'
  const date = parseLocal(value)
  const today = startOfDay(new Date())
  const target = startOfDay(date)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)

  if (diff < -1) return formatDay(date)
  if (diff === -1) return 'Yesterday'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return formatDay(date)
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function toCalendarDate(value: string): string {
  return value.slice(0, 19)
}

export interface TimeSpan {
  start: string
  end: string
  allDay: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Re-anchors a span onto the day and time it was dragged to, keeping its length.
 * Times are local wall-clock, so the drop target's date and time are used as-is.
 */
export function moveSpan(span: TimeSpan, target: { date: Date; allDay: boolean }): TimeSpan {
  const start = target.allDay
    ? startOfDay(target.date)
    : new Date(
        target.date.getFullYear(),
        target.date.getMonth(),
        target.date.getDate(),
        target.date.getHours(),
        target.date.getMinutes(),
        0,
        0,
      )

  const existing = Math.max(parseLocal(span.end).getTime() - parseLocal(span.start).getTime(), 0)
  const length = target.allDay
    ? DAY_MS - 60_000
    : span.allDay
      ? 60 * 60 * 1000
      : existing

  return {
    start: toLocalIso(start),
    end: toLocalIso(new Date(start.getTime() + length)),
    allDay: target.allDay,
  }
}
