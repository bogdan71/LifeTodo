import { useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import listPlugin from '@fullcalendar/react/list'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import themePlugin from '@fullcalendar/react/themes/monarch'

import type { EventOccurrence } from '@/lib/api'

function nextDay(date: string): string {
  const value = new Date(date.slice(0, 10) + 'T00:00:00')
  value.setDate(value.getDate() + 1)
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

interface CalendarViewProps {
  occurrences: EventOccurrence[]
  onDateClick: (date: Date) => void
  onEventClick: (occurrenceId: string) => void
}

export function CalendarView({ occurrences, onDateClick, onEventClick }: CalendarViewProps) {
  const events = useMemo(
    () =>
      occurrences.map((occurrence) => ({
        id: occurrence.id,
        title: occurrence.title,
        start: occurrence.allDay ? occurrence.start.slice(0, 10) : occurrence.start,
        end: occurrence.allDay ? nextDay(occurrence.end) : occurrence.end,
        allDay: occurrence.allDay,
        backgroundColor: occurrence.color,
        borderColor: occurrence.color,
        textColor: '#ffffff',
        extendedProps: {
          occurrenceId: occurrence.id,
          location: occurrence.location,
          recurring: occurrence.recurring,
        },
      })),
    [occurrences],
  )

  return (
    <FullCalendar
      plugins={[themePlugin, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      height="auto"
      events={events}
      firstDay={1}
      nowIndicator
      dayMaxEvents={3}
      fixedWeekCount={false}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listMonth',
      }}
      slotMinTime="06:00:00"
      slotMaxTime="23:00:00"
      eventTimeFormat={{ hour: 'numeric', minute: '2-digit' }}
      dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
      dateClick={(info) => onDateClick(info.date)}
      eventClick={(info) => {
        const id = info.event.extendedProps.occurrenceId as string | undefined
        if (id) {
          onEventClick(id)
        }
      }}
      eventContent={(info) => (
        <div className="flex min-w-0 items-center gap-1.5 truncate px-1.5 py-0.5">
          <span className="truncate text-[11px] leading-tight font-medium">{info.event.title}</span>
        </div>
      )}
    />
  )
}
