import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr'
import { toast } from 'sonner'

import type { Reminder } from '@/lib/api'
import { formatTime } from '@/lib/dates'
import { queryKeys } from '@/hooks/useLifeData'

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

// One shared connection for the whole tab (survives HMR and StrictMode).
let connection: HubConnection | null = null

function getConnection(): HubConnection {
  connection ??= new HubConnectionBuilder()
    .withUrl('/hubs/todos')
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
    .configureLogging(LogLevel.Warning)
    .build()

  return connection
}

function fireBrowserNotification(reminder: Reminder) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return
  }

  try {
    new Notification(reminder.title, {
      body: reminder.notes ?? `Scheduled for ${formatTime(reminder.remindAt)}`,
      tag: `lifetodo-reminder-${reminder.id}`,
      icon: '/favicon.svg',
    })
  } catch {
    // Some browsers block constructor notifications; the toast still shows.
  }
}

export function useRealtime(enabled = true): RealtimeStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<RealtimeStatus>('connecting')

  useEffect(() => {
    if (!enabled) {
      return
    }

    const hub = getConnection()
    let disposed = false

    const onReminderDue = (reminder: Reminder) => {
      toast(`⏰ ${reminder.title}`, {
        description: reminder.notes ?? `Due at ${formatTime(reminder.remindAt)}`,
        duration: 12_000,
      })
      fireBrowserNotification(reminder)
      void queryClient.invalidateQueries({ queryKey: queryKeys.reminders })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
    }

    const onRemindersChanged = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reminders })
    }

    const onTodosChanged = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.todos })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
    }

    const onEventsChanged = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events })
      void queryClient.invalidateQueries({ queryKey: ['occurrences'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
    }

    hub.on('reminderDue', onReminderDue)
    hub.on('remindersChanged', onRemindersChanged)
    hub.on('todosChanged', onTodosChanged)
    hub.on('eventsChanged', onEventsChanged)

    hub.onreconnecting(() => setStatus('connecting'))
    hub.onreconnected(() => setStatus('connected'))
    hub.onclose(() => setStatus('disconnected'))

    const start = async () => {
      if (hub.state !== HubConnectionState.Disconnected) {
        setStatus(hub.state === HubConnectionState.Connected ? 'connected' : 'connecting')
        return
      }

      try {
        await hub.start()
        if (!disposed) setStatus('connected')
      } catch {
        if (!disposed) setStatus('disconnected')
      }
    }

    void start()

    return () => {
      disposed = true
      hub.off('reminderDue', onReminderDue)
      hub.off('remindersChanged', onRemindersChanged)
      hub.off('todosChanged', onTodosChanged)
      hub.off('eventsChanged', onEventsChanged)
    }
  }, [enabled, queryClient])

  return status
}

export type NotificationPermissionState = NotificationPermission | 'unsupported'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      setPermission('unsupported')
      return
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      toast.success('Browser notifications enabled')
    }
  }

  return { permission, requestPermission }
}
