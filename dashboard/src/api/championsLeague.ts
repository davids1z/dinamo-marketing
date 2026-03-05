import api from './client';

export const championsLeagueApi = {
  getStatus: () => api.get('/champions-league/status'),
  activateSurge: (data: { match_date: string; opponent: string }) =>
    api.post('/champions-league/activate', data),
  generateContent: (opponent: string) =>
    api.post(`/champions-league/content/${opponent}`),
  boostBudget: (campaignId: string, multiplier: number) =>
    api.post(`/champions-league/boost/${campaignId}`, { multiplier }),
};
