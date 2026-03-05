export interface Country {
  id: string
  name: string
  code: string
  region_type: 'regional' | 'diaspora' | 'expansion'
  population: number
  internet_penetration: number
  football_popularity_index: number
}

export interface MarketScore {
  id: string
  country_id: string
  country_name: string
  country_code: string
  sports_density_score: number
  audience_score: number
  diaspora_score: number
  search_score: number
  social_penetration_score: number
  total_score: number
  rank: number
}

export interface ChannelMetrics {
  platform: string
  followers: number
  avg_reach: number
  engagement_rate: number
  posting_frequency: number
  demographics: Record<string, unknown>
  format_breakdown: Record<string, number>
}

export interface CompetitorData {
  id: string
  name: string
  short_name: string
  country: string
  league: string
  platforms: Record<string, { followers: number; engagement_rate: number }>
}

export interface ContentPost {
  id: string
  platform: string
  content_pillar: string
  scheduled_at: string
  status: 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived'
  caption_hr: string
  caption_en: string
  caption_de: string
  hashtags: string[]
  cta_text: string
  visual_url: string
  is_champions_league: boolean
  is_academy: boolean
}

export interface Campaign {
  id: string
  name: string
  platform: string
  objective: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  daily_budget: number
  total_spend: number
  start_date: string
  end_date: string
  ad_sets: AdSet[]
}

export interface AdSet {
  id: string
  name: string
  targeting: Record<string, unknown>
  status: string
  budget: number
  ads: Ad[]
}

export interface Ad {
  id: string
  variant_label: string
  headline: string
  description: string
  cta: string
  status: 'active' | 'paused' | 'winner' | 'loser'
  metrics?: AdMetrics
}

export interface AdMetrics {
  impressions: number
  reach: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  spend: number
  conversions: number
  roas: number
  frequency: number
}

export interface SentimentData {
  positive: number
  neutral: number
  negative: number
  total: number
}

export interface FanSegment {
  id: string
  name: string
  size: number
  avg_clv: number
  churn_rate: number
  growth_trend: number
}

export interface WeeklyReport {
  id: string
  week_start: string
  week_end: string
  top_posts: unknown[]
  top_ads: unknown[]
  recommendations: string[]
  generated_at: string
}

export interface KPIData {
  label: string
  value: number
  previous_value: number
  format: 'number' | 'currency' | 'percent'
}
