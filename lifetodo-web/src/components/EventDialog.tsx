import { useState } from 'react'
import { Trash2 } from 'lucide-react'

import type { ScheduleEvent, ScheduleEventInput } from '@/lib/api'
import {
  addDays,
  combineDateTime,
  dateInputValue,
  timeInputValue,
  toLocalIso,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RecurrenceField } from '@/components/RecurrenceField'
import { useEventMutations } from '@/hooks/useLifeData'

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6']

interface EventFormProps {
  event?: ScheduleEvent | null
  defaultDate?: Date
  onDone: () => void
}

function EventForm({ event, defaultDate, onDone }: EventFormProps) {
  const { create, update, remove } = useEventMutations()
  const initialStart = event ? new Date(event.start) : (defaultDate ?? new Date())
  const initialEnd = event ? new Date(event.end) : new Date(initialStart.getTime() + 60 * 60 * 1000)

  const [title, setTitle] = useState(event?.title ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [date, setDate] = useState(dateInputValue(initialStart))
  const [startTime, setStartTime] = useState(timeInputValue(initialStart))
  const [endTime, setEndTime] = useState(timeInputValue(initialEnd))
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [color, setColor] = useState(event?.color ?? COLORS[0])
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(event?.recurrenceRule ?? null)

  const pending = create.isPending || update.isPending || remove.isPending
  const anchor = date ? combineDateTime(date, startTime || '09:00') : new Date()

  const handleSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault()
    if (!title.trim() || !date) return

    const day = date
    const start = toLocalIso(
      allDay ? combineDateTime(day, '00:00') : combineDateTime(day, startTime || '09:00'),
    )
    let endDate = day
    let end = allDay
      ? combineDateTime(day, '23:59')
      : combineDateTime(day, endTime || '10:00')

    if (!allDay && end <= combineDateTime(day, startTime || '09:00')) {
      endDate = dateInputValue(addDays(combineDateTime(day, '00:00'), 1))
      end = combineDateTime(endDate, endTime || '10:00')
    }

    const input: ScheduleEventInput = {
      title: title.trim(),
      notes: notes.trim() || null,
      location: location.trim() || null,
      start,
      end: toLocalIso(end),
      allDay,
      color,
      recurrenceRule,
    }

    try {
      if (event) {
        await update.mutateAsync({ id: event.id, input })
      } else {
        await create.mutateAsync(input)
      }
      onDone()
    } catch {
      // toast already shown
    }
  }

  const handleDelete = async () => {
    if (!event) return
    try {
      await remove.mutateAsync(event.id)
      onDone()
    } catch {
      // toast already shown
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="event-title">What's happening?</Label>
        <Input
          id="event-title"
          autoFocus
          value={title}
          onChange={(inputEvent) => setTitle(inputEvent.target.value)}
          placeholder="e.g. Deep work block"
          maxLength={300}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="event-date">Date</Label>
          <Input
            id="event-date"
            type="date"
            value={date}
            onChange={(inputEvent) => setDate(inputEvent.target.value)}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(inputEvent) => setAllDay(inputEvent.target.checked)}
              className="size-4 rounded border-input accent-indigo-600"
            />
            All day
          </label>
        </div>
      </div>

      {!allDay && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="event-start">Starts</Label>
            <Input
              id="event-start"
              type="time"
              value={startTime}
              onChange={(inputEvent) => setStartTime(inputEvent.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-end">Ends</Label>
            <Input
              id="event-end"
              type="time"
              value={endTime}
              onChange={(inputEvent) => setEndTime(inputEvent.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="event-location">Location</Label>
        <Input
          id="event-location"
          value={location}
          onChange={(inputEvent) => setLocation(inputEvent.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="event-notes">Notes</Label>
        <Textarea
          id="event-notes"
          rows={2}
          value={notes}
          onChange={(inputEvent) => setNotes(inputEvent.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Colour</Label>
        <div className="flex gap-2">
          {COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setColor(swatch)}
              aria-label={`Use colour ${swatch}`}
              aria-pressed={color === swatch}
              className={cn(
                'size-7 rounded-full ring-offset-2 transition-all',
                color === swatch ? 'ring-2 ring-slate-900' : 'hover:scale-110',
              )}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
      </div>

      <RecurrenceField value={recurrenceRule} start={anchor} onChange={setRecurrenceRule} />

      <DialogFooter className="sm:justify-between">
        {event ? (
          <Button type="button" variant="ghost" onClick={handleDelete} className="text-destructive">
            <Trash2 className="size-4" />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim() || !date || pending}>
            {event ? 'Save changes' : 'Add event'}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: ScheduleEvent | null
  defaultDate?: Date
}

export function EventDialog({ open, onOpenChange, event, defaultDate }: EventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit event' : 'New event'}</DialogTitle>
          <DialogDescription>
            One-off or recurring — the server expands recurrence for you.
          </DialogDescription>
        </DialogHeader>
        <EventForm
          key={event?.id ?? 'new'}
          event={event}
          defaultDate={defaultDate}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
