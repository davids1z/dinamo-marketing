import api from './client';

export interface ApiToggleResponse {
  api: string;
  mode: string;
  message: string;
}

export interface NotificationToggleResponse {
  id: string;
  enabled: boolean;
  message: string;
}

export const settingsApi = {
  getHealth: () => api.get('/settings/health'),
  getApiStatus: () => api.get('/settings/api-status'),
  toggleApi: (service: string, useMock: boolean) =>
    api.put<ApiToggleResponse>('/settings/api-toggle', { service, use_mock: useMock }),
  toggleNotification: (id: string, enabled: boolean) =>
    api.put<NotificationToggleResponse>('/settings/notifications/toggle', { id, enabled }),
  getBrand: () => api.get('/settings/brand'),
  updateBrand: (data: Record<string, unknown>) =>
    api.put('/settings/brand', data),
  getNotifications: () => api.get('/settings/notifications'),
  getQuotas: () => api.get('/settings/quotas'),
  getSystemHealth: () => api.get('/settings/health'),
};
