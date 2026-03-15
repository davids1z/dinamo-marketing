import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { FunnelChart } from '../components/charts/FunnelChart'
import { CardSkeleton, ChartSkeleton, ErrorState } from '../components/common/LoadingSpinner'
import { useChannelStatus } from '../hooks/useChannelStatus'
import EmptyState from '../components/common/EmptyState'
import { fansApi } from '../api/fans'
import {
  Users, UserPlus, Heart, Star, Award, TrendingUp, TrendingDown,
  DollarSign, RefreshCw, ShieldAlert, ShieldCheck, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Target, Activity, Link2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, CartesianGrid,
} from 'recharts'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { CHART_ANIM, AXIS_STYLE, GRID_STYLE } from '../components/charts/chartConfig'

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

const iconMap: Record<string, LucideIcon> = {
  UserPlus,
  Users,
  Heart,
  Star,
  Award,
}

const SEGMENT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

const churnRiskColor = (risk: string) => {
  if (risk === 'Visoki') return { bg: 'bg-red-500/10', text: 'text-red-400', bar: 'bg-red-500', width: '85%' }
  if (risk === 'Srednji') return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', bar: 'bg-yellow-500', width: '55%' }
  if (risk === 'Niski') return { bg: 'bg-green-500/10', text: 'text-green-400', bar: 'bg-green-500', width: '25%' }
  return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-500', width: '10%' }
}

export default function CustomerSegmentation() {
  const navigate = useNavigate()
  const { hasConnectedChannels } = useChannelStatus()
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([])
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([])
  const [clvData, setClvData] = useState<ClvRow[]>([])
  const [churnPredictions, setChurnPredictions] = useState<ChurnPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [segmentsRes, clvRes, churnRes] = await Promise.all([
        fansApi.getSegments(),
        fansApi.getCLV(),
        fansApi.getChurnPredictions(),
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const segData = segmentsRes.data as any
      if (segData.fan_segments) {
        setCustomerSegments(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          segData.fan_segments.map((s: any) => ({
            stage: String(s.stage ?? ''),
            count: Number(s.count ?? 0),
            iconName: String(s.icon_name ?? 'Users'),
            color: String(s.color ?? ''),
            growth: Number(s.growth ?? 0),
            description: String(s.description ?? ''),
          }))
        )
      }
      if (segData.funnel_steps) {
        setFunnelSteps(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          segData.funnel_steps.map((f: any) => ({
            label: String(f.label ?? ''),
            value: Number(f.value ?? 0),
            color: String(f.color ?? '#3b82f6'),
          }))
        )
      }

      if (Array.isArray(clvRes.data)) {
        setClvData(
          clvRes.data.map((r: Record<string, unknown>) => ({
            segment: String(r.segment ?? ''),
            clv: String(r.clv ?? ''),
            retention: String(r.retention ?? ''),
            churnRisk: String(r.churn_risk ?? ''),
          }))
        )
      }

      if (Array.isArray(churnRes.data)) {
        setChurnPredictions(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          churnRes.data.map((c: any) => ({
            metric: String(c.metric ?? ''),
            value: String(c.value ?? '0'),
            trend: String(c.trend ?? 'up'),
            change: String(c.change ?? ''),
            description: String(c.description ?? ''),
          }))
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greska pri ucitavanju podataka')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (!hasConnectedChannels) {
    return (
      <div>
        <Header title="SEGMENTACIJA KORISNIKA" subtitle="Segmentacija kupaca, životni ciklus i analiza vrijednosti" />
        <div className="page-wrapper">
          <EmptyState
            icon={Users}
            title="Nema podataka o korisnicima"
            description="Povežite kanale i prikupite podatke o publici za segmentaciju korisnika i analizu životnog ciklusa."
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

  if (loading) {
    return (
      <>
        <Header title="SEGMENTACIJA KORISNIKA" subtitle="Segmentacija kupaca, životni ciklus i analiza vrijednosti" />
        <div className="page-wrapper space-y-6">
          <CardSkeleton count={4} />
          <ChartSkeleton />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header title="SEGMENTACIJA KORISNIKA" subtitle="Segmentacija kupaca, životni ciklus i analiza vrijednosti" />
        <div className="page-wrapper">
          <ErrorState message={error} onRetry={fetchData} />
        </div>
      </>
    )
  }

  // Calculate totals for segment distribution
  const totalCustomers = customerSegments.reduce((sum, s) => sum + s.count, 0)
  const segmentDistribution = customerSegments.map((s, i) => ({
    name: s.stage,
    value: s.count,
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length]!,
    pct: totalCustomers > 0 ? ((s.count / totalCustomers) * 100).toFixed(1) : '0',
  }))

  // Determine overall health
  const avgGrowth = customerSegments.length > 0
    ? customerSegments.reduce((sum, s) => sum + s.growth, 0) / customerSegments.length
    : 0
  const highRiskCount = clvData.filter(c => c.churnRisk === 'Visoki').length

  return (
    <div>
      <Header title="SEGMENTACIJA KORISNIKA" subtitle="Segmentacija kupaca, životni ciklus i analiza vrijednosti" />

      <div className="page-wrapper space-y-6">
        {/* Top Bar: Refresh + Health Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg">
              <Users size={16} className="text-brand-accent" />
              <span className="text-sm font-medium text-brand-accent">
                {totalCustomers >= 1000 ? `${(totalCustomers / 1000).toFixed(0)}K` : totalCustomers} ukupno korisnika
              </span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              avgGrowth > 5 ? 'bg-green-500/10' : avgGrowth > 0 ? 'bg-blue-500/10' : 'bg-amber-500/10'
            }`}>
              {avgGrowth > 0 ? <ArrowUpRight size={16} className="text-green-600" /> : <ArrowDownRight size={16} className="text-yellow-600" />}
              <span className={`text-sm font-medium ${avgGrowth > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                +{avgGrowth.toFixed(1)}% prosječni rast
              </span>
            </div>
            {highRiskCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-lg">
                <ShieldAlert size={16} className="text-red-400" />
                <span className="text-sm font-medium text-red-400">
                  {highRiskCount} segment{highRiskCount > 1 ? 'a' : ''} s visokim rizikom
                </span>
              </div>
            )}
          </div>
          <button
            onClick={fetchData}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            Osvježi
          </button>
        </div>

        {/* Customer Segment Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {customerSegments.map((seg, i) => {
            const Icon = iconMap[seg.iconName] || Users
            return (
              <div key={seg.stage} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${seg.color}`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className={`text-xs flex items-center gap-0.5 ${
                    seg.growth > 0 ? 'text-green-600' : 'text-red-400'
                  }`}>
                    {seg.growth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {seg.growth > 0 ? '+' : ''}{seg.growth}%
                  </span>
                </div>
                <div>
                  <p className="text-sm text-studio-text-secondary">{seg.stage}</p>
                  <p className="text-2xl font-bold text-studio-text-primary">
                    {seg.count >= 1000 ? `${(seg.count / 1000).toFixed(0)}K` : seg.count}
                  </p>
                </div>
                {/* Mini distribution bar */}
                <div className="w-full bg-studio-surface-3 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: totalCustomers > 0 ? `${(seg.count / totalCustomers) * 100}%` : '0%',
                      backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                    }}
                  />
                </div>
                <p className="text-xs text-studio-text-secondary truncate">{seg.description}</p>
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
                          `${(value / 1000).toFixed(0)}K (${totalCustomers > 0 ? ((value / totalCustomers) * 100).toFixed(1) : 0}%)`
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
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={[]}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="month" {...AXIS_STYLE} dy={8} />
                <YAxis {...AXIS_STYLE} dx={-4} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip formatter={(value: number) => `${(value / 1000).toFixed(1)}K`} />} />
                <Line type="monotone" dataKey="casual" stroke="#3b82f6" strokeWidth={2.5}
                  dot={{ r: 2, fill: '#3b82f6', stroke: '#1e293b', strokeWidth: 2 }}
                  activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  name="Casual" animationDuration={CHART_ANIM.lineDuration} animationEasing={CHART_ANIM.lineEasing} />
                <Line type="monotone" dataKey="engaged" stroke="#8b5cf6" strokeWidth={2.5}
                  dot={{ r: 2, fill: '#8b5cf6', stroke: '#1e293b', strokeWidth: 2 }}
                  activeDot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                  name="Angažirani" animationDuration={CHART_ANIM.lineDuration} animationEasing={CHART_ANIM.lineEasing} animationBegin={100} />
                <Line type="monotone" dataKey="loyal" stroke="#ec4899" strokeWidth={2.5}
                  dot={{ r: 2, fill: '#ec4899', stroke: '#1e293b', strokeWidth: 2 }}
                  activeDot={{ r: 4, fill: '#ec4899', stroke: '#fff', strokeWidth: 2 }}
                  name="Lojalni" animationDuration={CHART_ANIM.lineDuration} animationEasing={CHART_ANIM.lineEasing} animationBegin={200} />
                <Line type="monotone" dataKey="vip" stroke="#f59e0b" strokeWidth={2.5}
                  dot={{ r: 2, fill: '#f59e0b', stroke: '#1e293b', strokeWidth: 2 }}
                  activeDot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                  name="VIP" animationDuration={CHART_ANIM.lineDuration} animationEasing={CHART_ANIM.lineEasing} animationBegin={300} />
                <Line type="monotone" dataKey="ambassador" stroke="#10b981" strokeWidth={2.5}
                  dot={{ r: 2, fill: '#10b981', stroke: '#1e293b', strokeWidth: 2 }}
                  activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  name="Ambasadori" animationDuration={CHART_ANIM.lineDuration} animationEasing={CHART_ANIM.lineEasing} animationBegin={400} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 mt-3 justify-center">
              {['Casual', 'Angažirani', 'Lojalni', 'VIP', 'Ambasadori'].map((label, i) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-studio-text-secondary">
                  <div className="w-3 h-0.5 rounded" style={{ backgroundColor: SEGMENT_COLORS[i] }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Funnel */}
        {funnelSteps.length > 0 && (
          <div className="card">
            <FunnelChart steps={funnelSteps} title="Lijevak životnog ciklusa korisnika" />
          </div>
        )}

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
          <div className="card">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand-accent" />
              Distribucija rizika odljeva
            </h2>
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[]} layout="vertical">
                  <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
                  <XAxis type="number" {...AXIS_STYLE} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="name" {...AXIS_STYLE} width={80} />
                  <Tooltip content={<ChartTooltip formatter={(value: number) => `${value}%`} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}
                    animationDuration={CHART_ANIM.barDuration} animationEasing={CHART_ANIM.barEasing}>
                    {([] as any[]).map((entry, idx) => (
                      <Cell key={`bar-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Risk summary */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
                <span className="text-xs text-green-400 font-medium">Sigurno (Minimalni + Niski)</span>
                <span className="text-sm text-green-400 font-bold">73%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-red-400" />
                  <span className="text-xs text-red-400 font-medium">Potrebna intervencija</span>
                </div>
                <span className="text-sm text-red-400 font-bold">9%</span>
              </div>
            </div>
          </div>
        </div>

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
                    <span className="text-2xl font-bold text-studio-text-primary">{item.value}</span>
                    <span className={`text-xs flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                      item.trend === 'up' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-yellow-600'
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
      </div>
    </div>
  )
}
