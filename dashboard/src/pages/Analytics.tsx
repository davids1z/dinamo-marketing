import { useState, useEffect } from 'react'
import Header from '../components/layout/Header'
import { ReachChart } from '../components/charts/ReachChart'
import { CampaignChart } from '../components/charts/CampaignChart'
import { FunnelChart } from '../components/charts/FunnelChart'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import {
  Eye, Heart, Trophy, DollarSign, Target, BarChart3, RefreshCw,
  ArrowUpDown, ChevronUp, ChevronDown, Image, Download,
  Megaphone, Filter,
} from 'lucide-react'
import AiInsightsPanel from '../components/common/AiInsightsPanel'
import { analyticsApi, type AdRow, type AllAdsResponse } from '../api/analytics'

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
  const isCampaignDay = [0, 3, 7, 10, 14, 17, 21, 24, 28].includes(i)
  return {
    date: `${date.getDate()}.${date.getMonth() + 1}`,
    reach: Math.round(120000 + Math.random() * 80000 + (isCampaignDay ? 180000 : 0)),
    impressions: Math.round(250000 + Math.random() * 150000 + (isCampaignDay ? 350000 : 0)),
  }
})

const fallbackCampaigns = [
  { name: 'Lansiranje proizvoda', meta: 42000, tiktok: 18000, youtube: 12000 },
  { name: 'Brand awareness', meta: 15000, tiktok: 28000, youtube: 8000 },
  { name: 'Sezonska promocija', meta: 38000, tiktok: 5000, youtube: 3000 },
  { name: 'Retargeting', meta: 22000, tiktok: 12000, youtube: 18000 },
  { name: 'Newsletter signup', meta: 35000, tiktok: 42000, youtube: 15000 },
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
  { id: '1', title: 'Najava novog proizvoda — teaser video', platform: 'Instagram Reel', date: '28.02.2026', reach: 892000, engagement: 45200, engRate: 5.1 },
  { id: '2', title: 'Lansiranje proljetne kolekcije', platform: 'TikTok', date: '01.03.2026', reach: 756000, engagement: 52800, engRate: 7.0 },
  { id: '3', title: 'Recenzija klijenta — uspješna priča', platform: 'Instagram Reel', date: '02.03.2026', reach: 645000, engagement: 38900, engRate: 6.0 },
  { id: '4', title: 'Webinar — digitalne strategije 2026', platform: 'YouTube Short', date: '25.02.2026', reach: 412000, engagement: 21500, engRate: 5.2 },
  { id: '5', title: 'Iza kulisa — radni dan u timu', platform: 'Instagram Carousel', date: '22.02.2026', reach: 389000, engagement: 28400, engRate: 7.3 },
]

// Fallback ads data
const fallbackAds: AdRow[] = [
  { ad_id: '1', variant_label: 'A', headline: 'Otkrijte novu kolekciju!', image_url: '', status: 'active', campaign_id: '1', campaign_name: 'Lansiranje proizvoda Q1', platform: 'meta', impressions: 245000, clicks: 7840, ctr: 3.2, spend: 1250, conversions: 312, roas: 4.1 },
  { ad_id: '2', variant_label: 'B', headline: 'Vaš sljedeći favorit čeka', image_url: '', status: 'active', campaign_id: '1', campaign_name: 'Lansiranje proizvoda Q1', platform: 'meta', impressions: 198000, clicks: 6930, ctr: 3.5, spend: 1180, conversions: 289, roas: 3.8 },
  { ad_id: '3', variant_label: 'A', headline: 'Budućnost počinje danas', image_url: '', status: 'active', campaign_id: '2', campaign_name: 'Brand awareness kampanja', platform: 'tiktok', impressions: 312000, clicks: 14976, ctr: 4.8, spend: 820, conversions: 156, roas: 2.9 },
  { ad_id: '4', variant_label: 'A', headline: 'Proljetna promocija — 30% popust', image_url: '', status: 'active', campaign_id: '3', campaign_name: 'Sezonska promocija', platform: 'meta', impressions: 156000, clicks: 3276, ctr: 2.1, spend: 1450, conversions: 423, roas: 5.2 },
  { ad_id: '5', variant_label: 'B', headline: 'Pridružite se našoj zajednici', image_url: '', status: 'active', campaign_id: '3', campaign_name: 'Sezonska promocija', platform: 'meta', impressions: 142000, clicks: 3550, ctr: 2.5, spend: 1330, conversions: 398, roas: 4.8 },
  { ad_id: '6', variant_label: 'A', headline: 'Ekskluzivno za pretplatnike', image_url: '', status: 'paused', campaign_id: '4', campaign_name: 'Retargeting kampanja', platform: 'meta', impressions: 89000, clicks: 1602, ctr: 1.8, spend: 710, conversions: 89, roas: 2.4 },
  { ad_id: '7', variant_label: 'A', headline: 'Novo u ponudi — pogledajte sada', image_url: '', status: 'active', campaign_id: '5', campaign_name: 'Newsletter signup', platform: 'tiktok', impressions: 425000, clicks: 21675, ctr: 5.1, spend: 1390, conversions: 378, roas: 3.8 },
  { ad_id: '8', variant_label: 'C', headline: 'Proizvod izbliza — pogledajte detalje', image_url: '', status: 'active', campaign_id: '5', campaign_name: 'Newsletter signup', platform: 'tiktok', impressions: 389000, clicks: 19839, ctr: 5.1, spend: 1390, conversions: 345, roas: 3.5 },
]

type Tab = 'pregled' | 'reklame'
type SortKey = 'impressions' | 'clicks' | 'ctr' | 'spend' | 'conversions' | 'roas'

const platformColors: Record<string, string> = {
  meta: 'bg-blue-500/10 text-blue-400',
  tiktok: 'bg-purple-500/10 text-purple-400',
  youtube: 'bg-red-500/10 text-red-400',
}

export default function Analytics() {
  const { data: apiData, loading, refetch } = useApi<AnalyticsData>('/analytics/overview')
  const [tab, setTab] = useState<Tab>('pregled')

  // Ads state
  const [ads, setAds] = useState<AdRow[]>([])
  const [adsLoading, setAdsLoading] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [platformFilter, setPlatformFilter] = useState<string>('')

  const reachData = apiData?.reach_data || fallbackReach
  const campaignData = apiData?.campaign_data || fallbackCampaigns
  const campaignBars = apiData?.campaign_bars || fallbackBars
  const funnelSteps = apiData?.funnel || fallbackFunnel
  const topPosts = apiData?.top_posts || fallbackTopPosts
  const paid = apiData?.paid

  // Load ads when tab switches or sort/filter changes
  useEffect(() => {
    if (tab !== 'reklame') return
    const loadAds = async () => {
      setAdsLoading(true)
      try {
        const resp = await analyticsApi.getAllAds({
          sort_by: sortKey,
          sort_dir: sortDir,
          platform: platformFilter || undefined,
          limit: 50,
        })
        const data = resp as unknown as AllAdsResponse
        if (data?.ads?.length > 0) {
          setAds(data.ads)
        } else {
          setAds(fallbackAds)
        }
      } catch {
        setAds(fallbackAds)
      } finally {
        setAdsLoading(false)
      }
    }
    loadAds()
  }, [tab, sortKey, sortDir, platformFilter])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-studio-text-disabled" />
    return sortDir === 'desc' ? <ChevronDown size={12} className="text-brand-accent" /> : <ChevronUp size={12} className="text-brand-accent" />
  }

  // CSV export
  const exportCSV = () => {
    const headers = ['Kampanja', 'Varijanta', 'Naslov', 'Platforma', 'Status', 'Prikazivanja', 'Klikovi', 'CTR%', 'Potrošnja', 'Konverzije', 'ROAS']
    const rows = ads.map(a => [a.campaign_name, a.variant_label, a.headline, a.platform, a.status, a.impressions, a.clicks, a.ctr, a.spend, a.conversions, a.roas])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ads_report.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // Compute ads summary
  const adsTotalSpend = ads.reduce((s, a) => s + a.spend, 0)
  const adsTotalClicks = ads.reduce((s, a) => s + a.clicks, 0)
  const adsTotalConversions = ads.reduce((s, a) => s + a.conversions, 0)
  const adsAvgCTR = ads.length > 0 ? ads.reduce((s, a) => s + a.ctr, 0) / ads.length : 0

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

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-studio-surface-2 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab('pregled')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              tab === 'pregled' ? 'bg-studio-surface-1 text-brand-accent shadow-sm' : 'text-studio-text-secondary hover:text-studio-text-primary'
            }`}
          >
            <BarChart3 size={14} className="inline mr-1.5" />
            Pregled
          </button>
          <button
            onClick={() => setTab('reklame')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              tab === 'reklame' ? 'bg-studio-surface-1 text-brand-accent shadow-sm' : 'text-studio-text-secondary hover:text-studio-text-primary'
            }`}
          >
            <Megaphone size={14} className="inline mr-1.5" />
            Sve reklame
          </button>
        </div>

        {tab === 'pregled' && (
          <>
            {/* ROI Cards */}
            {paid && paid.total_spend > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card text-center">
                  <DollarSign size={20} className="mx-auto text-studio-text-secondary mb-1" />
                  <p className="text-2xl font-bold font-mono">EUR{paid.total_spend.toLocaleString()}</p>
                  <p className="text-xs text-studio-text-secondary">Ukupna potrošnja</p>
                </div>
                <div className="card text-center">
                  <BarChart3 size={20} className="mx-auto text-green-600 mb-1" />
                  <p className="text-2xl font-bold font-mono text-green-600">{paid.avg_roas}x</p>
                  <p className="text-xs text-studio-text-secondary">ROAS</p>
                </div>
                <div className="card text-center">
                  <Target size={20} className="mx-auto text-blue-400 mb-1" />
                  <p className="text-2xl font-bold font-mono">{paid.conversions}</p>
                  <p className="text-xs text-studio-text-secondary">Konverzije</p>
                </div>
                <div className="card text-center">
                  <DollarSign size={20} className="mx-auto text-purple-600 mb-1" />
                  <p className="text-2xl font-bold font-mono">EUR{paid.avg_cpc.toFixed(2)}</p>
                  <p className="text-xs text-studio-text-secondary">Prosj. CPC</p>
                </div>
              </div>
            )}

            {/* Reach Chart */}
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span />
                <button onClick={refetch} className="text-xs text-studio-text-secondary hover:text-white flex items-center gap-1">
                  <RefreshCw size={12} /> Osvježi
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
                  <div key={post.id} className="flex items-center gap-4 p-4 bg-studio-surface-0 rounded-lg hover:bg-studio-surface-2 transition-colors cursor-pointer">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-studio-surface-3 text-sm font-bold text-studio-text-secondary flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-studio-text-primary truncate">{post.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-studio-text-secondary">{post.platform}</span>
                        <span className="text-xs text-studio-text-secondary">|</span>
                        <span className="text-xs text-studio-text-secondary">{post.date}</span>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-sm flex-shrink-0">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-studio-text-secondary">
                          <Eye size={14} />
                          <span className="font-mono">{(post.reach / 1000).toFixed(0)}K</span>
                        </div>
                        <p className="text-xs text-studio-text-secondary">Doseg</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-studio-text-secondary">
                          <Heart size={14} />
                          <span className="font-mono">{(post.engagement / 1000).toFixed(1)}K</span>
                        </div>
                        <p className="text-xs text-studio-text-secondary">Angažman</p>
                      </div>
                      <div className="text-center">
                        <span className={`font-mono font-bold ${post.engRate > 5 ? 'text-green-600' : 'text-studio-text-secondary'}`}>
                          {post.engRate}%
                        </span>
                        <p className="text-xs text-studio-text-secondary">Stopa ang.</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <AiInsightsPanel pageKey="analytics" pageData={{ top_posts: topPosts.slice(0, 3).map(p => ({ title: p.title, platform: p.platform, reach: p.reach, engRate: p.engRate })), funnel: funnelSteps, paid: paid || null }} />
          </>
        )}

        {tab === 'reklame' && (
          <>
            {/* Ads Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card text-center">
                <Megaphone size={20} className="mx-auto text-studio-text-secondary mb-1" />
                <p className="text-2xl font-bold font-mono">{ads.length}</p>
                <p className="text-xs text-studio-text-secondary">Ukupno reklama</p>
              </div>
              <div className="card text-center">
                <DollarSign size={20} className="mx-auto text-red-500 mb-1" />
                <p className="text-2xl font-bold font-mono">EUR{adsTotalSpend.toLocaleString()}</p>
                <p className="text-xs text-studio-text-secondary">Ukupna potrošnja</p>
              </div>
              <div className="card text-center">
                <Target size={20} className="mx-auto text-green-600 mb-1" />
                <p className="text-2xl font-bold font-mono">{adsTotalConversions.toLocaleString()}</p>
                <p className="text-xs text-studio-text-secondary">Konverzije</p>
              </div>
              <div className="card text-center">
                <Eye size={20} className="mx-auto text-blue-600 mb-1" />
                <p className="text-2xl font-bold font-mono">{adsAvgCTR.toFixed(1)}%</p>
                <p className="text-xs text-studio-text-secondary">Prosj. CTR</p>
              </div>
            </div>

            {/* Filters + Export */}
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-studio-text-tertiary" />
                  {['', 'meta', 'tiktok', 'youtube'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPlatformFilter(p)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        platformFilter === p
                          ? 'bg-brand-accent text-white shadow-sm'
                          : 'bg-studio-surface-2 text-studio-text-secondary hover:bg-studio-surface-3'
                      }`}
                    >
                      {p === '' ? 'Sve' : p === 'meta' ? 'Meta' : p === 'tiktok' ? 'TikTok' : 'YouTube'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-studio-text-secondary bg-studio-surface-2 hover:bg-studio-surface-3 rounded-lg transition-all"
                >
                  <Download size={12} />
                  Izvoz CSV
                </button>
              </div>

              {/* Ads Table */}
              {adsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw size={24} className="animate-spin text-studio-text-tertiary" />
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-studio-border">
                        <th className="text-left py-3 px-2 text-xs font-medium text-studio-text-secondary uppercase">Reklama</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-studio-text-secondary uppercase">Kampanja</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-studio-text-secondary uppercase">Platforma</th>
                        <th className="text-right py-3 px-2 text-xs font-medium text-studio-text-secondary uppercase cursor-pointer select-none" onClick={() => handleSort('impressions')}>
                          <span className="inline-flex items-center gap-1">Prikazivanja <SortIcon col="impressions" /></span>
                        </th>
                        <th className="text-right py-3 px-2 text-xs font-medium text-studio-text-secondary uppercase cursor-pointer select-none" onClick={() => handleSort('clicks')}>
                          <span className="inline-flex items-center gap-1">Klikovi <SortIcon col="clicks" /></span>
                        </th>
                        <th className="text-right py-3 px-2 text-xs font-medium text-studio-text-secondary uppercase cursor-pointer select-none" onClick={() => handleSort('ctr')}>
                          <span className="inline-flex items-center gap-1">CTR <SortIcon col="ctr" /></span>
                        </th>
                        <th className="text-right py-3 px-2 text-xs font-medium text-studio-text-secondary uppercase cursor-pointer select-none" onClick={() => handleSort('spend')}>
                          <span className="inline-flex items-center gap-1">Potrošnja <SortIcon col="spend" /></span>
                        </th>
                        <th className="text-right py-3 px-2 text-xs font-medium text-studio-text-secondary uppercase cursor-pointer select-none" onClick={() => handleSort('conversions')}>
                          <span className="inline-flex items-center gap-1">Konv. <SortIcon col="conversions" /></span>
                        </th>
                        <th className="text-right py-3 px-2 text-xs font-medium text-studio-text-secondary uppercase cursor-pointer select-none" onClick={() => handleSort('roas')}>
                          <span className="inline-flex items-center gap-1">ROAS <SortIcon col="roas" /></span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ads.map((ad) => (
                        <tr key={ad.ad_id} className="border-b border-studio-border-subtle hover:bg-studio-surface-0 transition-colors">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              {ad.image_url ? (
                                <img src={ad.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                              ) : (
                                <div className="w-8 h-8 rounded bg-studio-surface-2 flex items-center justify-center flex-shrink-0">
                                  <Image size={14} className="text-studio-text-disabled" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-studio-text-primary font-medium truncate max-w-[200px]">{ad.headline}</p>
                                <span className="text-[10px] text-studio-text-tertiary font-mono">Var. {ad.variant_label}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-studio-text-secondary max-w-[150px] truncate">{ad.campaign_name}</td>
                          <td className="py-3 px-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${platformColors[ad.platform] || 'bg-studio-surface-2 text-studio-text-secondary'}`}>
                              {ad.platform}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-studio-text-primary">{ad.impressions.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right font-mono text-studio-text-primary">{ad.clicks.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right">
                            <span className={`font-mono font-bold ${ad.ctr > 4 ? 'text-green-600' : ad.ctr > 2 ? 'text-yellow-600' : 'text-studio-text-secondary'}`}>
                              {ad.ctr}%
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-studio-text-primary">EUR{ad.spend.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right font-mono text-studio-text-primary">{ad.conversions.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right">
                            <span className={`font-mono font-bold ${ad.roas > 3 ? 'text-green-600' : ad.roas > 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {ad.roas}x
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {ads.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-studio-border bg-studio-surface-0 font-medium">
                          <td className="py-3 px-2 text-studio-text-primary" colSpan={3}>Ukupno ({ads.length} reklama)</td>
                          <td className="py-3 px-2 text-right font-mono text-studio-text-primary">{ads.reduce((s, a) => s + a.impressions, 0).toLocaleString()}</td>
                          <td className="py-3 px-2 text-right font-mono text-studio-text-primary">{adsTotalClicks.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right font-mono text-studio-text-primary">{adsAvgCTR.toFixed(1)}%</td>
                          <td className="py-3 px-2 text-right font-mono text-studio-text-primary">EUR{adsTotalSpend.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right font-mono text-studio-text-primary">{adsTotalConversions.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right font-mono text-studio-text-primary">
                            {adsTotalSpend > 0 ? (adsTotalConversions * 10 / adsTotalSpend).toFixed(1) : '0'}x
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  {ads.length === 0 && (
                    <div className="text-center py-12 text-studio-text-tertiary">
                      <Megaphone size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nema podataka o reklamama</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
