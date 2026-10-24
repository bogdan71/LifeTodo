import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Repeat2 } from 'lucide-react'

import { api } from '@/lib/api'
import { formatDay, formatTime, toLocalIso } from '@/lib/dates'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const WEEKDAYS = [
  { code: 'MO', label: 'M' },
  { code: 'TU', label: 'T' },
  { code: 'WE', label: 'W' },
  { code: 'TH', label: 'T' },
  { code: 'FR', label: 'F' },
  { code: 'SA', label: 'S' },
  { code: 'SU', label: 'S' },
] as const

type Preset =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'yearly'
  | 'custom'

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Every weekday (Mon–Fri)' },
  { value: 'weekly', label: 'Every week on…' },
  { value: 'biweekly', label: 'Every 2 weeks on…' },
  { value: 'monthly', label: 'Every month on this day' },
  { value: 'yearly', label: 'Every year on this date' },
  { value: 'custom', label: 'Custom RRULE…' },
]

function detectPreset(rule?: string | null): Preset {
  if (!rule) return 'none'
  if (rule === 'FREQ=DAILY') return 'daily'
  if (rule === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR') return 'weekdays'
  if (rule.startsWith('FREQ=WEEKLY;INTERVAL=2;BYDAY=')) return 'biweekly'
  if (rule.startsWith('FREQ=WEEKLY;BYDAY=')) return 'weekly'
  if (rule.startsWith('FREQ=MONTHLY;BYMONTHDAY=')) return 'monthly'
  if (rule === 'FREQ=YEARLY') return 'yearly'
  return 'custom'
}

function extractDays(rule?: string | null): string[] {
  const match = rule?.match(/BYDAY=([A-Z,]+)/)
  return match ? match[1].split(',') : []
}

function dayCode(date: Date): string {
  return ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][date.getDay()]
}

function buildRule(preset: Preset, days: string[], custom: string, start: Date): string | null {
  switch (preset) {
    case 'none':
      return null
    case 'daily':
      return 'FREQ=DAILY'
    case 'weekdays':
      return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
    case 'weekly':
    case 'biweekly': {
      const selected = days.length > 0 ? days : [dayCode(start)]
      const prefix = preset === 'biweekly' ? 'FREQ=WEEKLY;INTERVAL=2' : 'FREQ=WEEKLY'
      return `${prefix};BYDAY=${selected.join(',')}`
    }
    case 'monthly':
      return `FREQ=MONTHLY;BYMONTHDAY=${start.getDate()}`
    case 'yearly':
      return 'FREQ=YEARLY'
    case 'custom':
      return custom.trim() || null
  }
}

interface RecurrenceFieldProps {
  value: string | null
  start: Date
  onChange: (rule: string | null) => void
}

export function RecurrenceField({ value, start, onChange }: RecurrenceFieldProps) {
  const [preset, setPreset] = useState<Preset>(() => detectPreset(value))
  const [days, setDays] = useState<string[]>(() => {
    const existing = extractDays(value)
    return existing.length > 0 ? existing : [dayCode(start)]
  })
  const [custom, setCustom] = useState(value ?? '')

  const deferredRule = useDeferredValue(value ?? '')
  const previewQuery = useQuery({
    queryKey: ['recurrence-preview', deferredRule, toLocalIso(start)],
    queryFn: () => api.recurrencePreview(toLocalIso(start), deferredRule),
    enabled: Boolean(deferredRule),
    retry: false,
    staleTime: 5 * 60_000,
  })

  const emit = (nextPreset: Preset, nextDays: string[], nextCustom: string) => {
    setPreset(nextPreset)
    setDays(nextDays)
    setCustom(nextCustom)
    onChange(buildRule(nextPreset, nextDays, nextCustom, start))
  }

  const toggleDay = (code: string) => {
    const next = days.includes(code) ? days.filter((d) => d !== code) : [...days, code]
    if (next.length === 0) return
    const sorted = WEEKDAYS.map((d) => d.code).filter((c) => next.includes(c))
    emit(preset, sorted, custom)
  }

  const showDays = preset === 'weekly' || preset === 'biweekly'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Repeat2 className="size-3.5 text-muted-foreground" />
        <Label htmlFor="recurrence-preset">Repeat</Label>
      </div>

      <select
        id="recurrence-preset"
        value={preset}
        onChange={(event) => emit(event.target.value as Preset, days, custom)}
        className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none"
      >
        {PRESETS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {showDays && (
        <div className="flex gap-1.5">
          {WEEKDAYS.map((day) => {
            const active = days.includes(day.code)
            return (
              <button
                key={day.code}
                type="button"
                onClick={() => toggleDay(day.code)}
                className={`size-8 rounded-full text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                aria-pressed={active}
                aria-label={day.code}
              >
                {day.label}
              </button>
            )
          })}
        </div>
      )}

      {preset === 'custom' && (
        <Input
          value={custom}
          onChange={(event) => emit(preset, days, event.target.value)}
          placeholder="FREQ=WEEKLY;INTERVAL=2;BYDAY=TU"
        />
      )}

      {deferredRule && previewQuery.data && (
        <p className="text-[11px] text-muted-foreground">
          {previewQuery.data.label}
          {previewQuery.data.next?.[0] && (
            <>
              {' '}· next {formatDay(previewQuery.data.next[0])} at{' '}
              {formatTime(previewQuery.data.next[0])}
            </>
          )}
        </p>
      )}
      {deferredRule && previewQuery.isError && (
        <p className="text-[11px] text-destructive">That RRULE looks invalid.</p>
      )}
    </div>
  )
}
