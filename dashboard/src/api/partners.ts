import api from './client';

export interface PartnerSummary {
  total: number;
  active: number;
  total_reach_delivered: number;
  avg_engagement_rate: number;
  avg_match_score: number;
}

export interface PartnerRow {
  id: string;
  name: string;
  handle: string;
  platform: string;
  website: string;
  category: string;
  partner_type: string;
  status: string;
  followers: number;
  engagement_rate: number;
  avg_reach_per_post: number;
  audience_overlap_pct: number;
  match_score: number;
  campaign_count: number;
  total_posts_delivered: number;
  total_reach_delivered: number;
  avg_cpe: number;
  partnership_start: string | null;
  partnership_end: string | null;
  notes: string;
}

export interface PartnersData {
  partners: PartnerRow[];
  summary: PartnerSummary;
}

export const partnersApi = {
  getAll: () => api.get<PartnersData>('/partners/'),
  create: (data: {
    name: string;
    handle?: string;
    platform?: string;
    category?: string;
    partner_type?: string;
    status?: string;
    followers?: number;
    engagement_rate?: number;
    notes?: string;
  }) => api.post('/partners/', data),
  update: (id: string, data: Partial<PartnerRow>) => api.patch(`/partners/${id}`, data),
  remove: (id: string) => api.delete(`/partners/${id}`),
};
