import Header from '../components/layout/Header'
import MetricCard from '../components/common/MetricCard'
import { PageLoader, ErrorState } from '../components/common/LoadingSpinner'
import { EngagementChart } from '../components/charts/EngagementChart'
import { SentimentDonut } from '../components/charts/SentimentDonut'
import { useApi } from '../hooks/useApi'
import { useWebSocket } from '../hooks/useWebSocket'
import { Users, Eye, TrendingUp, CreditCard, BarChart3, Heart, MessageCircle, UserPlus, AlertTriangle, CheckCircle, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface ApiOverview {
  organic?: {
    impressions: number; reach: number; likes: number; comments: number
    shares: number; saves: number; clicks: number; avg_engagement_rate: number
    new_followers: number; total_posts: number
  }
  paid?: {
    total_spend: number; conversions: number; conversion_value: number
    avg_roas: number; avg_cpm: number; avg_cpc: number
  }
  trends?: {
    impressions_change: number; reach_change: number
    engagement_change: number; followers_change: number
  }
  reach_data?: Array<{ date: string; reach: number; impressions: number }>
  campaign_data?: Array<Record<string, unknown>>
  funnel?: Array<{ label: string; value: number; color: string }>
  top_posts?: Array<Record<string, unknown>>
}

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

function mapApiToOverview(api: ApiOverview): Partial<OverviewData> {
  const o = api.organic
  const p = api.paid
  const t = api.trends
  if (!o) return {}
  const reach = o.reach || 0
  const engRate = o.avg_engagement_rate || 0
  // Estimate previous values from trend percentages
  const prevReach = t?.reach_change ? Math.round(reach / (1 + t.reach_change / 100)) : reach
  const prevEng = t?.engagement_change ? +(engRate / (1 + t.engagement_change / 100)).toFixed(2) : engRate
  const spend = p?.total_spend || 0
  const roas = p?.avg_roas || 0

  // Build engagement_trend from reach_data
  const engTrend = (api.reach_data || []).slice(-7).map(r => ({
    date: r.date,
    engagement: Math.round(r.reach * (engRate / 100)),
    reach: r.reach,
  }))

  return {
    total_followers: o.new_followers || 0,
    prev_followers: 0,
    monthly_reach: reach,
    prev_reach: prevReach,
    engagement_rate: engRate,
    prev_engagement_rate: prevEng,
    ad_spend: spend,
    prev_ad_spend: 0,
    roas,
    prev_roas: 0,
    engagement_trend: engTrend.length ? engTrend : undefined,
  }
}

export default function Dashboard() {
  const { data: rawApi, loading } = useApi<ApiOverview>('/analytics/overview')
  const { data: liveData, isConnected } = useWebSocket<ApiOverview>({ url: '/api/v1/analytics/ws/live' })

  // Use live WebSocket data when available, fallback to API polling
  const activeApi = liveData || rawApi
  const mapped = activeApi ? mapApiToOverview(activeApi) : {}
  const hasRealData = activeApi?.organic && (activeApi.organic.reach > 0 || activeApi.organic.impressions > 0)
  const d: OverviewData = hasRealData ? { ...fallbackOverview, ...mapped } : fallbackOverview

  if (loading && !rawApi) return <><Header title="NADZORNA PLOČA" subtitle="Pregled" /><PageLoader /></>

  const sentiment = d.sentiment_breakdown || { positive: 65, neutral: 25, negative: 10 }
  const engagementData = d.engagement_trend || fallbackOverview.engagement_trend
  const activities = d.recent_activity || fallbackOverview.recent_activity

  return (
    <div className="animate-fade-in">
      <Header title="NADZORNA PLOČA" subtitle="Pregled svih metrika u realnom vremenu" />

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
            {isConnected ? (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <Zap className="w-3 h-3" />
                Prijenos uživo
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-dinamo-muted">
                <Zap className="w-3 h-3 text-dinamo-accent" />
                Ažuriranje u realnom vremenu
              </div>
            )}
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
