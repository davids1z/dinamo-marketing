import { useState } from 'react'
import Header from '../components/layout/Header'
import DataTable from '../components/common/DataTable'
import { ComparisonBar } from '../components/charts/ComparisonBar'
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import {
  TrendingUp, TrendingDown, Minus, Target, Shield, Zap,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import AiInsightsPanel from '../components/common/AiInsightsPanel'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
  BarChart, Bar, CartesianGrid,
} from 'recharts'
import { SHIFTONEZERO_BRAND } from '../utils/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompetitorRow {
  club: string
  country: string
  igFollowers: number
  igEngagement: number
  tiktokFollowers: number
  tiktokEngagement: number
  gapVsDinamo: number
  tier: string
  followerGrowth: number   // month-over-month %
  engagementGrowth: number // month-over-month %
  contentPerWeek: number
}

interface CompetitorData {
  competitors: CompetitorRow[]
  dinamoIg: number
  dinamoTiktok: number
  dinamoEngagement: number
  dinamoTiktokEngagement: number
  dinamoFollowerGrowth: number
  dinamoEngagementGrowth: number
  dinamoContentPerWeek: number
  summary: {
    directCount: number
    dinamoLeadsIn: number
    dinamoIgFormatted: string
    dinamoRank: string
    avgEngagementDirect: number
    dinamoEngagement: number
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const formatFollowers = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  return `${(n / 1000).toFixed(0)}K`
}

const tierColor = (tier: string) => {
  if (tier === 'aspirational') return '#8B5CF6'
  if (tier === 'stretch') return '#F59E0B'
  return '#3B82F6'
}

const tierLabel = (tier: string) => {
  if (tier === 'aspirational') return 'Aspiracijski'
  if (tier === 'stretch') return 'Rastuci'
  return 'Direktni'
}

const threatLevel = (row: CompetitorRow): 'high' | 'medium' | 'low' => {
  const growthFast = row.followerGrowth > 4
  const gapSmall = Math.abs(row.gapVsDinamo) < 300000
  if (growthFast && gapSmall) return 'high'
  if (growthFast || gapSmall) return 'medium'
  return 'low'
}

const threatBadge = (level: 'high' | 'medium' | 'low') => {
  const cls =
    level === 'high'
      ? 'bg-red-100 text-red-700'
      : level === 'medium'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-green-100 text-green-700'
  const label = level === 'high' ? 'Visoka' : level === 'medium' ? 'Srednja' : 'Niska'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Tooltip style (shared)
// ---------------------------------------------------------------------------

const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  color: '#111827',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '10px 14px',
}

// ---------------------------------------------------------------------------
// Fallback data
// ---------------------------------------------------------------------------

const fallbackData: CompetitorData = {
  competitors: [
    { club: 'Galatasaray SK', country: 'Turska', igFollowers: 15600000, igEngagement: 1.2, tiktokFollowers: 4200000, tiktokEngagement: 1.0, gapVsDinamo: 15033000, tier: 'aspirational', followerGrowth: 2.1, engagementGrowth: -0.3, contentPerWeek: 28 },
    { club: 'Ajax Amsterdam', country: 'Nizozemska', igFollowers: 9000000, igEngagement: 1.8, tiktokFollowers: 2100000, tiktokEngagement: 1.5, gapVsDinamo: 8433000, tier: 'aspirational', followerGrowth: 1.8, engagementGrowth: 0.2, contentPerWeek: 24 },
    { club: 'Besiktas JK', country: 'Turska', igFollowers: 5600000, igEngagement: 1.4, tiktokFollowers: 1800000, tiktokEngagement: 1.1, gapVsDinamo: 5033000, tier: 'aspirational', followerGrowth: 1.5, engagementGrowth: -0.1, contentPerWeek: 22 },
    { club: 'Sporting CP', country: 'Portugal', igFollowers: 2800000, igEngagement: 2.1, tiktokFollowers: 950000, tiktokEngagement: 2.3, gapVsDinamo: 2233000, tier: 'stretch', followerGrowth: 3.2, engagementGrowth: 0.5, contentPerWeek: 18 },
    { club: 'Red Bull Salzburg', country: 'Austrija', igFollowers: 542000, igEngagement: 2.4, tiktokFollowers: 320000, tiktokEngagement: 3.1, gapVsDinamo: -25000, tier: 'direct', followerGrowth: 4.8, engagementGrowth: 0.8, contentPerWeek: 16 },
    { club: 'Slavia Praha', country: 'Ceska', igFollowers: 413000, igEngagement: 2.6, tiktokFollowers: 185000, tiktokEngagement: 2.9, gapVsDinamo: -154000, tier: 'direct', followerGrowth: 3.5, engagementGrowth: 0.4, contentPerWeek: 14 },
    { club: 'Hajduk Split', country: 'Hrvatska', igFollowers: 302000, igEngagement: 3.1, tiktokFollowers: 145000, tiktokEngagement: 3.5, gapVsDinamo: -265000, tier: 'direct', followerGrowth: 5.2, engagementGrowth: 1.1, contentPerWeek: 12 },
    { club: 'Ferencvaros TC', country: 'Madarska', igFollowers: 280000, igEngagement: 2.8, tiktokFollowers: 120000, tiktokEngagement: 2.7, gapVsDinamo: -287000, tier: 'direct', followerGrowth: 2.9, engagementGrowth: 0.3, contentPerWeek: 10 },
  ],
  dinamoIg: 567000,
  dinamoTiktok: 245000,
  dinamoEngagement: 3.2,
  dinamoTiktokEngagement: 3.8,
  dinamoFollowerGrowth: 4.2,
  dinamoEngagementGrowth: 0.6,
  dinamoContentPerWeek: 18,
  summary: {
    directCount: 4,
    dinamoLeadsIn: 3,
    dinamoIgFormatted: '567K',
    dinamoRank: '#1 u direktnoj skupini',
    avgEngagementDirect: 2.7,
    dinamoEngagement: 3.2,
  },
}

// ---------------------------------------------------------------------------
// Positioning matrix custom tooltip
// ---------------------------------------------------------------------------

interface MatrixPayloadEntry {
  payload?: {
    club?: string
    igFollowers?: number
    igEngagement?: number
    tiktokFollowers?: number
    tier?: string
  }
}

function MatrixTooltip({ active, payload }: { active?: boolean; payload?: MatrixPayloadEntry[] }) {
  if (!active || !payload?.[0]?.payload) return null
  const d = payload[0].payload
  return (
    <div style={tooltipStyle} className="text-sm">
      <p className="font-bold text-gray-900">{d.club}</p>
      <p className="text-gray-600">IG: {formatFollowers(d.igFollowers ?? 0)} &middot; Angaz: {d.igEngagement}%</p>
      <p className="text-gray-600">TikTok: {formatFollowers(d.tiktokFollowers ?? 0)}</p>
      <p className="text-gray-500 text-xs mt-1">{tierLabel(d.tier ?? 'direct')}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type PlatformTab = 'instagram' | 'tiktok' | 'overall'

export default function Competitors() {
  const { data: apiData, loading } = useApi<CompetitorData>('/competitors')
  const data = apiData || fallbackData
  const [platformTab, setPlatformTab] = useState<PlatformTab>('instagram')

  if (loading && !apiData) return (
    <>
      <Header title="KONKURENCIJA" subtitle="Usporedba s konkurencijom i analiza jaza" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={4} cols="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" />
        <ChartSkeleton />
        <ChartSkeleton />
        <TableSkeleton rows={8} />
      </div>
    </>
  )

  const competitorList = data.competitors || fallbackData.competitors
  const summary = data.summary || fallbackData.summary
  const dinamoIg = data.dinamoIg || fallbackData.dinamoIg
  const dinamoTiktok = data.dinamoTiktok ?? fallbackData.dinamoTiktok
  const dinamoEngagement = data.dinamoEngagement ?? fallbackData.dinamoEngagement
  const dinamoTiktokEngagement = data.dinamoTiktokEngagement ?? fallbackData.dinamoTiktokEngagement
  const dinamoFollowerGrowth = data.dinamoFollowerGrowth ?? fallbackData.dinamoFollowerGrowth
  const dinamoEngagementGrowth = data.dinamoEngagementGrowth ?? fallbackData.dinamoEngagementGrowth
  const dinamoContentPerWeek = data.dinamoContentPerWeek ?? fallbackData.dinamoContentPerWeek

  const directCompetitors = competitorList.filter(c => c.tier === 'direct')

  // ---- Positioning matrix data ----
  const matrixData = [
    {
      club: 'Dinamo Zagreb',
      igFollowers: dinamoIg,
      igEngagement: dinamoEngagement,
      tiktokFollowers: dinamoTiktok,
      tier: 'dinamo',
    },
    ...competitorList.map(c => ({
      club: c.club,
      igFollowers: c.igFollowers,
      igEngagement: c.igEngagement,
      tiktokFollowers: c.tiktokFollowers,
      tier: c.tier,
    })),
  ]

  // Scale TikTok followers for Z-axis (bubble size)
  const maxTiktok = Math.max(...matrixData.map(d => d.tiktokFollowers))
  const tiktokRange: [number, number] = [60, 400]

  // ---- Share of voice (direct competitors) ----
  const sovData = [
    { name: 'Dinamo Zagreb', value: dinamoIg, color: SHIFTONEZERO_BRAND.colors.accent },
    ...directCompetitors.map((c, i) => ({
      name: c.club,
      value: c.igFollowers,
      color: ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'][i % 4],
    })),
  ]
  const sovTotal = sovData.reduce((s, d) => s + d.value, 0)

  // ---- Platform rankings ----
  const platformRankings = (tab: PlatformTab) => {
    const all = [
      {
        club: 'Dinamo Zagreb',
        igFollowers: dinamoIg,
        igEngagement: dinamoEngagement,
        tiktokFollowers: dinamoTiktok,
        tiktokEngagement: dinamoTiktokEngagement,
        isDinamo: true,
      },
      ...competitorList.map(c => ({
        club: c.club,
        igFollowers: c.igFollowers,
        igEngagement: c.igEngagement,
        tiktokFollowers: c.tiktokFollowers,
        tiktokEngagement: c.tiktokEngagement ?? 0,
        isDinamo: false,
      })),
    ]
    if (tab === 'instagram') return all.sort((a, b) => b.igFollowers - a.igFollowers)
    if (tab === 'tiktok') return all.sort((a, b) => b.tiktokFollowers - a.tiktokFollowers)
    return all.sort((a, b) => (b.igFollowers + b.tiktokFollowers) - (a.igFollowers + a.tiktokFollowers))
  }

  const rankings = platformRankings(platformTab)

  // ---- Growth velocity ----
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
    {
      label: 'Rast pratitelja (MoM)',
      dinamo: dinamoFollowerGrowth,
      avg: avgDirectFollowerGrowth,
      unit: '%',
      icon: <TrendingUp size={16} />,
    },
    {
      label: 'Rast angazmana (MoM)',
      dinamo: dinamoEngagementGrowth,
      avg: avgDirectEngagementGrowth,
      unit: 'pp',
      icon: <Zap size={16} />,
    },
    {
      label: 'Sadrzaj tjedno',
      dinamo: dinamoContentPerWeek,
      avg: +avgDirectContent,
      unit: '',
      icon: <Target size={16} />,
    },
  ]

  // ---- Follower comparison bar (kept from original) ----
  const followerComparison = [
    { name: 'Dinamo Zagreb', value: dinamoIg },
    ...directCompetitors.map(c => ({ name: c.club, value: c.igFollowers })),
  ]

  // ---- Enhanced table columns ----
  const columns = [
    {
      key: 'club',
      header: 'Klub',
      render: (row: CompetitorRow) => (
        <div className="min-w-0">
          <span className="text-gray-900 font-medium truncate">{row.club}</span>
          <span className="text-xs text-gray-500 ml-2 hidden sm:inline">{row.country}</span>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Skupina',
      render: (row: CompetitorRow) => (
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            row.tier === 'aspirational'
              ? 'bg-purple-100 text-purple-600'
              : row.tier === 'stretch'
              ? 'bg-yellow-100 text-yellow-600'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          {tierLabel(row.tier)}
        </span>
      ),
    },
    {
      key: 'igFollowers',
      header: 'IG pratitelji',
      render: (row: CompetitorRow) => (
        <span className="text-gray-700 font-mono">{formatFollowers(row.igFollowers)}</span>
      ),
    },
    {
      key: 'igEngagement',
      header: 'IG angaz.',
      render: (row: CompetitorRow) => (
        <span
          className={`text-sm ${
            row.igEngagement > 2.5 ? 'text-green-600' : row.igEngagement > 1.5 ? 'text-yellow-600' : 'text-red-700'
          }`}
        >
          {row.igEngagement}%
        </span>
      ),
    },
    {
      key: 'tiktokFollowers',
      header: 'TikTok',
      render: (row: CompetitorRow) => (
        <span className="text-gray-700 font-mono">{formatFollowers(row.tiktokFollowers)}</span>
      ),
    },
    {
      key: 'tiktokEngagement',
      header: 'TT angaz.',
      render: (row: CompetitorRow) => (
        <span
          className={`text-sm ${
            row.tiktokEngagement > 2.5 ? 'text-green-600' : row.tiktokEngagement > 1.5 ? 'text-yellow-600' : 'text-red-700'
          }`}
        >
          {row.tiktokEngagement}%
        </span>
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
      key: 'gapVsDinamo',
      header: 'Jaz prema Dinamu',
      render: (row: CompetitorRow) => {
        const icon =
          row.gapVsDinamo > 0 ? <TrendingUp size={14} /> : row.gapVsDinamo < 0 ? <TrendingDown size={14} /> : <Minus size={14} />
        return (
          <div
            className={`flex items-center gap-1 text-sm font-mono ${
              row.gapVsDinamo > 0 ? 'text-red-700' : 'text-green-600'
            }`}
          >
            {icon}
            {row.gapVsDinamo > 0 ? '+' : ''}
            {formatFollowers(Math.abs(row.gapVsDinamo))}
          </div>
        )
      },
    },
    {
      key: 'threat',
      header: 'Prijetnja',
      render: (row: CompetitorRow) => threatBadge(threatLevel(row)),
    },
  ]

  // ---- Render ----
  return (
    <div className="animate-fade-in">
      <Header title="KONKURENCIJA" subtitle="Usporedba s konkurencijom i analiza jaza" />

      <div className="page-wrapper space-y-6">
        {/* ───── Summary cards ───── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Shield size={14} />
              Direktni konkurenti
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-1">{summary.directCount}</p>
            <p className="text-xs text-green-600 mt-1">
              Dinamo vodi u {summary.dinamoLeadsIn} od {summary.directCount}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Dinamo IG pratitelji</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{summary.dinamoIgFormatted}</p>
            <p className="text-xs text-blue-700 mt-1">Rangirani {summary.dinamoRank}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Prosj. angaz. (direktni)</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{summary.avgEngagementDirect}%</p>
            <p className="text-xs text-yellow-600 mt-1">Dinamo: {summary.dinamoEngagement}% (iznad prosjeka)</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Zap size={14} />
              MoM rast pratitelja
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-1">+{dinamoFollowerGrowth}%</p>
            <p className={`text-xs mt-1 ${dinamoFollowerGrowth > avgDirectFollowerGrowth ? 'text-green-600' : 'text-red-600'}`}>
              Prosjek direktnih: +{avgDirectFollowerGrowth}%
            </p>
          </div>
        </div>

        {/* ───── Competitive Positioning Matrix ───── */}
        <div className="card">
          <h2 className="section-title mb-2">Matrica pozicioniranja</h2>
          <p className="text-xs text-gray-500 mb-4">
            X: Instagram pratitelji &middot; Y: Angaz. stopa &middot; Velicina kruga: TikTok pratitelji
          </p>
          <div className="flex flex-wrap gap-4 mb-4 text-xs">
            {(['aspirational', 'stretch', 'direct'] as const).map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tierColor(t) }} />
                <span className="text-gray-600">{tierLabel(t)}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: SHIFTONEZERO_BRAND.colors.accent, backgroundColor: '#0A1A28' }} />
              <span className="text-gray-600">Dinamo</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                type="number"
                dataKey="igFollowers"
                name="IG pratitelji"
                stroke="#6B7280"
                fontSize={11}
                tickFormatter={(v: number) => formatFollowers(v)}
                label={{ value: 'Instagram pratitelji', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#6B7280' }}
                scale="log"
                domain={['auto', 'auto']}
              />
              <YAxis
                type="number"
                dataKey="igEngagement"
                name="Angaz. (%)"
                stroke="#6B7280"
                fontSize={11}
                tickFormatter={(v: number) => `${v}%`}
                label={{ value: 'Angaz. stopa (%)', angle: -90, position: 'insideLeft', offset: 5, fontSize: 11, fill: '#6B7280' }}
                domain={[0, 'auto']}
              />
              <ZAxis
                type="number"
                dataKey="tiktokFollowers"
                range={tiktokRange}
                domain={[0, maxTiktok]}
                name="TikTok"
              />
              <Tooltip content={<MatrixTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={matrixData} shape="circle">
                {matrixData.map((entry, i) => {
                  const isDinamo = entry.tier === 'dinamo'
                  return (
                    <Cell
                      key={i}
                      fill={isDinamo ? SHIFTONEZERO_BRAND.colors.primary : tierColor(entry.tier)}
                      stroke={isDinamo ? SHIFTONEZERO_BRAND.colors.accent : 'transparent'}
                      strokeWidth={isDinamo ? 3 : 0}
                      fillOpacity={isDinamo ? 1 : 0.75}
                    />
                  )
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* ───── Share of Voice + Growth Velocity side by side ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Share of Voice */}
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
                    stroke="#fff"
                  >
                    {sovData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [formatFollowers(value), 'Pratitelji']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {sovData.map(item => {
                  const pct = sovTotal > 0 ? ((item.value / sovTotal) * 100).toFixed(1) : '0'
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{item.name}</p>
                      </div>
                      <span className="text-sm font-mono text-gray-900 font-medium">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Growth Velocity */}
          <div className="card">
            <h2 className="section-title mb-4">Brzina rasta vs direktni konkurenti</h2>
            <div className="space-y-4">
              {growthMetrics.map(m => {
                const diff = m.dinamo - m.avg
                const winning = diff > 0
                return (
                  <div key={m.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {m.icon}
                        {m.label}
                      </div>
                      <span className={`text-xs font-medium ${winning ? 'text-green-600' : 'text-red-600'}`}>
                        {winning ? '+' : ''}{diff.toFixed(1)}{m.unit} vs prosjek
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Dinamo</span>
                          <span className="font-mono font-medium text-gray-900">{m.dinamo}{m.unit}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (m.dinamo / Math.max(m.dinamo, m.avg)) * 100)}%`,
                              backgroundColor: SHIFTONEZERO_BRAND.colors.accent,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Prosj. direktni</span>
                          <span className="font-mono font-medium text-gray-900">{m.avg}{m.unit}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-400"
                            style={{
                              width: `${Math.min(100, (m.avg / Math.max(m.dinamo, m.avg)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ───── Platform-by-Platform Comparison ───── */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="section-title">Usporedba po platformi</h2>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
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
                      ? 'bg-white text-gray-900 shadow-sm font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={Math.max(280, rankings.length * 36)}>
            <BarChart data={rankings} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis
                type="number"
                stroke="#6B7280"
                fontSize={11}
                tickFormatter={(v: number) => formatFollowers(v)}
              />
              <YAxis
                dataKey="club"
                type="category"
                stroke="#6B7280"
                fontSize={11}
                width={130}
                tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => (
                  <text
                    x={x}
                    y={y}
                    dy={4}
                    textAnchor="end"
                    fontSize={11}
                    fill={payload.value === 'Dinamo Zagreb' ? SHIFTONEZERO_BRAND.colors.primary : '#6B7280'}
                    fontWeight={payload.value === 'Dinamo Zagreb' ? 700 : 400}
                  >
                    {payload.value}
                  </text>
                )}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [formatFollowers(value), name]}
              />
              {platformTab === 'instagram' && (
                <Bar dataKey="igFollowers" name="IG pratitelji" radius={[0, 4, 4, 0]}>
                  {rankings.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isDinamo ? SHIFTONEZERO_BRAND.colors.primary : SHIFTONEZERO_BRAND.colors.blue}
                      fillOpacity={entry.isDinamo ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              )}
              {platformTab === 'tiktok' && (
                <Bar dataKey="tiktokFollowers" name="TikTok pratitelji" radius={[0, 4, 4, 0]}>
                  {rankings.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isDinamo ? SHIFTONEZERO_BRAND.colors.primary : '#8B5CF6'}
                      fillOpacity={entry.isDinamo ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              )}
              {platformTab === 'overall' && (
                <>
                  <Bar dataKey="igFollowers" name="IG pratitelji" stackId="a" radius={[0, 0, 0, 0]}>
                    {rankings.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.isDinamo ? SHIFTONEZERO_BRAND.colors.primary : SHIFTONEZERO_BRAND.colors.blue}
                        fillOpacity={entry.isDinamo ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="tiktokFollowers" name="TikTok pratitelji" stackId="a" radius={[0, 4, 4, 0]}>
                    {rankings.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.isDinamo ? SHIFTONEZERO_BRAND.colors.accent : '#8B5CF6'}
                        fillOpacity={entry.isDinamo ? 1 : 0.5}
                      />
                    ))}
                  </Bar>
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ───── Direct Competitor Comparison (original) ───── */}
        <div className="card">
          <ComparisonBar data={followerComparison} title="Instagram pratitelji — direktni konkurenti" valueLabel="Followers" />
        </div>

        {/* ───── Enhanced Competitor Table ───── */}
        <div className="card">
          <h2 className="section-title mb-4">Svi praceni konkurenti</h2>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={competitorList} emptyMessage="Nema pracenih konkurenata" />
          </div>
        </div>

        {/* ───── AI Insights ───── */}
        <AiInsightsPanel
          pageKey="competitors"
          pageData={{
            competitors: competitorList.map(c => ({
              club: c.club,
              igFollowers: c.igFollowers,
              igEngagement: c.igEngagement,
              tiktokFollowers: c.tiktokFollowers,
              tiktokEngagement: c.tiktokEngagement,
              followerGrowth: c.followerGrowth,
              tier: c.tier,
            })),
            dinamoIg,
            dinamoTiktok,
            dinamoEngagement,
            dinamoFollowerGrowth,
            summary,
          }}
        />
      </div>
    </div>
  )
}
