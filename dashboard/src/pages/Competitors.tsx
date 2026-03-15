import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import DataTable from '../components/common/DataTable'
import { ComparisonBar } from '../components/charts/ComparisonBar'
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import { useApi } from '../hooks/useApi'
import { useChannelStatus } from '../hooks/useChannelStatus'
import {
  TrendingUp, TrendingDown, Minus, Target, Shield, Zap,
  ArrowUpRight, ArrowDownRight, Link2,
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
  company: string
  country: string
  igFollowers: number
  igEngagement: number
  tiktokFollowers: number
  tiktokEngagement: number
  gapVsUs: number
  tier: string
  followerGrowth: number   // month-over-month %
  engagementGrowth: number // month-over-month %
  contentPerWeek: number
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
  const gapSmall = Math.abs(row.gapVsUs) < 300000
  if (growthFast && gapSmall) return 'high'
  if (growthFast || gapSmall) return 'medium'
  return 'low'
}

const threatBadge = (level: 'high' | 'medium' | 'low') => {
  const cls =
    level === 'high'
      ? 'bg-red-100 text-red-400'
      : level === 'medium'
      ? 'bg-yellow-100 text-yellow-400'
      : 'bg-green-100 text-green-400'
  const label = level === 'high' ? 'Visoka' : level === 'medium' ? 'Srednja' : 'Niska'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type PlatformTab = 'instagram' | 'tiktok' | 'overall'

export default function Competitors() {
  const { data: apiData, loading } = useApi<CompetitorData>('/competitors')
  const { hasConnectedChannels } = useChannelStatus()
  const navigate = useNavigate()
  const data: CompetitorData = apiData || {
    competitors: [],
    ourIg: 0,
    ourTiktok: 0,
    ourEngagement: 0,
    ourTiktokEngagement: 0,
    ourFollowerGrowth: 0,
    ourEngagementGrowth: 0,
    ourContentPerWeek: 0,
    summary: { directCount: 0, weLeadIn: 0, ourIgFormatted: '0', ourRank: '--', avgEngagementDirect: 0, ourEngagement: 0 },
  }
  const [platformTab, setPlatformTab] = useState<PlatformTab>('instagram')
  const [chartRevealed, setChartRevealed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setChartRevealed(true), 60)
    return () => clearTimeout(timer)
  }, [])

  if (!hasConnectedChannels) {
    return (
      <div>
        <Header title="KONKURENCIJA" subtitle="Usporedba s konkurencijom i analiza jaza" />
        <div className="page-wrapper">
          <EmptyState
            icon={Target}
            title="Konkurencija nije postavljena"
            description="Povežite kanale i dodajte konkurente za praćenje i usporedbu performansi."
            variant="hero"
            action={
              <button
                onClick={() => navigate('/brand-profile')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent-hover transition-all shadow-sm"
              >
                <Link2 size={16} />
                Poveži kanale
              </button>
            }
          />
        </div>
      </div>
    )
  }

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

  const competitorList = data.competitors || []
  const summary = data.summary || { directCount: 0, weLeadIn: 0, ourIgFormatted: '0', ourRank: '--', avgEngagementDirect: 0, ourEngagement: 0 }
  const ourIg = data.ourIg || 0
  const ourTiktok = data.ourTiktok ?? 0
  const ourEngagement = data.ourEngagement ?? 0
  const ourTiktokEngagement = data.ourTiktokEngagement ?? 0
  const ourFollowerGrowth = data.ourFollowerGrowth ?? 0
  const ourEngagementGrowth = data.ourEngagementGrowth ?? 0
  const ourContentPerWeek = data.ourContentPerWeek ?? 0

  const directCompetitors = competitorList.filter(c => c.tier === 'direct')

  // ---- Share of voice (direct competitors) ----
  const sovData = [
    { name: 'ShiftOneZero', value: ourIg, color: SHIFTONEZERO_BRAND.colors.accent },
    ...directCompetitors.map((c, i) => ({
      name: c.company,
      value: c.igFollowers,
      color: ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'][i % 4],
    })),
  ]
  const sovTotal = sovData.reduce((s, d) => s + d.value, 0)

  // ---- Platform rankings ----
  const platformRankings = (tab: PlatformTab) => {
    const all = [
      {
        company: 'ShiftOneZero',
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
      ours: ourFollowerGrowth,
      avg: avgDirectFollowerGrowth,
      unit: '%',
      icon: <TrendingUp size={16} />,
    },
    {
      label: 'Rast angazmana (MoM)',
      ours: ourEngagementGrowth,
      avg: avgDirectEngagementGrowth,
      unit: 'pp',
      icon: <Zap size={16} />,
    },
    {
      label: 'Sadrzaj tjedno',
      ours: ourContentPerWeek,
      avg: +avgDirectContent,
      unit: '',
      icon: <Target size={16} />,
    },
  ]


  // ---- Enhanced table columns ----
  const columns = [
    {
      key: 'company',
      header: 'Tvrtka',
      render: (row: CompetitorRow) => (
        <div className="min-w-0">
          <span className="text-studio-text-primary font-medium truncate">{row.company}</span>
          <span className="text-xs text-studio-text-secondary ml-2 hidden sm:inline">{row.country}</span>
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
              : 'bg-blue-500/10 text-blue-400'
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
        <span className="text-studio-text-primary font-mono">{formatFollowers(row.igFollowers)}</span>
      ),
    },
    {
      key: 'igEngagement',
      header: 'IG angaz.',
      render: (row: CompetitorRow) => (
        <span
          className={`text-sm ${
            row.igEngagement > 2.5 ? 'text-green-600' : row.igEngagement > 1.5 ? 'text-yellow-600' : 'text-red-400'
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
        <span className="text-studio-text-primary font-mono">{formatFollowers(row.tiktokFollowers)}</span>
      ),
    },
    {
      key: 'tiktokEngagement',
      header: 'TT angaz.',
      render: (row: CompetitorRow) => (
        <span
          className={`text-sm ${
            row.tiktokEngagement > 2.5 ? 'text-green-600' : row.tiktokEngagement > 1.5 ? 'text-yellow-600' : 'text-red-400'
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
      key: 'gapVsUs',
      header: 'Jaz prema nama',
      render: (row: CompetitorRow) => {
        const icon =
          row.gapVsUs > 0 ? <TrendingUp size={14} /> : row.gapVsUs < 0 ? <TrendingDown size={14} /> : <Minus size={14} />
        return (
          <div
            className={`flex items-center gap-1 text-sm font-mono ${
              row.gapVsUs > 0 ? 'text-red-400' : 'text-green-600'
            }`}
          >
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
  ]

  // ---- Render ----
  return (
    <div>
      <Header title="KONKURENCIJA" subtitle="Usporedba s konkurencijom i analiza jaza" />

      <div className="page-wrapper space-y-6 stagger-sections">
        {/* ───── Summary cards ───── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-cards">
          <div className="card">
            <div className="flex items-center gap-2 text-sm text-studio-text-secondary">
              <Shield size={14} />
              Direktni konkurenti
            </div>
            <p className="text-3xl font-bold text-studio-text-primary mt-1">{summary.directCount}</p>
            <p className="text-xs text-green-600 mt-1">
              Vodimo u {summary.weLeadIn} od {summary.directCount}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-studio-text-secondary">Naši IG pratitelji</p>
            <p className="text-3xl font-bold text-studio-text-primary mt-1">{summary.ourIgFormatted}</p>
            <p className="text-xs text-brand-accent mt-1">Rangirani {summary.ourRank}</p>
          </div>
          <div className="card">
            <p className="text-sm text-studio-text-secondary">Prosj. angaz. (direktni)</p>
            <p className="text-3xl font-bold text-studio-text-primary mt-1">{summary.avgEngagementDirect}%</p>
            <p className="text-xs text-yellow-600 mt-1">Mi: {summary.ourEngagement}% (iznad prosjeka)</p>
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

        {/* ───── Competitive Positioning — IG followers + engagement ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <ComparisonBar
              data={[
                { name: 'ShiftOneZero', value: ourIg, color: SHIFTONEZERO_BRAND.colors.accent },
                ...competitorList.map(c => ({
                  name: c.company,
                  value: c.igFollowers,
                  color: tierColor(c.tier),
                })),
              ].sort((a, b) => b.value - a.value)}
              title="Instagram pratitelji — svi konkurenti"
              valueLabel="Pratitelji"
            />
          </div>
          <div className="card">
            <ComparisonBar
              data={[
                { name: 'ShiftOneZero', value: ourEngagement, color: SHIFTONEZERO_BRAND.colors.accent },
                ...competitorList.map(c => ({
                  name: c.company,
                  value: c.igEngagement,
                  color: tierColor(c.tier),
                })),
              ].sort((a, b) => b.value - a.value)}
              title="Stopa angažmana (%)"
              valueLabel="Angažman %"
            />
          </div>
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
                    stroke="#1A1A1A"
                    animationDuration={CHART_ANIM.pieDuration}
                    animationEasing={CHART_ANIM.pieEasing}
                    animationBegin={300}
                  >
                    {sovData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value: number) => formatFollowers(value)}
                      />
                    }
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
                        <p className="text-sm text-studio-text-primary truncate">{item.name}</p>
                      </div>
                      <span className="text-sm font-mono text-studio-text-primary font-medium">{pct}%</span>
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
                const diff = m.ours - m.avg
                const winning = diff > 0
                return (
                  <div key={m.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-studio-text-secondary">
                        {m.icon}
                        {m.label}
                      </div>
                      <span className={`text-xs font-medium ${winning ? 'text-green-600' : 'text-red-600'}`}>
                        {winning ? '+' : ''}{diff.toFixed(1)}{m.unit} vs prosjek
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-studio-text-secondary mb-1">
                          <span>ShiftOneZero</span>
                          <span className="font-mono font-medium text-studio-text-primary">{m.ours}{m.unit}</span>
                        </div>
                        <div className="w-full h-2 bg-studio-surface-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (m.ours / Math.max(m.ours, m.avg)) * 100)}%`,
                              backgroundColor: SHIFTONEZERO_BRAND.colors.accent,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-studio-text-secondary mb-1">
                          <span>Prosj. direktni</span>
                          <span className="font-mono font-medium text-studio-text-primary">{m.avg}{m.unit}</span>
                        </div>
                        <div className="w-full h-2 bg-studio-surface-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-400"
                            style={{
                              width: `${Math.min(100, (m.avg / Math.max(m.ours, m.avg)) * 100)}%`,
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

          <div
            style={{
              clipPath: chartRevealed ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
              transition: 'clip-path 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <ResponsiveContainer width="100%" height={Math.max(280, rankings.length * 36)}>
              <BarChart data={rankings} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
                <XAxis
                  type="number"
                  {...AXIS_STYLE}
                  tickFormatter={(v: number) => formatFollowers(v)}
                />
                <YAxis
                  dataKey="company"
                  type="category"
                  {...AXIS_STYLE}
                  width={130}
                  tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => (
                    <text
                      x={x}
                      y={y}
                      dy={4}
                      textAnchor="end"
                      fontSize={11}
                      fill={payload.value === 'ShiftOneZero' ? SHIFTONEZERO_BRAND.colors.accent : '#94a3b8'}
                      fontWeight={payload.value === 'ShiftOneZero' ? 700 : 400}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <Tooltip
                  content={<ChartTooltip formatter={(value: number) => formatFollowers(value)} />}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />
                {platformTab === 'instagram' && (
                  <Bar dataKey="igFollowers" name="IG pratitelji" radius={[0, 6, 6, 0]}
                    isAnimationActive={false}>
                    {rankings.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.isOurs ? SHIFTONEZERO_BRAND.colors.primary : SHIFTONEZERO_BRAND.colors.blue}
                        fillOpacity={entry.isOurs ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                )}
                {platformTab === 'tiktok' && (
                  <Bar dataKey="tiktokFollowers" name="TikTok pratitelji" radius={[0, 6, 6, 0]}
                    isAnimationActive={false}>
                    {rankings.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.isOurs ? SHIFTONEZERO_BRAND.colors.primary : '#8B5CF6'}
                        fillOpacity={entry.isOurs ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                )}
                {platformTab === 'overall' && (
                  <>
                    <Bar dataKey="igFollowers" name="IG pratitelji" stackId="a" radius={[0, 0, 0, 0]}
                      isAnimationActive={false}>
                      {rankings.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.isOurs ? SHIFTONEZERO_BRAND.colors.primary : SHIFTONEZERO_BRAND.colors.blue}
                          fillOpacity={entry.isOurs ? 1 : 0.6}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="tiktokFollowers" name="TikTok pratitelji" stackId="a" radius={[0, 6, 6, 0]}
                      isAnimationActive={false}>
                      {rankings.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.isOurs ? SHIFTONEZERO_BRAND.colors.accent : '#8B5CF6'}
                          fillOpacity={entry.isOurs ? 1 : 0.5}
                        />
                      ))}
                    </Bar>
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ───── Enhanced Competitor Table ───── */}
        <div className="card">
          <h2 className="section-title mb-4">Svi praceni konkurenti</h2>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={competitorList} emptyMessage="Nema pracenih konkurenata" />
          </div>
        </div>

      </div>
    </div>
  )
}
