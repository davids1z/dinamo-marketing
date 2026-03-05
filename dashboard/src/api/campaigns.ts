import api from './client';

export const campaignsApi = {
  create: (data: Record<string, unknown>) => api.post('/campaigns', data),
  getAll: () => api.get('/campaigns'),
  get: (id: string) => api.get(`/campaigns/${id}`),
  pause: (id: string) => api.patch(`/campaigns/${id}/pause`),
  resume: (id: string) => api.patch(`/campaigns/${id}/resume`),
  getABTest: (id: string) => api.get(`/campaigns/${id}/ab-test`),
  refreshCreative: (id: string) => api.post(`/campaigns/${id}/refresh-creative`),
};
