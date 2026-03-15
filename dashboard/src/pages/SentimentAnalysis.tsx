import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { useApi } from '../hooks/useApi'
import { useChannelStatus } from '../hooks/useChannelStatus'
import { useProjectStatus } from '../hooks/useProjectStatus'
import { useClient } from '../contexts/ClientContext'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import { SentimentDonut } from '../components/charts/SentimentDonut'
import { EngagementChart } from '../components/charts/EngagementChart'
import {
  AlertTriangle, TrendingUp, TrendingDown, Hash, Heart, Link2,
  FolderKanban, Info, MessageSquare, Loader2, Sparkles, Shield,
  ThumbsUp, ThumbsDown, Minus, Clock, MessageCircle, Eye,
  Zap,
} from 'lucide-react'
import { formatNumber } from '../utils/formatters'

/* ─────────── types ─────────── */

interface SentimentOverview {
  hasData: boolean
  positive: number
  neutral: number
  negative: number
  positiveChange: string
  neutralChange: string
  negativeChange: string
  timeline: Array<{ date: string; engagement: number; reach: number }>
  topics: Array<{ topic: string; mentions: number; sentiment: string; change: string; icon: string }>
  alerts: Array<{
    id: number; severity: string; title: string
    description: string; time: string; platform: string; mentions: number
  }>
  wordCloud?: Array<{ text: string; value: number; sentiment: string }>
  sampleComments?: Record<string, Array<{ text: string; platform: string; confidence: number }>>
  totalComments?: number
  crisisAlert?: { type: string; message: string } | null
  _meta?: {
    is_estimate: boolean
    connected_platforms: string[]
    analyzed_at: string | null
  }
}

interface SentimentExample {
  text: string
  platform: string
  confidence: number
  analyzed_at: string
}

interface SentimentExamplesResponse {
  type: string
  examples: SentimentExample[]
}

/* ─────────── Estimate Banner ─────────── */

function EstimateBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
      <Info size={16} className="text-amber-500 flex-shrink-0" />
      <p className="text-xs text-amber-400/80">
        <span className="font-semibold text-amber-400">Procijenjeni podaci</span> — prikazane su benchmark procjene dok AI analizira vaše komentare. Analiza započinje automatski.
      </p>
    </div>
  )
}

/* ─────────── Crisis Alert Banner ─────────── */

function CrisisAlertBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-red-500/10 border border-red-500/20">
      <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
        <Shield size={20} className="text-red-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-red-400">Moguca kriza na društvenim mrežama</p>
        <p className="text-xs text-red-400/70 mt-0.5">{message}</p>
      </div>
    </div>
  )
}

/* ─────────── AI Insight Card ─────────── */

function SentimentAIInsight({
  positive,
  negative,
  totalComments,
  isEstimate,
  brandName,
  connectedPlatforms,
}: {
  positive: number
  negative: number
  neutral: number
  totalComments: number
  isEstimate: boolean
  brandName: string
  connectedPlatforms: string[]
}) {
  const insight = useMemo(() => {
    if (isEstimate) {
      const platNames = connectedPlatforms.map(p =>
        p === 'instagram' ? 'Instagram' :
        p === 'facebook' ? 'Facebook' :
        p === 'tiktok' ? 'TikTok' :
        p === 'youtube' ? 'YouTube' :
        p === 'linkedin' ? 'LinkedIn' : p
      ).join(', ')
      return {
        icon: Zap,
        color: '#f59e0b',
        title: 'Analiza u tijeku',
        text: `AI skenira komentare s ${platNames} za ${brandName}. Procjena: ${positive}% pozitivnog sentimenta na temelju sličnih brendova u industriji.`,
      }
    }

    if (negative > 20) {
      return {
        icon: AlertTriangle,
        color: '#ef4444',
        title: 'Upozorenje',
        text: `${negative}% komentara je negativno. ${brandName} bi trebao provjeriti nedavne komentare i reagirati na nezadovoljstvo korisnika. Najčešće pritužbe su vidljive u sekciji ispod.`,
      }
    }

    if (positive > 70) {
      return {
        icon: Heart,
        color: '#22c55e',
        title: 'Odličan sentiment',
        text: `${brandName} ima ${positive}% pozitivnog sentimenta iz ${formatNumber(totalComments)} analiziranih komentara. Publika je zadovoljna — iskoristite ovaj momentum za kampanje temeljene na recenzijama.`,
      }
    }

    return {
      icon: Sparkles,
      color: '#0ea5e9',
      title: 'Pregled sentimenta',
      text: `AI je analizirao ${formatNumber(totalComments)} komentara za ${brandName}. Sentiment je ${positive > 50 ? 'pretežno pozitivan' : 'uravnotežen'} s ${positive}% pozitivnih interakcija.`,
    }
  }, [positive, negative, totalComments, isEstimate, brandName, connectedPlatforms])

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
            <span className="text-studio-text-tertiary">·</span>
            <span className="text-xs text-studio-text-tertiary">{insight.title}</span>
          </div>
          <p className="text-sm text-studio-text-secondary leading-relaxed">{insight.text}</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Sentiment Score Card (big numbers) ─────────── */

function SentimentScoreCard({
  label,
  value,
  change,
  icon: Icon,
  color,
  bgColor,
  borderColor,
  onClick,
  isExpanded,
}: {
  label: string
  value: number
  change: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  onClick: () => void
  isExpanded: boolean
}) {
  const isPositiveChange = change.startsWith('+') && !change.startsWith('+0')
  const isNegativeChange = change.startsWith('-') && !change.startsWith('-0')

  return (
    <div
      className={`${bgColor} border ${borderColor} rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.02] ${
        isExpanded ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={color} />
        <span className="text-xs font-medium text-studio-text-secondary uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-4xl font-bold font-mono ${color}`}>{value}%</p>
      <div className="flex items-center gap-1.5 mt-2">
        {isPositiveChange ? (
          <TrendingUp size={12} className="text-emerald-500" />
        ) : isNegativeChange ? (
          <TrendingDown size={12} className="text-red-400" />
        ) : (
          <Minus size={12} className="text-studio-text-tertiary" />
        )}
        <span className={`text-xs font-mono ${
          isPositiveChange ? 'text-emerald-500' : isNegativeChange ? 'text-red-400' : 'text-studio-text-tertiary'
        }`}>
          {change}
        </span>
        <span className="text-[10px] text-studio-text-tertiary">vs prošli tjedan</span>
      </div>
      <button className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-3 transition-colors">
        <Eye size={11} /> {isExpanded ? 'Zatvori komentare' : 'Vidi komentare'}
      </button>
    </div>
  )
}

/* ─────────── Word Cloud ─────────── */

function WordCloud({ words }: { words: Array<{ text: string; value: number; sentiment: string }> }) {
  if (!words || words.length === 0) return null

  const maxVal = Math.max(...words.map(w => w.value), 1)

  const sentimentColor = (s: string) => {
    if (s === 'positive') return 'text-emerald-400'
    if (s === 'negative') return 'text-red-400'
    return 'text-studio-text-secondary'
  }

  // Sort by value descending and take top 20
  const sorted = [...words].sort((a, b) => b.value - a.value).slice(0, 20)

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Hash size={18} className="text-blue-400" />
        <h3 className="font-headline text-base tracking-wider text-studio-text-primary">Oblak riječi</h3>
      </div>
      <div className="flex flex-wrap gap-2 items-center justify-center py-4">
        {sorted.map((word) => {
          const scale = 0.6 + (word.value / maxVal) * 1.2
          const fontSize = Math.max(11, Math.min(28, Math.round(scale * 14)))
          const opacity = 0.5 + (word.value / maxVal) * 0.5
          return (
            <span
              key={word.text}
              className={`font-medium cursor-default transition-all hover:scale-110 ${sentimentColor(word.sentiment)}`}
              style={{ fontSize: `${fontSize}px`, opacity }}
              title={`${word.text}: ${word.value} spominjanja (${word.sentiment})`}
            >
              {word.text}
            </span>
          )
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-studio-text-tertiary">Pozitivno</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-[10px] text-studio-text-tertiary">Neutralno</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-[10px] text-studio-text-tertiary">Negativno</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Top Comments Panel ─────────── */

function TopCommentsPanel({
  comments,
  type,
}: {
  comments: Array<{ text: string; platform: string; confidence: number }>
  type: 'positive' | 'negative' | 'neutral'
}) {
  if (!comments || comments.length === 0) {
    return (
      <p className="text-sm text-studio-text-tertiary py-4 text-center">
        Nema primjera za ovaj tip sentimenta.
      </p>
    )
  }

  const config = {
    positive: { icon: ThumbsUp, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/10' },
    negative: { icon: ThumbsDown, color: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/10' },
    neutral: { icon: Minus, color: 'text-gray-400', bg: 'bg-gray-500/5', border: 'border-gray-500/10' },
  }
  const c = config[type]
  const CommentIcon = c.icon

  return (
    <div className="space-y-2">
      {comments.map((comment, i) => (
        <div key={i} className={`${c.bg} ${c.border} border rounded-lg p-3.5`}>
          <div className="flex items-start gap-2.5">
            <CommentIcon size={14} className={`${c.color} mt-0.5 flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-studio-text-primary leading-relaxed">"{comment.text}"</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] text-studio-text-tertiary capitalize">{comment.platform}</span>
                <span className="text-[10px] text-studio-text-tertiary">
                  Pouzdanost: {(comment.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────── Metadata Transparency ─────────── */

function MetadataBar({
  totalComments,
  analyzedAt,
  isEstimate,
}: {
  totalComments: number
  analyzedAt: string | null
  isEstimate: boolean
}) {
  let timeAgo = ''
  if (analyzedAt) {
    const diff = Date.now() - new Date(analyzedAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) timeAgo = 'upravo sada'
    else if (mins < 60) timeAgo = `prije ${mins} minuta`
    else {
      const hrs = Math.floor(mins / 60)
      timeAgo = hrs < 24 ? `prije ${hrs} sati` : `prije ${Math.floor(hrs / 24)} dana`
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] text-studio-text-tertiary">
      {totalComments > 0 && (
        <div className="flex items-center gap-1.5">
          <MessageCircle size={12} />
          <span>Temeljeno na <span className="font-semibold text-studio-text-secondary">{formatNumber(totalComments)}</span> komentara</span>
        </div>
      )}
      {analyzedAt && (
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>Analizirano {timeAgo}</span>
        </div>
      )}
      {isEstimate && (
        <div className="flex items-center gap-1.5 text-amber-400/60">
          <Info size={12} />
          <span>Procjena</span>
        </div>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function SentimentAnalysis() {
  const { data: apiData, loading } = useApi<SentimentOverview>('/sentiment/overview')
  const { hasConnectedChannels } = useChannelStatus()
  const { hasProjects } = useProjectStatus()
  const { currentClient } = useClient()
  const navigate = useNavigate()

  const [expandedSentiment, setExpandedSentiment] = useState<'positive' | 'negative' | 'neutral' | null>(null)

  // Legacy: fetch examples from separate endpoint when we have real data
  const { data: examplesData, loading: examplesLoading } = useApi<SentimentExamplesResponse>(
    expandedSentiment && !apiData?.sampleComments ? `/sentiment/examples?sentiment_type=${expandedSentiment}` : '',
    !!expandedSentiment && !apiData?.sampleComments,
  )

  const data = apiData
  const isEstimate = data?._meta?.is_estimate || false
  const connectedPlatforms = data?._meta?.connected_platforms || []
  const brandName = currentClient?.client_name || 'Vaš brend'

  /* ─── Empty states ─── */

  if (!hasProjects) {
    return (
      <div>
        <Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" />
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

  // Only block if NO social handles at all
  if (!hasConnectedChannels) {
    return (
      <div>
        <Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" />
        <div className="page-wrapper">
          <EmptyState
            icon={Heart}
            title="Povežite društvene mreže"
            description="Dodajte Instagram, TikTok ili Facebook profil u Brand Profile da biste aktivirali analizu sentimenta."
            variant="hero"
            action={
              <button
                onClick={() => navigate('/brand-profile?tab=mreze')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent-hover transition-all shadow-sm"
              >
                <Link2 size={16} />
                Dodaj kanale
              </button>
            }
          />
        </div>
      </div>
    )
  }

  if (loading && !apiData) return (
    <>
      <Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={3} cols="grid grid-cols-1 lg:grid-cols-3 gap-6" />
        <ChartSkeleton />
      </div>
    </>
  )

  // If no data at all and no estimate (safety net)
  if (!data || (!data.hasData && !isEstimate && data.positive === 0 && data.negative === 0)) {
    return (
      <div>
        <Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" />
        <div className="page-wrapper">
          <EmptyState
            icon={Heart}
            variant="hero"
            title="AI analizira vašu publiku..."
            description="Sentiment analiza je pokrenuta. Podaci će se pojaviti u roku od nekoliko minuta."
            action={
              <div className="flex items-center gap-2 text-brand-accent">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm font-medium">Analiza u tijeku...</span>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  // Get comments for expanded section
  const getExpandedComments = () => {
    if (!expandedSentiment) return []

    // First try inline sampleComments
    if (data.sampleComments && data.sampleComments[expandedSentiment]) {
      return data.sampleComments[expandedSentiment]
    }
    // Fallback to separate API call
    if (examplesData?.examples) {
      return examplesData.examples.map(ex => ({
        text: ex.text,
        platform: ex.platform,
        confidence: ex.confidence,
      }))
    }
    return []
  }

  return (
    <div>
      <Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" />

      <div className="page-wrapper space-y-6">

        {/* Crisis Alert */}
        {data.crisisAlert && <CrisisAlertBanner message={data.crisisAlert.message} />}

        {/* Estimate Banner */}
        {isEstimate && <EstimateBanner />}

        {/* AI Insight */}
        <SentimentAIInsight
          positive={data.positive}
          negative={data.negative}
          neutral={data.neutral}
          totalComments={data.totalComments || 0}
          isEstimate={isEstimate}
          brandName={brandName}
          connectedPlatforms={connectedPlatforms}
        />

        {/* Metadata */}
        <MetadataBar
          totalComments={data.totalComments || 0}
          analyzedAt={data._meta?.analyzed_at || null}
          isEstimate={isEstimate}
        />

        {/* ═══ Sentiment Score Cards + Donut ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Donut */}
          <div className="card">
            <SentimentDonut
              positive={data.positive}
              neutral={data.neutral}
              negative={data.negative}
              title="Ukupni sentiment"
            />
          </div>

          {/* Score Cards */}
          <SentimentScoreCard
            label="Pozitivno"
            value={data.positive}
            change={data.positiveChange}
            icon={ThumbsUp}
            color="text-emerald-500"
            bgColor="bg-emerald-500/5"
            borderColor="border-emerald-500/10"
            onClick={() => setExpandedSentiment(expandedSentiment === 'positive' ? null : 'positive')}
            isExpanded={expandedSentiment === 'positive'}
          />
          <SentimentScoreCard
            label="Neutralno"
            value={data.neutral}
            change={data.neutralChange}
            icon={Minus}
            color="text-studio-text-secondary"
            bgColor="bg-studio-surface-0"
            borderColor="border-studio-border"
            onClick={() => setExpandedSentiment(expandedSentiment === 'neutral' ? null : 'neutral')}
            isExpanded={expandedSentiment === 'neutral'}
          />
          <SentimentScoreCard
            label="Negativno"
            value={data.negative}
            change={data.negativeChange}
            icon={ThumbsDown}
            color="text-red-400"
            bgColor="bg-red-500/5"
            borderColor="border-red-500/10"
            onClick={() => setExpandedSentiment(expandedSentiment === 'negative' ? null : 'negative')}
            isExpanded={expandedSentiment === 'negative'}
          />
        </div>

        {/* Expanded comments panel */}
        {expandedSentiment && (
          <div className="card animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-blue-400" />
              <h4 className="text-sm font-semibold text-studio-text-primary">
                {expandedSentiment === 'positive' ? 'Top pozitivni' :
                 expandedSentiment === 'negative' ? 'Top negativni' : 'Neutralni'} komentari
              </h4>
            </div>
            {examplesLoading && !data.sampleComments ? (
              <div className="flex items-center gap-2 py-6 justify-center text-studio-text-tertiary text-sm">
                <Loader2 size={14} className="animate-spin" />
                Učitavanje primjera...
              </div>
            ) : (
              <TopCommentsPanel
                comments={getExpandedComments()}
                type={expandedSentiment}
              />
            )}
          </div>
        )}

        {/* ═══ Trend Chart ═══ */}
        {data.timeline && data.timeline.length > 0 && (
          <div className="card">
            <EngagementChart
              data={data.timeline}
              title="Trend sentimenta (pozitivni % vs negativni %)"
            />
          </div>
        )}

        {/* ═══ Word Cloud + Topics ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Word Cloud */}
          {data.wordCloud && data.wordCloud.length > 0 && (
            <div className="card">
              <WordCloud words={data.wordCloud} />
            </div>
          )}

          {/* Top Topics */}
          {data.topics && data.topics.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Hash size={18} className="text-blue-400" />
                <h3 className="font-headline text-base tracking-wider text-studio-text-primary">Najčešće teme</h3>
              </div>
              <div className="space-y-3">
                {data.topics.map((topic) => (
                  <div key={topic.topic} className="flex items-center justify-between p-3.5 bg-studio-surface-0 rounded-xl hover:bg-studio-surface-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{topic.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-studio-text-primary">{topic.topic}</p>
                        <p className="text-xs text-studio-text-secondary">{topic.mentions.toLocaleString()} spominjanja</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        topic.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400' :
                        topic.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' :
                        topic.sentiment === 'mixed' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-studio-surface-2 text-studio-text-secondary'
                      }`}>
                        {topic.sentiment === 'positive' ? 'pozitivno' :
                         topic.sentiment === 'negative' ? 'negativno' :
                         topic.sentiment === 'mixed' ? 'mješovito' : 'neutralno'}
                      </span>
                      <p className="text-[11px] mt-1.5 text-studio-text-tertiary font-mono">
                        {topic.change}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ Alerts ═══ */}
        {data.alerts && data.alerts.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-amber-500" />
              <h3 className="font-headline text-base tracking-wider text-studio-text-primary">Upozorenja sentimenta</h3>
            </div>
            <div className="space-y-3">
              {data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border ${
                    alert.severity === 'warning'
                      ? 'bg-amber-500/5 border-amber-500/10'
                      : 'bg-blue-500/5 border-blue-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className={`text-sm font-semibold ${
                      alert.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                    }`}>
                      {alert.title}
                    </h4>
                    <span className="text-[10px] text-studio-text-tertiary font-mono">{alert.time}</span>
                  </div>
                  <p className="text-xs text-studio-text-secondary mt-2 leading-relaxed">{alert.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[10px] text-studio-text-tertiary">{alert.platform}</span>
                    {alert.mentions > 0 && (
                      <>
                        <span className="text-[10px] text-studio-text-tertiary">·</span>
                        <span className="text-[10px] text-studio-text-tertiary">{alert.mentions} spominjanja</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
