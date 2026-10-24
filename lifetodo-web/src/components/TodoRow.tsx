import { startTransition, useOptimistic } from 'react'
import { Check, Pencil, Repeat2, Trash2 } from 'lucide-react'

import type { Todo } from '@/lib/api'
import { formatTime, isOverdue, isToday, relativeDay } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTodoMutations } from '@/hooks/useLifeData'

const priorityStyles: Record<Todo['priority'], string> = {
  High: 'bg-rose-500',
  Normal: 'bg-amber-400',
  Low: 'bg-slate-300',
}

interface TodoRowProps {
  todo: Todo
  onEdit?: (todo: Todo) => void
  onDelete?: (todo: Todo) => void
  showActions?: boolean
}

export function TodoRow({ todo, onEdit, onDelete, showActions = true }: TodoRowProps) {
  const { toggle } = useTodoMutations()
  const [done, setDone] = useOptimistic(todo.isCompleted, (_current, next: boolean) => next)

  const handleToggle = () => {
    startTransition(async () => {
      setDone(!todo.isCompleted)
      try {
        await toggle.mutateAsync(todo.id)
      } catch {
        // the hook already reported the error; React reverts the optimistic value
      }
    })
  }

  const overdue = !done && isOverdue(todo.dueDate)

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-border hover:bg-muted/50',
        done && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label={done ? `Reopen ${todo.title}` : `Complete ${todo.title}`}
        aria-pressed={done}
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
          done
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 bg-card hover:border-primary hover:bg-accent',
        )}
      >
        {done && <Check className="size-3" strokeWidth={3.5} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn('text-sm leading-5 font-medium', done && 'text-muted-foreground line-through')}
          >
            {todo.title}
          </span>
          <span className={cn('size-1.5 rounded-full', priorityStyles[todo.priority])} title={`${todo.priority} priority`} />
        </div>

        {todo.notes && !done && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{todo.notes}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {todo.dueDate && (
            <Badge variant={overdue ? 'danger' : isToday(todo.dueDate) ? 'default' : 'outline'}>
              {relativeDay(todo.dueDate)} · {formatTime(todo.dueDate)}
            </Badge>
          )}
          <Badge variant="secondary">{todo.category}</Badge>
          {todo.recurrenceRule && (
            <Badge variant="success">
              <Repeat2 className="size-3" />
              {todo.recurrenceLabel}
            </Badge>
          )}
        </div>
      </div>

      {showActions && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {onEdit && (
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(todo)} aria-label="Edit task">
              <Pencil className="size-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(todo)}
              aria-label="Delete task"
              className="hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
