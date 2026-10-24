import { useState } from 'react'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Flame,
  ListTodo,
  Plus,
  Repeat2,
  Sparkles,
} from 'lucide-react'

import type { ScheduleEvent, Todo } from '@/lib/api'
import {
  formatLongDate,
  formatTime,
  greeting,
  isOverdue,
  isToday,
  pluralize,
  relativeDay,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { ActivityChart } from '@/components/ActivityChart'
import { EmptyState } from '@/components/EmptyState'
import { EventDialog } from '@/components/EventDialog'
import { StatCard } from '@/components/StatCard'
import { TodoDialog } from '@/components/TodoDialog'
import { TodoRow } from '@/components/TodoRow'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useOccurrences,
  useReminderMutations,
  useReminders,
  useStats,
  useTodos,
} from '@/hooks/useLifeData'

interface OverviewProps {
  onOpenReminders: () => void
  onOpenTasks: () => void
}

export function Overview({ onOpenReminders, onOpenTasks }: OverviewProps) {
  const todos = useTodos()
  const occurrences = useOccurrences()
  const reminders = useReminders()
  const stats = useStats()
  const { acknowledge } = useReminderMutations()

  const [todoDialog, setTodoDialog] = useState<{ open: boolean; todo: Todo | null }>({
    open: false,
    todo: null,
  })
  const [eventDialog, setEventDialog] = useState<{ open: boolean; event: ScheduleEvent | null }>({
    open: false,
    event: null,
  })

  const openTodos = (todos.data ?? []).filter((todo) => !todo.isCompleted)
  const dueNow = openTodos
    .filter((todo) => todo.dueDate && (isToday(todo.dueDate) || isOverdue(todo.dueDate)))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))

  const todayEvents = (occurrences.data ?? [])
    .filter((occurrence) => isToday(occurrence.start))
    .sort((a, b) => a.start.localeCompare(b.start))

  const activeReminders = reminders.data ?? []
  const s = stats.data

  const summary = [
    dueNow.length > 0 ? `${pluralize(dueNow.length, 'task')} need you today` : 'No tasks are due today',
    todayEvents.length > 0 ? pluralize(todayEvents.length, 'event') : 'a clear calendar',
  ].join(' · ')

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white shadow-xl shadow-indigo-600/20">
        <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 size-56 rounded-full bg-fuchsia-400/20 blur-3xl" />

        <p className="text-[11px] font-medium tracking-[0.2em] text-indigo-100/80 uppercase">
          {formatLongDate(new Date())}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[26px]">
          {greeting()} — here's your day.
        </h1>
        <p className="mt-1 text-sm text-indigo-100">{summary}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => setTodoDialog({ open: true, todo: null })}
            className="shadow-sm"
          >
            <Plus className="size-4" />
            New task
          </Button>
          <Button
            variant="ghost"
            className="bg-white/10 text-white hover:bg-white/20"
            onClick={() => setEventDialog({ open: true, event: null })}
          >
            <CalendarPlus className="size-4" />
            New event
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Due today', value: s?.dueToday ?? dueNow.length },
            { label: 'Events today', value: todayEvents.length },
            { label: 'Day streak', value: s?.currentStreak ?? 0 },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
              <p className="text-xl font-semibold">{item.value}</p>
              <p className="text-[11px] text-indigo-100/80">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open tasks"
          value={s?.openTodos ?? openTodos.length}
          hint={`${s?.overdue ?? 0} overdue`}
          icon={ListTodo}
          tone="indigo"
        />
        <StatCard
          label="Done this week"
          value={s?.completedThisWeek ?? 0}
          hint={`${s?.completedToday ?? 0} today`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Current streak"
          value={`${s?.currentStreak ?? 0} days`}
          hint={`Best: ${s?.bestStreak ?? 0} days`}
          icon={Flame}
          tone="amber"
        />
        <StatCard
          label="Completion rate"
          value={`${s?.completionRate ?? 0}%`}
          hint="Last 30 days"
          icon={Sparkles}
          tone="rose"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Today's plan</CardTitle>
              <CardDescription>
                {todayEvents.length > 0
                  ? `${pluralize(todayEvents.length, 'event')} on the calendar`
                  : 'Nothing scheduled today'}
              </CardDescription>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <CalendarDays className="size-4" />
            </span>
          </CardHeader>
          <CardContent>
            {todayEvents.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="A blank canvas"
                description="Block time for the things that matter — deep work, a walk, or a proper lunch."
                action={
                  <Button size="sm" variant="outline" onClick={() => setEventDialog({ open: true, event: null })}>
                    <Plus className="size-3.5" />
                    Plan something
                  </Button>
                }
              />
            ) : (
              <div className="space-y-0">
                {todayEvents.map((occurrence) => (
                  <div key={occurrence.id} className="flex gap-3">
                    <div className="w-14 shrink-0 pt-0.5 text-[11px] font-medium text-muted-foreground">
                      {occurrence.allDay ? 'All day' : formatTime(occurrence.start)}
                    </div>
                    <div
                      className="mb-3 flex-1 border-l-2 pl-3"
                      style={{ borderColor: occurrence.color }}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{occurrence.title}</p>
                        {occurrence.recurring && (
                          <Repeat2 className="size-3 text-emerald-600" aria-label="Recurring" />
                        )}
                      </div>
                      {occurrence.location && (
                        <p className="text-xs text-muted-foreground">{occurrence.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Due now</CardTitle>
              <CardDescription>Overdue and everything due today</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onOpenTasks}>
              All tasks
              <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {dueNow.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All clear for today"
                description="Nothing overdue. Enjoy the breathing room — or get ahead on tomorrow."
              />
            ) : (
              <div className="-mx-2">
                {dueNow.slice(0, 6).map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    onEdit={(item) => setTodoDialog({ open: true, todo: item })}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Momentum</CardTitle>
              <CardDescription>The last 14 days of finished things</CardDescription>
            </div>
            <Badge variant="warning">
              <Flame className="size-3" />
              {s?.currentStreak ?? 0} day streak
            </Badge>
          </CardHeader>
          <CardContent>
            <ActivityChart data={s?.activity ?? []} height={110} />
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{s?.activity?.[0]?.label ?? ''}</span>
              <span>{s?.totalCompletions ?? 0} completions all time</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Reminders</CardTitle>
              <CardDescription>Nudges that arrive on time</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onOpenReminders}>
              Manage
              <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {activeReminders.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No reminders set"
                description="Add one so future-you doesn't have to remember."
              />
            ) : (
              <ul className="space-y-1">
                {activeReminders.slice(0, 4).map((reminder) => {
                  const dueNowReminder = new Date(reminder.remindAt) <= new Date()
                  return (
                    <li
                      key={reminder.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
                    >
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full',
                          dueNowReminder
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-amber-50 text-amber-600',
                        )}
                      >
                        <Bell className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{reminder.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {relativeDay(reminder.remindAt)} · {formatTime(reminder.remindAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Dismiss reminder"
                        onClick={() => acknowledge.mutate(reminder.id)}
                      >
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <TodoDialog
        open={todoDialog.open}
        onOpenChange={(open) => setTodoDialog({ open, todo: open ? todoDialog.todo : null })}
        todo={todoDialog.todo}
      />
      <EventDialog
        open={eventDialog.open}
        onOpenChange={(open) => setEventDialog({ open, event: open ? eventDialog.event : null })}
        event={eventDialog.event}
      />
    </div>
  )
}
