import api from './client';

export const channelsApi = {
  runAudit: () => api.post('/channels/audit'),
  getAll: () => api.get('/channels'),
  getChannel: (id: string) => api.get(`/channels/${id}`),
};
