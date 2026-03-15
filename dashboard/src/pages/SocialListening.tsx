import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { useApi } from '../hooks/useApi'
import { useChannelStatus } from '../hooks/useChannelStatus'
import { useProjectStatus } from '../hooks/useProjectStatus'
import { useClient } from '../contexts/ClientContext'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import MetricCard from '../components/common/MetricCard'
import PlatformIcon from '../components/common/PlatformIcon'
import { SentimentDonut } from '../components/charts/SentimentDonut'
import {
  MessageSquare, Volume2, TrendingUp, Hash, Globe,
  ThumbsUp, ThumbsDown, Minus, AlertTriangle, ShieldCheck,
  Filter, Reply, Search, Link2, FolderKanban,
  Sparkles, Info, Zap, Clock, Tag, Radio,
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { SHIFTONEZERO_BRAND } from '../utils/constants'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { CHART_ANIM, AXIS_STYLE, GRID_STYLE } from '../components/charts/chartConfig'
import { formatNumber } from '../utils/formatters'

/* ─────────── types ─────────── */

interface SentimentDay {
  date: string
  positive: number
  neutral: number
  negative: number
}

interface MentionVolumeDay {
  date: string
  mentions: number
}

interface CompetitorMention {
  name: string
  mentions: number
  color: string
}

interface SourceBreakdown {
  platform: string
  name: string
  percentage: number
  mentions: number
}

interface SocialListeningData {
  metrics: {
    totalMentions: number
    prevMentions: number
    shareOfVoice: number
    prevShareOfVoice: number
    trendingCount: number
    sentimentPositive: number
    sentimentNeutral: number
    sentimentNegative: number
  }
  recentMentions: Array<{
    id: number
    platform: string
    author: string
    text: string
    sentiment: string
    time: string
    reach: number
  }>
  trendingTopics: Array<{
    id: number
    topic: string
    mentions: number
    change: string
    velocity: string
  }>
  sentimentTimeline: SentimentDay[]
  mentionVolume: MentionVolumeDay[]
  competitorMentions: CompetitorMention[]
  sourceBreakdown?: SourceBreakdown[]
  _meta?: {
    is_estimate: boolean
    connected_platforms: string[]
    tracked_keywords: string[]
    analyzed_at: string | null
  }
}

/* ─────────── constants ─────────── */

const CRISIS_THRESHOLD = 20

const SENTIMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'Svi' },
  { value: 'positive', label: 'Pozitivni' },
  { value: 'neutral', label: 'Neutralni' },
  { value: 'negative', label: 'Negativni' },
] as const

const PLATFORM_FILTER_OPTIONS = [
  { value: 'all', label: 'Sve platforme' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
] as const

const SOURCE_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  facebook: '#1877F2',
  tiktok: '#000000',
  youtube: '#FF0000',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
}

/* ─────────── helpers ─────────── */

const sentimentIcon = (s: string) => {
  if (s === 'positive') return <ThumbsUp size={14} className="text-green-600" />
  if (s === 'negative') return <ThumbsDown size={14} className="text-red-400" />
  return <Minus size={14} className="text-studio-text-secondary" />
}

const sentimentLabel = (s: string) => {
  if (s === 'positive') return 'pozitivno'
  if (s === 'negative') return 'negativno'
  return 'neutralno'
}

const platDisplayName = (p: string) =>
  p === 'instagram' ? 'Instagram' :
  p === 'facebook' ? 'Facebook' :
  p === 'tiktok' ? 'TikTok' :
  p === 'youtube' ? 'YouTube' :
  p === 'linkedin' ? 'LinkedIn' :
  p === 'twitter' ? 'X / Twitter' : p

/* ─────────── EstimateBanner ─────────── */

function EstimateBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
      <Info size={16} className="text-amber-500 flex-shrink-0" />
      <p className="text-xs text-amber-400/80">
        <span className="font-semibold text-amber-400">Procijenjeni podaci</span> — prikazane su benchmark procjene dok AI analizira spominjanja vašeg brenda. Prikupljanje podataka je u tijeku.
      </p>
    </div>
  )
}

/* ─────────── AI Insight Card ─────────── */

function ListeningAIInsight({
  totalMentions,
  shareOfVoice,
  negativePercent,
  isEstimate,
  brandName,
  connectedPlatforms,
  trackedKeywords,
}: {
  totalMentions: number
  shareOfVoice: number
  negativePercent: number
  isEstimate: boolean
  brandName: string
  connectedPlatforms: string[]
  trackedKeywords: string[]
}) {
  const insight = useMemo(() => {
    if (isEstimate) {
      const platNames = connectedPlatforms.map(platDisplayName).join(', ')
      const kwList = trackedKeywords.slice(0, 3).join(', ')
      return {
        icon: Zap,
        color: '#f59e0b',
        title: 'Skeniranje u tijeku',
        text: `AI pretražuje ${platNames} za ključne riječi: ${kwList}. Procjena: ${totalMentions} spominjanja u zadnjih 7 dana na temelju sličnih brendova.`,
      }
    }

    if (negativePercent > CRISIS_THRESHOLD) {
      return {
        icon: AlertTriangle,
        color: '#ef4444',
        title: 'Potrebna pažnja',
        text: `${negativePercent.toFixed(0)}% spominjanja ${brandName} je negativno. Provjerite nedavne komentare i razmotrite reakciju na kritike korisnika.`,
      }
    }

    if (shareOfVoice > 60) {
      return {
        icon: Sparkles,
        color: '#22c55e',
        title: 'Jaka pozicija',
        text: `${brandName} dominira razgovorima s ${shareOfVoice}% udjela u komunikaciji i ${formatNumber(totalMentions)} spominjanja. Iskoristite pozitivan momentum za kampanje s korisničkim sadržajem.`,
      }
    }

    return {
      icon: Radio,
      color: '#0ea5e9',
      title: 'Pregled spominjanja',
      text: `AI je prikupio ${formatNumber(totalMentions)} spominjanja za ${brandName}. Udio u komunikaciji je ${shareOfVoice}% — ${shareOfVoice > 40 ? 'stabilna pozicija na tržištu' : 'postoji prostor za rast vidljivosti'}.`,
    }
  }, [totalMentions, shareOfVoice, negativePercent, isEstimate, brandName, connectedPlatforms, trackedKeywords])

  const InsightIcon = insight.icon

  return (
    <div
      className="rounded-xl border border-white/5 p-5 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${insight.color}08, ${insight.color}03)` }}
    >
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{ background: insight.color }}
      />
      <div className="relative flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${insight.color}20` }}
        >
          <InsightIcon size={20} style={{ color: insight.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: insight.color }}>
              AI Insight
            </span>
            <span className="text-studio-text-tertiary">&middot;</span>
            <span className="text-xs text-studio-text-tertiary">{insight.title}</span>
          </div>
          <p className="text-sm text-studio-text-secondary leading-relaxed">{insight.text}</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Tracked Keywords Strip ─────────── */

function TrackedKeywords({ keywords }: { keywords: string[] }) {
  if (!keywords.length) return null
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Tag size={14} className="text-studio-text-tertiary flex-shrink-0" />
      <span className="text-xs text-studio-text-tertiary">Praćene riječi:</span>
      {keywords.map((kw) => (
        <span
          key={kw}
          className="text-xs px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent font-medium"
        >
          {kw}
        </span>
      ))}
    </div>
  )
}

/* ─────────── Source Breakdown ─────────── */

function SourceBreakdownCard({ sources }: { sources: SourceBreakdown[] }) {
  if (!sources.length) return null

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <Globe size={18} className="text-brand-accent" />
        <h3 className="font-headline text-base tracking-wider text-studio-text-primary">Izvori spominjanja</h3>
      </div>
      <div className="space-y-4">
        {sources.map((src) => (
          <div key={src.platform}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={src.platform} size="sm" />
                <span className="text-sm font-medium text-studio-text-primary">{src.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-studio-text-secondary">{src.mentions.toLocaleString()} spom.</span>
                <span className="text-xs font-mono font-semibold text-studio-text-primary">{src.percentage}%</span>
              </div>
            </div>
            <div className="h-2 bg-studio-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${src.percentage}%`,
                  backgroundColor: SOURCE_COLORS[src.platform] || SHIFTONEZERO_BRAND.colors.blue,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────── Metadata Bar ─────────── */

function MetadataBar({
  totalMentions,
  analyzedAt,
  isEstimate,
}: {
  totalMentions: number
  analyzedAt: string | null
  isEstimate: boolean
}) {
  const timeAgo = useMemo(() => {
    if (!analyzedAt) return null
    const diff = Date.now() - new Date(analyzedAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'upravo'
    if (mins < 60) return `prije ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `prije ${hrs}h`
    return `prije ${Math.floor(hrs / 24)}d`
  }, [analyzedAt])

  return (
    <div className="flex items-center gap-4 flex-wrap text-xs text-studio-text-tertiary">
      <div className="flex items-center gap-1.5">
        <MessageSquare size={12} />
        <span>Temeljeno na <span className="font-semibold text-studio-text-secondary">{formatNumber(totalMentions)}</span> spominjanja</span>
      </div>
      {timeAgo && (
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>Ažurirano {timeAgo}</span>
        </div>
      )}
      {isEstimate && (
        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold">
          procjena
        </span>
      )}
    </div>
  )
}

/* ─────────── empty metrics fallback ─────────── */

const emptyMetrics: SocialListeningData['metrics'] = {
  totalMentions: 0,
  prevMentions: 0,
  shareOfVoice: 0,
  prevShareOfVoice: 0,
  trendingCount: 0,
  sentimentPositive: 0,
  sentimentNeutral: 0,
  sentimentNegative: 0,
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function SocialListening() {
  const { data: apiData, loading } = useApi<SocialListeningData>('/social-listening/trending')
  const { hasConnectedChannels } = useChannelStatus()
  const { hasProjects } = useProjectStatus()
  const { currentClient } = useClient()
  const navigate = useNavigate()

  const brandName = currentClient?.client_name || 'Vaš brend'

  const data: SocialListeningData = apiData
    ? {
        metrics: apiData.metrics ?? emptyMetrics,
        recentMentions: apiData.recentMentions ?? [],
        trendingTopics: apiData.trendingTopics ?? [],
        sentimentTimeline: apiData.sentimentTimeline ?? [],
        mentionVolume: apiData.mentionVolume ?? [],
        competitorMentions: apiData.competitorMentions ?? [],
        sourceBreakdown: apiData.sourceBreakdown ?? [],
        _meta: apiData._meta,
      }
    : {
        metrics: emptyMetrics,
        recentMentions: [],
        trendingTopics: [],
        sentimentTimeline: [],
        mentionVolume: [],
        competitorMentions: [],
        sourceBreakdown: [],
      }

  const isEstimate = data._meta?.is_estimate ?? false
  const connectedPlatforms = data._meta?.connected_platforms ?? []
  const trackedKeywords = data._meta?.tracked_keywords ?? []
  const analyzedAt = data._meta?.analyzed_at ?? null

  // Filters
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')

  // Derived
  const totalSentiment = data.metrics.sentimentPositive + data.metrics.sentimentNeutral + data.metrics.sentimentNegative
  const negativePercent = totalSentiment > 0 ? (data.metrics.sentimentNegative / totalSentiment) * 100 : 0
  const isCrisis = negativePercent > CRISIS_THRESHOLD

  const maxReach = useMemo(
    () => Math.max(...data.recentMentions.map((m) => m.reach), 1),
    [data.recentMentions],
  )

  const filteredMentions = useMemo(() => {
    return data.recentMentions.filter((m) => {
      if (sentimentFilter !== 'all' && m.sentiment !== sentimentFilter) return false
      if (platformFilter !== 'all' && m.platform !== platformFilter) return false
      return true
    })
  }, [data.recentMentions, sentimentFilter, platformFilter])

  const maxCompetitorMentions = useMemo(
    () => Math.max(...data.competitorMentions.map((c) => c.mentions), 1),
    [data.competitorMentions],
  )

  /* ─── Project guard ─── */
  if (!hasProjects) {
    return (
      <div>
        <Header title="PRAĆENJE SPOMINJANJA" subtitle="Saznajte što se o vašem brendu priča na internetu" />
        <div className="page-wrapper">
          <EmptyState
            icon={FolderKanban}
            variant="hero"
            title="Kreirajte prvi projekt"
            description="Projekti organiziraju kampanje, sadržaj i izvještaje. Kreirajte projekt za pristup ovoj stranici."
            action={
              <button
                onClick={() => navigate('/onboarding')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover transition-all shadow-md shadow-brand-accent/20"
              >
                <FolderKanban size={16} />
                Kreiraj projekt
              </button>
            }
          />
        </div>
      </div>
    )
  }

  /* ─── Loading state ─── */
  if (loading && !apiData) return (
    <>
      <Header title="PRAĆENJE SPOMINJANJA" subtitle="Saznajte što se o vašem brendu priča na internetu" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={1} cols="grid grid-cols-1" />
        <CardSkeleton count={3} cols="grid grid-cols-1 sm:grid-cols-3 gap-4" />
        <div className="content-grid"><ChartSkeleton /><ChartSkeleton /></div>
      </div>
    </>
  )

  /* ─── No channels and no data ─── */
  if (!hasConnectedChannels && !data.metrics.totalMentions) {
    return (
      <div>
        <Header title="PRAĆENJE SPOMINJANJA" subtitle="Saznajte što se o vašem brendu priča na internetu" />
        <div className="page-wrapper">
          <EmptyState
            icon={Radio}
            title="Dodajte kanale za praćenje"
            description="Unesite profile društvenih mreža u Profil brenda kako bi AI mogao pratiti spominjanja vašeg brenda."
            variant="hero"
            action={
              <button
                onClick={() => navigate('/brand-profile?tab=mreze')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent-hover transition-all shadow-sm"
              >
                <Link2 size={16} />
                Postavi kanale
              </button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="PRAĆENJE SPOMINJANJA" subtitle="Saznajte što se o vašem brendu priča na internetu" />

      <div className="page-wrapper space-y-6">

        {/* ── Estimate Banner ── */}
        {isEstimate && <EstimateBanner />}

        {/* ── AI Insight Card ── */}
        <ListeningAIInsight
          totalMentions={data.metrics.totalMentions}
          shareOfVoice={data.metrics.shareOfVoice}
          negativePercent={negativePercent}
          isEstimate={isEstimate}
          brandName={brandName}
          connectedPlatforms={connectedPlatforms}
          trackedKeywords={trackedKeywords}
        />

        {/* ── Crisis / OK Alert ── */}
        {isCrisis ? (
          <div className="flex items-center justify-between gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">
                    Krizni signal
                  </span>
                </div>
                <p className="text-sm text-red-300">
                  Negativni sentiment je na <span className="font-semibold">{negativePercent.toFixed(1)}%</span> &mdash; iznad praga od {CRISIS_THRESHOLD}%.
                  Provjerite recentne negativne reakcije.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSentimentFilter('negative')}
              className="flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Pogledaj
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} className="text-green-400" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full">
                Nema kriznih signala
              </span>
              <p className="text-sm text-green-300 mt-1">
                Negativni sentiment je na {negativePercent.toFixed(1)}% &mdash; ispod praga od {CRISIS_THRESHOLD}%. Sve je u redu.
              </p>
            </div>
          </div>
        )}

        {/* ── Tracked Keywords ── */}
        {trackedKeywords.length > 0 && <TrackedKeywords keywords={trackedKeywords} />}

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Ukupno spominjanja" value={data.metrics.totalMentions} previousValue={data.metrics.prevMentions} format="number" icon={MessageSquare} />
          <MetricCard label="Udio u komunikaciji" value={data.metrics.shareOfVoice} previousValue={data.metrics.prevShareOfVoice} format="percent" icon={Volume2} />
          <MetricCard label="Aktivni trendovi" value={data.metrics.trendingCount} format="number" icon={TrendingUp} />
        </div>

        {/* ── Charts row: Sentiment Donut + Mention Volume ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sentiment Donut */}
          <div className="card">
            <SentimentDonut
              positive={data.metrics.sentimentPositive}
              neutral={data.metrics.sentimentNeutral}
              negative={data.metrics.sentimentNegative}
              title="Distribucija sentimenta"
            />
          </div>

          {/* Mention Volume Area Chart */}
          <div className="card">
            <h3 className="font-headline text-base tracking-wider text-studio-text-primary mb-5">Volumen spominjanja (14 dana)</h3>
            {data.mentionVolume.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.mentionVolume} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mentionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SHIFTONEZERO_BRAND.colors.blue} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={SHIFTONEZERO_BRAND.colors.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="date" {...AXIS_STYLE} dy={8} />
                  <YAxis {...AXIS_STYLE} dx={-4} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="mentions"
                    stroke={SHIFTONEZERO_BRAND.colors.blue}
                    strokeWidth={2.5}
                    fill="url(#mentionGrad)"
                    dot={{ r: 3, fill: SHIFTONEZERO_BRAND.colors.blue, stroke: '#1e293b', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: SHIFTONEZERO_BRAND.colors.blue, stroke: '#fff', strokeWidth: 2 }}
                    name="Spominjanja"
                    animationDuration={CHART_ANIM.areaDuration}
                    animationEasing={CHART_ANIM.areaEasing}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-studio-text-tertiary">
                Nema podataka o volumenu
              </div>
            )}
          </div>
        </div>

        {/* ── Sentiment Timeline + Source Breakdown + Competitor Comparison ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sentiment Timeline Line Chart */}
          <div className="lg:col-span-2 card">
            <h3 className="font-headline text-base tracking-wider text-studio-text-primary mb-5">Kretanje sentimenta (14 dana)</h3>
            {data.sentimentTimeline.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.sentimentTimeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="date" {...AXIS_STYLE} dy={8} />
                    <YAxis {...AXIS_STYLE} dx={-4} unit="%" domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip formatter={(value: number) => `${value}%`} />} />
                    <Line type="monotone" dataKey="positive" stroke={SHIFTONEZERO_BRAND.colors.positive} strokeWidth={2.5}
                      dot={{ r: 2, fill: SHIFTONEZERO_BRAND.colors.positive, stroke: '#1e293b', strokeWidth: 2 }}
                      activeDot={{ r: 4, fill: SHIFTONEZERO_BRAND.colors.positive, stroke: '#fff', strokeWidth: 2 }}
                      name="Pozitivno"
                      animationDuration={CHART_ANIM.lineDuration} animationEasing={CHART_ANIM.lineEasing}
                    />
                    <Line type="monotone" dataKey="neutral" stroke={SHIFTONEZERO_BRAND.colors.neutral} strokeWidth={2.5}
                      dot={{ r: 2, fill: SHIFTONEZERO_BRAND.colors.neutral, stroke: '#1e293b', strokeWidth: 2 }}
                      activeDot={{ r: 4, fill: SHIFTONEZERO_BRAND.colors.neutral, stroke: '#fff', strokeWidth: 2 }}
                      name="Neutralno"
                      animationDuration={CHART_ANIM.lineDuration} animationEasing={CHART_ANIM.lineEasing} animationBegin={200}
                    />
                    <Line type="monotone" dataKey="negative" stroke={SHIFTONEZERO_BRAND.colors.negative} strokeWidth={2.5}
                      dot={{ r: 2, fill: SHIFTONEZERO_BRAND.colors.negative, stroke: '#1e293b', strokeWidth: 2 }}
                      activeDot={{ r: 4, fill: SHIFTONEZERO_BRAND.colors.negative, stroke: '#fff', strokeWidth: 2 }}
                      name="Negativno"
                      animationDuration={CHART_ANIM.lineDuration} animationEasing={CHART_ANIM.lineEasing} animationBegin={400}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-5 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: SHIFTONEZERO_BRAND.colors.positive }} />
                    <span className="text-xs text-studio-text-secondary">Pozitivno</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: SHIFTONEZERO_BRAND.colors.neutral }} />
                    <span className="text-xs text-studio-text-secondary">Neutralno</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: SHIFTONEZERO_BRAND.colors.negative }} />
                    <span className="text-xs text-studio-text-secondary">Negativno</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-sm text-studio-text-tertiary">
                Nema podataka o sentimentu
              </div>
            )}
          </div>

          {/* Source Breakdown or Competitor Comparison */}
          {data.sourceBreakdown && data.sourceBreakdown.length > 0 ? (
            <SourceBreakdownCard sources={data.sourceBreakdown} />
          ) : (
            <div className="card">
              <h3 className="font-headline text-base tracking-wider text-studio-text-primary mb-5">Usporedba s konkurencijom</h3>
              {data.competitorMentions.length > 0 ? (
                <div className="space-y-4">
                  {data.competitorMentions.map((comp) => {
                    const pct = (comp.mentions / maxCompetitorMentions) * 100
                    return (
                      <div key={comp.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-studio-text-primary">{comp.name}</span>
                          <span className="text-xs font-mono text-studio-text-secondary">{comp.mentions.toLocaleString()}</span>
                        </div>
                        <div className="h-2.5 bg-studio-surface-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: comp.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-sm text-studio-text-tertiary">
                  Dodajte konkurente u Profil brenda
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Competitor Comparison (when Source Breakdown exists, show competitors below) ── */}
        {data.sourceBreakdown && data.sourceBreakdown.length > 0 && data.competitorMentions.length > 0 && (
          <div className="card">
            <h3 className="font-headline text-base tracking-wider text-studio-text-primary mb-5">Udio u komunikaciji (Share of Voice)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.competitorMentions.map((comp, idx) => {
                const pct = (comp.mentions / maxCompetitorMentions) * 100
                const isOwn = idx === 0 || comp.color === '#0EA5E9'
                return (
                  <div
                    key={comp.name}
                    className={`p-4 rounded-xl border transition-colors ${
                      isOwn
                        ? 'border-brand-accent/20 bg-brand-accent/5'
                        : 'border-studio-border bg-studio-surface-1'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${isOwn ? 'text-brand-accent' : 'text-studio-text-primary'}`}>
                        {comp.name}
                      </span>
                      {isOwn && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 rounded">
                          Vi
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-stats text-studio-text-primary">{comp.mentions.toLocaleString()}</p>
                    <p className="text-xs text-studio-text-secondary mt-0.5">spominjanja</p>
                    <div className="h-1.5 bg-studio-surface-2 rounded-full overflow-hidden mt-3">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: comp.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Mentions List + Trending Topics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Mentions List */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe size={20} className="text-brand-accent" />
                <h2 className="section-title">Nedavna spominjanja</h2>
              </div>
              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-studio-text-tertiary pointer-events-none" />
                  <select
                    value={sentimentFilter}
                    onChange={(e) => setSentimentFilter(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-studio-border rounded-lg bg-studio-surface-1 text-studio-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent/40 appearance-none cursor-pointer"
                  >
                    {SENTIMENT_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-studio-text-tertiary pointer-events-none" />
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-studio-border rounded-lg bg-studio-surface-1 text-studio-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent/40 appearance-none cursor-pointer"
                  >
                    {PLATFORM_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {filteredMentions.length === 0 ? (
              <div className="py-10 text-center text-sm text-studio-text-tertiary">Nema rezultata za odabrane filtere.</div>
            ) : (
              <div className="space-y-3">
                {filteredMentions.map((mention) => {
                  const reachPct = (mention.reach / maxReach) * 100
                  return (
                    <div key={mention.id} className="p-4 bg-studio-surface-0 rounded-lg hover:bg-studio-surface-2 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={mention.platform} size="sm" />
                          <span className="text-sm font-medium text-brand-accent">{mention.author}</span>
                          {sentimentIcon(mention.sentiment)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-studio-text-secondary">{mention.time}</span>
                          <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-accent bg-brand-accent/10 rounded-lg hover:bg-brand-accent/20 transition-colors">
                            <Reply size={12} />
                            Odgovori
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-studio-text-secondary mt-2 leading-relaxed">{mention.text}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          mention.sentiment === 'positive' ? 'bg-green-500/10 text-green-400' :
                          mention.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' :
                          'bg-studio-surface-2 text-studio-text-secondary'
                        }`}>
                          {sentimentLabel(mention.sentiment)}
                        </span>
                        <span className="text-xs text-studio-text-secondary">
                          Doseg: {mention.reach >= 1000 ? `${(mention.reach / 1000).toFixed(1)}K` : mention.reach.toLocaleString()}
                        </span>
                        {/* Reach magnitude bar */}
                        <div className="flex-1 max-w-[120px]">
                          <div className="h-1.5 bg-studio-surface-3 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${reachPct}%`,
                                backgroundColor:
                                  reachPct > 70 ? SHIFTONEZERO_BRAND.colors.positive :
                                  reachPct > 40 ? SHIFTONEZERO_BRAND.colors.blue :
                                  SHIFTONEZERO_BRAND.colors.neutral,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Trending Topics */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Hash size={20} className="text-purple-600" />
              <h2 className="section-title">Trendovi u usponu</h2>
            </div>
            {data.trendingTopics.length > 0 ? (
              <div className="space-y-3">
                {data.trendingTopics.map((topic, index) => (
                  <div key={topic.id} className="flex items-center justify-between p-3 bg-studio-surface-0 rounded-lg hover:bg-studio-surface-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-studio-text-secondary font-mono w-4">{index + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-studio-text-primary">{topic.topic}</p>
                        <p className="text-xs text-studio-text-secondary">{topic.mentions.toLocaleString()} spominjanja</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono ${
                        topic.velocity === 'u porastu' ? 'text-red-400' :
                        topic.velocity === 'raste' ? 'text-green-600' :
                        'text-studio-text-secondary'
                      }`}>
                        {topic.change}
                      </span>
                      <p className={`text-xs mt-0.5 ${
                        topic.velocity === 'u porastu' ? 'text-red-400' :
                        topic.velocity === 'raste' ? 'text-green-600' :
                        'text-studio-text-secondary'
                      }`}>
                        {topic.velocity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-studio-text-tertiary">
                Nema aktivnih trendova
              </div>
            )}
          </div>
        </div>

        {/* ── Metadata Bar ── */}
        <MetadataBar
          totalMentions={data.metrics.totalMentions}
          analyzedAt={analyzedAt}
          isEstimate={isEstimate}
        />

      </div>
    </div>
  )
}
