import { useMemo, useState } from 'react'
import { CalendarDays, Info, Move, Plus, Repeat2 } from 'lucide-react'
import { toast } from 'sonner'

import type { EventOccurrence, ScheduleEvent } from '@/lib/api'
import type { TimeSpan } from '@/lib/dates'
import { CalendarView } from '@/components/CalendarView'
import { EventDialog } from '@/components/EventDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEventMutations, useEvents, useOccurrences } from '@/hooks/useLifeData'

export function ScheduleView() {
  const occurrences = useOccurrences()
  const events = useEvents()
  const { update } = useEventMutations()
  const [dialog, setDialog] = useState<{ open: boolean; event: ScheduleEvent | null; date?: Date }>({
    open: false,
    event: null,
  })

  const byId = useMemo(() => {
    const map = new Map<number, ScheduleEvent>()
    for (const item of events.data ?? []) {
      map.set(item.id, item)
    }
    return map
  }, [events.data])

  const handleOccurrenceClick = (occurrenceId: string) => {
    const occurrence = (occurrences.data ?? []).find((item) => item.id === occurrenceId)
    if (!occurrence) return
    const event = byId.get(occurrence.eventId)
    if (event) {
      setDialog({ open: true, event })
    }
  }

  const handleEventMove = async (occurrence: EventOccurrence, next: TimeSpan) => {
    const event = byId.get(occurrence.eventId)
    if (!event) {
      throw new Error('That event is no longer in your schedule.')
    }

    // PUT replaces the whole record, so carry the untouched fields along.
    await update.mutateAsync({
      id: event.id,
      input: {
        title: event.title,
        notes: event.notes,
        location: event.location,
        start: next.start,
        end: next.end,
        allDay: next.allDay,
        color: event.color,
        recurrenceRule: event.recurrenceRule,
      },
      message: `Moved “${event.title}”`,
    })
  }

  const handleRecurringDrag = (occurrence: EventOccurrence) => {
    toast.info(`“${occurrence.title}” repeats — open it to change the whole series.`, {
      description: 'Individual occurrences of a repeating event stay on their schedule.',
    })
  }

  const recurringCount = (events.data ?? []).filter((event) => event.recurrenceRule).length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            {occurrences.data?.length ?? 0} occurrences · {recurringCount} recurring series
          </p>
        </div>
        <Button onClick={() => setDialog({ open: true, event: null, date: new Date() })}>
          <Plus className="size-4" />
          New event
        </Button>
      </div>

      <Card className="overflow-hidden p-3 sm:p-4">
        {occurrences.isLoading ? (
          <div className="flex h-[520px] items-center justify-center text-sm text-muted-foreground">
            Loading your calendar…
          </div>
        ) : occurrences.isError ? (
          <div className="flex h-[520px] flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
            <CalendarDays className="size-5" />
            Could not load the calendar. Is the API running?
          </div>
        ) : (
          <CalendarView
            occurrences={occurrences.data ?? []}
            onDateClick={(date) => setDialog({ open: true, event: null, date })}
            onEventClick={handleOccurrenceClick}
            onEventMove={handleEventMove}
            onRecurringDrag={handleRecurringDrag}
          />
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#6366f1]" /> Focus / work
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#0ea5e9]" /> Meetings
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#f59e0b]" /> Personal
        </span>
        <span className="flex items-center gap-1.5">
          <Repeat2 className="size-3" /> Recurring (expanded server-side from RRULE)
        </span>
        <span className="flex items-center gap-1.5">
          <Move className="size-3" /> Drag an event to reschedule it
        </span>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="size-4 text-indigo-600" />
            Your repeating things, in plain English
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(events.data ?? []).filter((event) => event.recurrenceRule).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing repeats yet. Edit an event and pick a repeat rule.
            </p>
          ) : (
            <ul className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
              {(events.data ?? [])
                .filter((event) => event.recurrenceRule)
                .map((event) => (
                  <li key={event.id} className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium text-foreground">{event.title}</span>
                    <span className="shrink-0">{event.recurrenceLabel}</span>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <EventDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, event: open ? dialog.event : null, date: dialog.date })}
        event={dialog.event}
        defaultDate={dialog.date}
      />
    </div>
  )
}
