import api from './client';

export const engagementApi = {
  createPoll: (data: { question: string; options: string[]; platform: string }) =>
    api.post('/engagement/polls', data),
  getPolls: () => api.get('/engagement/polls'),
  vote: (pollId: string, data: { option_index: number; fan_id: string }) =>
    api.post(`/engagement/polls/${pollId}/vote`, data),
  submitUGC: (data: Record<string, unknown>) =>
    api.post('/engagement/ugc', data),
  getUGC: () => api.get('/engagement/ugc'),
  getLeaderboard: () => api.get('/engagement/leaderboard'),
  getSpotlights: () => api.get('/engagement/spotlights'),
};
