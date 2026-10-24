import { useEffect, useState } from 'react'
import {
  Bell,
  CalendarDays,
  CheckCheck,
  Flame,
  LayoutDashboard,
  ListTodo,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Overview } from '@/views/Overview'
import { RemindersView } from '@/views/RemindersView'
import { ScheduleView } from '@/views/ScheduleView'
import { StatsView } from '@/views/StatsView'
import { TodosView } from '@/views/TodosView'
import { useReminders, useStats } from '@/hooks/useLifeData'
import { useRealtime, type RealtimeStatus } from '@/hooks/useRealtime'
import { formatLongDate } from '@/lib/dates'

type ViewId = 'today' | 'schedule' | 'todos' | 'reminders' | 'stats'

interface NavItem {
  id: ViewId
  label: string
  icon: LucideIcon
  title: string
}

const NAV: NavItem[] = [
  { id: 'today', label: 'Today', icon: LayoutDashboard, title: 'Today' },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays, title: 'Schedule' },
  { id: 'todos', label: 'Tasks', icon: ListTodo, title: 'Tasks' },
  { id: 'reminders', label: 'Reminders', icon: Bell, title: 'Reminders' },
  { id: 'stats', label: 'Progress', icon: TrendingUp, title: 'Progress' },
]

function readHash(): ViewId {
  const hash = window.location.hash.replace('#', '')
  return (NAV.find((item) => item.id === hash)?.id ?? 'today') satisfies ViewId
}

export default function App() {
  const [view, setView] = useState<ViewId>(readHash)
  const realtimeStatus = useRealtime(true)
  const stats = useStats()
  const reminders = useReminders()

  useEffect(() => {
    window.location.hash = view
  }, [view])

  useEffect(() => {
    const onHashChange = () => setView(readHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const activeReminders = reminders.data?.length ?? 0

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar text-slate-300 md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-lg shadow-indigo-900/40">
            <CheckCheck className="size-4.5" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-[15px] font-semibold tracking-tight text-white">LifeTodo</p>
            <p className="text-[10px] tracking-wide text-slate-500 uppercase">Keep life together</p>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon className="size-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'reminders' && activeReminders > 0 && (
                  <span className="rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {activeReminders}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="m-3 rounded-xl bg-white/5 p-3.5">
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-amber-400" />
            <p className="text-xs font-medium text-white">
              {stats.data?.currentStreak ?? 0} day streak
            </p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {stats.data?.completedToday
              ? 'Today already counts. Nice.'
              : 'Complete one thing today to keep it alive.'}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
            <span
              className={cn(
                'size-1.5 rounded-full',
                realtimeStatus === 'connected'
                  ? 'bg-emerald-400'
                  : realtimeStatus === 'connecting'
                    ? 'bg-amber-400'
                    : 'bg-rose-400',
              )}
            />
            {realtimeStatus === 'connected' ? 'Live sync on' : `Live sync ${realtimeStatus}`}
          </div>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
            <div className="flex items-center gap-2 md:hidden">
              <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                <CheckCheck className="size-4" strokeWidth={2.5} />
              </span>
              <span className="text-sm font-semibold">LifeTodo</span>
            </div>

            <div className="hidden md:block">
              <h2 className="text-sm font-semibold">{NAV.find((item) => item.id === view)?.title}</h2>
              <p className="text-xs text-muted-foreground">{formatLongDate(new Date())}</p>
            </div>

            <div className="flex items-center gap-2">
              <StatusPill status={realtimeStatus} />
              <button
                type="button"
                onClick={() => setView('reminders')}
                className="relative flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Open reminders"
              >
                <Bell className="size-4" />
                {activeReminders > 0 && (
                  <span className="absolute top-1 right-1 size-1.5 rounded-full bg-rose-500" />
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-10">
          {view === 'today' && (
            <Overview
              onOpenReminders={() => setView('reminders')}
              onOpenTasks={() => setView('todos')}
            />
          )}
          {view === 'schedule' && <ScheduleView />}
          {view === 'todos' && <TodosView />}
          {view === 'reminders' && <RemindersView realtimeStatus={realtimeStatus} />}
          {view === 'stats' && <StatsView />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-card/95 px-2 pt-1.5 pb-2 backdrop-blur md:hidden">
        {NAV.map((item) => {
          const active = view === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon className="size-5" />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function StatusPill({ status }: { status: RealtimeStatus }) {
  const label =
    status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'
  return (
    <span
      title={status === 'connected' ? 'Real-time reminders connected' : `SignalR ${status}`}
      className={cn(
        'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex',
        status === 'connected'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : status === 'connecting'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-rose-200 bg-rose-50 text-rose-700',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          status === 'connected'
            ? 'bg-emerald-500'
            : status === 'connecting'
              ? 'bg-amber-500'
              : 'bg-rose-500',
        )}
      />
      {label}
    </span>
  )
}
