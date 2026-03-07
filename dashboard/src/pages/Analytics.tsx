import Header from '../components/layout/Header'
import { ReachChart } from '../components/charts/ReachChart'
import { CampaignChart } from '../components/charts/CampaignChart'
import { FunnelChart } from '../components/charts/FunnelChart'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { Eye, Heart, Trophy, DollarSign, Target, BarChart3, RefreshCw } from 'lucide-react'

interface AnalyticsData {
  reach_data: Array<{ date: string; reach: number; impressions: number }>
  campaign_data: Array<Record<string, unknown>>
  campaign_bars: Array<{ key: string; name: string; color: string }>
  funnel: Array<{ label: string; value: number; color: string }>
  top_posts: Array<{ id: string; title: string; platform: string; date: string; reach: number; engagement: number; engRate: number }>
  paid?: {
    total_spend: number; conversions: number; conversion_value: number
    avg_roas: number; avg_cpm: number; avg_cpc: number
  }
}

// Fallback data
const fallbackReach = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 1, 4 + i)
  const isMatchDay = [0, 3, 7, 10, 14, 17, 21, 24, 28].includes(i)
  return {
    date: `${date.getDate()}.${date.getMonth() + 1}`,
    reach: Math.round(120000 + Math.random() * 80000 + (isMatchDay ? 180000 : 0)),
    impressions: Math.round(250000 + Math.random() * 150000 + (isMatchDay ? 350000 : 0)),
  }
})

const fallbackCampaigns = [
  { name: 'UCL Matchday', meta: 42000, tiktok: 18000, youtube: 12000 },
  { name: 'Academy', meta: 15000, tiktok: 28000, youtube: 8000 },
  { name: 'Season Ticket', meta: 38000, tiktok: 5000, youtube: 3000 },
  { name: 'Diaspora', meta: 22000, tiktok: 12000, youtube: 18000 },
  { name: 'Kit Launch', meta: 35000, tiktok: 42000, youtube: 15000 },
]
const fallbackBars = [
  { key: 'meta', name: 'Meta (IG + FB)', color: '#3b82f6' },
  { key: 'tiktok', name: 'TikTok', color: '#a855f7' },
  { key: 'youtube', name: 'YouTube', color: '#ef4444' },
]
const fallbackFunnel = [
  { label: 'Impressions', value: 4200000, color: '#60a5fa' },
  { label: 'Engagements', value: 315000, color: '#3b82f6' },
  { label: 'Profile Visits / Follows', value: 89000, color: '#6366f1' },
  { label: 'Website Visits', value: 42000, color: '#a855f7' },
  { label: 'Conversions', value: 8500, color: '#22c55e' },
]
const fallbackTopPosts = [
  { id: '1', title: 'Reakcija na zdrijeb UCL grupe', platform: 'Instagram Reel', date: '28.02.2026', reach: 892000, engagement: 45200, engRate: 5.1 },
  { id: '2', title: 'Predstavljanje novog dresa 2026/27', platform: 'TikTok', date: '01.03.2026', reach: 756000, engagement: 52800, engRate: 7.0 },
  { id: '3', title: 'Petkovic hat-trick highlights', platform: 'Instagram Reel', date: '02.03.2026', reach: 645000, engagement: 38900, engRate: 6.0 },
  { id: '4', title: 'Pobjeda U19 akademije u finalu', platform: 'YouTube Short', date: '25.02.2026', reach: 412000, engagement: 21500, engRate: 5.2 },
  { id: '5', title: 'Navijacka koreografija — Maksimir', platform: 'Instagram Carousel', date: '22.02.2026', reach: 389000, engagement: 28400, engRate: 7.3 },
]

export default function Analytics() {
  const { data: apiData, loading, refetch } = useApi<AnalyticsData>('/analytics/overview')

  const reachData = apiData?.reach_data || fallbackReach
  const campaignData = apiData?.campaign_data || fallbackCampaigns
  const campaignBars = apiData?.campaign_bars || fallbackBars
  const funnelSteps = apiData?.funnel || fallbackFunnel
  const topPosts = apiData?.top_posts || fallbackTopPosts
  const paid = apiData?.paid

  if (loading && !apiData) return (
    <>
      <Header title="ANALITIKA" subtitle="Dubinska analitika" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={4} />
        <ChartSkeleton height={250} />
        <div className="content-grid"><ChartSkeleton height={200} /><ChartSkeleton height={200} /></div>
      </div>
    </>
  )

  return (
    <div className="animate-fade-in">
      <Header title="ANALITIKA" subtitle="Dubinska analitika performansi i uvidi" />

      <div className="page-wrapper space-y-6">

        {/* ROI Cards */}
        {paid && paid.total_spend > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <DollarSign size={20} className="mx-auto text-gray-500 mb-1" />
              <p className="text-2xl font-bold font-mono">€{paid.total_spend.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Ukupna potrosnja</p>
            </div>
            <div className="card text-center">
              <BarChart3 size={20} className="mx-auto text-green-600 mb-1" />
              <p className="text-2xl font-bold font-mono text-green-600">{paid.avg_roas}x</p>
              <p className="text-xs text-gray-500">ROAS</p>
            </div>
            <div className="card text-center">
              <Target size={20} className="mx-auto text-blue-700 mb-1" />
              <p className="text-2xl font-bold font-mono">{paid.conversions}</p>
              <p className="text-xs text-gray-500">Konverzije</p>
            </div>
            <div className="card text-center">
              <DollarSign size={20} className="mx-auto text-purple-600 mb-1" />
              <p className="text-2xl font-bold font-mono">€{paid.avg_cpc.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Prosj. CPC</p>
            </div>
          </div>
        )}

        {/* Reach Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span />
            <button onClick={refetch} className="text-xs text-gray-500 hover:text-dinamo-primary flex items-center gap-1">
              <RefreshCw size={12} /> Osvjezi
            </button>
          </div>
          <ReachChart data={reachData} title="Doseg i prikazivanja (30 dana)" />
        </div>

        {/* Campaign Comparison + Funnel */}
        <div className="content-grid">
          <div className="card">
            <CampaignChart data={campaignData} bars={campaignBars} title="Performanse kampanja po platformi" />
          </div>
          <div className="card">
            <FunnelChart steps={funnelSteps} title="Konverzijski lijevak" />
          </div>
        </div>

        {/* Top Posts */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={20} className="text-yellow-600" />
            <h2 className="section-title">Top 5 objava po performansu</h2>
          </div>

          <div className="space-y-3">
            {topPosts.map((post, index) => (
              <div key={post.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-sm font-bold text-gray-500 flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{post.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{post.platform}</span>
                    <span className="text-xs text-gray-500">|</span>
                    <span className="text-xs text-gray-500">{post.date}</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-sm flex-shrink-0">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Eye size={14} />
                      <span className="font-mono">{(post.reach / 1000).toFixed(0)}K</span>
                    </div>
                    <p className="text-xs text-gray-500">Doseg</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Heart size={14} />
                      <span className="font-mono">{(post.engagement / 1000).toFixed(1)}K</span>
                    </div>
                    <p className="text-xs text-gray-500">Angazman</p>
                  </div>
                  <div className="text-center">
                    <span className={`font-mono font-bold ${post.engRate > 5 ? 'text-green-600' : 'text-gray-500'}`}>
                      {post.engRate}%
                    </span>
                    <p className="text-xs text-gray-500">Stopa ang.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
