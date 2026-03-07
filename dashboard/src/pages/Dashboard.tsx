import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import MetricCard from '../components/common/MetricCard'
import { ErrorState } from '../components/common/LoadingSpinner'
import { EngagementChart } from '../components/charts/EngagementChart'
import { SentimentDonut } from '../components/charts/SentimentDonut'
import { useApi } from '../hooks/useApi'
import { useWebSocket } from '../hooks/useWebSocket'
import {
  Users, Eye, TrendingUp, CreditCard, BarChart3, Heart,
  MessageCircle, UserPlus, AlertTriangle, CheckCircle, Zap,
  Plus, Rocket, FileText, ChevronDown,
  ExternalLink, Calendar, Clock, ArrowRight, Sparkles, TrendingDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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
      text: '148 novih komentara na highlights reel utakmice',
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
      text: 'Mjesečni izvještaj generiran i poslan dioničarima',
      time: 'prije 12 sati',
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
      link: '/reports',
    },
    {
      id: 6, type: 'campaign',
      text: 'Nova Instagram Stories kampanja pokrenuta za U19 momčad',
      time: 'prije 1 dan',
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
      link: '/campaigns',
    },
    {
      id: 7, type: 'follow',
      text: 'YouTube kanal presao 50K pretplatnika',
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
    iconBg: 'bg-amber-50',
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
    iconBg: 'bg-emerald-50',
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
    iconBg: 'bg-blue-50',
    title: 'UCL utakmica za 3 dana',
    description: 'Pripremite matchday sadržaj unaprijed — pretprodajna kampanja, countdown objave i live coverage plan za maksimalni doseg.',
    action: 'Pripremi kampanju',
    actionLink: '/campaigns',
    priority: 'high',
  },
]

const activityIcons: Record<string, { icon: LucideIcon; color: string; bg: string; border: string }> = {
  follow: { icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-l-emerald-400' },
  comment: { icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-l-blue-400' },
  campaign: { icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-l-violet-400' },
  alert: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-l-amber-400' },
  report: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-l-emerald-400' },
}

const PRIORITY_BADGES: Record<string, { label: string; className: string }> = {
  high: { label: 'Visoki', className: 'bg-red-50 text-red-700 border-red-200' },
  medium: { label: 'Srednji', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'Niski', className: 'bg-gray-50 text-gray-600 border-gray-200' },
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
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
}

function MetricCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card">
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
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
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
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5">
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
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-dinamo-blue/30 hover:bg-gray-50 transition-all shadow-sm"
      >
        <Clock size={15} className="text-gray-400" />
        {selectedOption.label}
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 animate-fade-in">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => { onChange(opt.key); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                opt.key === selected
                  ? 'bg-dinamo-blue/5 text-dinamo-blue font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
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
    { label: 'Kreiraj objavu', icon: Plus, to: '/content', color: 'bg-dinamo-blue text-white hover:bg-dinamo-blue/90' },
    { label: 'Pokreni kampanju', icon: Rocket, to: '/campaigns', color: 'bg-white text-gray-700 border border-gray-200 hover:border-dinamo-blue/30 hover:bg-gray-50' },
    { label: 'Generiraj izvještaj', icon: FileText, to: '/reports', color: 'bg-white text-gray-700 border border-gray-200 hover:border-dinamo-blue/30 hover:bg-gray-50' },
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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card hover:shadow-card-hover hover:border-dinamo-blue/20 hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${rec.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={rec.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">{rec.title}</h3>
            {badge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{rec.description}</p>
        </div>
      </div>
      <div className="mt-auto pt-3">
        <button
          onClick={() => navigate(rec.actionLink)}
          className="flex items-center gap-1.5 text-xs font-semibold text-dinamo-blue hover:text-dinamo-blue/80 transition-colors group"
        >
          {rec.action}
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
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

  // Period maps to days for the API
  const periodDays: Record<PeriodKey, number> = { '7d': 7, '30d': 30, 'month': 30, 'quarter': 90 }
  const { data: rawApi, loading, error, refetch } = useApi<ApiOverview>(`/analytics/overview?days=${periodDays[period]}`)
  const { data: liveData, isConnected } = useWebSocket<ApiOverview>({ url: '/api/v1/analytics/ws/live' })

  const activeApi = liveData || rawApi
  const mapped = activeApi ? mapApiToOverview(activeApi) : {}
  const hasRealData = activeApi?.organic && (activeApi.organic.reach > 0 || activeApi.organic.impressions > 0)
  const d: OverviewData = hasRealData ? { ...fallbackOverview, ...mapped } : fallbackOverview

  const handlePeriodChange = useCallback((key: PeriodKey) => {
    setPeriod(key)
  }, [])

  if (error && !rawApi) {
    return (
      <>
        <Header title="NADZORNA PLOČA" subtitle="Pregled" />
        <ErrorState message={`Greška pri učitavanju podataka: ${error}`} onRetry={refetch} />
      </>
    )
  }

  if (loading && !rawApi) {
    return <DashboardLoadingSkeleton />
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
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  Prijenos uzivo
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-dinamo-muted">
                  <Zap className="w-3 h-3 text-dinamo-accent" />
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
                  className={`flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 hover:bg-white transition-all border border-gray-200 border-l-[3px] ${iconInfo.border} ${item.link ? 'cursor-pointer group' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg ${iconInfo.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={15} className={iconInfo.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 leading-snug">{item.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[11px] text-gray-400">{relativeTime}</p>
                      {item.link && (
                        <ExternalLink size={10} className="text-gray-300 group-hover:text-dinamo-blue transition-colors" />
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
              <p className="text-xs text-gray-400 -mt-0.5">AI uvidi i prijedlozi za poboljšanje</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RECOMMENDATIONS.map(rec => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
