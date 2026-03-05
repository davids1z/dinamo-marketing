import Header from '../components/layout/Header'
import { FunnelChart } from '../components/charts/FunnelChart'
import { Users, UserPlus, Heart, Star, Award, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
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

interface FanData {
  fanSegments: FanSegment[]
  funnelSteps: FunnelStep[]
  clvData: ClvRow[]
  churnPredictions: ChurnPrediction[]
}

const iconMap: Record<string, LucideIcon> = {
  UserPlus,
  Users,
  Heart,
  Star,
  Award,
}

// Fallback mock data for when API is not available
const fallbackData: FanData = {
  fanSegments: [
    { stage: 'Novi', count: 45000, iconName: 'UserPlus', color: 'from-sky-600 to-sky-400', growth: 12.4, description: 'Pridruženi u zadnjih 30 dana' },
    { stage: 'Povremeni', count: 120000, iconName: 'Users', color: 'from-blue-600 to-blue-400', growth: 5.2, description: 'Prate, ali nizak angažman' },
    { stage: 'Aktivni', count: 280000, iconName: 'Heart', color: 'from-indigo-600 to-indigo-400', growth: 8.1, description: 'Redovita interakcija' },
    { stage: 'Superfan', count: 85000, iconName: 'Star', color: 'from-purple-600 to-purple-400', growth: 15.3, description: 'Visoki angažman + kupnje' },
    { stage: 'Ambasador', count: 12000, iconName: 'Award', color: 'from-yellow-600 to-yellow-400', growth: 22.7, description: 'UGC kreatori i zagovornici' },
  ],
  funnelSteps: [
    { label: 'Ukupni doseg', value: 542000, color: '#0ea5e9' },
    { label: 'Aktivni pratitelji', value: 280000, color: '#3b82f6' },
    { label: 'Angazirani navijaci', value: 120000, color: '#6366f1' },
    { label: 'Superfanovi', value: 85000, color: '#a855f7' },
    { label: 'Ambasadori', value: 12000, color: '#eab308' },
  ],
  clvData: [
    { segment: 'Novi', clv: '\u20AC2.10', retention: '35%', churnRisk: 'Visoki' },
    { segment: 'Povremeni', clv: '\u20AC8.50', retention: '52%', churnRisk: 'Srednji' },
    { segment: 'Aktivni', clv: '\u20AC24.00', retention: '78%', churnRisk: 'Niski' },
    { segment: 'Superfan', clv: '\u20AC86.00', retention: '92%', churnRisk: 'Vrlo nizak' },
    { segment: 'Ambasador', clv: '\u20AC210.00', retention: '97%', churnRisk: 'Minimalan' },
  ],
  churnPredictions: [
    { metric: 'Navijači pod rizikom (30 dana)', value: '8,420', trend: 'down', change: '-12%', description: 'Navijači koji će vjerojatno prestati pratiti u sljedećih 30 dana' },
    { metric: 'Ciljevi za reaktivaciju', value: '3,150', trend: 'up', change: '+8%', description: 'Neaktivni navijači s potencijalom reaktivacije' },
    { metric: 'Kandidati za nadogradnju', value: '15,800', trend: 'up', change: '+22%', description: 'Povremeni navijači koji pokazuju signale Superfana' },
  ],
}

export default function FanInsights() {
  const fanSegments = fallbackData.fanSegments
  const funnelSteps = fallbackData.funnelSteps
  const clvData = fallbackData.clvData
  const churnPredictions = fallbackData.churnPredictions

  return (
    <div className="animate-fade-in">
      <Header title="UVIDI O NAVIJAČIMA" subtitle="Segmentacija navijača, životni ciklus i analiza vrijednosti" />

      <div className="page-wrapper space-y-6">
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
                  <p className="text-sm text-dinamo-muted">{seg.stage}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {seg.count >= 1000 ? `${(seg.count / 1000).toFixed(0)}K` : seg.count}
                  </p>
                </div>
                <p className="text-xs text-dinamo-muted truncate">{seg.description}</p>
              </div>
            )
          })}
        </div>

        {/* Funnel */}
        <div className="card">
          <FunnelChart steps={funnelSteps} title="Lijevak životnog ciklusa navijača" />
        </div>

        {/* CLV Table */}
        <div className="card">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-600" />
            Doživotna vrijednost navijača po segmentu
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-dinamo-muted font-medium">Segment</th>
                  <th className="text-left py-3 px-4 text-dinamo-muted font-medium">Prosj. CLV</th>
                  <th className="text-left py-3 px-4 text-dinamo-muted font-medium hidden sm:table-cell">Zadržavanje</th>
                  <th className="text-left py-3 px-4 text-dinamo-muted font-medium">Rizik odljeva</th>
                </tr>
              </thead>
              <tbody>
                {clvData.map((row) => (
                  <tr key={row.segment} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900 font-medium">{row.segment}</td>
                    <td className="py-3 px-4 text-emerald-600 font-mono">{row.clv}</td>
                    <td className="py-3 px-4 text-gray-600 hidden sm:table-cell">{row.retention}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        row.churnRisk === 'Visoki' ? 'bg-red-100 text-red-600' :
                        row.churnRisk === 'Srednji' ? 'bg-yellow-100 text-yellow-600' :
                        row.churnRisk === 'Niski' ? 'bg-green-100 text-green-600' :
                        'bg-emerald-100 text-emerald-600'
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

        {/* Churn Predictions */}
        <div className="card">
          <h2 className="section-title mb-4">Prediktivna analitika</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {churnPredictions.map((item) => (
              <div key={item.metric} className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-dinamo-muted">{item.metric}</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">{item.value}</span>
                  <span className={`text-xs flex items-center gap-0.5 ${
                    item.trend === 'up' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {item.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {item.change}
                  </span>
                </div>
                <p className="text-xs text-dinamo-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
