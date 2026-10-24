import { useState } from 'react'
import { Bell, BellRing, Check, Plus, Repeat2, Trash2 } from 'lucide-react'

import { formatTime, relativeDay } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { ReminderDialog } from '@/components/ReminderDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useReminderMutations, useReminders } from '@/hooks/useLifeData'
import { useNotifications, type RealtimeStatus } from '@/hooks/useRealtime'

interface RemindersViewProps {
  realtimeStatus: RealtimeStatus
}

export function RemindersView({ realtimeStatus }: RemindersViewProps) {
  const reminders = useReminders()
  const { acknowledge, remove } = useReminderMutations()
  const { permission, requestPermission } = useNotifications()
  const [open, setOpen] = useState(false)

  const sorted = [...(reminders.data ?? [])].sort((a, b) => a.remindAt.localeCompare(b.remindAt))

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reminders</h1>
          <p className="text-sm text-muted-foreground">
            Pushed live while the app is open
            <span
              className={cn(
                'ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]',
                realtimeStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-700'
                  : realtimeStatus === 'connecting'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-700',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  realtimeStatus === 'connected'
                    ? 'bg-emerald-500'
                    : realtimeStatus === 'connecting'
                      ? 'bg-amber-500'
                      : 'bg-rose-500',
                )}
              />
              {realtimeStatus}
            </span>
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          New reminder
        </Button>
      </div>

      {permission !== 'granted' && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <BellRing className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-amber-950">Turn on browser notifications</p>
                <p className="text-xs text-amber-900/70">
                  {permission === 'unsupported'
                    ? 'This browser does not support desktop notifications — in-app toasts still work.'
                    : permission === 'denied'
                      ? 'Notifications are blocked in your browser settings. In-app toasts still work.'
                      : 'Get a desktop notification even when this tab is in the background.'}
                </p>
              </div>
            </div>
            {permission === 'default' && (
              <Button variant="outline" size="sm" onClick={requestPermission}>
                Enable
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upcoming nudges</CardTitle>
          <CardDescription>
            The background service checks every 15 seconds and pushes what's due.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reminders.isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          )}

          {!reminders.isLoading && sorted.length === 0 && (
            <EmptyState
              icon={Bell}
              title="No reminders yet"
              description="Set one for the thing you keep meaning to do."
              action={
                <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                  <Plus className="size-3.5" />
                  Add a reminder
                </Button>
              }
            />
          )}

          <ul className="divide-y divide-border/70">
            {sorted.map((reminder) => {
              const due = new Date(reminder.remindAt) <= new Date()
              return (
                <li key={reminder.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={cn(
                      'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
                      due ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600',
                    )}
                  >
                    <Bell className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{reminder.title}</p>
                      {due && <Badge variant="danger">Due now</Badge>}
                      {reminder.recurrenceRule && (
                        <Badge variant="success">
                          <Repeat2 className="size-3" />
                          Repeats
                        </Badge>
                      )}
                    </div>
                    {reminder.notes && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{reminder.notes}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {relativeDay(reminder.remindAt)} · {formatTime(reminder.remindAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Mark reminder done"
                      onClick={() => acknowledge.mutate(reminder.id)}
                    >
                      <Check className="size-4 text-emerald-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete reminder"
                      className="hover:text-destructive"
                      onClick={() => remove.mutate(reminder.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <ReminderDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
