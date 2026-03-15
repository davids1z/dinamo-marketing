import api from './client';

export const fansApi = {
  /** BFF: all data for Segmentacija korisnika page */
  getPageData: () => api.get('/fans/'),
  getSegments: () => api.get('/fans/segments'),
  getProfile: (id: string) => api.get(`/fans/profiles/${id}`),
  updateLifecycle: () => api.post('/fans/lifecycle/update'),
  getCLV: () => api.get('/fans/clv'),
  getChurnPredictions: () => api.get('/fans/churn'),
};
