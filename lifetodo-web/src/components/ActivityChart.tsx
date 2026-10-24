import type { DayPoint } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ActivityChartProps {
  data: DayPoint[]
  className?: string
  height?: number
}

export function ActivityChart({ data, className, height = 96 }: ActivityChartProps) {
  const max = Math.max(1, ...data.map((day) => day.count))
  const todayKey = new Date().toISOString().slice(0, 10)

  return (
    <div className={cn('flex items-end gap-1.5', className)} style={{ height }}>
      {data.map((day) => {
        const heightPercent = day.count === 0 ? 4 : Math.max(12, (day.count / max) * 100)
        return (
          <div key={day.date} className="group flex h-full flex-1 flex-col justify-end">
            <div
              title={`${day.label}: ${day.count} completed`}
              className={cn(
                'w-full rounded-t-[4px] transition-colors',
                day.count === 0
                  ? 'bg-slate-100'
                  : day.date === todayKey
                    ? 'bg-indigo-600 group-hover:bg-indigo-500'
                    : 'bg-indigo-200 group-hover:bg-indigo-300',
              )}
              style={{ height: `${heightPercent}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}
