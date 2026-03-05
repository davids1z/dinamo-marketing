export const DINAMO_BRAND = {
  colors: {
    primary: '#0A1A28',
    primaryLight: '#112233',
    dark: '#0A1A28',
    darkLight: '#112233',
    darkCard: '#112233',
    accent: '#B8FF00',
    accentHover: '#9FDB00',
    accentDark: '#4D7C0F',
    muted: '#64748B',
    mutedLight: '#7298BE',
    blue: '#0057A8',
    white: '#F1F1F1',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    positive: '#22C55E',
    neutral: '#6B7280',
    negative: '#EF4444',
  },
  fonts: {
    headline: "'Montserrat', sans-serif",
    body: "'Montserrat', sans-serif",
    stats: "'Montserrat', sans-serif",
  },
} as const

export const PLATFORMS = {
  instagram: { name: 'Instagram', color: '#E4405F', icon: 'instagram' },
  facebook: { name: 'Facebook', color: '#1877F2', icon: 'facebook' },
  tiktok: { name: 'TikTok', color: '#000000', icon: 'music-2' },
  youtube: { name: 'YouTube', color: '#FF0000', icon: 'youtube' },
  web: { name: 'Web stranica', color: '#0057A8', icon: 'globe' },
  twitter: { name: 'X / Twitter', color: '#1DA1F2', icon: 'twitter' },
} as const

export const CONTENT_PILLARS = [
  { id: 'match_highlights', name: 'Highlights utakmica', color: '#EF4444' },
  { id: 'player_interviews', name: 'Intervjui s igračima', color: '#F59E0B' },
  { id: 'behind_scenes', name: 'Iza kulisa', color: '#8B5CF6' },
  { id: 'academy', name: 'Akademija', color: '#22C55E' },
  { id: 'tactical', name: 'Taktička analiza', color: '#3B82F6' },
  { id: 'fan_engagement', name: 'Angažman navijača', color: '#EC4899' },
  { id: 'lifestyle', name: 'Lifestyle i kultura', color: '#14B8A6' },
] as const

export const LIFECYCLE_STAGES = [
  { id: 'new', name: 'Novi navijač', color: '#6B7280' },
  { id: 'casual', name: 'Povremeni', color: '#3B82F6' },
  { id: 'engaged', name: 'Aktivni', color: '#22C55E' },
  { id: 'superfan', name: 'Superfan', color: '#F59E0B' },
  { id: 'ambassador', name: 'Ambasador', color: '#EF4444' },
] as const

export const CHART_COLORS = [
  '#B8FF00', '#64748B', '#22C55E', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6',
] as const

export const API_BASE = '/api/v1'
