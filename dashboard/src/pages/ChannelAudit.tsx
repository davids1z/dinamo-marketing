import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import PlatformIcon from '../components/common/PlatformIcon'
import { EngagementChart } from '../components/charts/EngagementChart'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { useProjectStatus } from '../hooks/useProjectStatus'
import { useClient } from '../contexts/ClientContext'
import EmptyState from '../components/common/EmptyState'
import {
  Trophy, TrendingUp, TrendingDown, Eye, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, Clock, Link2, FolderKanban,
  Info, Zap, Sparkles, CheckCircle, AlertTriangle, XCircle,
  Lightbulb, Activity, Shield, Radio,
} from 'lucide-react'
import { PLATFORMS } from '../utils/constants'
import { formatNumber } from '../utils/formatters'

/* ─────────── types ─────────── */

interface PlatformStat {
  platform: string
  followers: number
  prevFollowers: number
  engagement: number
  prevEngagement: number
  reach: number
  icon: string
  contentCount?: number
}

interface FormatBreakdownItem {
  type: string
  share: number
  posts: number
  avgEngagement: number
}

interface PostingTimeSlot {
  day: string
  hour: number
  score: number
}

interface ChecklistItem {
  text: string
  status: 'good' | 'warning' | 'critical'
}

interface PlatformChecklist {
  platform: string
  name: string
  items: ChecklistItem[]
}

interface IndustryComparison {
  yourEngagement: number
  industryAvg: number
  verdict: string
}

interface ChannelData {
  hasData?: boolean
  platformStats: PlatformStat[]
  engagementData30: Array<{ date: string; engagement: number; reach: number }>
  formatBreakdown: FormatBreakdownItem[]
  postingTimes?: PostingTimeSlot[]
  checklist?: PlatformChecklist[]
  aiAdvice?: string
  overallScore?: number
  industryComparison?: IndustryComparison
  _meta?: {
    is_estimate: boolean
    connected_platforms?: string[]
    analyzed_at: string | null
  }
}

/* ─────────── Health Score Helpers ─────────── */

function calculateHealthScore(p: PlatformStat): number {
  const followerGrowth = ((p.followers - p.prevFollowers) / Math.max(p.prevFollowers, 1)) * 100
  const reachRatio = (p.reach / Math.max(p.followers, 1)) * 100
  const engagementScore = Math.min(p.engagement * 15, 100)
  const growthScore = Math.min(Math.max(followerGrowth * 10, 0), 100)
  const reachScore = Math.min(reachRatio / 4, 100)
  return Math.round(engagementScore * 0.4 + growthScore * 0.3 + reachScore * 0.3)
}

function getHealthLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: 'Odlično', color: 'text-green-400', bg: 'bg-green-500/10' }
  if (score >= 60) return { label: 'Dobro', color: 'text-blue-400', bg: 'bg-blue-500/10' }
  if (score >= 40) return { label: 'Potrebno poboljšanje', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
  return { label: 'Kritično', color: 'text-red-400', bg: 'bg-red-500/10' }
}

function healthRingColor(score: number): string {
  if (score >= 80) return '#22C55E'
  if (score >= 60) return '#3B82F6'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

function pctChange(current: number, prev: number): number {
  if (prev === 0) return 0
  return ((current - prev) / prev) * 100
}

/* ─────────── Posting Times ─────────── */

function heatColor(score: number): string {
  if (score >= 80) return 'bg-blue-700 text-white'
  if (score >= 60) return 'bg-blue-500 text-white'
  if (score >= 40) return 'bg-blue-300 text-blue-900'
  if (score >= 20) return 'bg-blue-100 text-blue-400'
  return 'bg-studio-surface-2 text-studio-text-tertiary'
}

const DAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']
const TIME_SLOTS = [6, 8, 10, 12, 14, 16, 18, 20, 22]

function generatePostingTimes(): PostingTimeSlot[] {
  const slots: PostingTimeSlot[] = []
  const peakMap: Record<string, number[]> = {
    Pon: [8, 12, 18], Uto: [10, 14, 20], Sri: [8, 12, 20],
    Čet: [10, 18, 20], Pet: [12, 16, 20], Sub: [10, 14, 18], Ned: [10, 12, 16],
  }
  for (const day of DAYS) {
    for (const hour of TIME_SLOTS) {
      const peaks = peakMap[day] || []
      const isPeak = peaks.includes(hour)
      const isNearPeak = peaks.some(p => Math.abs(p - hour) <= 2)
      let base = 15 + Math.floor(Math.random() * 20)
      if (isNearPeak) base += 25
      if (isPeak) base += 30
      slots.push({ day, hour, score: Math.min(base, 100) })
    }
  }
  return slots
}

/* ─────────── EstimateBanner ─────────── */

function EstimateBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
      <Info size={16} className="text-amber-500 flex-shrink-0" />
      <p className="text-xs text-amber-400/80">
        <span className="font-semibold text-amber-400">Procijenjeni podaci</span> — prikazani su benchmark rezultati dok AI analizira vaše kanale. Audit započinje automatski nakon prikupljanja prvih podataka.
      </p>
    </div>
  )
}

/* ─────────── AI Insight Card ─────────── */

function AuditAIInsight({
  overallScore,
  isEstimate,
  brandName,
  connectedPlatforms,
  industryComparison,
}: {
  overallScore: number
  isEstimate: boolean
  brandName: string
  connectedPlatforms: string[]
  industryComparison?: IndustryComparison
}) {
  const platDisplayName = (p: string) =>
    p === 'instagram' ? 'Instagram' : p === 'facebook' ? 'Facebook' :
    p === 'tiktok' ? 'TikTok' : p === 'youtube' ? 'YouTube' :
    p === 'linkedin' ? 'LinkedIn' : p === 'twitter' ? 'X' : p

  const insight = useMemo(() => {
    if (isEstimate) {
      const platNames = connectedPlatforms.map(platDisplayName).join(', ')
      return {
        icon: Zap,
        color: '#f59e0b',
        title: 'Analiziramo vaše kanale',
        text: `AI skenira ${platNames} za ${brandName}. Procjena zdravlja: ${overallScore}/100 na temelju benchmark podataka sličnih brendova.`,
      }
    }

    if (overallScore >= 80) {
      return {
        icon: Sparkles,
        color: '#22c55e',
        title: 'Izvrsno zdravlje kanala',
        text: `${brandName} ima ukupnu ocjenu ${overallScore}/100. ${industryComparison ? `Vaš angažman (${industryComparison.yourEngagement}%) je ${industryComparison.verdict} industrijskog prosjeka (${industryComparison.industryAvg}%).` : ''} Nastavite s aktualnom strategijom.`,
      }
    }

    if (overallScore >= 60) {
      return {
        icon: Activity,
        color: '#0ea5e9',
        title: 'Dobra osnova za rast',
        text: `Ocjena ${overallScore}/100 za ${brandName}. ${industryComparison ? `Angažman od ${industryComparison.yourEngagement}% je ${industryComparison.verdict} prosjeka industrije (${industryComparison.industryAvg}%).` : ''} Pogledajte AI preporuke za poboljšanje.`,
      }
    }

    return {
      icon: AlertTriangle,
      color: '#ef4444',
      title: 'Potrebna optimizacija',
      text: `Ocjena ${overallScore}/100 za ${brandName}. Postoji značajan prostor za poboljšanje. ${industryComparison ? `Vaš angažman (${industryComparison.yourEngagement}%) je ${industryComparison.verdict} prosjeka (${industryComparison.industryAvg}%).` : ''} Pratite AI checklist ispod.`,
    }
  }, [overallScore, isEstimate, brandName, connectedPlatforms, industryComparison])

  const InsightIcon = insight.icon

  return (
    <div
      className="rounded-xl border border-white/5 p-5 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${insight.color}08, ${insight.color}03)` }}
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: insight.color }} />
      <div className="relative flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${insight.color}20` }}>
          <InsightIcon size={20} style={{ color: insight.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: insight.color }}>AI Insight</span>
            <span className="text-studio-text-tertiary">&middot;</span>
            <span className="text-xs text-studio-text-tertiary">{insight.title}</span>
          </div>
          <p className="text-sm text-studio-text-secondary leading-relaxed">{insight.text}</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Overall Score Ring (large) ─────────── */

function OverallScoreRing({ score }: { score: number }) {
  const health = getHealthLabel(score)
  const ringPct = Math.min(score, 100)

  return (
    <div className="card flex items-center gap-6">
      <div className="relative w-24 h-24 shrink-0">
        <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#2A2A2A" strokeWidth="2.5" />
          <circle
            cx="18" cy="18" r="15"
            fill="none"
            stroke={healthRingColor(score)}
            strokeWidth="2.5"
            strokeDasharray={`${ringPct * 0.942} 100`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-stats text-studio-text-primary">
          {score}
        </span>
      </div>
      <div>
        <h3 className="font-headline text-base tracking-wider text-studio-text-primary mb-1">Ukupno zdravlje kanala</h3>
        <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${health.bg} ${health.color}`}>
          {score >= 80 ? <Shield size={14} /> : score >= 60 ? <Activity size={14} /> : <AlertTriangle size={14} />}
          {health.label}
        </span>
        <p className="text-xs text-studio-text-secondary mt-2">Na temelju angažmana, rasta pratitelja i dosega svih povezanih kanala</p>
      </div>
    </div>
  )
}

/* ─────────── AI Checklist ─────────── */

function AuditChecklist({ checklist }: { checklist: PlatformChecklist[] }) {
  const statusIcon = (status: string) => {
    if (status === 'good') return <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
    if (status === 'warning') return <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
    return <XCircle size={14} className="text-red-400 flex-shrink-0" />
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <Shield size={18} className="text-brand-accent" />
        <h3 className="font-headline text-base tracking-wider text-studio-text-primary">AI preporuke po kanalu</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {checklist.map((plat) => (
          <div key={plat.platform} className="p-4 rounded-xl bg-studio-surface-0 border border-studio-border-subtle">
            <div className="flex items-center gap-2 mb-3">
              <PlatformIcon platform={plat.platform} size="sm" />
              <span className="text-sm font-semibold text-studio-text-primary">{plat.name}</span>
            </div>
            <div className="space-y-2">
              {plat.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  {statusIcon(item.status)}
                  <span className={`text-xs leading-relaxed ${
                    item.status === 'good' ? 'text-studio-text-secondary' :
                    item.status === 'warning' ? 'text-yellow-300/80' :
                    'text-red-300/80'
                  }`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────── AI Savjet Dana ─────────── */

function AIDailyAdvice({ advice }: { advice: string }) {
  return (
    <div className="card border border-brand-accent/15 bg-gradient-to-r from-brand-accent/5 to-transparent">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
          <Lightbulb size={22} className="text-brand-accent" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">AI savjet dana</span>
            <span className="text-[10px] text-studio-text-tertiary px-1.5 py-0.5 rounded bg-studio-surface-2">
              {new Date().toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <p className="text-sm text-studio-text-secondary leading-relaxed">{advice}</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Industry Comparison Bar ─────────── */

function IndustryComparisonCard({ comparison }: { comparison: IndustryComparison }) {
  const isAbove = comparison.verdict === 'iznad'
  const maxVal = Math.max(comparison.yourEngagement, comparison.industryAvg) * 1.2

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={18} className="text-brand-accent" />
        <h3 className="font-headline text-base tracking-wider text-studio-text-primary">Usporedba s industrijom</h3>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-brand-accent">Vaš angažman</span>
            <span className="text-sm font-stats text-studio-text-primary">{comparison.yourEngagement}%</span>
          </div>
          <div className="h-3 bg-studio-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(comparison.yourEngagement / maxVal) * 100}%`,
                backgroundColor: isAbove ? '#22c55e' : '#ef4444',
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-studio-text-secondary">Prosjek industrije</span>
            <span className="text-sm font-stats text-studio-text-primary">{comparison.industryAvg}%</span>
          </div>
          <div className="h-3 bg-studio-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-studio-text-tertiary transition-all duration-700"
              style={{ width: `${(comparison.industryAvg / maxVal) * 100}%` }}
            />
          </div>
        </div>
      </div>
      <div className={`mt-4 p-3 rounded-lg ${isAbove ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
        <p className={`text-xs font-medium ${isAbove ? 'text-green-400' : 'text-red-400'}`}>
          {isAbove
            ? `Super vam ide! Vaš angažman je ${(comparison.yourEngagement - comparison.industryAvg).toFixed(1)} postotnih bodova iznad prosjeka.`
            : `Postoji prostor za rast. Vaš angažman je ${(comparison.industryAvg - comparison.yourEngagement).toFixed(1)} postotnih bodova ispod prosjeka industrije.`
          }
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function ChannelAudit() {
  const { data: apiData, loading } = useApi<ChannelData>('/channels')
  const { hasProjects } = useProjectStatus()
  const { currentClient } = useClient()
  const navigate = useNavigate()

  const brandName = currentClient?.client_name || 'Vaš brend'

  const data = apiData || { platformStats: [], engagementData30: [], formatBreakdown: [] }
  // useMemo prevents new array references on every render (react-hooks/exhaustive-deps)
  const platformStats = useMemo(() => data.platformStats || [], [data.platformStats])
  const engagementData30 = data.engagementData30 || []
  const formatBreakdown = useMemo(() => data.formatBreakdown || [], [data.formatBreakdown])
  const postingTimes = data.postingTimes || generatePostingTimes()
  const checklist = data.checklist || []
  const aiAdvice = data.aiAdvice || ''
  const industryComparison = data.industryComparison
  const isEstimate = data._meta?.is_estimate ?? false
  const connectedPlatforms = data._meta?.connected_platforms ?? []

  // Health scores per platform
  const platformsWithHealth = useMemo(
    () =>
      platformStats.map(p => ({
        ...p,
        healthScore: calculateHealthScore(p),
        followerGrowth: pctChange(p.followers, p.prevFollowers),
        engagementChange: pctChange(p.engagement, p.prevEngagement),
      })),
    [platformStats],
  )

  // Overall score
  const overallScore = data.overallScore ??
    (platformsWithHealth.length > 0
      ? Math.round(platformsWithHealth.reduce((s, p) => s + p.healthScore, 0) / platformsWithHealth.length)
      : 0)

  // Cross-platform benchmarks
  const benchmarks = useMemo(() => {
    if (platformsWithHealth.length === 0) return null
    const bestEngagement = platformsWithHealth.reduce((best, p) => (p.engagement > best.engagement ? p : best), platformsWithHealth[0]!)
    const avgEngagement = platformsWithHealth.reduce((sum, p) => sum + p.engagement, 0) / platformsWithHealth.length
    const totalReach = platformsWithHealth.reduce((sum, p) => sum + p.reach, 0)
    const highestGrowth = platformsWithHealth.reduce((best, p) => (p.followerGrowth > best.followerGrowth ? p : best), platformsWithHealth[0]!)
    return { bestEngagement, avgEngagement, totalReach, highestGrowth }
  }, [platformsWithHealth])

  // Format recommendations
  const formatRecommendations = useMemo(() => {
    if (formatBreakdown.length === 0) return []
    const avgEngAll = formatBreakdown.reduce((s, f) => s + f.avgEngagement, 0) / formatBreakdown.length
    return formatBreakdown.map(f => {
      const engagementRatio = f.avgEngagement / (avgEngAll || 1)
      const shareRatio = f.share / (100 / formatBreakdown.length)
      let recommendation: 'increase' | 'maintain' | 'decrease'
      if (engagementRatio > 1.2 && shareRatio < 1.3) {
        recommendation = 'increase'
      } else if (engagementRatio < 0.8 && shareRatio > 1.0) {
        recommendation = 'decrease'
      } else {
        recommendation = 'maintain'
      }
      return { ...f, recommendation }
    })
  }, [formatBreakdown])

  /* ─── Project guard ─── */
  if (!hasProjects) {
    return (
      <div>
        <Header title="AUDIT KANALA" subtitle="Skeniranje zdravlja vaših društvenih mreža" />
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
      <Header title="AUDIT KANALA" subtitle="Skeniranje zdravlja vaših društvenih mreža" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={1} cols="grid grid-cols-1" />
        <CardSkeleton count={3} cols="grid grid-cols-1 sm:grid-cols-3 gap-4" />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </>
  )

  /* ─── No channels and no data ─── */
  if (!apiData?.hasData && platformStats.length === 0) {
    return (
      <div>
        <Header title="AUDIT KANALA" subtitle="Skeniranje zdravlja vaših društvenih mreža" />
        <div className="page-wrapper">
          <EmptyState
            icon={Radio}
            title="Dodajte kanale za audit"
            description="Unesite profile društvenih mreža u Profil brenda kako bi AI mogao skenirati zdravlje vaših kanala."
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
      <Header title="AUDIT KANALA" subtitle="Skeniranje zdravlja vaših društvenih mreža" />

      <div className="page-wrapper space-y-6">

        {/* ── Estimate Banner ── */}
        {isEstimate && <EstimateBanner />}

        {/* ── AI Insight Card ── */}
        <AuditAIInsight
          overallScore={overallScore}
          isEstimate={isEstimate}
          brandName={brandName}
          connectedPlatforms={connectedPlatforms}
          industryComparison={industryComparison}
        />

        {/* ── Overall Score + Industry Comparison ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OverallScoreRing score={overallScore} />
          {industryComparison && <IndustryComparisonCard comparison={industryComparison} />}
        </div>

        {/* ── Platform Health Cards ── */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${platformsWithHealth.length <= 3 ? 'lg:grid-cols-3' : platformsWithHealth.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-4 stagger-children`}>
          {platformsWithHealth.map(p => {
            const health = getHealthLabel(p.healthScore)
            const ringPct = Math.min(p.healthScore, 100)
            return (
              <div key={p.platform} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <PlatformIcon platform={p.platform} size="md" showLabel />
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.followerGrowth >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {p.followerGrowth >= 0 ? '+' : ''}{p.followerGrowth.toFixed(1)}%
                  </span>
                </div>

                <div>
                  <p className="text-2xl font-stats text-studio-text-primary">
                    {p.platform === 'web' ? `${formatNumber(p.followers)} posj.` : formatNumber(p.followers)}
                  </p>
                  <p className="text-xs text-studio-text-secondary mt-1">
                    Stopa ang.: <span className="font-medium text-studio-text-primary">{p.engagement}%</span>
                    <span className={`ml-1.5 ${p.engagementChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({p.engagementChange >= 0 ? '+' : ''}{p.engagementChange.toFixed(1)}%)
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="relative w-11 h-11 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#2A2A2A" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15"
                        fill="none"
                        stroke={healthRingColor(p.healthScore)}
                        strokeWidth="3"
                        strokeDasharray={`${ringPct * 0.942} 100`}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-studio-text-primary">
                      {p.healthScore}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${health.bg} ${health.color}`}>
                    {health.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── AI Checklist (per platform) ── */}
        {checklist.length > 0 && <AuditChecklist checklist={checklist} />}

        {/* ── AI Savjet Dana ── */}
        {aiAdvice && <AIDailyAdvice advice={aiAdvice} />}

        {/* ── Cross-Platform Benchmarks ── */}
        {benchmarks && (
          <div className="card">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-brand-accent" />
              Usporedba platformi
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-500/10 rounded-xl p-4 space-y-1">
                <p className="text-xs text-blue-400 font-medium">Najbolji angažman</p>
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={benchmarks.bestEngagement.platform} size="sm" />
                  <span className="text-lg font-stats text-studio-text-primary">
                    {(PLATFORMS as Record<string, { name: string }>)[benchmarks.bestEngagement.platform]?.name || benchmarks.bestEngagement.platform}
                  </span>
                </div>
                <p className="text-sm text-blue-400 font-medium">{benchmarks.bestEngagement.engagement}%</p>
              </div>
              <div className="bg-studio-surface-0 rounded-xl p-4 space-y-1">
                <p className="text-xs text-studio-text-secondary font-medium">Prosječni angažman</p>
                <p className="text-lg font-stats text-studio-text-primary">{benchmarks.avgEngagement.toFixed(2)}%</p>
                <p className="text-xs text-studio-text-secondary">Sve platforme</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4 space-y-1">
                <p className="text-xs text-green-400 font-medium">Ukupni doseg</p>
                <div className="flex items-center gap-1.5">
                  <Eye size={16} className="text-green-400" />
                  <p className="text-lg font-stats text-studio-text-primary">{formatNumber(benchmarks.totalReach)}</p>
                </div>
                <p className="text-xs text-studio-text-secondary">Kombinirani doseg</p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-4 space-y-1">
                <p className="text-xs text-emerald-400 font-medium">Najveći rast</p>
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={benchmarks.highestGrowth.platform} size="sm" />
                  <span className="text-lg font-stats text-studio-text-primary">
                    {(PLATFORMS as Record<string, { name: string }>)[benchmarks.highestGrowth.platform]?.name || benchmarks.highestGrowth.platform}
                  </span>
                </div>
                <p className="text-sm text-emerald-400 font-medium flex items-center gap-0.5">
                  <TrendingUp size={14} />
                  +{benchmarks.highestGrowth.followerGrowth.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── 30-Day Engagement Chart ── */}
        {engagementData30.length > 0 && (
          <div className="card">
            <EngagementChart data={engagementData30} title="30-dnevni angažman i doseg (sve platforme)" />
          </div>
        )}

        {/* ── Optimal Posting Times Heatmap ── */}
        <div className="card">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Clock size={18} className="text-brand-accent" />
            Optimalno vrijeme objave
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 px-2 text-studio-text-secondary font-medium w-16">Dan</th>
                  {TIME_SLOTS.map(h => (
                    <th key={h} className="text-center py-2 px-1 text-studio-text-secondary font-medium text-xs">
                      {h.toString().padStart(2, '0')}:00
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day}>
                    <td className="py-1.5 px-2 text-studio-text-primary font-medium text-xs">{day}</td>
                    {TIME_SLOTS.map(hour => {
                      const slot = postingTimes.find(s => s.day === day && s.hour === hour)
                      const score = slot?.score ?? 0
                      return (
                        <td key={hour} className="py-1.5 px-1">
                          <div
                            className={`w-full h-8 rounded flex items-center justify-center text-[10px] font-medium ${heatColor(score)}`}
                            title={`${day} ${hour}:00 - Score: ${score}`}
                          >
                            {score}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-studio-text-secondary">
            <span>Legenda:</span>
            <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-studio-surface-2 inline-block" /> Nizak</span>
            <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-blue-100 inline-block" /> Umjeren</span>
            <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-blue-300 inline-block" /> Dobar</span>
            <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-blue-500 inline-block" /> Visok</span>
            <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-blue-700 inline-block" /> Vrh</span>
          </div>
        </div>

        {/* ── Content Format Breakdown + Recommendations ── */}
        {formatRecommendations.length > 0 && (
          <div className="card">
            <h2 className="section-title mb-4">Raspodjela formata sadržaja</h2>
            <div className="space-y-3">
              {formatRecommendations.map(f => (
                <div key={f.type} className="flex items-center gap-4">
                  <span className="text-sm text-studio-text-secondary w-40 shrink-0 truncate">{f.type}</span>
                  <div className="flex-1 bg-studio-surface-3 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-brand-accent to-brand-accent/60 h-3 rounded-full transition-all"
                      style={{ width: `${f.share}%` }}
                    />
                  </div>
                  <span className="text-sm text-studio-text-secondary w-12 text-right hidden sm:flex justify-end">{f.share}%</span>
                  <span className="text-sm text-studio-text-secondary w-20 text-right hidden sm:flex justify-end">{f.posts} objava</span>
                  <span className="text-sm text-emerald-400 w-16 text-right hidden sm:flex justify-end">{f.avgEngagement}% ang</span>
                  <span className={`hidden md:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                    f.recommendation === 'increase'
                      ? 'bg-green-500/10 text-green-400'
                      : f.recommendation === 'decrease'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-studio-surface-2 text-studio-text-secondary'
                  }`}>
                    {f.recommendation === 'increase' && <><ArrowUpRight size={12} /> Povećaj</>}
                    {f.recommendation === 'decrease' && <><ArrowDownRight size={12} /> Smanji</>}
                    {f.recommendation === 'maintain' && <><Minus size={12} /> Zadrži</>}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-studio-border-subtle">
              <p className="text-xs text-studio-text-secondary">
                Preporuke se temelje na omjeru angažmana i udjela. Formati s visokim angažmanom ali niskim udjelom dobivaju oznaku "Povećaj".
              </p>
            </div>
          </div>
        )}

        {/* ── Platform Comparison Table ── */}
        {platformsWithHealth.length > 1 && (
          <div className="card">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-yellow-500" />
              Usporedna tablica platformi
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-studio-border">
                    <th className="text-left py-3 px-4 text-studio-text-secondary font-medium">Platforma</th>
                    <th className="text-right py-3 px-4 text-studio-text-secondary font-medium">Pratitelji</th>
                    <th className="text-right py-3 px-4 text-studio-text-secondary font-medium">Angažman</th>
                    <th className="text-right py-3 px-4 text-studio-text-secondary font-medium hidden sm:table-cell">Doseg</th>
                    <th className="text-right py-3 px-4 text-studio-text-secondary font-medium hidden md:table-cell">Rast</th>
                    <th className="text-right py-3 px-4 text-studio-text-secondary font-medium hidden md:table-cell">Objave</th>
                    <th className="text-right py-3 px-4 text-studio-text-secondary font-medium">Zdravlje</th>
                  </tr>
                </thead>
                <tbody>
                  {platformsWithHealth
                    .slice()
                    .sort((a, b) => b.healthScore - a.healthScore)
                    .map((p, idx) => {
                      const health = getHealthLabel(p.healthScore)
                      const isTop = idx === 0
                      return (
                        <tr key={p.platform} className={`border-b border-studio-border-subtle hover:bg-studio-surface-1 ${isTop ? 'bg-yellow-500/5' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {isTop && <Trophy size={14} className="text-yellow-500" />}
                              <PlatformIcon platform={p.platform} size="sm" showLabel />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-studio-text-primary font-mono font-medium">
                            {formatNumber(p.followers)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-studio-text-primary font-medium">{p.engagement}%</span>
                            <span className={`ml-1.5 text-xs ${p.engagementChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {p.engagementChange >= 0 ? '+' : ''}{p.engagementChange.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-studio-text-primary font-mono hidden sm:table-cell">
                            {formatNumber(p.reach)}
                          </td>
                          <td className="py-3 px-4 text-right hidden md:table-cell">
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                              p.followerGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {p.followerGrowth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {p.followerGrowth >= 0 ? '+' : ''}{p.followerGrowth.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-studio-text-primary font-mono hidden md:table-cell">
                            {p.contentCount ?? '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${health.bg} ${health.color}`}>
                              {p.healthScore}
                              <span className="hidden lg:inline">/ 100</span>
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
