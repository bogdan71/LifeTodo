import { useState } from 'react'

import type { Priority, Todo, TodoInput } from '@/lib/api'
import { combineDateTime, dateInputValue, timeInputValue, toLocalIso } from '@/lib/dates'
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
import { useTodoMutations } from '@/hooks/useLifeData'

const inputClass =
  'h-9 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none'

interface TodoFormProps {
  todo?: Todo | null
  defaultDate?: Date
  onDone: () => void
}

function TodoForm({ todo, defaultDate, onDone }: TodoFormProps) {
  const { create, update } = useTodoMutations()
  const initialDue = todo ? (todo.dueDate ? new Date(todo.dueDate) : null) : (defaultDate ?? null)

  const [title, setTitle] = useState(todo?.title ?? '')
  const [notes, setNotes] = useState(todo?.notes ?? '')
  const [category, setCategory] = useState(todo?.category ?? 'Personal')
  const [priority, setPriority] = useState<Priority>(todo?.priority ?? 'Normal')
  const [dueDate, setDueDate] = useState(initialDue ? dateInputValue(initialDue) : '')
  const [dueTime, setDueTime] = useState(initialDue ? timeInputValue(initialDue) : '09:00')
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(todo?.recurrenceRule ?? null)

  const recurrenceAnchor = dueDate
    ? combineDateTime(dueDate, dueTime || '09:00')
    : (defaultDate ?? new Date())

  const pending = create.isPending || update.isPending

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return

    // Recurring tasks need an anchor date; fall back to today at 09:00.
    const effectiveDate = dueDate || (recurrenceRule ? dateInputValue(new Date()) : '')
    const effectiveTime = dueTime || '09:00'
    const due = effectiveDate ? toLocalIso(combineDateTime(effectiveDate, effectiveTime)) : null

    const input: TodoInput = {
      title: title.trim(),
      notes: notes.trim() || null,
      category: category.trim() || 'Personal',
      priority,
      dueDate: due,
      recurrenceRule,
    }

    try {
      if (todo) {
        await update.mutateAsync({ id: todo.id, input })
      } else {
        await create.mutateAsync(input)
      }
      onDone()
    } catch {
      // the mutation hook surfaces the error toast
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="todo-title">What needs doing?</Label>
        <Input
          id="todo-title"
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Book the dentist appointment"
          maxLength={300}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="todo-notes">Notes</Label>
        <Textarea
          id="todo-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional details, links, context…"
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="todo-category">Category</Label>
          <Input
            id="todo-category"
            list="todo-categories"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Personal"
          />
          <datalist id="todo-categories">
            {['Personal', 'Health', 'Home', 'Work', 'Admin', 'Planning', 'People'].map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="todo-priority">Priority</Label>
          <select
            id="todo-priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
            className={inputClass}
          >
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="todo-due-date">Due date</Label>
          <Input
            id="todo-due-date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="todo-due-time">Time</Label>
          <Input
            id="todo-due-time"
            type="time"
            value={dueTime}
            onChange={(event) => setDueTime(event.target.value)}
            disabled={!dueDate}
          />
        </div>
      </div>

      <RecurrenceField
        value={recurrenceRule}
        start={recurrenceAnchor}
        onChange={setRecurrenceRule}
      />

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title.trim() || pending}>
          {todo ? 'Save changes' : 'Add task'}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface TodoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  todo?: Todo | null
  defaultDate?: Date
}

export function TodoDialog({ open, onOpenChange, todo, defaultDate }: TodoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{todo ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>
            {todo
              ? 'Change the details, the schedule, or the repeat rule.'
              : 'Keep it small enough to actually finish.'}
          </DialogDescription>
        </DialogHeader>
        <TodoForm
          key={todo?.id ?? 'new'}
          todo={todo}
          defaultDate={defaultDate}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
