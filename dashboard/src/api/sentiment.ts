import api from './client';

export const sentimentApi = {
  analyze: (comments: { text: string; source_id?: string; platform?: string }[]) =>
    api.post('/sentiment/analyze', { comments }),
  getOverview: (days?: number) =>
    api.get('/sentiment/overview', { params: { days } }),
  getTopics: (days?: number) =>
    api.get('/sentiment/topics', { params: { days } }),
  getTimeline: (days?: number) =>
    api.get('/sentiment/timeline', { params: { days } }),
};
