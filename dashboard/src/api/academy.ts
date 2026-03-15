import api from './client';

export const academyApi = {
  getPlayers: () => api.get('/academy/players'),
  getPlayer: (id: string) => api.get(`/academy/players/${id}`),
  generateMatchReport: (matchId: string) =>
    api.post(`/academy/match-report/${matchId}`),
  getStats: () => api.get('/academy/stats'),
  getMatches: () => api.get('/academy/matches'),
  getPageData: () => api.get('/academy/page-data'),
};
