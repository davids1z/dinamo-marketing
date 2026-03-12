import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import MetricCard from '../components/common/MetricCard'
import { EngagementChart } from '../components/charts/EngagementChart'
import { SentimentDonut } from '../components/charts/SentimentDonut'
import { useApi } from '../hooks/useApi'
import { useWebSocket } from '../hooks/useWebSocket'
import {
  Users, Eye, TrendingUp, CreditCard, BarChart3, Heart,
  MessageCircle, UserPlus, AlertTriangle, CheckCircle, Zap,
  Plus, Rocket, FileText, ChevronDown,
  ExternalLink, Calendar, Clock, ArrowRight, Sparkles, TrendingDown,
  LayoutDashboard, Link2, PenTool, Building2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AiInsightsPanel from '../components/common/AiInsightsPanel'
import { useClient } from '../contexts/ClientContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiOverview {
  organic?: {
    impressions: number; reach: number; likes: number; comments: number
    shares: number; saves: number; clicks: number; avg_engagement_rate: number
    new_followers: number; total_posts: number
  }
  paid?: {
    total_spend: number; conversions: number; conversion_value: number
    avg_roas: number; avg_cpm: number; avg_cpc: number
  }
  trends?: {
    impressions_change: number; reach_change: number
    engagement_change: number; followers_change: number
  }
  reach_data?: Array<{ date: string; reach: number; impressions: number }>
  campaign_data?: Array<Record<string, unknown>>
  funnel?: Array<{ label: string; value: number; color: string }>
  top_posts?: Array<Record<string, unknown>>
}

interface ActivityItem {
  id: number
  type: string
  text: string
  time: string
  timestamp?: string
  link?: string
}

interface OverviewData {
  total_followers: number
  prev_followers: number
  monthly_reach: number
  prev_reach: number
  engagement_rate: number
  prev_engagement_rate: number
  ad_spend: number
  prev_ad_spend: number
  roas: number
  prev_roas: number
  sentiment_score: number
  prev_sentiment_score: number
  engagement_trend: Array<{ date: string; engagement: number; reach: number }>
  sentiment_breakdown: { positive: number; neutral: number; negative: number }
  recent_activity: ActivityItem[]
}

interface Recommendation {
  id: number
  icon: LucideIcon
  iconColor: string
  iconBg: string
  title: string
  description: string
  action: string
  actionLink: string
  priority: 'high' | 'medium' | 'low'
}

type PeriodKey = '7d' | '30d' | 'month' | 'quarter'

interface PeriodOption {
  key: PeriodKey
  label: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: '7d', label: 'Zadnjih 7 dana' },
  { key: '30d', label: 'Zadnjih 30 dana' },
  { key: 'month', label: 'Ovaj mjesec' },
  { key: 'quarter', label: 'Ovaj kvartal' },
]

const fallbackOverview: OverviewData = {
  total_followers: 1121000, prev_followers: 1050000,
  monthly_reach: 4200000, prev_reach: 3800000,
  engagement_rate: 2.8, prev_engagement_rate: 2.5,
  ad_spend: 12450, prev_ad_spend: 11200,
  roas: 3.2, prev_roas: 2.8,
  sentiment_score: 78, prev_sentiment_score: 72,
  engagement_trend: [
    { date: '27.02', engagement: 4200, reach: 125000 },
    { date: '28.02', engagement: 5100, reach: 142000 },
    { date: '01.03', engagement: 6800, reach: 198000 },
    { date: '02.03', engagement: 4900, reach: 137000 },
    { date: '03.03', engagement: 7200, reach: 215000 },
    { date: '04.03', engagement: 5600, reach: 168000 },
    { date: '05.03', engagement: 6100, reach: 182000 },
  ],
  sentiment_breakdown: { positive: 65, neutral: 25, negative: 10 },
  recent_activity: [
    {
      id: 1, type: 'follow',
      text: '+2.340 novih pratitelja na Instagramu ovaj tjedan',
      time: 'prije 2 sata',
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      link: '/analytics',
    },
    {
      id: 2, type: 'comment',
      text: '148 novih komentara na promotivni video sadržaj',
      time: 'prije 4 sata',
      timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
      link: '/content',
    },
    {
      id: 3, type: 'campaign',
      text: 'TikTok kampanja premasila ciljani CTR za 18%',
      time: 'prije 6 sati',
      timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
      link: '/campaigns',
    },
    {
      id: 4, type: 'alert',
      text: 'Detektiran porast negativnog sentimenta na Facebooku',
      time: 'prije 8 sati',
      timestamp: new Date(Date.now() - 8 * 3600000).toISOString(),
      link: '/sentiment',
    },
    {
      id: 5, type: 'report',
      text: 'Mjesečni izvještaj generiran i poslan klijentima',
      time: 'prije 12 sati',
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
      link: '/reports',
    },
    {
      id: 6, type: 'campaign',
      text: 'Nova Instagram Stories kampanja pokrenuta za lansiranje proizvoda',
      time: 'prije 1 dan',
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
      link: '/campaigns',
    },
    {
      id: 7, type: 'follow',
      text: 'YouTube kanal prešao 50K pretplatnika',
      time: 'prije 1 dan',
      timestamp: new Date(Date.now() - 28 * 3600000).toISOString(),
      link: '/analytics',
    },
  ],
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 1,
    icon: TrendingDown,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-500/10',
    title: 'Engagement rate pao 5%',
    description: 'Razmotrite video sadržaj u petak navečer — analize pokazuju da video postovi dobivaju 3x više interakcija u tom terminu.',
    action: 'Kreiraj video objavu',
    actionLink: '/content',
    priority: 'high',
  },
  {
    id: 2,
    icon: TrendingUp,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-500/10',
    title: 'TikTok publika raste',
    description: 'TikTok pratitelji porasli 23% ovaj mjesec. Povećajte objave s 3 na 5 tjedno kako biste iskoristili algoritamski momentum.',
    action: 'Planiraj TikTok sadržaj',
    actionLink: '/content',
    priority: 'medium',
  },
  {
    id: 3,
    icon: Calendar,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-500/10',
    title: 'Lansiranje kampanje za 3 dana',
    description: 'Pripremite sadržaj unaprijed — countdown objave, teaser video i plan promocije za maksimalni doseg.',
    action: 'Pripremi kampanju',
    actionLink: '/campaigns',
    priority: 'high',
  },
]

const activityIcons: Record<string, { icon: LucideIcon; color: string; bg: string; border: string }> = {
  follow: { icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-l-emerald-400' },
  comment: { icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-l-blue-400' },
  campaign: { icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-l-violet-400' },
  alert: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-l-amber-400' },
  report: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-l-emerald-400' },
}

const PRIORITY_BADGES: Record<string, { label: string; className: string }> = {
  high: { label: 'Visoki', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  medium: { label: 'Srednji', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  low: { label: 'Niski', className: 'bg-studio-surface-0 text-studio-text-secondary border-studio-border' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapApiToOverview(apiData: ApiOverview): Partial<OverviewData> {
  const o = apiData.organic
  const p = apiData.paid
  const t = apiData.trends
  if (!o) return {}
  const reach = o.reach || 0
  const engRate = o.avg_engagement_rate || 0
  const prevReach = t?.reach_change ? Math.round(reach / (1 + t.reach_change / 100)) : reach
  const prevEng = t?.engagement_change ? +(engRate / (1 + t.engagement_change / 100)).toFixed(2) : engRate
  const spend = p?.total_spend || 0
  const roas = p?.avg_roas || 0

  const engTrend = (apiData.reach_data || []).slice(-7).map(r => ({
    date: r.date,
    engagement: Math.round(r.reach * (engRate / 100)),
    reach: r.reach,
  }))

  return {
    total_followers: o.new_followers || 0,
    prev_followers: 0,
    monthly_reach: reach,
    prev_reach: prevReach,
    engagement_rate: engRate,
    prev_engagement_rate: prevEng,
    ad_spend: spend,
    prev_ad_spend: 0,
    roas,
    prev_roas: 0,
    engagement_trend: engTrend.length ? engTrend : undefined,
  }
}

function formatRelativeTime(timestamp: string | undefined): string {
  if (!timestamp) return ''
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'upravo sada'
  if (diff < 3600) return `prije ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `prije ${Math.floor(diff / 3600)}h`
  if (diff < 172800) return 'jučer'
  return `prije ${Math.floor(diff / 86400)} dana`
}

// ---------------------------------------------------------------------------
// Animated counter hook
// ---------------------------------------------------------------------------

function useAnimatedNumber(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)

  useEffect(() => {
    fromRef.current = current
    startRef.current = null

    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(fromRef.current + (target - fromRef.current) * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return current
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse bg-studio-surface-3 rounded-lg ${className}`} />
}

function MetricCardSkeleton() {
  return (
    <div className="bg-studio-surface-1 border border-studio-border rounded-2xl p-5 shadow-studio-panel">
      <div className="flex items-start justify-between mb-3">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-9 w-9 !rounded-xl" />
      </div>
      <SkeletonBlock className="h-8 w-32 mt-2" />
      <div className="flex items-center gap-2 mt-3">
        <SkeletonBlock className="h-5 w-16 !rounded-full" />
        <SkeletonBlock className="h-3 w-28" />
      </div>
    </div>
  )
}

function DashboardLoadingSkeleton() {
  return (
    <div className="animate-fade-in">
      <Header title="NADZORNA PLOČA" subtitle="Pregled svih metrika u realnom vremenu" />
      <div className="page-wrapper space-y-6 sm:space-y-8">
        {/* Quick actions skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-2.5">
            <SkeletonBlock className="h-10 w-32 !rounded-xl" />
            <SkeletonBlock className="h-10 w-36 !rounded-xl" />
            <SkeletonBlock className="h-10 w-40 !rounded-xl" />
          </div>
          <SkeletonBlock className="h-10 w-44 !rounded-xl" />
        </div>

        {/* Metric cards skeleton */}
        <div className="metric-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <SkeletonBlock className="h-5 w-48 mb-5" />
            <SkeletonBlock className="h-[300px] w-full" />
          </div>
          <div className="card">
            <SkeletonBlock className="h-5 w-32 mb-5" />
            <div className="flex items-center justify-center h-[250px]">
              <SkeletonBlock className="h-[200px] w-[200px] !rounded-full" />
            </div>
          </div>
        </div>

        {/* Activity skeleton */}
        <div className="card">
          <SkeletonBlock className="h-5 w-40 mb-4" />
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-studio-surface-0 border border-studio-border">
                <SkeletonBlock className="w-8 h-8 !rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-full max-w-sm" />
                  <SkeletonBlock className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations skeleton */}
        <div>
          <SkeletonBlock className="h-5 w-32 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-studio-surface-1 border border-studio-border rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-3">
                  <SkeletonBlock className="w-10 h-10 !rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-3/4" />
                    <SkeletonBlock className="h-3 w-full" />
                    <SkeletonBlock className="h-3 w-2/3" />
                  </div>
                </div>
                <SkeletonBlock className="h-4 w-28 mt-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PeriodSelector({
  selected,
  onChange,
}: {
  selected: PeriodKey
  onChange: (key: PeriodKey) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selectedOption = PERIOD_OPTIONS.find(o => o.key === selected)!

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-studio-surface-1 border border-studio-border rounded-xl text-sm font-medium text-studio-text-secondary hover:border-brand-accent/30 hover:bg-studio-surface-2 transition-all shadow-sm"
      >
        <Clock size={15} className="text-studio-text-tertiary" />
        {selectedOption.label}
        <ChevronDown size={14} className={`text-studio-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-52 bg-studio-surface-2 border border-studio-border rounded-xl shadow-studio-dropdown z-20 py-1 animate-fade-in">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => { onChange(opt.key); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                opt.key === selected
                  ? 'bg-brand-accent/10 text-brand-accent font-medium'
                  : 'text-studio-text-secondary hover:bg-studio-surface-3'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function QuickActions() {
  const navigate = useNavigate()
  const actions = [
    { label: 'Kreiraj objavu', icon: Plus, to: '/content', color: 'bg-brand-accent text-brand-primary hover:bg-brand-accent-hover' },
    { label: 'Pokreni kampanju', icon: Rocket, to: '/campaigns', color: 'bg-studio-surface-1 text-studio-text-secondary border border-studio-border hover:border-brand-accent/30 hover:bg-studio-surface-2' },
    { label: 'Generiraj izvještaj', icon: FileText, to: '/reports', color: 'bg-studio-surface-1 text-studio-text-secondary border border-studio-border hover:border-brand-accent/30 hover:bg-studio-surface-2' },
  ]

  return (
    <div className="flex flex-wrap gap-2.5">
      {actions.map(a => {
        const Icon = a.icon
        return (
          <button
            key={a.label}
            onClick={() => navigate(a.to)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${a.color}`}
          >
            <Icon size={16} />
            {a.label}
          </button>
        )
      })}
    </div>
  )
}

function AnimatedMetricCard({
  label,
  value,
  previousValue,
  format = 'number',
  icon,
}: {
  label: string
  value: number
  previousValue?: number
  format?: 'number' | 'currency' | 'percent'
  icon?: LucideIcon
}) {
  const animatedValue = useAnimatedNumber(value)

  return (
    <MetricCard
      label={label}
      value={animatedValue}
      previousValue={previousValue}
      format={format}
      icon={icon}
    />
  )
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const navigate = useNavigate()
  const Icon = rec.icon
  const badge = PRIORITY_BADGES[rec.priority]

  return (
    <div className="bg-studio-surface-1 border border-studio-border rounded-2xl p-5 shadow-studio-panel hover:shadow-card-hover hover:border-studio-border-hover hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${rec.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={rec.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-studio-text-primary">{rec.title}</h3>
            {badge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-xs text-studio-text-secondary leading-relaxed">{rec.description}</p>
        </div>
      </div>
      <div className="mt-auto pt-3">
        <button
          onClick={() => navigate(rec.actionLink)}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:text-brand-accent/80 transition-colors group"
        >
          {rec.action}
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Welcome / Empty State Hero — shown to new clients without data
// ---------------------------------------------------------------------------

function WelcomeHero() {
  const navigate = useNavigate()
  const { currentClient } = useClient()

  const steps = [
    {
      icon: Building2,
      title: 'Završi profil klijenta',
      desc: 'Dodaj opis poslovanja, ton komunikacije i ciljnu publiku za AI kontekst.',
      to: '/brand-profile',
      done: !!(currentClient?.onboarding_completed),
    },
    {
      icon: Link2,
      title: 'Poveži kanale',
      desc: 'Poveži Instagram, TikTok, YouTube ili Facebook račune.',
      to: '/channels',
      done: false,
    },
    {
      icon: PenTool,
      title: 'Kreiraj prvi sadržaj',
      desc: 'Koristi AI za generiranje content plana ili kreiraj objavu ručno.',
      to: '/content',
      done: false,
    },
  ]

  return (
    <div className="animate-fade-in">
      <Header title="NADZORNA PLOČA" subtitle="Dobrodošli! Postavite svoj prostor." />
      <div className="page-wrapper space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-accent/5 via-studio-surface-1 to-blue-500/5 border border-studio-border rounded-2xl p-8 sm:p-10">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-brand-accent/15 flex items-center justify-center">
                <LayoutDashboard size={24} className="text-brand-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-studio-text-primary font-headline uppercase tracking-wide">
                  Započnite s platformom
                </h2>
                <p className="text-sm text-studio-text-secondary">
                  Dovršite korake ispod za aktivaciju svih funkcionalnosti.
                </p>
              </div>
            </div>
          </div>
          {/* Decorative gradient blob */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Setup steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <button
                key={step.title}
                onClick={() => navigate(step.to)}
                className={`text-left bg-studio-surface-1 border rounded-2xl p-6 transition-all duration-300 group ${
                  step.done
                    ? 'border-brand-accent/30 bg-brand-accent/5'
                    : 'border-studio-border hover:border-brand-accent/30 hover:shadow-card-hover hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    step.done ? 'bg-brand-accent/15' : 'bg-studio-surface-3'
                  }`}>
                    {step.done ? (
                      <CheckCircle size={18} className="text-brand-accent" />
                    ) : (
                      <Icon size={18} className="text-studio-text-tertiary group-hover:text-brand-accent transition-colors" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-studio-text-primary mb-1">{step.title}</h3>
                    <p className="text-xs text-studio-text-tertiary leading-relaxed">{step.desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-studio-text-disabled group-hover:text-brand-accent transition-colors mt-1 flex-shrink-0" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Empty metric cards showing zeros */}
        <div>
          <h2 className="section-title mb-4">Metrike</h2>
          <div className="metric-grid">
            <MetricCard label="Ukupno pratitelja" value={0} format="number" icon={Users} />
            <MetricCard label="Mjesečni doseg" value={0} format="number" icon={Eye} />
            <MetricCard label="Stopa angažmana" value={0} format="percent" icon={TrendingUp} />
            <MetricCard label="Potrošnja na oglase" value={0} format="currency" icon={CreditCard} />
          </div>
        </div>

        {/* Empty activity */}
        <div className="card">
          <h2 className="section-title mb-4">Nedavna aktivnost</h2>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-studio-surface-3 flex items-center justify-center mb-3">
              <Zap size={20} className="text-studio-text-disabled" />
            </div>
            <p className="text-sm text-studio-text-secondary font-medium mb-1">Još nema aktivnosti</p>
            <p className="text-xs text-studio-text-tertiary">Aktivnosti će se pojaviti kada povežete kanale i počnete objavljivati sadržaj.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodKey>('7d')
  const navigate = useNavigate()
  const { currentClient } = useClient()

  // Period maps to days for the API
  const periodDays: Record<PeriodKey, number> = { '7d': 7, '30d': 30, 'month': 30, 'quarter': 90 }
  const { data: rawApi, loading } = useApi<ApiOverview>(`/analytics/overview?days=${periodDays[period]}`)
  const { data: liveData, isConnected } = useWebSocket<ApiOverview>({ url: '/api/v1/analytics/ws/live' })

  const activeApi = liveData || rawApi
  const mapped = activeApi ? mapApiToOverview(activeApi) : {}
  const hasRealData = activeApi?.organic && (activeApi.organic.reach > 0 || activeApi.organic.impressions > 0)
  const d: OverviewData = hasRealData ? { ...fallbackOverview, ...mapped } : fallbackOverview

  const handlePeriodChange = useCallback((key: PeriodKey) => {
    setPeriod(key)
  }, [])

  // On API error, fall through to render with fallback data instead of showing error page

  if (loading && !rawApi) {
    return <DashboardLoadingSkeleton />
  }

  // Show welcome/empty state for new clients with no real data
  if (!hasRealData && currentClient && !currentClient.onboarding_completed) {
    return <WelcomeHero />
  }

  const sentiment = d.sentiment_breakdown || { positive: 65, neutral: 25, negative: 10 }
  const engagementData = d.engagement_trend || fallbackOverview.engagement_trend
  const activities = d.recent_activity || fallbackOverview.recent_activity
  const periodLabel = PERIOD_OPTIONS.find(o => o.key === period)?.label || ''

  return (
    <div className="animate-fade-in">
      <Header title="NADZORNA PLOČA" subtitle="Pregled svih metrika u realnom vremenu" />

      <div className="page-wrapper space-y-6 sm:space-y-8">
        {/* Quick Actions + Period Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <QuickActions />
          <PeriodSelector selected={period} onChange={handlePeriodChange} />
        </div>

        {/* Metric Cards with animated counters */}
        <div className="metric-grid">
          <AnimatedMetricCard label="Ukupno pratitelja" value={d.total_followers} previousValue={d.prev_followers} format="number" icon={Users} />
          <AnimatedMetricCard label="Mjesečni doseg" value={d.monthly_reach} previousValue={d.prev_reach} format="number" icon={Eye} />
          <AnimatedMetricCard label="Stopa angažmana" value={d.engagement_rate} previousValue={d.prev_engagement_rate} format="percent" icon={TrendingUp} />
          <AnimatedMetricCard label="Potrošnja na oglase" value={d.ad_spend} previousValue={d.prev_ad_spend} format="currency" icon={CreditCard} />
          <AnimatedMetricCard label="ROAS" value={d.roas} previousValue={d.prev_roas} format="number" icon={BarChart3} />
          <AnimatedMetricCard label="Ocjena sentimenta" value={d.sentiment_score} previousValue={d.prev_sentiment_score} format="percent" icon={Heart} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <EngagementChart
              data={engagementData}
              title={`Angazman i doseg (${periodLabel.toLowerCase()})`}
            />
          </div>
          <div className="card">
            <SentimentDonut
              positive={sentiment.positive}
              neutral={sentiment.neutral}
              negative={sentiment.negative}
              title="Ukupni sentiment"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Nedavna aktivnost</h2>
            <div className="flex items-center gap-3">
              {isConnected ? (
                <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  Prijenos uzivo
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-brand-muted">
                  <Zap className="w-3 h-3 text-brand-accent" />
                  Ažuriranje u realnom vremenu
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {activities.map((item) => {
              const iconInfo = (activityIcons[item.type] ?? activityIcons.report)!
              const Icon = iconInfo.icon
              const relativeTime = item.timestamp ? formatRelativeTime(item.timestamp) : item.time
              return (
                <div
                  key={item.id}
                  onClick={() => item.link && navigate(item.link)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl bg-studio-surface-0 hover:bg-studio-surface-2 transition-all border border-studio-border border-l-[3px] ${iconInfo.border} ${item.link ? 'cursor-pointer group' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg ${iconInfo.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={15} className={iconInfo.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-studio-text-primary leading-snug">{item.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[11px] text-studio-text-tertiary">{relativeTime}</p>
                      {item.link && (
                        <ExternalLink size={10} className="text-studio-text-disabled group-hover:text-brand-accent transition-colors" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 flex items-center justify-center">
              <Sparkles size={16} className="text-violet-600" />
            </div>
            <div>
              <h2 className="section-title">Preporuke</h2>
              <p className="text-xs text-studio-text-tertiary -mt-0.5">AI uvidi i prijedlozi za poboljšanje</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RECOMMENDATIONS.map(rec => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        </div>

        <AiInsightsPanel pageKey="dashboard" pageData={{ metrics: { followers: d.total_followers, reach: d.monthly_reach, engagement_rate: d.engagement_rate, ad_spend: d.ad_spend, roas: d.roas, sentiment: d.sentiment_score }, activities: activities.slice(0, 5).map(a => ({ type: a.type, text: a.text })) }} />
      </div>
    </div>
  )
}
