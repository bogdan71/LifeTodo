import { useMemo, useState } from 'react'
import { CheckCircle2, ListTodo, Plus, Search } from 'lucide-react'

import type { Todo } from '@/lib/api'
import { isOverdue, isToday, relativeDay, startOfDay, startOfWeek } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { TodoDialog } from '@/components/TodoDialog'
import { TodoRow } from '@/components/TodoRow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTodoMutations, useTodos } from '@/hooks/useLifeData'

type Filter = 'all' | 'today' | 'overdue' | 'done'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'done', label: 'Completed' },
]

function groupKey(todo: Todo): { key: string; label: string; order: number } {
  if (todo.isCompleted) {
    return { key: 'done', label: 'Completed', order: 90 }
  }
  if (!todo.dueDate) {
    return { key: 'someday', label: 'Someday', order: 80 }
  }

  const due = new Date(todo.dueDate)
  if (isOverdue(todo.dueDate)) return { key: 'overdue', label: 'Overdue', order: 0 }
  if (isToday(due)) return { key: 'today', label: 'Today', order: 1 }
  if (startOfDay(due).getTime() <= startOfDay(new Date(Date.now() + 86_400_000)).getTime()) {
    return { key: 'tomorrow', label: 'Tomorrow', order: 2 }
  }
  if (startOfDay(due).getTime() < startOfWeek(new Date()).getTime() + 7 * 86_400_000) {
    return { key: 'week', label: 'Later this week', order: 3 }
  }
  return { key: 'later', label: relativeDay(todo.dueDate), order: 5 }
}

export function TodosView() {
  const todos = useTodos()
  const { remove } = useTodoMutations()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<{ open: boolean; todo: Todo | null }>({
    open: false,
    todo: null,
  })

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase()
    const items = (todos.data ?? []).filter((todo) => {
      if (query) {
        const haystack = `${todo.title} ${todo.notes ?? ''} ${todo.category}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      if (filter === 'done') return todo.isCompleted
      if (filter === 'today') return !todo.isCompleted && todo.dueDate && isToday(todo.dueDate)
      if (filter === 'overdue') return !todo.isCompleted && isOverdue(todo.dueDate)
      return true
    })

    const map = new Map<string, { label: string; order: number; items: Todo[] }>()
    for (const todo of items) {
      const { key, label, order } = groupKey(todo)
      const bucket = map.get(key) ?? { label, order, items: [] }
      bucket.items.push(todo)
      map.set(key, bucket)
    }

    const byDue = (a: Todo, b: Todo) => {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      if (aDue !== bDue) return aDue - bDue
      const weight = { High: 0, Normal: 1, Low: 2 } as const
      return weight[a.priority] - weight[b.priority]
    }

    return [...map.entries()]
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key, value]) => ({
        key,
        label: value.label,
        items: value.items.sort(byDue),
      }))
  }, [todos.data, filter, search])

  const openCount = (todos.data ?? []).filter((todo) => !todo.isCompleted).length

  const handleDelete = (todo: Todo) => {
    if (window.confirm(`Delete “${todo.title}”? Completion history is kept.`)) {
      remove.mutate(todo.id)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {openCount} open · {todos.data?.length ?? 0} total
          </p>
        </div>
        <Button onClick={() => setDialog({ open: true, todo: null })}>
          <Plus className="size-4" />
          New task
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks…"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                filter === option.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {todos.isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {todos.isError && (
        <EmptyState
          icon={ListTodo}
          title="Could not load tasks"
          description="Check that the API is running, then refresh."
        />
      )}

      {!todos.isLoading && groups.length === 0 && (
        <EmptyState
          icon={filter === 'done' ? CheckCircle2 : ListTodo}
          title={filter === 'done' ? 'Nothing completed yet' : 'No tasks match'}
          description={
            filter === 'done'
              ? 'Your finished tasks will collect here.'
              : 'Try a different filter, or add something new.'
          }
          action={
            <Button size="sm" variant="outline" onClick={() => setDialog({ open: true, todo: null })}>
              <Plus className="size-3.5" />
              Add a task
            </Button>
          }
        />
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key}>
            <div className="mb-1.5 flex items-center gap-2 px-3">
              <h2
                className={cn(
                  'text-xs font-semibold tracking-wider uppercase',
                  group.key === 'overdue' ? 'text-rose-600' : 'text-muted-foreground',
                )}
              >
                {group.label}
              </h2>
              <span className="text-[11px] text-muted-foreground">{group.items.length}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div>
              {group.items.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  onEdit={(item) => setDialog({ open: true, todo: item })}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <TodoDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, todo: open ? dialog.todo : null })}
        todo={dialog.todo}
      />
    </div>
  )
}
