import { useState } from 'react'

import type { ReminderInput } from '@/lib/api'
import {
  addDays,
  combineDateTime,
  dateInputValue,
  startOfDay,
  timeInputValue,
  toLocalIso,
} from '@/lib/dates'
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
import { useReminderMutations } from '@/hooks/useLifeData'

interface ReminderFormProps {
  onDone: () => void
}

function ReminderForm({ onDone }: ReminderFormProps) {
  const { create } = useReminderMutations()
  const defaultTime = new Date(Date.now() + 60 * 60 * 1000)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(dateInputValue(defaultTime))
  const [time, setTime] = useState(timeInputValue(defaultTime))
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null)
  const [quick, setQuick] = useState<string | null>(null)

  const anchor = date ? combineDateTime(date, time) : new Date()

  const applyQuick = (minutes: number) => {
    const when = new Date(Date.now() + minutes * 60_000)
    setDate(dateInputValue(when))
    setTime(timeInputValue(when))
    setQuick(String(minutes))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return

    const input: ReminderInput = {
      title: title.trim(),
      notes: notes.trim() || null,
      remindAt: toLocalIso(combineDateTime(date, time || '09:00')),
      recurrenceRule,
    }

    try {
      await create.mutateAsync(input)
      onDone()
    } catch {
      // toast already shown
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reminder-title">Remind me to…</Label>
        <Input
          id="reminder-title"
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Take the bins out"
          maxLength={300}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reminder-notes">Notes</Label>
        <Textarea
          id="reminder-notes"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-2">
        <Label>Quick pick</Label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'In 15 min', minutes: 15 },
            { label: 'In 1 hour', minutes: 60 },
            { label: 'In 3 hours', minutes: 180 },
            { label: 'Tomorrow 9am', minutes: -1 },
          ].map((option) => (
            <Button
              key={option.label}
              type="button"
              variant={quick === String(option.minutes) ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (option.minutes === -1) {
                  const tomorrow = addDays(startOfDay(new Date()), 1)
                  tomorrow.setHours(9, 0, 0, 0)
                  setDate(dateInputValue(tomorrow))
                  setTime('09:00')
                  setQuick('-1')
                } else {
                  applyQuick(option.minutes)
                }
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reminder-date">Date</Label>
          <Input
            id="reminder-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reminder-time">Time</Label>
          <Input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </div>
      </div>

      <RecurrenceField value={recurrenceRule} start={anchor} onChange={setRecurrenceRule} />

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title.trim() || create.isPending}>
          Set reminder
        </Button>
      </DialogFooter>
    </form>
  )
}

interface ReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReminderDialog({ open, onOpenChange }: ReminderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New reminder</DialogTitle>
          <DialogDescription>
            Delivered live to this browser while the app is open, plus a desktop notification if you
            allow it.
          </DialogDescription>
        </DialogHeader>
        <ReminderForm key={open ? 'open' : 'closed'} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
