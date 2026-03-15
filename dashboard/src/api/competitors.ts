import api from './client';

export interface DiscoverResult {
  discovered: number
  competitors: Array<{
    id: string
    name: string
    short_name: string
    country: string
    reason: string
  }>
}

export const competitorsApi = {
  scan: () => api.post('/competitors/scan'),
  discover: () => api.post<DiscoverResult>('/competitors/discover'),
  getComparison: () => api.get('/competitors'),
  getAlerts: () => api.get('/competitors/alerts'),
  remove: (id: string) => api.delete(`/competitors/${id}`),
};
