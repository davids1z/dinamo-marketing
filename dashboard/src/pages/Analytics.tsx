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
import { analyticsApi, type AdRow, type AllAdsResponse } from '../api/analytics'
import { useChannelStatus } from '../hooks/useChannelStatus'
import { useProjectStatus } from '../hooks/useProjectStatus'
import EmptyState from '../components/common/EmptyState'
import { useNavigate } from 'react-router-dom'
import { Link2, FolderKanban } from 'lucide-react'

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


type Tab = 'pregled' | 'reklame'
type SortKey = 'impressions' | 'clicks' | 'ctr' | 'spend' | 'conversions' | 'roas'

const platformColors: Record<string, string> = {
  meta: 'bg-blue-500/10 text-blue-400',
  tiktok: 'bg-purple-500/10 text-purple-400',
  youtube: 'bg-red-500/10 text-red-400',
}

export default function Analytics() {
  const { data: apiData, loading, refetch } = useApi<AnalyticsData>('/analytics/overview')
  const { hasConnectedChannels } = useChannelStatus()
  const { hasProjects } = useProjectStatus()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('pregled')

  // Ads state
  const [ads, setAds] = useState<AdRow[]>([])
  const [adsLoading, setAdsLoading] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [platformFilter, setPlatformFilter] = useState<string>('')

  const reachData = apiData?.reach_data || []
  const campaignData = apiData?.campaign_data || []
  const campaignBars = apiData?.campaign_bars || []
  const funnelSteps = apiData?.funnel || []
  const topPosts = apiData?.top_posts || []
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
          setAds([])
        }
      } catch {
        setAds([])
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

  if (!hasProjects) {
    return (
      <div>
        <Header title="ANALITIKA" subtitle="Dubinska analitika performansi i uvidi" />
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

  // Empty state when no channels connected
  if (!hasConnectedChannels) {
    return (
      <div>
        <Header title="ANALITIKA" subtitle="Dubinska analitika performansi i uvidi" />
        <div className="page-wrapper">
          <EmptyState
            icon={BarChart3}
            title="Nema podataka za analitiku"
            description="Povežite barem jedan kanal (Instagram, TikTok, Facebook) da biste vidjeli analitiku performansi i uvide."
            variant="hero"
            action={
              <button
                onClick={() => navigate('/brand-profile')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent-hover transition-all shadow-sm"
              >
                <Link2 size={16} />
                Poveži kanale za analitiku
              </button>
            }
          />
        </div>
      </div>
    )
  }

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
    <div>
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
