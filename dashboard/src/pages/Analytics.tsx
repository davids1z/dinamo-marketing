import { useState, useEffect, useMemo } from 'react'
import Header from '../components/layout/Header'
import { ReachChart } from '../components/charts/ReachChart'
import { CampaignChart } from '../components/charts/CampaignChart'
import { FunnelChart } from '../components/charts/FunnelChart'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import {
  Eye, Heart, Trophy, DollarSign, Target, BarChart3, RefreshCw,
  ArrowUpDown, ChevronUp, ChevronDown, Image, Download,
  Megaphone, Filter, Sparkles, TrendingUp, TrendingDown,
  Users, MousePointerClick, ShoppingCart, ArrowRight,
  Info, Link2, FolderKanban, Zap,
} from 'lucide-react'
import { analyticsApi, type AdRow, type AllAdsResponse } from '../api/analytics'
import { useChannelStatus } from '../hooks/useChannelStatus'
import { useProjectStatus } from '../hooks/useProjectStatus'
import { useClient } from '../contexts/ClientContext'
import EmptyState from '../components/common/EmptyState'
import { useNavigate } from 'react-router-dom'
import { formatNumber } from '../utils/formatters'

/* ─────────── types ─────────── */

interface AnalyticsData {
  organic?: {
    impressions: number; reach: number; likes: number; comments: number
    shares: number; saves: number; clicks: number; avg_engagement_rate: number
    new_followers: number; total_posts: number
  }
  reach_data: Array<{ date: string; reach: number; impressions: number }>
  campaign_data: Array<Record<string, unknown>>
  campaign_bars?: Array<{ key: string; name: string; color: string }>
  funnel: Array<{ label: string; value: number; color: string }>
  top_posts: Array<{ id: string; title: string; platform: string; date: string; reach: number; engagement: number; engRate: number }>
  paid?: {
    total_spend: number; conversions: number; conversion_value: number
    avg_roas: number; avg_cpm: number; avg_cpc: number
  }
  trends?: {
    impressions_change: number; reach_change: number
    engagement_change: number; followers_change: number
  }
  _meta?: {
    last_refreshed: string | null
    is_estimate: boolean
    connected_platforms: string[]
  }
}

type Tab = 'pregled' | 'reklame'
type SortKey = 'impressions' | 'clicks' | 'ctr' | 'spend' | 'conversions' | 'roas'

const platformColors: Record<string, string> = {
  meta: 'bg-blue-500/10 text-blue-400',
  tiktok: 'bg-purple-500/10 text-purple-400',
  youtube: 'bg-red-500/10 text-red-400',
}

/* ─────────── Customer Journey funnel (visual) ─────────── */

const JOURNEY_STEPS = [
  { key: 'impressions', label: 'Prikazivanja', icon: Eye, color: '#60a5fa', desc: 'Koliko ljudi je vidjelo sadržaj' },
  { key: 'engagement', label: 'Angažman', icon: Heart, color: '#8b5cf6', desc: 'Lajkovi, komentari, dijeljenja' },
  { key: 'clicks', label: 'Klikovi', icon: MousePointerClick, color: '#0ea5e9', desc: 'Posjet web stranici' },
  { key: 'conversions', label: 'Konverzije', icon: ShoppingCart, color: '#22c55e', desc: 'Kupnja, prijava, lead' },
]

function CustomerJourney({ funnel }: { funnel: Array<{ label: string; value: number; color: string }> }) {
  // Map funnel steps to journey steps by index
  const maxVal = Math.max(...funnel.map(s => s.value), 1)

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Users size={18} className="text-brand-accent" />
        <h3 className="font-headline text-base tracking-wider text-studio-text-primary">Customer Journey</h3>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        {JOURNEY_STEPS.map((step, idx) => {
          const funnelStep = funnel[idx]
          const value = funnelStep?.value || 0
          const pct = maxVal > 0 ? (value / maxVal) * 100 : 0
          const convRate = idx > 0 && funnel[idx - 1] && funnel[idx - 1]!.value > 0
            ? ((value / funnel[idx - 1]!.value) * 100).toFixed(1)
            : null
          const Icon = step.icon

          return (
            <div key={step.key} className="flex-1 flex items-center gap-2 group">
              <div
                className="flex-1 rounded-xl p-4 border border-white/5 transition-all hover:border-white/10
                  hover:scale-[1.02] cursor-default"
                style={{ background: `linear-gradient(135deg, ${step.color}08, ${step.color}15)` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${step.color}25` }}
                  >
                    <Icon size={16} style={{ color: step.color }} />
                  </div>
                  <span className="text-xs text-studio-text-secondary font-medium">{step.label}</span>
                </div>

                <p className="text-xl font-bold font-mono text-studio-text-primary mb-1">
                  {formatNumber(value)}
                </p>

                {/* Conversion rate from prev step */}
                {convRate && (
                  <div className="flex items-center gap-1 text-[10px] text-studio-text-tertiary">
                    <ArrowRight size={10} />
                    <span>{convRate}% konverzija</span>
                  </div>
                )}

                {/* Mini bar */}
                <div className="w-full h-1.5 rounded-full bg-white/5 mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(pct, 2)}%`, background: step.color }}
                  />
                </div>
              </div>

              {/* Arrow connector (not after last) */}
              {idx < JOURNEY_STEPS.length - 1 && (
                <ArrowRight size={16} className="text-studio-text-disabled hidden sm:block flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────── AI Insight card ─────────── */

function AIInsightCard({
  organic,
  trends,
  isEstimate,
  connectedPlatforms,
  brandName,
}: {
  organic?: AnalyticsData['organic']
  trends?: AnalyticsData['trends']
  isEstimate: boolean
  connectedPlatforms: string[]
  brandName: string
}) {
  const insight = useMemo(() => {
    if (!organic) return null

    const reach = organic.reach || 0
    const engagement = organic.avg_engagement_rate || 0
    const followers = organic.new_followers || 0
    const posts = organic.total_posts || 0
    const reachChange = trends?.reach_change || 0

    if (isEstimate) {
      const platNames = connectedPlatforms.map(p =>
        p === 'instagram' ? 'Instagram' :
        p === 'facebook' ? 'Facebook' :
        p === 'tiktok' ? 'TikTok' :
        p === 'youtube' ? 'YouTube' :
        p === 'linkedin' ? 'LinkedIn' : p
      ).join(', ')
      return {
        icon: Zap,
        color: '#f59e0b',
        title: 'Procjena potencijala',
        text: `Na temelju ${connectedPlatforms.length} povezan${connectedPlatforms.length === 1 ? 'og kanala' : 'a kanala'} (${platNames}), ${brandName} ima procijenjeni mjesečni doseg od ${formatNumber(reach)}. Sinkronizacija pravih podataka je u tijeku.`,
      }
    }

    // Real data insights
    if (reachChange > 15) {
      return {
        icon: TrendingUp,
        color: '#22c55e',
        title: 'Rast dosega',
        text: `Doseg ${brandName} je porastao ${reachChange.toFixed(0)}% u zadnjih 30 dana. ${engagement > 3 ? 'Angažman je iznadprosječan' : 'Fokusirajte se na interaktivni sadržaj za bolji angažman'}.`,
      }
    }
    if (reachChange < -10) {
      return {
        icon: TrendingDown,
        color: '#ef4444',
        title: 'Pad dosega',
        text: `Doseg je pao ${Math.abs(reachChange).toFixed(0)}% u odnosu na prethodni period. ${posts < 10 ? 'Povećajte frekvenciju objava' : 'Razmotrite promjenu vrste sadržaja'} za bolju vidljivost.`,
      }
    }
    if (engagement > 4) {
      return {
        icon: Heart,
        color: '#8b5cf6',
        title: 'Odličan angažman',
        text: `Stopa angažmana od ${engagement.toFixed(1)}% je iznadprosječna. ${brandName} gradi snažnu zajednicu s ${formatNumber(followers)} novih pratitelja ovaj mjesec.`,
      }
    }

    return {
      icon: Sparkles,
      color: '#0ea5e9',
      title: 'Pregled performansi',
      text: `${brandName} je u zadnjih 30 dana ostvario ${formatNumber(reach)} doseg s prosječnim angažmanom od ${engagement.toFixed(1)}%. ${followers > 0 ? `Privučeno je ${formatNumber(followers)} novih pratitelja.` : ''}`,
    }
  }, [organic, trends, isEstimate, connectedPlatforms, brandName])

  if (!insight) return null

  const InsightIcon = insight.icon

  return (
    <div
      className="rounded-xl border border-white/5 p-5 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${insight.color}08, ${insight.color}03)` }}
    >
      {/* Glow */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{ background: insight.color }}
      />

      <div className="relative flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${insight.color}20` }}
        >
          <InsightIcon size={20} style={{ color: insight.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: insight.color }}>
              AI Insight
            </span>
            <span className="text-studio-text-tertiary">·</span>
            <span className="text-xs text-studio-text-tertiary">{insight.title}</span>
          </div>
          <p className="text-sm text-studio-text-secondary leading-relaxed">
            {insight.text}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Estimate Banner ─────────── */

function EstimateBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
      <Info size={16} className="text-amber-500 flex-shrink-0" />
      <p className="text-xs text-amber-400/80">
        <span className="font-semibold text-amber-400">Procijenjeni podaci</span> — prikazane su benchmark procjene dok se pravi podaci sinkroniziraju. Ovo može potrajati do 24h.
      </p>
    </div>
  )
}

/* ─────────── KPI Card ─────────── */

function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  color = 'text-studio-text-secondary',
}: {
  icon: React.ElementType
  label: string
  value: string
  trend?: number
  color?: string
}) {
  return (
    <div className="card text-center group hover:border-white/10 transition-all">
      <Icon size={20} className={`mx-auto ${color} mb-2 group-hover:scale-110 transition-transform`} />
      <p className="text-2xl font-bold font-mono text-studio-text-primary">{value}</p>
      <p className="text-xs text-studio-text-secondary mt-0.5">{label}</p>
      {trend !== undefined && trend !== 0 && (
        <div className={`flex items-center justify-center gap-0.5 mt-1.5 text-[11px] font-mono font-semibold ${
          trend > 0 ? 'text-emerald-500' : 'text-red-400'
        }`}>
          {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function Analytics() {
  const { data: apiData, loading, refetch } = useApi<AnalyticsData>('/analytics/overview')
  const { hasConnectedChannels } = useChannelStatus()
  const { hasProjects } = useProjectStatus()
  const { currentClient } = useClient()
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
  const organic = apiData?.organic
  const trends = apiData?.trends
  const meta = apiData?._meta
  const isEstimate = meta?.is_estimate || false
  const connectedPlatforms = meta?.connected_platforms || []
  const brandName = currentClient?.client_name || 'Vaš brend'

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

  /* ─── Empty states ─── */

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

  // Only block if NO social handles at all (not even in brand profile)
  if (!hasConnectedChannels) {
    return (
      <div>
        <Header title="ANALITIKA" subtitle="Dubinska analitika performansi i uvidi" />
        <div className="page-wrapper">
          <EmptyState
            icon={BarChart3}
            title="Povežite društvene mreže"
            description="Dodajte Instagram, TikTok ili Facebook profil u Brand Profile da biste aktivirali analitiku."
            variant="hero"
            action={
              <button
                onClick={() => navigate('/brand-profile?tab=mreze')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent-hover transition-all shadow-sm"
              >
                <Link2 size={16} />
                Dodaj kanale
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

  /* ─── Main analytics view (always renders if channels connected) ─── */

  return (
    <div>
      <Header title="ANALITIKA" subtitle="Dubinska analitika performansi i uvidi" />

      <div className="page-wrapper space-y-6">

        {/* Estimate banner */}
        {isEstimate && <EstimateBanner />}

        {/* AI Insight Card */}
        <AIInsightCard
          organic={organic}
          trends={trends}
          isEstimate={isEstimate}
          connectedPlatforms={connectedPlatforms}
          brandName={brandName}
        />

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
            {/* Organic KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard
                icon={Eye}
                label="Doseg (30d)"
                value={formatNumber(organic?.reach || 0)}
                trend={trends?.reach_change}
                color="text-sky-500"
              />
              <KpiCard
                icon={Heart}
                label="Angažman"
                value={`${(organic?.avg_engagement_rate || 0).toFixed(1)}%`}
                trend={trends?.engagement_change}
                color="text-purple-500"
              />
              <KpiCard
                icon={Users}
                label="Novi pratitelji"
                value={formatNumber(organic?.new_followers || 0)}
                trend={trends?.followers_change}
                color="text-emerald-500"
              />
              <KpiCard
                icon={BarChart3}
                label="Impresije"
                value={formatNumber(organic?.impressions || 0)}
                trend={trends?.impressions_change}
                color="text-amber-500"
              />
            </div>

            {/* ROI Cards (only if paid data exists) */}
            {paid && paid.total_spend > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard icon={DollarSign} label="Ukupna potrošnja" value={`EUR${paid.total_spend.toLocaleString()}`} color="text-red-400" />
                <KpiCard icon={BarChart3} label="ROAS" value={`${paid.avg_roas}x`} color="text-green-600" />
                <KpiCard icon={Target} label="Konverzije" value={String(paid.conversions)} color="text-blue-400" />
                <KpiCard icon={DollarSign} label="Prosj. CPC" value={`EUR${paid.avg_cpc.toFixed(2)}`} color="text-purple-600" />
              </div>
            )}

            {/* Reach Chart */}
            {reachData.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <span />
                  <button onClick={refetch} className="text-xs text-studio-text-secondary hover:text-white flex items-center gap-1">
                    <RefreshCw size={12} /> Osvježi
                  </button>
                </div>
                <ReachChart data={reachData} title="Doseg i prikazivanja (30 dana)" />
              </div>
            )}

            {/* Customer Journey */}
            {funnelSteps.length > 0 && (
              <div className="card">
                <CustomerJourney funnel={funnelSteps} />
              </div>
            )}

            {/* Campaign Comparison + Classic Funnel */}
            <div className="content-grid">
              {campaignData.length > 0 && (
                <div className="card">
                  <CampaignChart data={campaignData} bars={campaignBars} title="Performanse po platformi" />
                </div>
              )}
              {funnelSteps.length > 0 && (
                <div className="card">
                  <FunnelChart steps={funnelSteps} title="Konverzijski lijevak" />
                </div>
              )}
            </div>

            {/* Top Posts */}
            {topPosts.length > 0 && (
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
                            <span className="font-mono">{formatNumber(post.reach)}</span>
                          </div>
                          <p className="text-xs text-studio-text-secondary">Doseg</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-studio-text-secondary">
                            <Heart size={14} />
                            <span className="font-mono">{formatNumber(post.engagement)}</span>
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
            )}
          </>
        )}

        {tab === 'reklame' && (
          <>
            {/* Ads Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard icon={Megaphone} label="Ukupno reklama" value={String(ads.length)} color="text-studio-text-secondary" />
              <KpiCard icon={DollarSign} label="Ukupna potrošnja" value={`EUR${adsTotalSpend.toLocaleString()}`} color="text-red-500" />
              <KpiCard icon={Target} label="Konverzije" value={adsTotalConversions.toLocaleString()} color="text-green-600" />
              <KpiCard icon={Eye} label="Prosj. CTR" value={`${adsAvgCTR.toFixed(1)}%`} color="text-blue-600" />
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
