import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { FunnelChart } from '../components/charts/FunnelChart'
import { CardSkeleton, ChartSkeleton, ErrorState } from '../components/common/LoadingSpinner'
import { useProjectStatus } from '../hooks/useProjectStatus'
import { useClient } from '../contexts/ClientContext'
import { useApi } from '../hooks/useApi'
import EmptyState from '../components/common/EmptyState'
import {
  Users, UserPlus, Heart, Star, Award, TrendingUp, TrendingDown,
  DollarSign, RefreshCw, ShieldAlert, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Target, Activity, Link2, FolderKanban, Info,
  Zap, Sparkles, Lightbulb, Shield, Crosshair,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, CartesianGrid,
} from 'recharts'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { CHART_ANIM, AXIS_STYLE, GRID_STYLE } from '../components/charts/chartConfig'
import { formatNumber } from '../utils/formatters'

/* ─────────── types ─────────── */

interface CustomerSegment {
  stage: string
  count: number
  iconName: string
  color: string
  growth: number
  description: string
}

interface FunnelStep {
  label: string
  value: number
  color: string
}

interface ClvRow {
  segment: string
  clv: string
  retention: string
  churnRisk: string
}

interface ChurnPrediction {
  metric: string
  value: string
  trend: string
  change: string
  description: string
}

interface ChurnDistItem {
  name: string
  value: number
  color: string
}

interface GrowthTrendPoint {
  month: string
  ambassador: number
  superfan: number
  casual: number
  sleeper: number
  vip_risk: number
}

interface TargetingItem {
  segment: string
  icon: string
  advice: string
}

interface MonetaryValue {
  segment: string
  count: number
  avgValue: number
  totalValue: number
}

interface ChurnAlert {
  severity: string
  title: string
  message: string
  affectedCount: number
  estimatedRevenueAtRisk: number
}

interface SegmentationData {
  fanSegments: CustomerSegment[]
  funnelSteps: FunnelStep[]
  clvData: ClvRow[]
  churnPredictions: ChurnPrediction[]
  churnDistribution: ChurnDistItem[]
  growthTrend: GrowthTrendPoint[]
  targeting: TargetingItem[]
  monetaryValues: MonetaryValue[]
  aiAdvice: string | null
  churnAlert: ChurnAlert | null
  totalUsers: number
  _meta?: {
    is_estimate: boolean
    connected_platforms?: string[]
    analyzed_at: string | null
  }
}

/* ─────────── helpers ─────────── */

const iconMap: Record<string, LucideIcon> = {
  UserPlus,
  Users,
  Heart,
  Star,
  Award,
}

const SEGMENT_COLORS = ['#f59e0b', '#a855f7', '#3b82f6', '#64748b', '#ef4444']

const TREND_LINE_COLORS: Record<string, { color: string; label: string }> = {
  ambassador: { color: '#f59e0b', label: 'Ambasadori' },
  superfan: { color: '#a855f7', label: 'Superfanovi' },
  casual: { color: '#3b82f6', label: 'Povremeni' },
  sleeper: { color: '#64748b', label: 'Spavači' },
  vip_risk: { color: '#ef4444', label: 'VIP / Rizik' },
}

const churnRiskColor = (risk: string) => {
  if (risk === 'Visoki' || risk === 'Kritičan') return { bg: 'bg-red-500/10', text: 'text-red-400', bar: 'bg-red-500', width: '85%' }
  if (risk === 'Srednji') return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', bar: 'bg-yellow-500', width: '55%' }
  if (risk === 'Niski') return { bg: 'bg-green-500/10', text: 'text-green-400', bar: 'bg-green-500', width: '25%' }
  return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-500', width: '10%' }
}

/* ─────────── EstimateBanner ─────────── */

function EstimateBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
      <Info size={16} className="text-amber-500 flex-shrink-0" />
      <p className="text-xs text-amber-400/80">
        <span className="font-semibold text-amber-400">Procijenjeni podaci</span> — AI analizira vaše kanale i kreira segmentaciju publike. Prikaz se temelji na benchmark podacima sličnih brendova.
      </p>
    </div>
  )
}

/* ─────────── AI Insight Card ─────────── */

function SegmentationAIInsight({
  totalUsers,
  isEstimate,
  brandName,
  segments,
  churnAlert,
}: {
  totalUsers: number
  isEstimate: boolean
  brandName: string
  segments: CustomerSegment[]
  churnAlert: ChurnAlert | null
}) {
  const insight = useMemo(() => {
    if (isEstimate) {
      return {
        icon: Zap,
        color: '#f59e0b',
        title: 'Analiziramo vašu publiku',
        text: `AI kreira segmentaciju za ${brandName} na temelju ${formatNumber(totalUsers)} procijenjenih korisnika. Podaci se temelje na benchmark analizi sličnih brendova.`,
      }
    }

    if (churnAlert && churnAlert.severity === 'high') {
      return {
        icon: AlertTriangle,
        color: '#ef4444',
        title: 'Upozorenje: odljev korisnika',
        text: `${churnAlert.affectedCount} korisnika pokazuje znakove odljeva za ${brandName}. Procijenjeni prihod u riziku: €${churnAlert.estimatedRevenueAtRisk.toFixed(0)}. Pokrenite re-engagement kampanju.`,
      }
    }

    const topSegment = segments.length > 0 ? segments.reduce((a, b) => (a.count > b.count ? a : b)) : null
    if (topSegment) {
      return {
        icon: Sparkles,
        color: '#22c55e',
        title: 'Analiza segmenata',
        text: `Najveći segment za ${brandName}: "${topSegment.stage}" s ${formatNumber(topSegment.count)} korisnika (${totalUsers > 0 ? ((topSegment.count / totalUsers) * 100).toFixed(0) : 0}% ukupne publike). ${topSegment.growth > 0 ? `Rast od +${topSegment.growth}% ovaj mjesec.` : ''}`,
      }
    }

    return {
      icon: Activity,
      color: '#0ea5e9',
      title: 'Segmentacija u tijeku',
      text: `AI analizira ponašanje publike za ${brandName}.`,
    }
  }, [totalUsers, isEstimate, brandName, segments, churnAlert])

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

/* ─────────── Churn Alert Banner ─────────── */

function ChurnAlertBanner({ alert }: { alert: ChurnAlert }) {
  const isCritical = alert.severity === 'high'

  return (
    <div className={`rounded-xl border p-5 ${
      isCritical
        ? 'border-red-500/20 bg-gradient-to-r from-red-500/5 to-transparent'
        : 'border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-transparent'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isCritical ? 'bg-red-500/10' : 'bg-yellow-500/10'
        }`}>
          <ShieldAlert size={22} className={isCritical ? 'text-red-400' : 'text-yellow-400'} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold uppercase tracking-wider ${isCritical ? 'text-red-400' : 'text-yellow-400'}`}>
              {alert.title}
            </span>
          </div>
          <p className="text-sm text-studio-text-secondary leading-relaxed mb-3">{alert.message}</p>
          <div className="flex items-center gap-4">
            <span className={`text-xs px-2 py-1 rounded-full ${isCritical ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
              {alert.affectedCount} korisnika
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">
              €{alert.estimatedRevenueAtRisk.toFixed(0)} u riziku
            </span>
          </div>
        </div>
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
            <span className="text-studio-text-tertiary">&middot;</span>
            <span className="text-xs text-studio-text-tertiary">Segmentacija</span>
          </div>
          <p className="text-sm text-studio-text-secondary leading-relaxed">{advice}</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Targeting Advice Card ─────────── */

function TargetingAdviceCard({ targeting }: { targeting: TargetingItem[] }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <Crosshair size={18} className="text-brand-accent" />
        <h3 className="font-headline text-base tracking-wider text-studio-text-primary">AI savjeti za targetiranje</h3>
      </div>
      <div className="space-y-3">
        {targeting.map((t) => {
          const Icon = iconMap[t.icon] || Users
          return (
            <div key={t.segment} className="p-4 rounded-xl bg-studio-surface-0 border border-studio-border-subtle hover:border-brand-accent/20 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className="text-brand-accent" />
                <span className="text-sm font-semibold text-studio-text-primary">{t.segment}</span>
              </div>
              <p className="text-xs text-studio-text-secondary leading-relaxed">{t.advice}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────── Monetary Value Table ─────────── */

function MonetaryValueTable({ values }: { values: MonetaryValue[] }) {
  const totalValue = values.reduce((sum, v) => sum + v.totalValue, 0)

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <DollarSign size={18} className="text-emerald-400" />
        <h3 className="font-headline text-base tracking-wider text-studio-text-primary">Procjena monetarne vrijednosti</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-studio-border">
              <th className="text-left py-3 px-4 text-studio-text-secondary font-medium">Segment</th>
              <th className="text-right py-3 px-4 text-studio-text-secondary font-medium">Korisnici</th>
              <th className="text-right py-3 px-4 text-studio-text-secondary font-medium hidden sm:table-cell">Prosj. CLV</th>
              <th className="text-right py-3 px-4 text-studio-text-secondary font-medium">Ukupna vr.</th>
              <th className="text-right py-3 px-4 text-studio-text-secondary font-medium hidden md:table-cell">Udio</th>
            </tr>
          </thead>
          <tbody>
            {values.map((row) => (
              <tr key={row.segment} className="border-b border-studio-border hover:bg-studio-surface-1">
                <td className="py-3 px-4 text-studio-text-primary font-medium">{row.segment}</td>
                <td className="py-3 px-4 text-right text-studio-text-secondary font-mono">{formatNumber(row.count)}</td>
                <td className="py-3 px-4 text-right text-emerald-400 font-mono hidden sm:table-cell">€{row.avgValue.toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-brand-accent font-mono font-semibold">€{formatNumber(Math.round(row.totalValue))}</td>
                <td className="py-3 px-4 text-right hidden md:table-cell">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 bg-studio-surface-3 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-brand-accent/60 transition-all"
                        style={{ width: `${totalValue > 0 ? (row.totalValue / totalValue * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-studio-text-tertiary font-mono w-10 text-right">
                      {totalValue > 0 ? ((row.totalValue / totalValue) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-studio-border">
              <td className="py-3 px-4 text-studio-text-primary font-bold">Ukupno</td>
              <td className="py-3 px-4 text-right text-studio-text-secondary font-mono font-semibold">
                {formatNumber(values.reduce((s, v) => s + v.count, 0))}
              </td>
              <td className="py-3 px-4 hidden sm:table-cell" />
              <td className="py-3 px-4 text-right text-brand-accent font-mono font-bold">€{formatNumber(Math.round(totalValue))}</td>
              <td className="py-3 px-4 hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

/* ─────────── Page ─────────── */

export default function CustomerSegmentation() {
  const navigate = useNavigate()
  const { hasProjects } = useProjectStatus()
  const { currentClient } = useClient()
  const brandName = currentClient?.client_name || 'Vaš brend'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawData, loading, error, refetch } = useApi<any>('/fans/')

  // Transform API data
  const pageData: SegmentationData | null = useMemo(() => {
    if (!rawData) return null

    // BFF endpoint returns camelCase keys
    const segments: CustomerSegment[] = (rawData.fanSegments || rawData.fan_segments || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => ({
        stage: String(s.stage ?? ''),
        count: Number(s.count ?? 0),
        iconName: String(s.icon_name ?? s.iconName ?? 'Users'),
        color: String(s.color ?? ''),
        growth: Number(s.growth ?? 0),
        description: String(s.description ?? ''),
      })
    )

    const funnel: FunnelStep[] = (rawData.funnelSteps || rawData.funnel_steps || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => ({
        label: String(f.label ?? ''),
        value: Number(f.value ?? 0),
        color: String(f.color ?? '#3b82f6'),
      })
    )

    const clv: ClvRow[] = (rawData.clvData || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => ({
        segment: String(r.segment ?? ''),
        clv: String(r.clv ?? ''),
        retention: String(r.retention ?? ''),
        churnRisk: String(r.churn_risk ?? r.churnRisk ?? ''),
      })
    )

    const churn: ChurnPrediction[] = (rawData.churnPredictions || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => ({
        metric: String(c.metric ?? ''),
        value: String(c.value ?? '0'),
        trend: String(c.trend ?? 'up'),
        change: String(c.change ?? ''),
        description: String(c.description ?? ''),
      })
    )

    return {
      fanSegments: segments,
      funnelSteps: funnel,
      clvData: clv,
      churnPredictions: churn,
      churnDistribution: rawData.churnDistribution || [],
      growthTrend: rawData.growthTrend || [],
      targeting: rawData.targeting || [],
      monetaryValues: rawData.monetaryValues || [],
      aiAdvice: rawData.aiAdvice || null,
      churnAlert: rawData.churnAlert || null,
      totalUsers: Number(rawData.totalUsers ?? 0),
      _meta: rawData._meta || undefined,
    }
  }, [rawData])

  const isEstimate = pageData?._meta?.is_estimate ?? false
  const connectedPlatforms = pageData?._meta?.connected_platforms ?? []

  /* ── Guards ── */

  if (!hasProjects) {
    return (
      <div>
        <Header title="SEGMENTACIJA KORISNIKA" subtitle="Mozak vašeg marketinga — segmenti, životni ciklus i vrijednost publike" />
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

  if (loading) {
    return (
      <>
        <Header title="SEGMENTACIJA KORISNIKA" subtitle="Mozak vašeg marketinga — segmenti, životni ciklus i vrijednost publike" />
        <div className="page-wrapper space-y-6">
          <CardSkeleton count={5} />
          <ChartSkeleton />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header title="SEGMENTACIJA KORISNIKA" subtitle="Mozak vašeg marketinga — segmenti, životni ciklus i vrijednost publike" />
        <div className="page-wrapper">
          <ErrorState message={error} onRetry={refetch} />
        </div>
      </>
    )
  }

  if (!pageData || pageData.fanSegments.length === 0) {
    return (
      <div>
        <Header title="SEGMENTACIJA KORISNIKA" subtitle="Mozak vašeg marketinga — segmenti, životni ciklus i vrijednost publike" />
        <div className="page-wrapper">
          <EmptyState
            icon={Users}
            variant="hero"
            title="Dodajte linkove društvenih mreža"
            description="Unesite linkove vaših profila u Brand Profilu kako bi AI mogao analizirati publiku i kreirati segmente."
            action={
              <button
                onClick={() => navigate('/brand-profile?tab=mreze')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent-hover transition-all shadow-sm"
              >
                <Link2 size={16} />
                Dodajte linkove
              </button>
            }
          />
        </div>
      </div>
    )
  }

  /* ── Computed ── */

  const { fanSegments, funnelSteps, clvData, churnPredictions, churnDistribution, growthTrend, targeting, monetaryValues, aiAdvice, churnAlert, totalUsers } = pageData

  const segmentDistribution = fanSegments.map((s, i) => ({
    name: s.stage,
    value: s.count,
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length]!,
    pct: totalUsers > 0 ? ((s.count / totalUsers) * 100).toFixed(1) : '0',
  }))

  const avgGrowth = fanSegments.length > 0
    ? fanSegments.reduce((sum, s) => sum + s.growth, 0) / fanSegments.length
    : 0

  return (
    <div>
      <Header title="SEGMENTACIJA KORISNIKA" subtitle="Mozak vašeg marketinga — segmenti, životni ciklus i vrijednost publike" />

      <div className="page-wrapper space-y-6">
        {/* Estimate Banner */}
        {isEstimate && <EstimateBanner />}

        {/* AI Insight */}
        <SegmentationAIInsight
          totalUsers={totalUsers}
          isEstimate={isEstimate}
          brandName={brandName}
          segments={fanSegments}
          churnAlert={churnAlert}
        />

        {/* Churn Alert */}
        {churnAlert && <ChurnAlertBanner alert={churnAlert} />}

        {/* Top Bar: Health Summary + Refresh */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-accent/10 rounded-lg">
              <Users size={16} className="text-brand-accent" />
              <span className="text-sm font-medium text-brand-accent">
                {formatNumber(totalUsers)} ukupno korisnika
              </span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              avgGrowth > 5 ? 'bg-green-500/10' : avgGrowth > 0 ? 'bg-blue-500/10' : 'bg-amber-500/10'
            }`}>
              {avgGrowth > 0 ? <ArrowUpRight size={16} className="text-green-600" /> : <ArrowDownRight size={16} className="text-yellow-600" />}
              <span className={`text-sm font-medium ${avgGrowth > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                {avgGrowth > 0 ? '+' : ''}{avgGrowth.toFixed(1)}% prosječni rast
              </span>
            </div>
            {connectedPlatforms.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg">
                <Activity size={16} className="text-blue-400" />
                <span className="text-sm font-medium text-blue-400">
                  {connectedPlatforms.length} {connectedPlatforms.length === 1 ? 'kanal' : connectedPlatforms.length < 5 ? 'kanala' : 'kanala'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={refetch}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            Osvježi
          </button>
        </div>

        {/* Customer Segment Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {fanSegments.map((seg, i) => {
            const Icon = iconMap[seg.iconName] || Users
            return (
              <div key={seg.stage} className="card space-y-3 hover:border-brand-accent/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${seg.color}`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className={`text-xs flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                    seg.growth > 0
                      ? (seg.stage === 'VIP / Rizik' || seg.stage === 'Spavači' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400')
                      : (seg.stage === 'VIP / Rizik' || seg.stage === 'Spavači' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')
                  }`}>
                    {seg.growth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {seg.growth > 0 ? '+' : ''}{seg.growth}%
                  </span>
                </div>
                <div>
                  <p className="text-sm text-studio-text-secondary">{seg.stage}</p>
                  <p className="text-2xl font-stats text-studio-text-primary">
                    {formatNumber(seg.count)}
                  </p>
                </div>
                {/* Mini distribution bar */}
                <div className="w-full bg-studio-surface-3 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: totalUsers > 0 ? `${(seg.count / totalUsers) * 100}%` : '0%',
                      backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                    }}
                  />
                </div>
                <p className="text-xs text-studio-text-secondary leading-relaxed">{seg.description}</p>
              </div>
            )
          })}
        </div>

        {/* Segment Distribution + Growth Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Segment Distribution Donut */}
          <div className="card">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <Target size={18} className="text-brand-accent" />
              Raspodjela segmenata
            </h2>
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={segmentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={CHART_ANIM.pieDuration}
                    animationEasing={CHART_ANIM.pieEasing}
                    animationBegin={200}
                  >
                    {segmentDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value: number) =>
                          `${formatNumber(value)} (${totalUsers > 0 ? ((value / totalUsers) * 100).toFixed(1) : 0}%)`
                        }
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {segmentDistribution.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-studio-text-primary">{s.name}</span>
                  </div>
                  <span className="text-studio-text-secondary font-mono">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Growth Trend Chart */}
          <div className="lg:col-span-2 card">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <Activity size={18} className="text-emerald-400" />
              Trend rasta segmenata (6 mjeseci)
            </h2>
            {growthTrend.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={growthTrend}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="month" {...AXIS_STYLE} dy={8} />
                    <YAxis {...AXIS_STYLE} dx={-4} tickFormatter={(v: number) => formatNumber(v)} />
                    <Tooltip content={<ChartTooltip formatter={(value: number) => formatNumber(value)} />} />
                    {Object.entries(TREND_LINE_COLORS).map(([key, { color, label }], i) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={color}
                        strokeWidth={2.5}
                        dot={{ r: 2, fill: color, stroke: '#1e293b', strokeWidth: 2 }}
                        activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
                        name={label}
                        animationDuration={CHART_ANIM.lineDuration}
                        animationEasing={CHART_ANIM.lineEasing}
                        animationBegin={i * 100}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-4 mt-3 justify-center">
                  {Object.entries(TREND_LINE_COLORS).map(([, { color, label }]) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-studio-text-secondary">
                      <div className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-studio-text-tertiary text-sm">
                Podaci o trendu će biti dostupni nakon prikupljanja podataka
              </div>
            )}
          </div>
        </div>

        {/* Funnel */}
        {funnelSteps.length > 0 && (
          <div className="card">
            <FunnelChart steps={funnelSteps} title="Lijevak životnog ciklusa korisnika" />
          </div>
        )}

        {/* AI Daily Advice */}
        {aiAdvice && <AIDailyAdvice advice={aiAdvice} />}

        {/* CLV Table + Churn Risk Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CLV Table */}
          {clvData.length > 0 && (
            <div className="lg:col-span-2 card">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-400" />
                Doživotna vrijednost korisnika po segmentu
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-studio-border">
                      <th className="text-left py-3 px-4 text-studio-text-secondary font-medium">Segment</th>
                      <th className="text-left py-3 px-4 text-studio-text-secondary font-medium">Prosj. CLV</th>
                      <th className="text-left py-3 px-4 text-studio-text-secondary font-medium hidden sm:table-cell">Zadržavanje</th>
                      <th className="text-left py-3 px-4 text-studio-text-secondary font-medium">Rizik odljeva</th>
                      <th className="text-left py-3 px-4 text-studio-text-secondary font-medium hidden md:table-cell">Razina rizika</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clvData.map((row) => {
                      const riskStyle = churnRiskColor(row.churnRisk)
                      return (
                        <tr key={row.segment} className="border-b border-studio-border hover:bg-studio-surface-1">
                          <td className="py-3 px-4 text-studio-text-primary font-medium">{row.segment}</td>
                          <td className="py-3 px-4 text-emerald-400 font-mono">{row.clv}</td>
                          <td className="py-3 px-4 text-studio-text-secondary hidden sm:table-cell">{row.retention}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${riskStyle.bg} ${riskStyle.text}`}>
                              {row.churnRisk}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <div className="w-full bg-studio-surface-3 rounded-full h-2 max-w-[120px]">
                              <div
                                className={`h-2 rounded-full ${riskStyle.bar} transition-all`}
                                style={{ width: riskStyle.width }}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Churn Risk Distribution */}
          {churnDistribution.length > 0 ? (
            <div className="card">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <Shield size={18} className="text-brand-accent" />
                Distribucija rizika odljeva
              </h2>
              <div className="flex justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={churnDistribution} layout="vertical">
                    <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
                    <XAxis type="number" {...AXIS_STYLE} tickFormatter={(v: number) => `${v}%`} />
                    <YAxis type="category" dataKey="name" {...AXIS_STYLE} width={80} />
                    <Tooltip content={<ChartTooltip formatter={(value: number) => `${value}%`} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}
                      animationDuration={CHART_ANIM.barDuration} animationEasing={CHART_ANIM.barEasing}>
                      {churnDistribution.map((entry, idx) => (
                        <Cell key={`bar-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Risk summary */}
              <div className="mt-4 space-y-2">
                {(() => {
                  const safe = churnDistribution.filter(d => d.name === 'Minimalan' || d.name === 'Niski').reduce((s, d) => s + d.value, 0)
                  const critical = churnDistribution.filter(d => d.name === 'Visoki' || d.name === 'Kritičan').reduce((s, d) => s + d.value, 0)
                  return (
                    <>
                      <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
                        <span className="text-xs text-green-400 font-medium">Sigurno (Minimalni)</span>
                        <span className="text-sm text-green-400 font-bold">{safe}%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle size={14} className="text-red-400" />
                          <span className="text-xs text-red-400 font-medium">Potrebna intervencija</span>
                        </div>
                        <span className="text-sm text-red-400 font-bold">{critical}%</span>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          ) : clvData.length === 0 ? null : (
            <div className="card flex items-center justify-center text-studio-text-tertiary text-sm min-h-[200px]">
              Distribucija rizika će biti dostupna nakon analize
            </div>
          )}
        </div>

        {/* Monetary Value + Targeting Advice */}
        {(monetaryValues.length > 0 || targeting.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {monetaryValues.length > 0 && <MonetaryValueTable values={monetaryValues} />}
            {targeting.length > 0 && <TargetingAdviceCard targeting={targeting} />}
          </div>
        )}

        {/* Churn Predictions */}
        {churnPredictions.length > 0 && (
          <div className="card">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <Activity size={18} className="text-violet-600" />
              Prediktivna analitika
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {churnPredictions.map((item) => (
                <div key={item.metric} className="bg-studio-surface-0 rounded-xl p-4 space-y-2 border border-studio-border hover:border-brand-accent/30 transition-colors">
                  <p className="text-sm text-studio-text-secondary">{item.metric}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-stats text-studio-text-primary">{item.value}</span>
                    <span className={`text-xs flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                      item.trend === 'up' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-yellow-400'
                    }`}>
                      {item.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {item.change}
                    </span>
                  </div>
                  <p className="text-xs text-studio-text-secondary leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata bar */}
        {pageData._meta?.analyzed_at && (
          <div className="flex items-center justify-center gap-2 text-xs text-studio-text-tertiary pt-2">
            <Info size={12} />
            <span>
              Analizirano: {new Date(pageData._meta.analyzed_at).toLocaleString('hr-HR')}
              {isEstimate && ' • Procjena na temelju benchmark podataka'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
