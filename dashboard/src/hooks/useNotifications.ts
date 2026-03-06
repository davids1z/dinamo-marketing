import { usePolling } from './useApi'
import { notificationsApi } from '../api/notifications'

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  severity: 'info' | 'warning' | 'critical'
  is_read: boolean
  link: string
  created_at: string
}

export function useNotifications() {
  const { data, loading, refetch } = usePolling<Notification[]>(
    '/settings/notifications/recent',
    30000
  )

  const notifications = data || []
  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id)
      refetch()
    } catch {
      // ignore
    }
  }

  return { notifications, unreadCount, loading, markRead, refetch }
}
