import Header from '../components/layout/Header'
import PlatformIcon from '../components/common/PlatformIcon'
import { EngagementChart } from '../components/charts/EngagementChart'
import { PageLoader, ErrorState } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { Users, Globe } from 'lucide-react'

interface PlatformStat {
  platform: string
  followers: number
  prevFollowers: number
  engagement: number
  prevEngagement: number
  reach: number
  icon: string
}

interface FormatBreakdownItem {
  type: string
  share: number
  posts: number
  avgEngagement: number
}

interface ChannelData {
  platformStats: PlatformStat[]
  engagementData30: Array<{ date: string; engagement: number; reach: number }>
  formatBreakdown: FormatBreakdownItem[]
}

// Fallback mock data for when API is not available
const fallbackData: ChannelData = {
  platformStats: [
    { platform: 'instagram', followers: 567000, prevFollowers: 542000, engagement: 3.2, prevEngagement: 2.9, reach: 1800000, icon: 'Users' },
    { platform: 'facebook', followers: 320000, prevFollowers: 312000, engagement: 1.8, prevEngagement: 1.6, reach: 950000, icon: 'Users' },
    { platform: 'tiktok', followers: 89000, prevFollowers: 72000, engagement: 5.4, prevEngagement: 4.8, reach: 620000, icon: 'Users' },
    { platform: 'youtube', followers: 145000, prevFollowers: 138000, engagement: 2.1, prevEngagement: 1.9, reach: 480000, icon: 'Users' },
    { platform: 'web', followers: 180000, prevFollowers: 165000, engagement: 1.2, prevEngagement: 1.0, reach: 320000, icon: 'Globe' },
  ],
  engagementData30: Array.from({ length: 30 }, (_, i) => {
    const date = new Date(2026, 1, 4 + i)
    const isMatchDay = [0, 3, 7, 10, 14, 17, 21, 24, 28].includes(i)
    return {
      date: date.toISOString().split('T')[0],
      engagement: Math.round(3000 + Math.random() * 4000 + (isMatchDay ? 5000 : 0)),
      reach: Math.round(80000 + Math.random() * 120000 + (isMatchDay ? 150000 : 0)),
    }
  }),
  formatBreakdown: [
    { type: 'Reels / Short Video', share: 42, posts: 126, avgEngagement: 4.8 },
    { type: 'Static Image', share: 24, posts: 72, avgEngagement: 2.1 },
    { type: 'Carousel', share: 18, posts: 54, avgEngagement: 3.4 },
    { type: 'Stories', share: 10, posts: 30, avgEngagement: 1.8 },
    { type: 'Long-form Video', share: 6, posts: 18, avgEngagement: 2.9 },
  ],
}

export default function ChannelAudit() {
  const { data: apiData, loading, error, refetch } = useApi<ChannelData>('/channels')
  const data = apiData || fallbackData

  if (loading && !apiData) return <><Header title="AUDIT KANALA" subtitle="Performanse platformi i provjera zdravlja" /><PageLoader /></>

  const platformStats = data.platformStats || fallbackData.platformStats
  const engagementData30 = data.engagementData30 || fallbackData.engagementData30
  const formatBreakdown = data.formatBreakdown || fallbackData.formatBreakdown

  return (
    <div className="animate-fade-in">
      <Header title="AUDIT KANALA" subtitle="Performanse platformi i provjera zdravlja" />

      <div className="page-wrapper space-y-6">


        {/* Platform Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {platformStats.map((p) => (
            <div key={p.platform} className="card space-y-4">
              <div className="flex items-center justify-between">
                <PlatformIcon platform={p.platform} size={28} showLabel />
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  p.followers > p.prevFollowers ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {p.followers > p.prevFollowers ? '+' : ''}{(((p.followers - p.prevFollowers) / p.prevFollowers) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {p.platform === 'web'
                    ? `${(p.followers / 1000).toFixed(0)}K visits`
                    : p.followers >= 1000000
                      ? `${(p.followers / 1000000).toFixed(1)}M`
                      : `${(p.followers / 1000).toFixed(0)}K`
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Stopa ang.: <span className="text-gray-500">{p.engagement}%</span>
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(p.engagement * 15, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Engagement Over Time */}
        <div className="card">
          <EngagementChart data={engagementData30} title="30-dnevni angažman i doseg (sve platforme)" />
        </div>

        {/* Format Breakdown */}
        <div className="card">
          <h2 className="section-title mb-4">Raspodjela formata sadržaja</h2>
          <div className="space-y-3">
            {formatBreakdown.map((f) => (
              <div key={f.type} className="flex items-center gap-4">
                <span className="text-sm text-gray-500 w-40 shrink-0 truncate">{f.type}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-blue-400 h-3 rounded-full transition-all"
                    style={{ width: `${f.share}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-12 text-right hidden sm:flex justify-end">{f.share}%</span>
                <span className="text-sm text-gray-500 w-20 text-right hidden sm:flex justify-end">{f.posts} objava</span>
                <span className="text-sm text-emerald-700 w-16 text-right hidden sm:flex justify-end">{f.avgEngagement}% ang</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
