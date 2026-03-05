import api from './client';

export const settingsApi = {
  getHealth: () => api.get('/settings/health'),
  getApiStatus: () => api.get('/settings/api-status'),
  toggleApi: (service: string, useMock: boolean) =>
    api.put('/settings/api-toggle', { service, use_mock: useMock }),
  getBrand: () => api.get('/settings/brand'),
  updateBrand: (data: Record<string, unknown>) =>
    api.put('/settings/brand', data),
  getNotifications: () => api.get('/settings/notifications'),
};
