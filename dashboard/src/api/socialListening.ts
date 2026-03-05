import api from './client';

export const socialListeningApi = {
  scan: () => api.post('/social-listening/scan'),
  getTrending: (days?: number) =>
    api.get('/social-listening/trending', { params: { days } }),
  getShareOfVoice: () => api.get('/social-listening/share-of-voice'),
  getCrisis: () => api.get('/social-listening/crisis'),
};
