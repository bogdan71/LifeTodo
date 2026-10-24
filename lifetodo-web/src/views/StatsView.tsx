import { Bell, CheckCircle2, Flame, Sparkles, Target, TrendingUp } from 'lucide-react'

import { formatDay, formatTime, relativeDay } from '@/lib/dates'
import { ActivityChart } from '@/components/ActivityChart'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStats } from '@/hooks/useLifeData'

export function StatsView() {
  const stats = useStats()
  const s = stats.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground">
          Small things, repeated. This is the evidence.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current streak"
          value={`${s?.currentStreak ?? 0} days`}
          hint={`Best ever: ${s?.bestStreak ?? 0} days`}
          icon={Flame}
          tone="amber"
        />
        <StatCard
          label="Completion rate"
          value={`${s?.completionRate ?? 0}%`}
          hint="Completed vs open, 30 days"
          icon={Target}
          tone="indigo"
        />
        <StatCard
          label="This week"
          value={s?.completedThisWeek ?? 0}
          hint={`${s?.completedThisMonth ?? 0} this month`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="All-time completions"
          value={s?.totalCompletions ?? 0}
          hint={`${s?.openTodos ?? 0} still open`}
          icon={Sparkles}
          tone="rose"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Completions over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={s?.activity ?? []} height={160} />
            <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
              <span>{s?.activity?.[0] ? formatDay(s.activity[0].date) : ''}</span>
              <span>Today</span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 border-t pt-4 text-center">
              <div>
                <p className="text-lg font-semibold">{s?.completedToday ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Today</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{s?.completedThisWeek ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">This week</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{s?.completedThisMonth ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
            <CardDescription>Where your attention goes</CardDescription>
          </CardHeader>
          <CardContent>
            {(s?.byCategory ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Add a few tasks to see the split.</p>
            ) : (
              <ul className="space-y-3">
                {(s?.byCategory ?? []).map((category) => {
                  const total = category.open + category.completed
                  const percent = total === 0 ? 0 : Math.round((category.completed / total) * 100)
                  return (
                    <li key={category.category}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{category.category}</span>
                        <span className="text-muted-foreground">
                          {category.completed}/{total} done
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-indigo-600" />
            What's next
          </CardTitle>
          <CardDescription>Your nearest deadlines and nudges</CardDescription>
        </CardHeader>
        <CardContent>
          {(s?.upcoming ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing on the horizon. Suspiciously calm.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {(s?.upcoming ?? []).map((item) => (
                <li
                  key={`${item.kind}-${item.title}-${item.when}`}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {item.kind === 'Reminder' ? (
                      <Bell className="size-3.5" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {relativeDay(item.when)} · {formatTime(item.when)}
                    </p>
                  </div>
                  <Badge variant="outline">{item.kind}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
