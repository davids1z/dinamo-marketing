import api from './client';

export const competitorsApi = {
  scan: () => api.post('/competitors/scan'),
  getComparison: () => api.get('/competitors'),
  getAlerts: () => api.get('/competitors/alerts'),
};
