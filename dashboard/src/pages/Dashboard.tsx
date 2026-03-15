import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import MetricCard from '../components/common/MetricCard'
import { formatNumber, formatPercent, formatCurrency } from '../utils/formatters'
import { EngagementChart } from '../components/charts/EngagementChart'
import { SentimentDonut } from '../components/charts/SentimentDonut'
import { useApi } from '../hooks/useApi'
import { useWebSocket } from '../hooks/useWebSocket'
import {
  Users, Eye, TrendingUp, CreditCard, BarChart3, Heart,
  MessageCircle, UserPlus, AlertTriangle, CheckCircle, Zap,
  Plus, Rocket, FileText, ChevronDown,
  ExternalLink, Clock, ArrowRight, Sparkles, TrendingDown,
  LayoutDashboard, Link2, PenTool, Building2, ShieldAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useClient } from '../contexts/ClientContext'
import { useAuth } from '../contexts/AuthContext'
import { useChannelStatus } from '../hooks/useChannelStatus'

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

const TONE_LABELS: Record<string, string> = {
  professional: 'Profesionalan',
  friendly: 'Prijateljski',
  bold: 'Hrabar i direktan',
  creative: 'Kreativan',
  formal: 'Formalan',
  casual: 'Opušten',
  inspirational: 'Inspirativan',
  humorous: 'Humorističan',
}

const activityIcons: Record<string, { icon: LucideIcon; color: string; bg: string; border: string }> = {
  follow: { icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-l-emerald-400' },
  comment: { icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-l-blue-400' },
  campaign: { icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-l-violet-400' },
  alert: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-l-amber-400' },
  report: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-l-emerald-400' },
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
    <div>
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
    { label: 'Kreiraj objavu', icon: Plus, to: '/content', color: 'bg-brand-accent text-white hover:bg-brand-accent-hover' },
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

function HeroMetricCard({
  label,
  value,
  previousValue,
  format = 'number',
  icon,
  gradient,
}: {
  label: string
  value: number
  previousValue?: number
  format?: 'number' | 'currency' | 'percent'
  icon?: LucideIcon
  gradient: string
}) {
  const animatedValue = useAnimatedNumber(value)

  const formattedValue =
    format === 'currency' ? formatCurrency(animatedValue) :
    format === 'percent' ? formatPercent(animatedValue) :
    formatNumber(animatedValue)

  const trend = previousValue !== undefined && previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : null
  const isPositive = trend !== null && trend >= 0
  const Icon = icon

  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${gradient} shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300`}>
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-white/70 uppercase tracking-wider">{label}</p>
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Icon size={20} className="text-white/80" />
            </div>
          )}
        </div>
        <p className="text-3xl font-bold text-white font-stats tracking-tight">{formattedValue}</p>
        {trend !== null && (
          <div className="flex items-center gap-2 mt-3">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
              isPositive ? 'bg-white/15 text-emerald-200' : 'bg-white/15 text-red-200'
            }`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isPositive ? '+' : ''}{trend.toFixed(1)}%
            </div>
            <span className="text-xs text-white/50">vs prošli period</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Welcome / Empty State Hero — shown when no real channels are connected
// ---------------------------------------------------------------------------

function WelcomeHero() {
  const navigate = useNavigate()
  const { currentClient } = useClient()
  const { hasConnectedChannels } = useChannelStatus()

  // Profile completeness calculation
  const profileChecks = [
    { label: 'Opis poslovanja', done: !!(currentClient?.business_description && currentClient.business_description.length >= 20) },
    { label: 'Ton komunikacije', done: !!currentClient?.tone_of_voice },
    { label: 'Kanali povezani', done: hasConnectedChannels },
    { label: 'Prvi sadržaj', done: false },
  ]
  const completedCount = profileChecks.filter(c => c.done).length
  const profilePercent = Math.round((completedCount / profileChecks.length) * 100)

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
    <div>
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

        {/* Profile completeness bar */}
        {profilePercent < 100 && (
          <div className="bg-studio-surface-1 border border-studio-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-brand-accent" />
                <span className="text-sm font-semibold text-studio-text-primary">
                  AI profil: {profilePercent}%
                </span>
              </div>
              <button
                onClick={() => navigate('/brand-profile')}
                className="text-xs font-medium text-brand-accent hover:underline"
              >
                Popuni podatke
              </button>
            </div>
            <div className="w-full h-2 bg-studio-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-accent rounded-full transition-all duration-700"
                style={{ width: `${profilePercent}%` }}
              />
            </div>
            <p className="text-xs text-studio-text-tertiary mt-2">
              Što više podataka unesete, to će AI bolje generirati sadržaj za vaš brand.
            </p>
          </div>
        )}

        {/* Brand Profile Summary — confirms onboarding data saved */}
        {currentClient?.business_description && (
          <div className="bg-studio-surface-1 border border-studio-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-brand-accent" />
              <h2 className="section-title">Vaš brand profil</h2>
            </div>
            <p className="text-sm text-studio-text-secondary leading-relaxed mb-3">
              {currentClient.business_description.length > 200
                ? currentClient.business_description.slice(0, 200) + '...'
                : currentClient.business_description}
            </p>
            {currentClient.tone_of_voice && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-studio-text-tertiary">Ton komunikacije:</span>
                <span className="text-xs font-medium text-brand-accent bg-brand-accent/10 px-2.5 py-1 rounded-full">
                  {TONE_LABELS[currentClient.tone_of_voice] || currentClient.tone_of_voice}
                </span>
              </div>
            )}
          </div>
        )}

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
  const { currentClient, clientRole } = useClient()
  const { user } = useAuth()
  const isSuperadminVisitor = user?.is_superadmin && clientRole === 'superadmin'

  // Period maps to days for the API
  const periodDays: Record<PeriodKey, number> = { '7d': 7, '30d': 30, 'month': 30, 'quarter': 90 }
  const { data: rawApi, loading } = useApi<ApiOverview>(`/analytics/overview?days=${periodDays[period]}`)
  const { data: liveData, isConnected } = useWebSocket<ApiOverview>({ url: '/api/v1/analytics/ws/live' })

  const activeApi = liveData || rawApi
  const mapped = activeApi ? mapApiToOverview(activeApi) : {}

  // Show WelcomeHero when client hasn't connected any social channels yet.
  const { hasConnectedChannels } = useChannelStatus()
  const hasRealChannels = hasConnectedChannels

  const handlePeriodChange = useCallback((key: PeriodKey) => {
    setPeriod(key)
  }, [])

  if (loading && !rawApi) {
    return <DashboardLoadingSkeleton />
  }

  // Superadmin banner flag — show read-only notice when visiting another client
  const actualOnboardingDone = currentClient?.onboarding_completed_actual ?? currentClient?.onboarding_completed

  // Show welcome/setup state when no real analytics data
  if (!hasRealChannels && currentClient) {
    return <WelcomeHero />
  }

  // Build overview data from real API response
  const d: OverviewData = {
    total_followers: mapped.total_followers || 0,
    prev_followers: mapped.prev_followers || 0,
    monthly_reach: mapped.monthly_reach || 0,
    prev_reach: mapped.prev_reach || 0,
    engagement_rate: mapped.engagement_rate || 0,
    prev_engagement_rate: mapped.prev_engagement_rate || 0,
    ad_spend: mapped.ad_spend || 0,
    prev_ad_spend: mapped.prev_ad_spend || 0,
    roas: mapped.roas || 0,
    prev_roas: mapped.prev_roas || 0,
    sentiment_score: 0,
    prev_sentiment_score: 0,
    engagement_trend: mapped.engagement_trend || [],
    sentiment_breakdown: { positive: 0, neutral: 0, negative: 0 },
    recent_activity: [],
  }

  const sentiment = d.sentiment_breakdown
  const engagementData = d.engagement_trend
  const activities = d.recent_activity
  const periodLabel = PERIOD_OPTIONS.find(o => o.key === period)?.label || ''

  return (
    <div>
      <Header title="NADZORNA PLOČA" subtitle="Pregled svih metrika u realnom vremenu" />

      <div className="page-wrapper space-y-6 sm:space-y-8">
        {/* Quick Actions + Period Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <QuickActions />
          <PeriodSelector selected={period} onChange={handlePeriodChange} />
        </div>

        {/* Superadmin read-only banner */}
        {isSuperadminVisitor && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-studio-text-primary">Pregled klijenta (samo čitanje)</p>
              <p className="text-xs text-studio-text-tertiary">
                Superadmin pristup — promjene može raditi samo admin ovog klijenta.
                {!actualOnboardingDone && ' Klijent još nije dovršio postavljanje profila.'}
              </p>
            </div>
          </div>
        )}

        {/* Hero Metrics — gradient cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-cards">
          <HeroMetricCard
            label="Mjesečni doseg"
            value={d.monthly_reach}
            previousValue={d.prev_reach}
            format="number"
            icon={Eye}
            gradient="from-blue-600 via-blue-500 to-indigo-600"
          />
          <HeroMetricCard
            label="Stopa angažmana"
            value={d.engagement_rate}
            previousValue={d.prev_engagement_rate}
            format="percent"
            icon={TrendingUp}
            gradient="from-violet-600 via-purple-500 to-fuchsia-600"
          />
          <HeroMetricCard
            label="ROAS"
            value={d.roas}
            previousValue={d.prev_roas}
            format="number"
            icon={BarChart3}
            gradient="from-emerald-600 via-emerald-500 to-teal-600"
          />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-cards">
          <AnimatedMetricCard label="Ukupno pratitelja" value={d.total_followers} previousValue={d.prev_followers} format="number" icon={Users} />
          <AnimatedMetricCard label="Potrošnja na oglase" value={d.ad_spend} previousValue={d.prev_ad_spend} format="currency" icon={CreditCard} />
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

      </div>
    </div>
  )
}
