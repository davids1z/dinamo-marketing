import api from './client';

export const analyticsApi = {
  getOverview: () => api.get('/analytics/overview'),
  getPlatformBreakdown: (days?: number) =>
    api.get('/analytics/platforms', { params: { days } }),
  getMarketPerformance: () => api.get('/analytics/markets'),
  getContentRanking: (limit?: number) =>
    api.get('/analytics/content-ranking', { params: { limit } }),
  getPostMetrics: (postId: string) => api.get(`/analytics/post-metrics/${postId}`),
  getAdMetrics: (adId: string) => api.get(`/analytics/ad-metrics/${adId}`),
  getAttribution: (days?: number) =>
    api.get('/analytics/attribution', { params: { days } }),
  getRoiSummary: (days?: number) =>
    api.get('/analytics/roi/summary', { params: { days } }),
  getRoiByPlatform: (days?: number) =>
    api.get('/analytics/roi/by-platform', { params: { days } }),
  getPostMetricsHistory: (postId: string, days?: number) =>
    api.get(`/analytics/post-metrics/${postId}/history`, { params: { days } }),
};
