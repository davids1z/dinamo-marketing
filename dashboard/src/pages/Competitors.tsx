import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import DataTable from '../components/common/DataTable'
import { ComparisonBar } from '../components/charts/ComparisonBar'
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import { useApi } from '../hooks/useApi'
import { useApiMutation } from '../hooks/useApiMutation'
// useChannelStatus available for future channel-gated features
// import { useChannelStatus } from '../hooks/useChannelStatus'
import { useProjectStatus } from '../hooks/useProjectStatus'
import { useClient } from '../contexts/ClientContext'
import { useToast } from '../hooks/useToast'
import { competitorsApi, SwotAnalysis } from '../api/competitors'
import {
  TrendingUp, TrendingDown, Minus, Target, Shield, Zap,
  ArrowUpRight, ArrowDownRight, FolderKanban, Sparkles,
  Radar, X, AlertTriangle, BarChart3,
  RefreshCw, Search, Eye, Info, Brain,
  ChevronUp, Loader2,
} from 'lucide-react'
import {
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
  BarChart, Bar, CartesianGrid,
} from 'recharts'
import { SHIFTONEZERO_BRAND } from '../utils/constants'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { CHART_ANIM, AXIS_STYLE, GRID_STYLE } from '../components/charts/chartConfig'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompetitorRow {
  id?: string
  company: string
  country: string
  igFollowers: number
  igEngagement: number
  tiktokFollowers: number
  tiktokEngagement: number
  gapVsUs: number
  tier: string
  followerGrowth: number
  engagementGrowth: number
  contentPerWeek: number
}

interface ContentGap {
  avgContentPerWeek: number
  ourContentPerWeek: number
  gapPercent: number
}

interface CompetitorData {
  competitors: CompetitorRow[]
  ourIg: number
  ourTiktok: number
  ourEngagement: number
  ourTiktokEngagement: number
  ourFollowerGrowth: number
  ourEngagementGrowth: number
  ourContentPerWeek: number
  hasOwnData: boolean
  contentGap: ContentGap | null
  summary: {
    directCount: number
    weLeadIn: number
    ourIgFormatted: string
    ourRank: string
    avgEngagementDirect: number
    ourEngagement: number
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const formatFollowers = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

const tierLabel = (tier: string) => {
  if (tier === 'aspirational') return 'Aspiracijski'
  if (tier === 'stretch') return 'Rastući'
  return 'Direktni'
}

const threatLevel = (row: CompetitorRow): 'high' | 'medium' | 'low' => {
  const growthFast = row.followerGrowth > 4
  const gapSmall = Math.abs(row.gapVsUs) < 300000
  if (growthFast && gapSmall) return 'high'
  if (growthFast || gapSmall) return 'medium'
  return 'low'
}

const threatBadge = (level: 'high' | 'medium' | 'low') => {
  const cls =
    level === 'high'
      ? 'bg-red-100 text-red-600'
      : level === 'medium'
      ? 'bg-yellow-100 text-yellow-600'
      : 'bg-green-100 text-green-600'
  const label = level === 'high' ? 'Visoka' : level === 'medium' ? 'Srednja' : 'Niska'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Ghost Empty State — animated radar + blurred preview
// ---------------------------------------------------------------------------

function GhostEmptyState({ onDiscover, discovering }: { onDiscover: () => void; discovering: boolean }) {
  const { currentClient } = useClient()
  const hasProfile = !!(currentClient?.business_description && currentClient.business_description.trim().length >= 20)

  return (
    <div className="relative">
      {/* Blurred ghost preview of what data would look like */}
      <div className="select-none pointer-events-none filter blur-[6px] opacity-30">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {['Direktni konkurenti', 'Naši pratitelji', 'Prosj. angažman', 'MoM rast'].map(label => (
            <div key={label} className="card">
              <p className="text-sm text-studio-text-secondary">{label}</p>
              <div className="h-8 w-16 bg-studio-surface-3 rounded mt-1" />
              <div className="h-3 w-24 bg-studio-surface-2 rounded mt-2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card"><div className="h-[260px] bg-studio-surface-0 rounded-lg" /></div>
          <div className="card"><div className="h-[260px] bg-studio-surface-0 rounded-lg" /></div>
        </div>
        <div className="card">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-8 w-8 bg-studio-surface-2 rounded" />
                <div className="h-4 flex-1 bg-studio-surface-2 rounded" />
                <div className="h-4 w-16 bg-studio-surface-2 rounded" />
                <div className="h-4 w-16 bg-studio-surface-2 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/90 dark:bg-studio-surface-1/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-studio-border p-8 max-w-lg w-full mx-4 text-center">
          {/* Animated radar */}
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-500/20" />
            <div className="absolute inset-2 rounded-full border border-blue-100 dark:border-blue-500/10" />
            <div className="absolute inset-4 rounded-full border border-blue-50 dark:border-blue-500/5" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Radar size={24} className="text-blue-500" />
            </div>
            {discovering && (
              <div className="absolute inset-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            )}
          </div>

          <h3 className="text-xl font-bold text-studio-text-primary mb-2">
            {discovering ? 'AI pretražuje vaše tržište...' : 'Analizirajte svoju konkurenciju'}
          </h3>
          <p className="text-sm text-studio-text-secondary mb-6 leading-relaxed">
            {discovering
              ? 'AI analizira vaš profil brenda i identificira tvrtke s sličnim poslovnim profilom, ciljnom publikom i tržišnom nišom.'
              : 'AI će automatski pronaći 5 konkurenata na temelju vašeg opisa poslovanja, ciljne publike i industrije. Ne morate ništa sami tražiti.'
            }
          </p>

          {!discovering && (
            <button
              onClick={onDiscover}
              disabled={!hasProfile}
              className="btn-primary flex items-center gap-2 text-sm mx-auto px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search size={16} />
              Analiziraj moje tržište
            </button>
          )}

          {discovering && (
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
              <RefreshCw size={14} className="animate-spin" />
              Otkrivam konkurente...
            </div>
          )}

          {!hasProfile && !discovering && (
            <div className="mt-4 flex items-start gap-2 text-left bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Za AI analizu potrebno je ispuniti <strong>opis poslovanja</strong> u profilu brenda.{' '}
                <a href="/brand-profile" className="underline hover:no-underline">Uredite profil →</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SWOT Analysis Display
// ---------------------------------------------------------------------------

const SWOT_CONFIG = {
  strengths:      { label: 'Snage',       color: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-500/20', icon: '💪', textColor: 'text-green-700 dark:text-green-400' },
  weaknesses:     { label: 'Slabosti',    color: 'bg-red-50 dark:bg-red-500/10',     border: 'border-red-200 dark:border-red-500/20',     icon: '⚠️', textColor: 'text-red-700 dark:text-red-400' },
  opportunities:  { label: 'Prilike',     color: 'bg-blue-50 dark:bg-blue-500/10',   border: 'border-blue-200 dark:border-blue-500/20',   icon: '🚀', textColor: 'text-blue-700 dark:text-blue-400' },
  threats:        { label: 'Prijetnje',   color: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20', icon: '🔥', textColor: 'text-orange-700 dark:text-orange-400' },
} as const

function SwotQuadrant({ type, items }: { type: keyof typeof SWOT_CONFIG; items: string[] }) {
  const cfg = SWOT_CONFIG[type]
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.color} p-4`}>
      <h4 className={`text-sm font-semibold mb-3 ${cfg.textColor}`}>
        {cfg.icon} {cfg.label}
      </h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-studio-text-primary flex items-start gap-2">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
              type === 'strengths' ? 'bg-green-500' :
              type === 'weaknesses' ? 'bg-red-500' :
              type === 'opportunities' ? 'bg-blue-500' :
              'bg-orange-500'
            }`} />
            {item}
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-studio-text-tertiary italic">Nema podataka</li>
        )}
      </ul>
    </div>
  )
}

function SwotDisplay({ swot }: { swot: SwotAnalysis }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <SwotQuadrant type="strengths" items={swot.strengths} />
      <SwotQuadrant type="weaknesses" items={swot.weaknesses} />
      <SwotQuadrant type="opportunities" items={swot.opportunities} />
      <SwotQuadrant type="threats" items={swot.threats} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Content Gap Analysis Card
// ---------------------------------------------------------------------------

function ContentGapCard({ gap, competitors }: { gap: ContentGap | null; competitors: CompetitorRow[] }) {
  if (!gap && competitors.length === 0) return null

  const avgEngagement = competitors.length
    ? +(competitors.reduce((s, c) => s + c.igEngagement, 0) / competitors.length).toFixed(1)
    : 0
  const avgContent = gap?.avgContentPerWeek ?? 0
  const ourContent = gap?.ourContentPerWeek ?? 0
  const gapPct = gap?.gapPercent ?? 0

  let gapInsight: string | null = null
  if (gapPct > 30) {
    gapInsight = `Konkurencija objavljuje ${gapPct}% više sadržaja tjedno od vas. Povećajte frekvenciju objava za bolju vidljivost.`
  } else if (gapPct > 0) {
    gapInsight = `Konkurencija objavljuje nešto više sadržaja (${avgContent} vs ${ourContent} tjedno). Razmotrite povećanje frekvencije.`
  } else if (gapPct < -20) {
    gapInsight = `Objavljujete više sadržaja od prosjeka konkurencije! Fokusirajte se na kvalitetu i angažman.`
  }

  let sentimentInsight: string | null = null
  const lowEngagementComps = competitors.filter(c => c.igEngagement < 1.5)
  if (lowEngagementComps.length > 0) {
    const names = lowEngagementComps.slice(0, 2).map(c => c.company).join(' i ')
    sentimentInsight = `Prilika: ${names} ${lowEngagementComps.length === 1 ? 'ima' : 'imaju'} nizak angažman (< 1.5%). Iskoristite to — stvarajte sadržaj koji potiče interakciju.`
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={18} className="text-purple-500" />
        <h2 className="section-title">Analiza jaza (Content Gap)</h2>
      </div>
      <div className="space-y-3">
        {gapInsight && (
          <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4">
            <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-studio-text-primary">{gapInsight}</p>
          </div>
        )}
        {sentimentInsight && (
          <div className="flex items-start gap-3 bg-green-50 dark:bg-green-500/10 rounded-xl p-4">
            <Target size={16} className="text-green-500 mt-0.5 shrink-0" />
            <p className="text-sm text-studio-text-primary">{sentimentInsight}</p>
          </div>
        )}
        {!gapInsight && !sentimentInsight && (
          <div className="flex items-start gap-3 bg-studio-surface-0 rounded-xl p-4">
            <Eye size={16} className="text-studio-text-tertiary mt-0.5 shrink-0" />
            <p className="text-sm text-studio-text-secondary">Potrebno više podataka za detaljnu analizu jaza. Pokrenite skeniranje za ažuriranje metrika.</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="bg-studio-surface-0 rounded-lg p-3 text-center">
            <p className="text-xs text-studio-text-secondary">Naš sadržaj/tjedan</p>
            <p className="text-lg font-bold text-studio-text-primary">{ourContent || '—'}</p>
          </div>
          <div className="bg-studio-surface-0 rounded-lg p-3 text-center">
            <p className="text-xs text-studio-text-secondary">Prosj. konkurencija</p>
            <p className="text-lg font-bold text-studio-text-primary">{avgContent || '—'}</p>
          </div>
          <div className="bg-studio-surface-0 rounded-lg p-3 text-center">
            <p className="text-xs text-studio-text-secondary">Prosj. angažman konk.</p>
            <p className="text-lg font-bold text-studio-text-primary">{avgEngagement}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type PlatformTab = 'instagram' | 'tiktok' | 'overall'


interface DiscoverResponse {
  discovered?: number
  message?: string
  [key: string]: unknown
}

export default function Competitors() {
  const { data: apiData, loading, refetch } = useApi<CompetitorData>('/competitors')
  const discoverMutation = useApiMutation<DiscoverResponse>('/competitors/discover', 'post')
  // const { hasConnectedChannels } = useChannelStatus()
  const { hasProjects } = useProjectStatus()
  const { currentClient } = useClient()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [platformTab, setPlatformTab] = useState<PlatformTab>('instagram')
  const [chartRevealed, setChartRevealed] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [swotData, setSwotData] = useState<Record<string, SwotAnalysis>>({})
  const [swotLoading, setSwotLoading] = useState<Record<string, boolean>>({})
  const [swotExpanded, setSwotExpanded] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setChartRevealed(true), 60)
    return () => clearTimeout(timer)
  }, [])

  // --- Early returns for missing prereqs ---
  if (!hasProjects) {
    return (
      <div>
        <Header title="KONKURENCIJA" subtitle="Competitive Intelligence Hub" />
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

  if (loading && !apiData) return (
    <>
      <Header title="KONKURENCIJA" subtitle="Competitive Intelligence Hub" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={4} cols="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" />
        <ChartSkeleton />
        <ChartSkeleton />
        <TableSkeleton rows={8} />
      </div>
    </>
  )

  const data: CompetitorData = apiData || {
    competitors: [],
    ourIg: 0,
    ourTiktok: 0,
    ourEngagement: 0,
    ourTiktokEngagement: 0,
    ourFollowerGrowth: 0,
    ourEngagementGrowth: 0,
    ourContentPerWeek: 0,
    hasOwnData: false,
    contentGap: null,
    summary: { directCount: 0, weLeadIn: 0, ourIgFormatted: '0', ourRank: '--', avgEngagementDirect: 0, ourEngagement: 0 },
  }

  const competitorList = data.competitors || []

  // --- AI Discover handler ---
  const handleDiscover = async () => {
    const result = await discoverMutation.mutate()
    if (result?.discovered) {
      addToast(`AI je pronašao ${result.discovered} konkurenata!`, 'success')
    } else if (result) {
      addToast('Analiza pokrenuta', 'info')
    }
    refetch()
  }

  // --- Remove competitor handler ---
  const handleRemove = async (id: string) => {
    setRemovingId(id)
    try {
      await competitorsApi.remove(id)
      refetch()
    } catch {
      // silently fail
    } finally {
      setRemovingId(null)
    }
  }

  // --- SWOT handler ---
  const handleSwotToggle = async (id: string) => {
    // Collapse if already expanded
    if (swotExpanded === id) {
      setSwotExpanded(null)
      return
    }

    // Expand
    setSwotExpanded(id)

    // Already cached in state? Don't re-fetch
    if (swotData[id]) return

    // Try to get cached SWOT from server first
    setSwotLoading(prev => ({ ...prev, [id]: true }))
    try {
      const cachedRes = await competitorsApi.getSwot(id)
      const cached = cachedRes.data
      if (cached.swot) {
        setSwotData(prev => ({ ...prev, [id]: cached.swot! }))
        setSwotLoading(prev => ({ ...prev, [id]: false }))
        return
      }

      // No cached SWOT — generate via AI
      const genRes = await competitorsApi.generateSwot(id)
      const result = genRes.data
      if (result.swot) {
        setSwotData(prev => ({ ...prev, [id]: result.swot! }))
        addToast('SWOT analiza generirana', 'success')
      }
    } catch {
      addToast('Greška pri generiranju SWOT analize', 'error')
    } finally {
      setSwotLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  // --- Ghost empty state ---
  if (competitorList.length === 0 && !data.hasOwnData) {
    return (
      <div>
        <Header title="KONKURENCIJA" subtitle="Competitive Intelligence Hub" />
        <div className="page-wrapper space-y-6">
          <GhostEmptyState onDiscover={handleDiscover} discovering={discoverMutation.loading} />
        </div>
      </div>
    )
  }

  // No competitors found yet but has own data
  if (competitorList.length === 0) {
    return (
      <div>
        <Header title="KONKURENCIJA" subtitle="Competitive Intelligence Hub" />
        <div className="page-wrapper">
          <EmptyState
            icon={Sparkles}
            variant="hero"
            title="Otkrijte svoju konkurenciju"
            description="AI automatski identificira 5 konkurenata na temelju vašeg poslovnog opisa i ciljne publike. Ne morate ništa sami tražiti."
            action={
              <button
                onClick={handleDiscover}
                disabled={discoverMutation.loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent-hover transition-all shadow-sm disabled:opacity-50"
              >
                {discoverMutation.loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                {discoverMutation.loading ? 'Otkrivam...' : 'Analiziraj moje tržište'}
              </button>
            }
          />
        </div>
      </div>
    )
  }

  // --- Data computations ---
  const summary = data.summary
  const ourIg = data.ourIg || 0
  const ourTiktok = data.ourTiktok ?? 0
  const ourEngagement = data.ourEngagement ?? 0
  const ourTiktokEngagement = data.ourTiktokEngagement ?? 0
  const ourFollowerGrowth = data.ourFollowerGrowth ?? 0
  const ourEngagementGrowth = data.ourEngagementGrowth ?? 0
  const ourContentPerWeek = data.ourContentPerWeek ?? 0

  const directCompetitors = competitorList.filter(c => c.tier === 'direct')
  const brandName = currentClient?.client_name || 'Mi'

  // Share of voice
  const sovData = [
    { name: brandName, value: ourIg, color: SHIFTONEZERO_BRAND.colors.accent },
    ...directCompetitors.map((c, i) => ({
      name: c.company,
      value: c.igFollowers,
      color: ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'][i % 4] as string,
    })),
  ]
  const sovTotal = sovData.reduce((s, d) => s + d.value, 0)

  // Platform rankings
  const platformRankings = (tab: PlatformTab) => {
    const all = [
      {
        company: brandName,
        igFollowers: ourIg,
        igEngagement: ourEngagement,
        tiktokFollowers: ourTiktok,
        tiktokEngagement: ourTiktokEngagement,
        isOurs: true,
      },
      ...competitorList.map(c => ({
        company: c.company,
        igFollowers: c.igFollowers,
        igEngagement: c.igEngagement,
        tiktokFollowers: c.tiktokFollowers,
        tiktokEngagement: c.tiktokEngagement ?? 0,
        isOurs: false,
      })),
    ]
    if (tab === 'instagram') return all.sort((a, b) => b.igFollowers - a.igFollowers)
    if (tab === 'tiktok') return all.sort((a, b) => b.tiktokFollowers - a.tiktokFollowers)
    return all.sort((a, b) => (b.igFollowers + b.tiktokFollowers) - (a.igFollowers + a.tiktokFollowers))
  }

  const rankings = platformRankings(platformTab)

  // Growth velocity
  const avgDirectFollowerGrowth = directCompetitors.length
    ? +(directCompetitors.reduce((s, c) => s + c.followerGrowth, 0) / directCompetitors.length).toFixed(1)
    : 0
  const avgDirectEngagementGrowth = directCompetitors.length
    ? +(directCompetitors.reduce((s, c) => s + c.engagementGrowth, 0) / directCompetitors.length).toFixed(1)
    : 0
  const avgDirectContent = directCompetitors.length
    ? +(directCompetitors.reduce((s, c) => s + c.contentPerWeek, 0) / directCompetitors.length).toFixed(0)
    : 0

  const growthMetrics = [
    { label: 'Rast pratitelja (MoM)', ours: ourFollowerGrowth, avg: avgDirectFollowerGrowth, unit: '%', icon: <TrendingUp size={16} /> },
    { label: 'Rast angažmana (MoM)', ours: ourEngagementGrowth, avg: avgDirectEngagementGrowth, unit: 'pp', icon: <Zap size={16} /> },
    { label: 'Sadržaj tjedno', ours: ourContentPerWeek, avg: +avgDirectContent, unit: '', icon: <Target size={16} /> },
  ]

  // Table columns
  const columns = [
    {
      key: 'company',
      header: 'Tvrtka',
      render: (row: CompetitorRow) => (
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-studio-text-primary font-medium truncate">{row.company}</span>
          <span className="text-xs text-studio-text-secondary hidden sm:inline">{row.country}</span>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Skupina',
      render: (row: CompetitorRow) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          row.tier === 'aspirational' ? 'bg-purple-100 text-purple-600' :
          row.tier === 'stretch' ? 'bg-yellow-100 text-yellow-600' :
          'bg-blue-500/10 text-blue-600'
        }`}>
          {tierLabel(row.tier)}
        </span>
      ),
    },
    {
      key: 'igFollowers',
      header: 'IG pratitelji',
      render: (row: CompetitorRow) => (
        <span className="text-studio-text-primary font-mono">{formatFollowers(row.igFollowers)}</span>
      ),
    },
    {
      key: 'igEngagement',
      header: 'IG angaž.',
      render: (row: CompetitorRow) => (
        <span className={`text-sm ${
          row.igEngagement > 2.5 ? 'text-green-600' : row.igEngagement > 1.5 ? 'text-yellow-600' : 'text-red-400'
        }`}>
          {row.igEngagement}%
        </span>
      ),
    },
    {
      key: 'tiktokFollowers',
      header: 'TikTok',
      render: (row: CompetitorRow) => (
        <span className="text-studio-text-primary font-mono">{formatFollowers(row.tiktokFollowers)}</span>
      ),
    },
    {
      key: 'followerGrowth',
      header: 'Trend',
      render: (row: CompetitorRow) => {
        const up = row.followerGrowth > 0
        return (
          <div className={`flex items-center gap-1 text-sm font-mono ${up ? 'text-green-600' : 'text-red-600'}`}>
            {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {row.followerGrowth > 0 ? '+' : ''}{row.followerGrowth}%
          </div>
        )
      },
    },
    {
      key: 'gapVsUs',
      header: 'Jaz prema nama',
      render: (row: CompetitorRow) => {
        const icon =
          row.gapVsUs > 0 ? <TrendingUp size={14} /> : row.gapVsUs < 0 ? <TrendingDown size={14} /> : <Minus size={14} />
        return (
          <div className={`flex items-center gap-1 text-sm font-mono ${row.gapVsUs > 0 ? 'text-red-400' : 'text-green-600'}`}>
            {icon}
            {row.gapVsUs > 0 ? '+' : ''}
            {formatFollowers(Math.abs(row.gapVsUs))}
          </div>
        )
      },
    },
    {
      key: 'threat',
      header: 'Prijetnja',
      render: (row: CompetitorRow) => threatBadge(threatLevel(row)),
    },
    {
      key: 'actions',
      header: '',
      render: (row: CompetitorRow) => row.id ? (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleSwotToggle(row.id!) }}
            className={`p-1 rounded transition-colors ${
              swotExpanded === row.id
                ? 'bg-blue-100 text-blue-600'
                : 'opacity-0 group-hover:opacity-100 text-studio-text-tertiary hover:bg-blue-50 hover:text-blue-500'
            }`}
            title="SWOT analiza"
          >
            {swotLoading[row.id!] ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Brain size={14} />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleRemove(row.id!) }}
            disabled={removingId === row.id}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-studio-text-tertiary hover:text-red-500"
            title="Ukloni konkurenta"
          >
            {removingId === row.id ? <RefreshCw size={14} className="animate-spin" /> : <X size={14} />}
          </button>
        </div>
      ) : null,
    },
  ]

  return (
    <div>
      <Header title="KONKURENCIJA" subtitle="Competitive Intelligence Hub" />

      <div className="page-wrapper space-y-6 stagger-sections">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-cards">
          <div className="card">
            <div className="flex items-center gap-2 text-sm text-studio-text-secondary">
              <Shield size={14} />
              Direktni konkurenti
            </div>
            <p className="text-3xl font-bold text-studio-text-primary mt-1">{summary.directCount}</p>
            <p className="text-xs text-green-600 mt-1">Vodimo u {summary.weLeadIn} od {summary.directCount}</p>
          </div>
          <div className="card">
            <p className="text-sm text-studio-text-secondary">Naši IG pratitelji</p>
            <p className="text-3xl font-bold text-studio-text-primary mt-1">{summary.ourIgFormatted}</p>
            <p className="text-xs text-brand-accent mt-1">Rangirani {summary.ourRank}</p>
          </div>
          <div className="card">
            <p className="text-sm text-studio-text-secondary">Prosj. angaž. (direktni)</p>
            <p className="text-3xl font-bold text-studio-text-primary mt-1">{summary.avgEngagementDirect}%</p>
            <p className="text-xs text-yellow-600 mt-1">Mi: {summary.ourEngagement}%</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-sm text-studio-text-secondary">
              <Zap size={14} />
              MoM rast pratitelja
            </div>
            <p className="text-3xl font-bold text-studio-text-primary mt-1">+{ourFollowerGrowth}%</p>
            <p className={`text-xs mt-1 ${ourFollowerGrowth > avgDirectFollowerGrowth ? 'text-green-600' : 'text-red-600'}`}>
              Prosjek direktnih: +{avgDirectFollowerGrowth}%
            </p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-studio-text-secondary text-sm">
            AI je identificirao {competitorList.length} konkurenata — kliknite ✕ za uklanjanje
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDiscover}
              disabled={discoverMutation.loading}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              {discoverMutation.loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              Ponovo otkrij
            </button>
            <button onClick={() => refetch()} className="btn-primary flex items-center gap-2 text-sm">
              <RefreshCw size={14} />
              Osvježi podatke
            </button>
          </div>
        </div>

        {/* Competitive Positioning */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <ComparisonBar
              data={[
                { name: brandName, value: ourIg },
                ...competitorList.map(c => ({ name: c.company, value: c.igFollowers })),
              ].sort((a, b) => b.value - a.value)}
              title="Instagram pratitelji — svi konkurenti"
              valueLabel="Pratitelji"
              tooltipFormatter={(v) => formatFollowers(v)}
              yAxisWidth={130}
            />
          </div>
          <div className="card">
            <ComparisonBar
              data={[
                { name: brandName, value: ourEngagement },
                ...competitorList.map(c => ({ name: c.company, value: c.igEngagement })),
              ].sort((a, b) => b.value - a.value)}
              title="Stopa angažmana (%)"
              valueLabel="Angažman %"
              tooltipFormatter={(v) => `${v}%`}
              yAxisWidth={130}
            />
          </div>
        </div>

        {/* Share of Voice + Growth Velocity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="section-title mb-4">Udio glasa (direktni konkurenti)</h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={sovData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#1A1A1A"
                    animationDuration={CHART_ANIM.pieDuration}
                    animationEasing={CHART_ANIM.pieEasing}
                    animationBegin={300}
                  >
                    {sovData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(value: number) => formatFollowers(value)} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {sovData.map(item => {
                  const pct = sovTotal > 0 ? ((item.value / sovTotal) * 100).toFixed(1) : '0'
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-studio-text-primary truncate">{item.name}</p>
                      </div>
                      <span className="text-sm font-mono text-studio-text-primary font-medium">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="section-title mb-4">Brzina rasta vs direktni konkurenti</h2>
            <div className="space-y-4">
              {growthMetrics.map(m => {
                const diff = m.ours - m.avg
                const winning = diff > 0
                return (
                  <div key={m.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-studio-text-secondary">{m.icon}{m.label}</div>
                      <span className={`text-xs font-medium ${winning ? 'text-green-600' : 'text-red-600'}`}>
                        {winning ? '+' : ''}{diff.toFixed(1)}{m.unit} vs prosjek
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-studio-text-secondary mb-1">
                          <span>{brandName}</span>
                          <span className="font-mono font-medium text-studio-text-primary">{m.ours}{m.unit}</span>
                        </div>
                        <div className="w-full h-3 bg-studio-surface-2 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${Math.min(100, (m.ours / Math.max(m.ours, m.avg, 1)) * 100)}%`,
                            backgroundColor: SHIFTONEZERO_BRAND.colors.accent,
                          }} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-studio-text-secondary mb-1">
                          <span>Prosj. direktni</span>
                          <span className="font-mono font-medium text-studio-text-primary">{m.avg}{m.unit}</span>
                        </div>
                        <div className="w-full h-3 bg-studio-surface-2 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-400" style={{
                            width: `${Math.min(100, (m.avg / Math.max(m.ours, m.avg, 1)) * 100)}%`,
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Content Gap Analysis */}
        <ContentGapCard gap={data.contentGap} competitors={competitorList} />

        {/* Platform-by-Platform Comparison */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="section-title">Usporedba po platformi</h2>
            <div className="flex bg-studio-surface-2 rounded-lg p-0.5">
              {([
                { key: 'instagram' as PlatformTab, label: 'Instagram' },
                { key: 'tiktok' as PlatformTab, label: 'TikTok' },
                { key: 'overall' as PlatformTab, label: 'Ukupno' },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPlatformTab(tab.key)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    platformTab === tab.key
                      ? 'bg-studio-surface-1 text-studio-text-primary shadow-sm font-medium'
                      : 'text-studio-text-secondary hover:text-studio-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            clipPath: chartRevealed ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
            transition: 'clip-path 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <ResponsiveContainer width="100%" height={Math.max(280, rankings.length * 36)}>
              <BarChart data={rankings} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
                <XAxis type="number" {...AXIS_STYLE} tickFormatter={(v: number) => formatFollowers(v)} />
                <YAxis
                  dataKey="company"
                  type="category"
                  {...AXIS_STYLE}
                  width={130}
                  tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => (
                    <text
                      x={x} y={y} dy={4} textAnchor="end" fontSize={11}
                      fill={payload.value === brandName ? SHIFTONEZERO_BRAND.colors.accent : '#94a3b8'}
                      fontWeight={payload.value === brandName ? 700 : 400}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <Tooltip content={<ChartTooltip formatter={(value: number) => formatFollowers(value)} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                {platformTab === 'instagram' && (
                  <Bar dataKey="igFollowers" name="IG pratitelji" radius={[0, 8, 8, 0]} barSize={28} isAnimationActive={false}>
                    {rankings.map((entry, i) => (
                      <Cell key={i} fill={entry.isOurs ? SHIFTONEZERO_BRAND.colors.primary : SHIFTONEZERO_BRAND.colors.blue} fillOpacity={entry.isOurs ? 1 : 0.6} />
                    ))}
                  </Bar>
                )}
                {platformTab === 'tiktok' && (
                  <Bar dataKey="tiktokFollowers" name="TikTok pratitelji" radius={[0, 8, 8, 0]} barSize={28} isAnimationActive={false}>
                    {rankings.map((entry, i) => (
                      <Cell key={i} fill={entry.isOurs ? SHIFTONEZERO_BRAND.colors.primary : '#8B5CF6'} fillOpacity={entry.isOurs ? 1 : 0.6} />
                    ))}
                  </Bar>
                )}
                {platformTab === 'overall' && (
                  <>
                    <Bar dataKey="igFollowers" name="IG pratitelji" stackId="a" radius={[0, 0, 0, 0]} isAnimationActive={false}>
                      {rankings.map((entry, i) => (
                        <Cell key={i} fill={entry.isOurs ? SHIFTONEZERO_BRAND.colors.primary : SHIFTONEZERO_BRAND.colors.blue} fillOpacity={entry.isOurs ? 1 : 0.6} />
                      ))}
                    </Bar>
                    <Bar dataKey="tiktokFollowers" name="TikTok pratitelji" stackId="a" radius={[0, 8, 8, 0]} isAnimationActive={false}>
                      {rankings.map((entry, i) => (
                        <Cell key={i} fill={entry.isOurs ? SHIFTONEZERO_BRAND.colors.accent : '#8B5CF6'} fillOpacity={entry.isOurs ? 1 : 0.5} />
                      ))}
                    </Bar>
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Competitor Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Svi praćeni konkurenti</h2>
            <p className="text-xs text-studio-text-tertiary">AI identificirano · Kliknite ✕ za uklanjanje</p>
          </div>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={competitorList} emptyMessage="Nema praćenih konkurenata" />
          </div>

          {/* SWOT Expansion Panel */}
          {swotExpanded && (
            <div className="mt-4 border-t border-studio-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-blue-500" />
                  <h3 className="text-sm font-semibold text-studio-text-primary">
                    SWOT analiza: {competitorList.find(c => c.id === swotExpanded)?.company}
                  </h3>
                </div>
                <button
                  onClick={() => setSwotExpanded(null)}
                  className="p-1 rounded hover:bg-studio-surface-2 text-studio-text-tertiary"
                >
                  <ChevronUp size={16} />
                </button>
              </div>

              {swotLoading[swotExpanded] ? (
                <div className="flex items-center justify-center gap-3 py-12">
                  <Loader2 size={20} className="animate-spin text-blue-500" />
                  <span className="text-sm text-studio-text-secondary">
                    AI generira SWOT analizu...
                  </span>
                </div>
              ) : swotData[swotExpanded] ? (
                <SwotDisplay swot={swotData[swotExpanded]} />
              ) : (
                <div className="text-sm text-studio-text-tertiary text-center py-8">
                  Kliknite za generiranje SWOT analize
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
