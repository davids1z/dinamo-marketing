import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import PlatformIcon from '../components/common/PlatformIcon'
import { EngagementChart } from '../components/charts/EngagementChart'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { useChannelStatus } from '../hooks/useChannelStatus'
import { useProjectStatus } from '../hooks/useProjectStatus'
import EmptyState from '../components/common/EmptyState'
import { Trophy, TrendingUp, TrendingDown, Eye, BarChart3, ArrowUpRight, ArrowDownRight, Minus, Clock, Link2, FolderKanban } from 'lucide-react'
import { PLATFORMS } from '../utils/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  score: number // 0-100
}

interface ChannelData {
  platformStats: PlatformStat[]
  engagementData30: Array<{ date: string; engagement: number; reach: number }>
  formatBreakdown: FormatBreakdownItem[]
  postingTimes?: PostingTimeSlot[]
}

// ---------------------------------------------------------------------------
// Health Score Helpers
// ---------------------------------------------------------------------------

function calculateHealthScore(p: PlatformStat): number {
  const followerGrowth = ((p.followers - p.prevFollowers) / p.prevFollowers) * 100
  const reachRatio = (p.reach / p.followers) * 100

  // Engagement contributes 40%, follower growth 30%, reach ratio 30%
  const engagementScore = Math.min(p.engagement * 15, 100)
  const growthScore = Math.min(Math.max(followerGrowth * 10, 0), 100)
  const reachScore = Math.min(reachRatio / 4, 100)

  return Math.round(engagementScore * 0.4 + growthScore * 0.3 + reachScore * 0.3)
}

function getHealthLabel(score: number): { label: string; color: string; bg: string; ring: string } {
  if (score >= 80) return { label: 'Odlično', color: 'text-green-400', bg: 'bg-green-500/10', ring: 'ring-green-500' }
  if (score >= 60) return { label: 'Dobro', color: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-500' }
  if (score >= 40) return { label: 'Potrebno poboljšanje', color: 'text-yellow-400', bg: 'bg-yellow-500/10', ring: 'ring-yellow-500' }
  return { label: 'Kritično', color: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500' }
}

function healthRingColor(score: number): string {
  if (score >= 80) return '#22C55E'
  if (score >= 60) return '#3B82F6'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

// ---------------------------------------------------------------------------
// Format Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function pctChange(current: number, prev: number): number {
  if (prev === 0) return 0
  return ((current - prev) / prev) * 100
}

// ---------------------------------------------------------------------------
// Posting Times Heatmap Color
// ---------------------------------------------------------------------------

function heatColor(score: number): string {
  if (score >= 80) return 'bg-blue-700 text-white'
  if (score >= 60) return 'bg-blue-500 text-white'
  if (score >= 40) return 'bg-blue-300 text-blue-900'
  if (score >= 20) return 'bg-blue-100 text-blue-400'
  return 'bg-studio-surface-2 text-studio-text-tertiary'
}

// ---------------------------------------------------------------------------
// Fallback mock data
// ---------------------------------------------------------------------------

const DAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']
const TIME_SLOTS = [6, 8, 10, 12, 14, 16, 18, 20, 22]

function generatePostingTimes(): PostingTimeSlot[] {
  const slots: PostingTimeSlot[] = []
  const peakMap: Record<string, number[]> = {
    Pon: [8, 12, 18],
    Uto: [10, 14, 20],
    Sri: [8, 12, 20],
    Čet: [10, 18, 20],
    Pet: [12, 16, 20],
    Sub: [10, 14, 18],
    Ned: [10, 12, 16],
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChannelAudit() {
  const { data: apiData, loading } = useApi<ChannelData>('/channels')
  const { hasConnectedChannels } = useChannelStatus()
  const { hasProjects } = useProjectStatus()
  const navigate = useNavigate()
  const data = apiData || { platformStats: [], engagementData30: [], formatBreakdown: [], postingTimes: [] }

  // Resolved data with safe fallbacks
  const platformStats = data.platformStats || []
  const engagementData30 = data.engagementData30 || []
  const formatBreakdown = data.formatBreakdown || []
  const postingTimes = data.postingTimes || generatePostingTimes()

  // Health scores per platform
  const platformsWithHealth = useMemo(
    () =>
      platformStats.map(p => ({
        ...p,
        healthScore: calculateHealthScore(p),
        followerGrowth: pctChange(p.followers, p.prevFollowers),
        engagementChange: pctChange(p.engagement, p.prevEngagement),
      })),
    [platformStats]
  )

  // Cross-platform benchmark calculations
  const benchmarks = useMemo(() => {
    const bestEngagement = platformsWithHealth.reduce((best, p) => (p.engagement > best.engagement ? p : best), platformsWithHealth[0]!)
    const avgEngagement = platformsWithHealth.reduce((sum, p) => sum + p.engagement, 0) / platformsWithHealth.length
    const totalReach = platformsWithHealth.reduce((sum, p) => sum + p.reach, 0)
    const highestGrowth = platformsWithHealth.reduce((best, p) => (p.followerGrowth > best.followerGrowth ? p : best), platformsWithHealth[0]!)
    return { bestEngagement, avgEngagement, totalReach, highestGrowth }
  }, [platformsWithHealth])

  // Format recommendations based on engagement vs share ratio
  const formatRecommendations = useMemo(() => {
    const avgEngAll = formatBreakdown.reduce((s, f) => s + f.avgEngagement, 0) / formatBreakdown.length
    return formatBreakdown.map(f => {
      const engagementRatio = f.avgEngagement / avgEngAll
      const shareRatio = f.share / (100 / formatBreakdown.length) // normalised share vs even split
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

  if (!hasProjects) {
    return (
      <div>
        <Header title="AUDIT KANALA" subtitle="Performanse platformi i provjera zdravlja" />
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

  if (!hasConnectedChannels) {
    return (
      <div>
        <Header title="AUDIT KANALA" subtitle="Performanse platformi i provjera zdravlja" />
        <div className="page-wrapper">
          <EmptyState
            icon={BarChart3}
            title="Kanali nisu povezani"
            description="Povežite Instagram, TikTok, YouTube ili Facebook za detaljan audit performansi svakog kanala."
            variant="hero"
            action={
              <button
                onClick={() => navigate('/brand-profile?tab=mreze')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent-hover transition-all shadow-sm"
              >
                <Link2 size={16} />
                Poveži kanale za audit
              </button>
            }
          />
        </div>
      </div>
    )
  }

  // Loading state
  if (loading && !apiData) return (
    <>
      <Header title="AUDIT KANALA" subtitle="Performanse platformi i provjera zdravlja" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={5} cols="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </>
  )

  // No audit data available yet
  const hasAuditData = apiData?.platformStats && apiData.platformStats.length > 0
  if (!loading && !hasAuditData) {
    return (
      <div>
        <Header title="AUDIT KANALA" subtitle="Performanse platformi i provjera zdravlja" />
        <div className="page-wrapper">
          <EmptyState
            icon={BarChart3}
            variant="hero"
            title="Audit kanala u pripremi"
            description="Povežite društvene mreže i pokrenite audit za detaljnu analizu performansi vaših kanala."
            action={
              <button
                onClick={() => navigate('/brand-profile?tab=mreze')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent-hover transition-all shadow-sm"
              >
                <Link2 size={16} />
                Poveži kanale za audit
              </button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="AUDIT KANALA" subtitle="Performanse platformi i provjera zdravlja" />

      <div className="page-wrapper space-y-6">

        {/* ---------------------------------------------------------------- */}
        {/* Platform Health Cards                                            */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
          {platformsWithHealth.map(p => {
            const health = getHealthLabel(p.healthScore)
            const ringPct = Math.min(p.healthScore, 100)
            return (
              <div key={p.platform} className="card space-y-3">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <PlatformIcon platform={p.platform} size="md" showLabel />
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.followerGrowth >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {p.followerGrowth >= 0 ? '+' : ''}{p.followerGrowth.toFixed(1)}%
                  </span>
                </div>

                {/* Follower count */}
                <div>
                  <p className="text-2xl font-bold text-studio-text-primary">
                    {p.platform === 'web' ? `${formatNumber(p.followers)} visits` : formatNumber(p.followers)}
                  </p>
                  <p className="text-xs text-studio-text-secondary mt-1">
                    Stopa ang.: <span className="font-medium text-studio-text-primary">{p.engagement}%</span>
                    <span className={`ml-1.5 ${p.engagementChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({p.engagementChange >= 0 ? '+' : ''}{p.engagementChange.toFixed(1)}%)
                    </span>
                  </p>
                </div>

                {/* Health Score Ring */}
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
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-studio-text-primary">
                      {p.healthScore}
                    </span>
                  </div>
                  <div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${health.bg} ${health.color}`}>
                      {health.label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Cross-Platform Benchmark Row                                     */}
        {/* ---------------------------------------------------------------- */}
        <div className="card">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-600" />
            Usporedba platformi
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Best engagement platform */}
            <div className="bg-blue-500/10 rounded-xl p-4 space-y-1">
              <p className="text-xs text-blue-600 font-medium">Najbolji angažman</p>
              <div className="flex items-center gap-2">
                <PlatformIcon platform={benchmarks.bestEngagement.platform} size="sm" />
                <span className="text-lg font-bold text-studio-text-primary">
                  {(PLATFORMS as Record<string, { name: string }>)[benchmarks.bestEngagement.platform]?.name || benchmarks.bestEngagement.platform}
                </span>
              </div>
              <p className="text-sm text-blue-400 font-medium">{benchmarks.bestEngagement.engagement}%</p>
            </div>

            {/* Average engagement */}
            <div className="bg-studio-surface-0 rounded-xl p-4 space-y-1">
              <p className="text-xs text-studio-text-secondary font-medium">Prosječni angažman</p>
              <p className="text-lg font-bold text-studio-text-primary">{benchmarks.avgEngagement.toFixed(2)}%</p>
              <p className="text-xs text-studio-text-secondary">Sve platforme</p>
            </div>

            {/* Total combined reach */}
            <div className="bg-green-500/10 rounded-xl p-4 space-y-1">
              <p className="text-xs text-green-600 font-medium">Ukupni doseg</p>
              <div className="flex items-center gap-1.5">
                <Eye size={16} className="text-green-600" />
                <p className="text-lg font-bold text-studio-text-primary">{formatNumber(benchmarks.totalReach)}</p>
              </div>
              <p className="text-xs text-studio-text-secondary">Kombinirani doseg</p>
            </div>

            {/* Highest growth */}
            <div className="bg-emerald-500/10 rounded-xl p-4 space-y-1">
              <p className="text-xs text-emerald-600 font-medium">Najveći rast</p>
              <div className="flex items-center gap-2">
                <PlatformIcon platform={benchmarks.highestGrowth.platform} size="sm" />
                <span className="text-lg font-bold text-studio-text-primary">
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

        {/* ---------------------------------------------------------------- */}
        {/* Engagement Over Time                                             */}
        {/* ---------------------------------------------------------------- */}
        <div className="card">
          <EngagementChart data={engagementData30} title="30-dnevni angažman i doseg (sve platforme)" />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Optimal Posting Times Heatmap                                    */}
        {/* ---------------------------------------------------------------- */}
        <div className="card">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
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
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-studio-text-secondary">
            <span>Legenda:</span>
            <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-studio-surface-2 inline-block" /> Nizak</span>
            <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-blue-100 inline-block" /> Umjeren</span>
            <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-blue-300 inline-block" /> Dobar</span>
            <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-blue-500 inline-block" /> Visok</span>
            <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-blue-700 inline-block" /> Vrh</span>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Content Format Breakdown + Recommendations                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="card">
          <h2 className="section-title mb-4">Raspodjela formata sadržaja</h2>
          <div className="space-y-3">
            {formatRecommendations.map(f => (
              <div key={f.type} className="flex items-center gap-4">
                <span className="text-sm text-studio-text-secondary w-40 shrink-0 truncate">{f.type}</span>
                <div className="flex-1 bg-studio-surface-3 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-blue-400 h-3 rounded-full transition-all"
                    style={{ width: `${f.share}%` }}
                  />
                </div>
                <span className="text-sm text-studio-text-secondary w-12 text-right hidden sm:flex justify-end">{f.share}%</span>
                <span className="text-sm text-studio-text-secondary w-20 text-right hidden sm:flex justify-end">{f.posts} objava</span>
                <span className="text-sm text-emerald-400 w-16 text-right hidden sm:flex justify-end">{f.avgEngagement}% ang</span>
                {/* Recommendation badge */}
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
          {/* Recommendation summary */}
          <div className="mt-4 pt-4 border-t border-studio-border-subtle">
            <p className="text-xs text-studio-text-secondary">
              Preporuke se temelje na omjeru angažmana i udjela. Formati s visokim angažmanom ali niskim udjelom dobivaju oznaku "Povećaj".
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Platform Comparison Table                                        */}
        {/* ---------------------------------------------------------------- */}
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

      </div>
    </div>
  )
}
