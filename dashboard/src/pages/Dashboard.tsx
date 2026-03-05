import Header from '../components/layout/Header'
import MetricCard from '../components/common/MetricCard'
import { PageLoader, ErrorState } from '../components/common/LoadingSpinner'
import { EngagementChart } from '../components/charts/EngagementChart'
import { SentimentDonut } from '../components/charts/SentimentDonut'
import { useApi, usePolling } from '../hooks/useApi'
import { Users, Eye, TrendingUp, CreditCard, BarChart3, Heart, MessageCircle, UserPlus, AlertTriangle, CheckCircle, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface OverviewData {
  total_followers: number
  prev_followers: number
  monthly_reach: number
  prev_reach: number
  engagement_rate: number
  prev_engagement_rate: number
  ad_spend: number
  prev_ad_spend: number
  roas: number
  prev_roas: number
  sentiment_score: number
  prev_sentiment_score: number
  engagement_trend: Array<{ date: string; engagement: number; reach: number }>
  sentiment_breakdown: { positive: number; neutral: number; negative: number }
  recent_activity: Array<{ id: number; type: string; text: string; time: string }>
}

// Fallback mock data for when API is not available
const fallbackOverview: OverviewData = {
  total_followers: 1121000, prev_followers: 1050000,
  monthly_reach: 4200000, prev_reach: 3800000,
  engagement_rate: 2.8, prev_engagement_rate: 2.5,
  ad_spend: 12450, prev_ad_spend: 11200,
  roas: 3.2, prev_roas: 2.8,
  sentiment_score: 78, prev_sentiment_score: 72,
  engagement_trend: [
    { date: '27.02', engagement: 4200, reach: 125000 },
    { date: '28.02', engagement: 5100, reach: 142000 },
    { date: '01.03', engagement: 6800, reach: 198000 },
    { date: '02.03', engagement: 4900, reach: 137000 },
    { date: '03.03', engagement: 7200, reach: 215000 },
    { date: '04.03', engagement: 5600, reach: 168000 },
    { date: '05.03', engagement: 6100, reach: 182000 },
  ],
  sentiment_breakdown: { positive: 65, neutral: 25, negative: 10 },
  recent_activity: [
    { id: 1, type: 'follow', text: '+2.340 novih pratitelja na Instagramu ovaj tjedan', time: 'prije 2 sata' },
    { id: 2, type: 'comment', text: '148 novih komentara na highlights reel utakmice', time: 'prije 4 sata' },
    { id: 3, type: 'campaign', text: 'TikTok kampanja premasila ciljani CTR za 18%', time: 'prije 6 sati' },
    { id: 4, type: 'alert', text: 'Detektiran porast negativnog sentimenta na Facebooku', time: 'prije 8 sati' },
    { id: 5, type: 'report', text: 'Mjesecni izvjestaj generiran i poslan dionicima', time: 'prije 12 sati' },
  ],
}

const activityIcons: Record<string, { icon: LucideIcon; color: string }> = {
  follow: { icon: UserPlus, color: 'text-green-600' },
  comment: { icon: MessageCircle, color: 'text-blue-600' },
  campaign: { icon: TrendingUp, color: 'text-purple-600' },
  alert: { icon: AlertTriangle, color: 'text-yellow-600' },
  report: { icon: CheckCircle, color: 'text-emerald-600' },
}

export default function Dashboard() {
  const { data: apiData, loading, error, refetch } = useApi<OverviewData>('/analytics/overview')

  // Use API data if available, otherwise fallback
  const d = apiData || fallbackOverview

  if (loading && !apiData) return <><Header title="NADZORNA PLOCA" subtitle="Pregled" /><PageLoader /></>
  if (error && !apiData) return <><Header title="NADZORNA PLOCA" subtitle="Pregled" /><ErrorState message={error} onRetry={refetch} /></>

  const sentiment = d.sentiment_breakdown || { positive: 65, neutral: 25, negative: 10 }
  const engagementData = d.engagement_trend || fallbackOverview.engagement_trend
  const activities = d.recent_activity || fallbackOverview.recent_activity

  return (
    <div className="animate-fade-in">
      <Header title="NADZORNA PLOCA" subtitle="Pregled svih metrika u realnom vremenu" />

      <div className="page-wrapper space-y-6">
        {/* Metric Cards */}
        <div className="metric-grid">
          <MetricCard label="Ukupno pratitelja" value={d.total_followers} previousValue={d.prev_followers} format="number" icon={Users} />
          <MetricCard label="Mjesecni doseg" value={d.monthly_reach} previousValue={d.prev_reach} format="number" icon={Eye} />
          <MetricCard label="Stopa angazmana" value={d.engagement_rate} previousValue={d.prev_engagement_rate} format="percent" icon={TrendingUp} />
          <MetricCard label="Potrosnja na oglase" value={d.ad_spend} previousValue={d.prev_ad_spend} format="currency" icon={CreditCard} />
          <MetricCard label="ROAS" value={d.roas} previousValue={d.prev_roas} format="number" icon={BarChart3} />
          <MetricCard label="Ocjena sentimenta" value={d.sentiment_score} previousValue={d.prev_sentiment_score} format="percent" icon={Heart} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <EngagementChart data={engagementData} title="Angazman i doseg (zadnjih 7 dana)" />
          </div>
          <div className="card">
            <SentimentDonut positive={sentiment.positive} neutral={sentiment.neutral} negative={sentiment.negative} title="Ukupni sentiment" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Nedavna aktivnost</h2>
            <div className="flex items-center gap-2 text-xs text-dinamo-muted">
              <Zap className="w-3 h-3 text-dinamo-accent" />
              Azuriranje u realnom vremenu
            </div>
          </div>
          <div className="space-y-3">
            {activities.map((item) => {
              const iconInfo = activityIcons[item.type] || activityIcons.report
              const Icon = iconInfo.icon
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`mt-0.5 ${iconInfo.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{item.text}</p>
                    <p className="text-xs text-dinamo-muted mt-1">{item.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
