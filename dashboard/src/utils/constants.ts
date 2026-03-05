export const DINAMO_BRAND = {
  colors: {
    primary: '#0057A8',
    primaryLight: '#1a6fbf',
    primaryDark: '#004080',
    dark: '#0A0E1A',
    darkLight: '#141927',
    darkCard: '#1a1f33',
    accent: '#00A8E8',
    accentHover: '#0090c8',
    white: '#FFFFFF',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    positive: '#22C55E',
    neutral: '#6B7280',
    negative: '#EF4444',
  },
  fonts: {
    headline: "'Bebas Neue', sans-serif",
    body: "'Barlow Condensed', sans-serif",
    stats: "'Oswald', sans-serif",
  },
} as const

export const PLATFORMS = {
  instagram: { name: 'Instagram', color: '#E4405F', icon: 'instagram' },
  facebook: { name: 'Facebook', color: '#1877F2', icon: 'facebook' },
  tiktok: { name: 'TikTok', color: '#000000', icon: 'music-2' },
  youtube: { name: 'YouTube', color: '#FF0000', icon: 'youtube' },
  web: { name: 'Website', color: '#0057A8', icon: 'globe' },
  twitter: { name: 'X / Twitter', color: '#1DA1F2', icon: 'twitter' },
} as const

export const CONTENT_PILLARS = [
  { id: 'match_highlights', name: 'Match Highlights', color: '#EF4444' },
  { id: 'player_interviews', name: 'Player Interviews', color: '#F59E0B' },
  { id: 'behind_scenes', name: 'Behind the Scenes', color: '#8B5CF6' },
  { id: 'academy', name: 'Academy Spotlight', color: '#22C55E' },
  { id: 'tactical', name: 'Tactical Analysis', color: '#3B82F6' },
  { id: 'fan_engagement', name: 'Fan Engagement', color: '#EC4899' },
  { id: 'lifestyle', name: 'Lifestyle & Culture', color: '#14B8A6' },
] as const

export const LIFECYCLE_STAGES = [
  { id: 'new', name: 'New Fan', color: '#6B7280' },
  { id: 'casual', name: 'Casual', color: '#3B82F6' },
  { id: 'engaged', name: 'Engaged', color: '#22C55E' },
  { id: 'superfan', name: 'Superfan', color: '#F59E0B' },
  { id: 'ambassador', name: 'Ambassador', color: '#EF4444' },
] as const

export const CHART_COLORS = [
  '#0057A8', '#00A8E8', '#22C55E', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6',
] as const

export const API_BASE = '/api/v1'
