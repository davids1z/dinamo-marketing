import api from './client';

export const diasporaApi = {
  getMap: () => api.get('/diaspora/map'),
  getEvents: () => api.get('/diaspora/events'),
  adaptContent: (postId: string, targetLang: string) =>
    api.post(`/diaspora/adapt/${postId}`, null, { params: { target_lang: targetLang } }),
  getPopulations: () => api.get('/diaspora/populations'),
};
