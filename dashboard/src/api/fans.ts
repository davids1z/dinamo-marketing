import api from './client';

export const fansApi = {
  getSegments: () => api.get('/fans/segments'),
  getProfile: (id: string) => api.get(`/fans/profiles/${id}`),
  updateLifecycle: () => api.post('/fans/lifecycle/update'),
  getCLV: () => api.get('/fans/clv'),
  getChurnPredictions: () => api.get('/fans/churn'),
};
