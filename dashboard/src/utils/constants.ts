export const SHIFTONEZERO_BRAND = {
  colors: {
    primary: '#0A1A28',
    primaryLight: '#112233',
    dark: '#0A1A28',
    darkLight: '#112233',
    darkCard: '#112233',
    accent: '#0EA5E9',
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
  linkedin: { name: 'LinkedIn', color: '#0A66C2', icon: 'linkedin' },
  web: { name: 'Web stranica', color: '#0057A8', icon: 'globe' },
  twitter: { name: 'X / Twitter', color: '#1DA1F2', icon: 'twitter' },
} as const

export const CONTENT_PILLARS = [
  { id: 'edukacija', name: 'Edukacija', color: '#3B82F6' },
  { id: 'prodaja', name: 'Prodaja', color: '#22C55E' },
  { id: 'iza_kulisa', name: 'Iza kulisa', color: '#8B5CF6' },
  { id: 'zabava', name: 'Zabava', color: '#EC4899' },
  { id: 'inspiracija', name: 'Inspiracija', color: '#F59E0B' },
  { id: 'produkt', name: 'Produkt', color: '#EF4444' },
  { id: 'vijesti', name: 'Vijesti', color: '#0EA5E9' },
  { id: 'lifestyle', name: 'Lifestyle', color: '#14B8A6' },
] as const

/* URL-to-platform auto-detection for social link input */
const PLATFORM_URL_PATTERNS: Array<{ platform: string; patterns: RegExp[] }> = [
  { platform: 'instagram', patterns: [/instagram\.com/i, /instagr\.am/i] },
  { platform: 'facebook', patterns: [/facebook\.com/i, /fb\.com/i, /fb\.me/i] },
  { platform: 'twitter', patterns: [/twitter\.com/i, /x\.com/i] },
  { platform: 'linkedin', patterns: [/linkedin\.com/i] },
  { platform: 'tiktok', patterns: [/tiktok\.com/i] },
  { platform: 'youtube', patterns: [/youtube\.com/i, /youtu\.be/i] },
]

export function detectPlatformFromUrl(url: string): string | null {
  for (const { platform, patterns } of PLATFORM_URL_PATTERNS) {
    if (patterns.some(p => p.test(url))) return platform
  }
  return null
}

export const LIFECYCLE_STAGES = [
  { id: 'new', name: 'Novi navijač', color: '#6B7280' },
  { id: 'casual', name: 'Povremeni', color: '#3B82F6' },
  { id: 'engaged', name: 'Aktivni', color: '#22C55E' },
  { id: 'superfan', name: 'Superfan', color: '#F59E0B' },
  { id: 'ambassador', name: 'Ambasador', color: '#EF4444' },
] as const

export const CHART_COLORS = [
  '#0EA5E9', '#64748B', '#22C55E', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6',
] as const

export const API_BASE = '/api/v1'
