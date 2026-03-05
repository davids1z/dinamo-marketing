import api from './client';

export const marketResearchApi = {
  scan: () => api.post('/market-research/scan'),
  getCountries: () => api.get('/market-research/countries'),
  getCountry: (id: string) => api.get(`/market-research/countries/${id}`),
  getRankings: () => api.get('/market-research/rankings'),
};
