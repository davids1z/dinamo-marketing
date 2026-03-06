import api from './client'

export const notificationsApi = {
  getRecent: () => api.get('/settings/notifications/recent'),
  markRead: (id: string) => api.put(`/settings/notifications/${id}/read`),
  getPreferences: () => api.get('/settings/notifications'),
}
