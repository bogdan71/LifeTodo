# LifeTodo

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![.NET Aspire](https://img.shields.io/badge/.NET%20Aspire-13.6-512BD4)](https://aspire.dev)

A local-first life tracker: tasks, a schedule, and reminders in one place. No accounts, no cloud —
everything lives in a single SQLite file on your machine.

- **Backend:** ASP.NET Core 10 Minimal API, EF Core 10, SQLite, SignalR
- **Frontend:** React 19.3 + TypeScript + Vite 8, TanStack Query, FullCalendar 7, Tailwind CSS 4,
  shadcn/ui-style components on Radix primitives
- **Orchestration:** .NET Aspire 13.6 (AppHost + ServiceDefaults + dashboard on
  <http://localhost:18888>)

## Run it

Prerequisites: .NET 10 SDK and Node.js 20+.

```bash
# from LifeTodos2/
dotnet run --project LifeTodo.AppHost
```

One command starts the API, the Vite dev server, and the Aspire dashboard. Open
<http://localhost:18888>, log in with the URL printed in the console, and click the **web** resource
to open the app. The API's OpenTelemetry traces, logs and metrics show up in the dashboard.

### Without Aspire

```bash
# terminal 1 — API on http://localhost:5080
dotnet run --project LifeTodo.Api

# terminal 2 — UI on http://localhost:5173 (proxies /api and /hubs to the API)
cd lifetodo-web
npm install
npm run dev
```

The database is created and seeded on first start at `data/lifetodo.db`. Delete that folder to reset
the app.

## What it does

- **Tasks** — due dates, priority, categories, notes. Completed work is archived in a separate
  `Completions` table so statistics and streaks survive deleting a task.
- **Recurring tasks** — a standard iCalendar RRULE is expanded by the server. Completing a recurring
  task logs the completion and rolls the due date to the next occurrence instead of closing it.
- **Schedule** — FullCalendar month / week / list views. Click a day to add an event, click an event
  to edit it, drag one to another day or time to reschedule it, or pull an event's trailing edge to
  change how long it lasts (an all-day chip stretched across days spans that many days). Recurring
  events are expanded for the visible window by the API (`/api/events/occurrences`), and dragging or
  resizing one of their occurrences moves only that instance: the series slot keeps its identity and
  an `EventOverride` row holds the new time. Re-timing the series itself clears those exceptions,
  since its slots no longer line up. Every event carries one of six named colours (Focus / work,
  Meetings, Health, Personal, Family, Learning) from a single palette that feeds the picker, the
  calendar dots and blocks, and the legend below the grid.
- **Reminders** — a hosted background service polls every 15 seconds and pushes due reminders over
  SignalR. The browser shows a toast and, if allowed, a desktop notification. Recurring reminders
  roll forward automatically.
- **Progress** — current and best streaks, 30-day completion rate, 14-day activity bars, category
  breakdown, and what's coming next.
- **Optimistic UI** — completing a task updates immediately via React 19's `useOptimistic`, then
  reconciles with the server.

### Recurrence examples

The engine understands `FREQ`, `INTERVAL`, `BYDAY`, `BYMONTHDAY`, `BYMONTH`, `COUNT` and `UNTIL`:

```
FREQ=DAILY
FREQ=WEEKLY;BYDAY=MO,WE,FR
FREQ=WEEKLY;INTERVAL=2;BYDAY=TU
FREQ=MONTHLY;BYMONTHDAY=1
FREQ=YEARLY
```

Times are stored as local wall-clock values (no offsets), so “every Monday at 09:00” stays at 09:00
across daylight-saving changes.

## Project layout

```
LifeTodo.AppHost/        Aspire orchestrator — starts the API, Vite, and the dashboard
LifeTodo.ServiceDefaults/ OpenTelemetry, health checks, service discovery, resilient HTTP
LifeTodo.Api/            Minimal API endpoints, RRULE engine, reminder service, SignalR hub
LifeTodo.Db/             EF Core DbContext and entities (TodoItem, ScheduleEvent, EventOverride, Reminder, Completion)
LifeTodo.Tests/          xUnit tests for the recurrence engine and occurrence building
lifetodo-web/            React + TypeScript client (Vite dev server, Tailwind, FullCalendar)
data/                    SQLite database, created and seeded on first run (git-ignored)
```

The recurrence engine is the core piece: `RecurrenceEngine` parses an RRULE into a structured rule
and enumerates occurrences lazily, so a “every second Tuesday” event costs nothing until a calendar
window asks for dates.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET/POST | `/api/todos` | List / create tasks (`?view=open\|done`) |
| PUT/DELETE | `/api/todos/{id}` | Update / delete a task |
| POST | `/api/todos/{id}/toggle` | Complete, reopen, or roll a recurring task forward |
| GET/POST | `/api/events` | List / create events |
| PUT/DELETE | `/api/events/{id}` | Update / delete an event |
| GET | `/api/events/occurrences?from&to` | Expanded occurrences for a calendar window |
| GET | `/api/recurrence/preview?start&rule` | Validate an RRULE and preview the next dates |
| GET/POST | `/api/reminders` | List / create reminders |
| PUT/DELETE | `/api/reminders/{id}` | Update / delete a reminder |
| POST | `/api/reminders/{id}/ack` | Acknowledge a reminder |
| GET | `/api/stats` | Streaks, completion counts, activity, categories |
| GET | `/health`, `/alive` | Liveness from ServiceDefaults |

SignalR hub: `/hubs/todos` (`reminderDue`, `remindersChanged`, `todosChanged`, `eventsChanged`).
OpenAPI: `/openapi/v1.json` in Development.

## Tests

```bash
dotnet test
```

`LifeTodo.Tests` covers the RRULE expansion engine (daily/weekly/monthly/yearly, intervals, COUNT,
UNTIL, short months, next-occurrence lookup).

## Notes

- Schema is created with `EnsureCreated()` for a zero-friction local app; there are no migrations.
- The Aspire Community Toolkit SQLite resources (`AddSqlite` / `WithSqliteWeb`) are not wired in
  because the DB viewer runs in Docker, which this setup intentionally does not require. SQLite is
  passed to the API as a connection string pointing at `data/lifetodo.db`.

## Troubleshooting

**`Failed to bind to address http://127.0.0.1:18891: address already in use`**

An earlier AppHost is still running and holding the dashboard ports (18888–18891). Stop the stale
tree, then start again:

```bash
# find what owns the dashboard ports
netstat -ano | grep -E ":1888[0-9]" | grep -i listen

# kill the AppHost (and its children) plus its orchestration helper
taskkill //F //T //PID <AppHost pid>
taskkill //F //IM dcp.exe
```

If the API or Vite child processes also linger, `taskkill //F //IM LifeTodo.Api.exe` and closing any
`node.exe` started by the AppHost clears them. Ctrl+C in the AppHost terminal is the clean way to
shut the stack down.

## License

Released under the MIT License. See [LICENSE](LICENSE) for the full text.
