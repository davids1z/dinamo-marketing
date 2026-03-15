import api from './client';

export interface AdPerformance {
  ad_id: string;
  variant_label: string;
  headline: string;
  description: string;
  image_url: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  conversions: number;
  roas: number;
  daily_metrics: { date: string; impressions: number; clicks: number; spend: number; conversions: number }[];
}

export interface CampaignPerformance {
  campaign_id: string;
  name: string;
  platform: string;
  objective: string;
  status: string;
  daily_budget: number;
  max_budget: number;
  total_spend: number;
  ads: AdPerformance[];
}

export const campaignsApi = {
  create: (data: Record<string, unknown>) => api.post('/campaigns', data),
  getAll: () => api.get('/campaigns'),
  get: (id: string) => api.get(`/campaigns/${id}`),
  pause: (id: string) => api.patch(`/campaigns/${id}/pause`),
  resume: (id: string) => api.patch(`/campaigns/${id}/resume`),
  getABTest: (id: string) => api.get(`/campaigns/${id}/ab-test`),
  refreshCreative: (id: string) => api.post(`/campaigns/${id}/refresh-creative`),
  getPerformance: (id: string) => api.get<CampaignPerformance>(`/campaigns/${id}/performance`),
  getPageData: () => api.get('/campaigns/page-data'),
};
