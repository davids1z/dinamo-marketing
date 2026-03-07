import { useState, useEffect } from 'react'
import Header from '../components/layout/Header'
import { FunnelChart } from '../components/charts/FunnelChart'
import { CardSkeleton, ChartSkeleton, ErrorState } from '../components/common/LoadingSpinner'
import { fansApi } from '../api/fans'
import { Users, UserPlus, Heart, Star, Award, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface FanSegment {
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

export default function FanInsights() {
  const [fanSegments, setFanSegments] = useState<FanSegment[]>([])
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

      // Map segments response (snake_case from backend -> camelCase for frontend)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const segData = segmentsRes.data as any
      if (segData.fan_segments) {
        setFanSegments(
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

      // Map CLV response
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

      // Map churn response
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

  if (loading) {
    return (
      <>
        <Header title="UVIDI O NAVIJAČIMA" subtitle="Segmentacija navijača, životni ciklus i analiza vrijednosti" />
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
        <Header title="UVIDI O NAVIJAČIMA" subtitle="Segmentacija navijača, životni ciklus i analiza vrijednosti" />
        <div className="page-wrapper">
          <ErrorState message={error} onRetry={fetchData} />
        </div>
      </>
    )
  }

  return (
    <div className="animate-fade-in">
      <Header title="UVIDI O NAVIJAČIMA" subtitle="Segmentacija navijača, životni ciklus i analiza vrijednosti" />

      <div className="page-wrapper space-y-6">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <button
            onClick={fetchData}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            Osvježi
          </button>
        </div>

        {/* Fan Segment Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {fanSegments.map((seg) => {
            const Icon = iconMap[seg.iconName] || Users
            return (
              <div key={seg.stage} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${seg.color}`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className="text-xs text-green-600 flex items-center gap-0.5">
                    <TrendingUp size={12} />
                    +{seg.growth}%
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{seg.stage}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {seg.count >= 1000 ? `${(seg.count / 1000).toFixed(0)}K` : seg.count}
                  </p>
                </div>
                <p className="text-xs text-gray-500 truncate">{seg.description}</p>
              </div>
            )
          })}
        </div>

        {/* Funnel */}
        {funnelSteps.length > 0 && (
          <div className="card">
            <FunnelChart steps={funnelSteps} title="Lijevak životnog ciklusa navijača" />
          </div>
        )}

        {/* CLV Table */}
        {clvData.length > 0 && (
          <div className="card">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-emerald-700" />
              Doživotna vrijednost navijača po segmentu
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Segment</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Prosj. CLV</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium hidden sm:table-cell">Zadržavanje</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Rizik odljeva</th>
                  </tr>
                </thead>
                <tbody>
                  {clvData.map((row) => (
                    <tr key={row.segment} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-medium">{row.segment}</td>
                      <td className="py-3 px-4 text-emerald-700 font-mono">{row.clv}</td>
                      <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">{row.retention}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          row.churnRisk === 'Visoki' ? 'bg-red-50 text-red-700' :
                          row.churnRisk === 'Srednji' ? 'bg-yellow-100 text-yellow-600' :
                          row.churnRisk === 'Niski' ? 'bg-green-50 text-green-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {row.churnRisk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Churn Predictions */}
        {churnPredictions.length > 0 && (
          <div className="card">
            <h2 className="section-title mb-4">Prediktivna analitika</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {churnPredictions.map((item) => (
                <div key={item.metric} className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-gray-500">{item.metric}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">{item.value}</span>
                    <span className={`text-xs flex items-center gap-0.5 ${
                      item.trend === 'up' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {item.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {item.change}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
