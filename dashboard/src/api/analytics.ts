import api from './client';

export interface AdRow {
  ad_id: string;
  variant_label: string;
  headline: string;
  image_url: string;
  status: string;
  campaign_id: string;
  campaign_name: string;
  platform: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  conversions: number;
  roas: number;
}

export interface AllAdsResponse {
  ads: AdRow[];
  total: number;
}

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
  getAllAds: (params?: { platform?: string; campaign_id?: string; sort_by?: string; sort_dir?: string; limit?: number }) =>
    api.get<AllAdsResponse>('/analytics/ads', { params }),
  getAdHistory: (adId: string, days?: number) =>
    api.get(`/analytics/ads/${adId}/history`, { params: { days } }),
};
