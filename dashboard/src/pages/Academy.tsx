import { useState, useMemo } from 'react'
import Header from '../components/layout/Header'
import { useApi } from '../hooks/useApi'
import { useClient } from '../contexts/ClientContext'
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSpinner'
import MetricCard from '../components/common/MetricCard'
import DataTable from '../components/common/DataTable'
import { formatNumber, formatCurrency } from '../utils/formatters'
import {
  Video, Calendar, Target, DollarSign, Users, TrendingUp,
  AlertTriangle, Info, Sparkles, Lightbulb, Search, ExternalLink,
  Check, X, Clock, Shield, Zap, Award, Filter,
  Activity, Heart,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { CHART_ANIM, AXIS_STYLE, GRID_STYLE } from '../components/charts/chartConfig'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PartnerData {
  id: string
  name: string
  handle: string
  avatar_url: string | null
  category: string
  tier: string
  platform: string
  followers: number
  engagement_rate: number
  match_score: number
  campaigns_done: number
  reach: number
  clicks: number
  conversions: number
  cost_per_post: number
  total_cost: number
  revenue_generated: number
  roi: number
  roas: number
  affiliate_code: string
  content_status: string
  is_active: boolean
  last_activity: string | null
  specialties: string[]
}

interface ContentItem {
  id: string
  partner_name: string
  partner_handle: string
  title: string
  type: string
  platform: string
  status: string
  due: string
  due_date: string
}

interface Discovery {
  name: string
  handle: string
  category: string
  platform: string
  followers: number
  engagement_rate: number
  match_score: number
  reason: string
}

interface TierComparison {
  tier: string
  count: number
  total_spend: number
  total_revenue: number
  avg_roas: number
}

interface AIInsight {
  icon: string
  text: string
  type: 'success' | 'warning' | 'info'
}

interface AIAdvice {
  title: string
  insights: AIInsight[]
}

interface Summary {
  active_collaborations: number
  total_partners: number
  total_revenue: number
  total_cost: number
  total_roi: number
  avg_match_score: number
  total_reach: number
  total_conversions: number
  pending_content: number
  active_programs: number
}

interface PageData {
  partners: PartnerData[]
  contentPipeline: ContentItem[]
  discoveries: Discovery[]
  summary: Summary
  tier_comparison: TierComparison[]
  ai_advice: AIAdvice
  _meta: {
    is_estimate: boolean
    connected_platforms: string[]
    analyzed_at: string
  }
}

type PartnerFilter = 'svi' | 'premium' | 'standard' | 'kreator'
type SortBy = 'match' | 'roas' | 'reach' | 'conversions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function matchLabel(score: number): string {
  if (score >= 80) return 'Odličan'
  if (score >= 60) return 'Dobar'
  if (score >= 40) return 'Prosječan'
  return 'Nizak'
}

function platformIcon(platform: string): string {
  switch (platform) {
    case 'instagram': return '📸'
    case 'tiktok': return '🎵'
    case 'youtube': return '▶️'
    case 'facebook': return '👤'
    default: return '🌐'
  }
}

function platformDisplayName(p: string): string {
  switch (p) {
    case 'instagram': return 'Instagram'
    case 'tiktok': return 'TikTok'
    case 'youtube': return 'YouTube'
    case 'facebook': return 'Facebook'
    default: return p
  }
}

const tierColors: Record<string, string> = {
  Premium: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Standard: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Kreator: 'bg-green-500/10 text-green-400 border-green-500/20',
}

const statusColors: Record<string, string> = {
  'Odobreno': 'bg-green-500/10 text-green-400',
  'U čekanju': 'bg-amber-500/10 text-amber-400',
  'U produkciji': 'bg-blue-500/10 text-blue-400',
  'Snimanje': 'bg-blue-500/10 text-blue-400',
  'Pregled': 'bg-yellow-500/10 text-yellow-400',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EstimateBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
      <Info size={16} className="text-amber-500 flex-shrink-0" />
      <p className="text-xs text-amber-400/80">
        <span className="font-semibold text-amber-400">Procijenjeni podaci</span> — AI je generirao primjere partnera na temelju vašeg brend profila.
        Dodajte stvarne partnere za praćenje performansi.
      </p>
    </div>
  )
}

function PartnerAIInsight({ advice, isEstimate, brandName }: {
  advice: AIAdvice
  isEstimate: boolean
  brandName: string
}) {
  const insightIcons: Record<string, typeof Zap> = {
    Target, TrendingUp, AlertTriangle, DollarSign, Lightbulb,
    Sparkles, Clock, Award, Zap, Activity, Shield,
  }

  if (advice.insights.length === 0) return null

  return (
    <div className="rounded-2xl border border-brand-accent/20 bg-gradient-to-br from-brand-accent/5 to-transparent p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-brand-accent/20 flex items-center justify-center">
          <Sparkles size={16} className="text-brand-accent" />
        </div>
        <div>
          <h3 className="font-headline text-sm text-studio-text-primary">{advice.title}</h3>
          <p className="text-[10px] text-studio-text-tertiary">
            {isEstimate ? 'Na temelju AI analize profila' : `Preporuke za ${brandName}`}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {advice.insights.map((insight, idx) => {
          const IconComp = insightIcons[insight.icon] || Lightbulb
          const colors = {
            success: 'text-green-400 bg-green-500/10',
            warning: 'text-amber-400 bg-amber-500/10',
            info: 'text-blue-400 bg-blue-500/10',
          }
          return (
            <div key={idx} className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${colors[insight.type]}`}>
                <IconComp size={12} />
              </div>
              <p className="text-xs text-studio-text-secondary leading-relaxed">{insight.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DiscoverySection({ discoveries, brandName }: { discoveries: Discovery[], brandName: string }) {
  if (discoveries.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-brand-accent" />
          <h3 className="font-headline text-sm tracking-wider text-studio-text-primary">AI PRONAŠAO NOVE PARTNERE</h3>
        </div>
        <span className="text-[10px] text-studio-text-tertiary">Na temelju profila {brandName}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {discoveries.map((d, idx) => (
          <div key={idx} className="border border-studio-border rounded-xl p-4 hover:border-brand-accent/30 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-studio-text-primary">{d.name}</p>
                <p className="text-xs text-studio-text-tertiary">{d.handle}</p>
              </div>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: `${matchColor(d.match_score)}15`, color: matchColor(d.match_score) }}
              >
                <Target size={10} />
                {d.match_score}%
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3 text-xs text-studio-text-secondary">
              <span>{platformIcon(d.platform)}</span>
              <span>{platformDisplayName(d.platform)}</span>
              <span className="text-studio-text-tertiary">·</span>
              <span>{d.category}</span>
            </div>
            <div className="flex items-center gap-3 text-xs mb-3">
              <div>
                <span className="text-studio-text-tertiary">Pratitelji: </span>
                <span className="font-mono text-studio-text-primary">{formatNumber(d.followers)}</span>
              </div>
              <div>
                <span className="text-studio-text-tertiary">Eng: </span>
                <span className="font-mono text-studio-text-primary">{d.engagement_rate}%</span>
              </div>
            </div>
            <p className="text-[10px] text-studio-text-tertiary leading-relaxed">{d.reason}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function TierComparisonChart({ data }: { data: TierComparison[] }) {
  if (data.length === 0) return null

  const chartData = data.map(d => ({
    tier: d.tier,
    Prihod: d.total_revenue,
    Trošak: d.total_spend,
    ROAS: d.avg_roas,
    count: d.count,
  }))

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-brand-accent" />
        <h3 className="font-headline text-sm tracking-wider text-studio-text-primary">ROI PO RAZINI PARTNERA</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barGap={4}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="tier" {...AXIS_STYLE} />
          <YAxis {...AXIS_STYLE} tickFormatter={(v: number) => `€${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} />
          <Tooltip
            contentStyle={{
              background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.2)',
              borderRadius: '12px', fontSize: '12px', color: '#e2e8f0',
            }}
            formatter={(value: number, name: string) => [
              `€${value.toFixed(0)}`, name === 'Prihod' ? 'Prihod' : 'Uloženo',
            ]}
          />
          <Bar dataKey="Trošak" fill="#64748b" radius={[4, 4, 0, 0]} animationDuration={CHART_ANIM.barDuration} />
          <Bar dataKey="Prihod" radius={[4, 4, 0, 0]} animationDuration={CHART_ANIM.barDuration}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.ROAS >= 2 ? '#22c55e' : entry.ROAS >= 1 ? '#f59e0b' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-6 justify-center mt-3 text-xs text-studio-text-tertiary">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#64748b]" />
          <span>Uloženo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Prihod</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PartnersCreators() {
  const { data: pageData, loading } = useApi<PageData>('/academy/page-data')
  const { currentClient } = useClient()
  const brandName = currentClient?.client_name || 'Brend'

  const [tierFilter, setTierFilter] = useState<PartnerFilter>('svi')
  const [sortBy, setSortBy] = useState<SortBy>('match')
  const [detailPartner, setDetailPartner] = useState<PartnerData | null>(null)

  // Extract data
  const partners = pageData?.partners ?? []
  const contentPipeline = pageData?.contentPipeline ?? []
  const discoveries = pageData?.discoveries ?? []
  const summary = pageData?.summary ?? {
    active_collaborations: 0, total_partners: 0, total_revenue: 0,
    total_cost: 0, total_roi: 0, avg_match_score: 0,
    total_reach: 0, total_conversions: 0, pending_content: 0,
    active_programs: 0,
  }
  const tierComparison = pageData?.tier_comparison ?? []
  const aiAdvice = pageData?.ai_advice ?? { title: 'AI Matchmaking', insights: [] }
  const isEstimate = pageData?._meta?.is_estimate ?? false

  // Filter & sort
  const filteredPartners = useMemo(() => {
    let result = [...partners]

    if (tierFilter !== 'svi') {
      const tierMap: Record<string, string> = { premium: 'Premium', standard: 'Standard', kreator: 'Kreator' }
      result = result.filter(p => p.tier === tierMap[tierFilter])
    }

    switch (sortBy) {
      case 'match': result.sort((a, b) => b.match_score - a.match_score); break
      case 'roas': result.sort((a, b) => b.roas - a.roas); break
      case 'reach': result.sort((a, b) => b.reach - a.reach); break
      case 'conversions': result.sort((a, b) => b.conversions - a.conversions); break
    }

    return result
  }, [partners, tierFilter, sortBy])

  // Table columns
  const columns = [
    { key: 'name', header: 'Partner', render: (row: PartnerData) => (
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-accent/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-studio-text-primary">
          {row.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-studio-text-primary font-medium truncate">{row.name}</span>
            {row.is_active && <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />}
          </div>
          <p className="text-xs text-studio-text-tertiary truncate">
            {platformIcon(row.platform)} {row.handle} · {row.category}
          </p>
        </div>
      </div>
    )},
    { key: 'match', header: 'Podudaranje', render: (row: PartnerData) => (
      <div className="flex items-center gap-1.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: `${matchColor(row.match_score)}15`, color: matchColor(row.match_score) }}
        >
          {row.match_score}
        </div>
        <span className="text-[10px] text-studio-text-tertiary hidden sm:inline">{matchLabel(row.match_score)}</span>
      </div>
    ), align: 'center' as const },
    { key: 'tier', header: 'Razina', render: (row: PartnerData) => (
      <span className={`text-xs px-2 py-0.5 rounded-full border ${tierColors[row.tier] || 'bg-studio-surface-2 text-studio-text-secondary'}`}>
        {row.tier}
      </span>
    )},
    { key: 'followers', header: 'Pratitelji', render: (row: PartnerData) => (
      <span className="text-studio-text-secondary font-mono text-sm">{formatNumber(row.followers)}</span>
    ), align: 'right' as const },
    { key: 'engagement', header: 'Eng. %', render: (row: PartnerData) => (
      <span className={`font-mono text-sm ${row.engagement_rate > 5 ? 'text-green-400' : row.engagement_rate > 3 ? 'text-amber-400' : 'text-studio-text-secondary'}`}>
        {row.engagement_rate}%
      </span>
    ), align: 'right' as const },
    { key: 'conversions', header: 'Konverzije', render: (row: PartnerData) => (
      <span className="text-studio-text-secondary font-mono text-sm">{row.conversions}</span>
    ), align: 'right' as const },
    { key: 'roas', header: 'ROAS', render: (row: PartnerData) => (
      <span className="font-bold font-mono text-sm" style={{ color: row.roas >= 3 ? '#22c55e' : row.roas >= 1.5 ? '#f59e0b' : '#ef4444' }}>
        {row.roas}x
      </span>
    ), align: 'right' as const },
    { key: 'content', header: 'Sadržaj', render: (row: PartnerData) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[row.content_status] || 'bg-studio-surface-2 text-studio-text-secondary'}`}>
        {row.content_status}
      </span>
    )},
  ]

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading && !pageData) return (
    <>
      <Header title="PARTNERI & KREATORI" subtitle="AI Matchmaking — upravljanje partnerima i influencer pipeline" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={5} />
        <TableSkeleton rows={8} />
      </div>
    </>
  )

  return (
    <div>
      <Header title="PARTNERI & KREATORI" subtitle="AI Matchmaking — upravljanje partnerima i influencer pipeline" />

      <div className="page-wrapper space-y-6">
        {/* Estimate banner */}
        {isEstimate && <EstimateBanner />}

        {/* KPI Cards — 5 metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard label="Aktivne suradnje" value={summary.active_collaborations} format="number" icon={Users} />
          <MetricCard label="Prihod od partnera" value={summary.total_revenue} format="currency" icon={DollarSign} />
          <MetricCard label="Ukupni ROI" value={summary.total_roi} format="number" icon={TrendingUp} />
          <MetricCard label="Prosj. Match Score" value={summary.avg_match_score} format="number" icon={Target} />
          <MetricCard label="Ukupne konverzije" value={summary.total_conversions} format="number" icon={Heart} />
        </div>

        {/* Two-column: AI Advice + Tier ROI Chart */}
        {(aiAdvice.insights.length > 0 || tierComparison.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {aiAdvice.insights.length > 0 && (
              <PartnerAIInsight advice={aiAdvice} isEstimate={isEstimate} brandName={brandName} />
            )}
            <TierComparisonChart data={tierComparison} />
          </div>
        )}

        {/* Partners Table */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Popis partnera i kreatora</h2>
          </div>

          {/* Filters + Sort */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-studio-text-tertiary" />
              {(['svi', 'premium', 'standard', 'kreator'] as PartnerFilter[]).map((f) => {
                const labels: Record<string, string> = { svi: 'Svi', premium: 'Premium', standard: 'Standard', kreator: 'Kreatori' }
                const counts: Record<string, number> = {
                  svi: partners.length,
                  premium: partners.filter(p => p.tier === 'Premium').length,
                  standard: partners.filter(p => p.tier === 'Standard').length,
                  kreator: partners.filter(p => p.tier === 'Kreator').length,
                }
                return (
                  <button
                    key={f}
                    onClick={() => setTierFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      tierFilter === f
                        ? 'bg-brand-accent text-white shadow-sm'
                        : 'bg-studio-surface-2 text-studio-text-secondary hover:bg-studio-surface-3'
                    }`}
                  >
                    {labels[f]} ({counts[f]})
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] text-studio-text-tertiary">Sortiraj:</span>
              {(['match', 'roas', 'reach', 'conversions'] as SortBy[]).map((s) => {
                const labels: Record<string, string> = { match: 'Podudaranje', roas: 'ROAS', reach: 'Doseg', conversions: 'Konverzije' }
                return (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                      sortBy === s
                        ? 'bg-brand-accent/20 text-brand-accent'
                        : 'text-studio-text-tertiary hover:text-studio-text-secondary'
                    }`}
                  >
                    {labels[s]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <DataTable
              columns={columns}
              data={filteredPartners}
              onRowClick={(row) => setDetailPartner(row)}
              emptyMessage="Nema pronađenih partnera"
            />
          </div>
        </div>

        {/* Content Pipeline */}
        {contentPipeline.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Video size={16} className="text-purple-400" />
              <h3 className="font-headline text-sm tracking-wider text-studio-text-primary">SADRŽAJNI PIPELINE</h3>
              <span className="text-xs text-studio-text-tertiary ml-auto">{summary.pending_content} čeka odobrenje</span>
            </div>
            <div className="space-y-2">
              {contentPipeline.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-studio-surface-0 rounded-xl hover:bg-studio-surface-2 transition-colors group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Video size={14} className="text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-studio-text-primary truncate">{item.title}</h4>
                      <p className="text-xs text-studio-text-tertiary truncate">
                        {item.partner_name} · {item.type} · {item.platform}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[item.status] || 'bg-studio-surface-2 text-studio-text-secondary'}`}>
                      {item.status}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-studio-text-tertiary">
                      <Calendar size={12} />
                      {item.due}
                    </div>
                    {item.status === 'U čekanju' && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Odobri">
                          <Check size={12} />
                        </button>
                        <button className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Traži popravak">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Discovery — New Partners */}
        <DiscoverySection discoveries={discoveries} brandName={brandName} />
      </div>

      {/* ================================================================ */}
      {/* PARTNER DETAIL MODAL                                             */}
      {/* ================================================================ */}
      {detailPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailPartner(null)} />

          <div className="relative bg-studio-surface-1 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-studio-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-accent/30 to-purple-500/30 flex items-center justify-center text-lg font-bold text-studio-text-primary">
                  {detailPartner.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-studio-text-primary">{detailPartner.name}</h3>
                  <p className="text-xs text-studio-text-secondary">
                    {platformIcon(detailPartner.platform)} {detailPartner.handle} · {detailPartner.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${matchColor(detailPartner.match_score)}15`, color: matchColor(detailPartner.match_score) }}
                >
                  <Target size={12} />
                  {detailPartner.match_score}% Match
                </div>
                <button onClick={() => setDetailPartner(null)} className="p-1.5 hover:bg-studio-surface-2 rounded-lg transition-colors">
                  <X size={18} className="text-studio-text-tertiary" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-studio-surface-0 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-studio-text-tertiary mb-1">Pratitelji</p>
                  <p className="font-stats text-lg text-studio-text-primary">{formatNumber(detailPartner.followers)}</p>
                </div>
                <div className="bg-studio-surface-0 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-studio-text-tertiary mb-1">Engagement</p>
                  <p className={`font-stats text-lg ${detailPartner.engagement_rate > 5 ? 'text-green-400' : 'text-studio-text-primary'}`}>
                    {detailPartner.engagement_rate}%
                  </p>
                </div>
                <div className="bg-studio-surface-0 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-studio-text-tertiary mb-1">Konverzije</p>
                  <p className="font-stats text-lg text-studio-text-primary">{detailPartner.conversions}</p>
                </div>
                <div className="bg-studio-surface-0 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-studio-text-tertiary mb-1">ROAS</p>
                  <p className="font-stats text-lg" style={{ color: detailPartner.roas >= 3 ? '#22c55e' : detailPartner.roas >= 1.5 ? '#f59e0b' : '#ef4444' }}>
                    {detailPartner.roas}x
                  </p>
                </div>
              </div>

              {/* Financials */}
              <div className="bg-studio-surface-0 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-studio-text-tertiary tracking-wider">FINANCIJSKI PREGLED</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-studio-text-secondary">Cijena/objava</span>
                    <span className="text-studio-text-primary font-mono">{formatCurrency(detailPartner.cost_per_post)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-studio-text-secondary">Ukupno uloženo</span>
                    <span className="text-studio-text-primary font-mono">{formatCurrency(detailPartner.total_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-studio-text-secondary">Prihod generiran</span>
                    <span className="text-green-400 font-mono">{formatCurrency(detailPartner.revenue_generated)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-studio-text-secondary">ROI</span>
                    <span className={`font-mono font-bold ${detailPartner.roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {detailPartner.roi > 0 ? '+' : ''}{detailPartner.roi}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Affiliate tracking */}
              {detailPartner.affiliate_code && (
                <div className="bg-studio-surface-0 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-studio-text-tertiary tracking-wider mb-2">AFFILIATE LINK</h4>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-studio-surface-2 text-xs font-mono text-brand-accent truncate">
                      {`https://${brandName.toLowerCase().replace(/\s/g, '')}.hr/?ref=${detailPartner.affiliate_code}`}
                    </code>
                    <button className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors" title="Kopiraj">
                      <ExternalLink size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-studio-text-tertiary">
                    <span>Doseg: <strong className="text-studio-text-secondary font-mono">{formatNumber(detailPartner.reach)}</strong></span>
                    <span>Klikovi: <strong className="text-studio-text-secondary font-mono">{formatNumber(detailPartner.clicks)}</strong></span>
                    <span>Konv: <strong className="text-studio-text-secondary font-mono">{detailPartner.conversions}</strong></span>
                  </div>
                </div>
              )}

              {/* Performance bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-studio-text-primary">Učinkovitost suradnje</span>
                  <span className="text-xs text-studio-text-tertiary">{detailPartner.campaigns_done} kampanja dovršeno</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="w-full bg-studio-surface-3 rounded-full h-2 mb-1">
                      <div className="bg-green-400 h-2 rounded-full" style={{ width: `${Math.min(detailPartner.match_score, 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-studio-text-tertiary">Podudaranje</span>
                  </div>
                  <div className="text-center">
                    <div className="w-full bg-studio-surface-3 rounded-full h-2 mb-1">
                      <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${Math.min(detailPartner.engagement_rate * 10, 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-studio-text-tertiary">Angažman</span>
                  </div>
                  <div className="text-center">
                    <div className="w-full bg-studio-surface-3 rounded-full h-2 mb-1">
                      <div className="bg-brand-accent h-2 rounded-full" style={{ width: `${Math.min(detailPartner.roas * 20, 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-studio-text-tertiary">ROAS</span>
                  </div>
                </div>
              </div>

              {/* Specialties */}
              {detailPartner.specialties.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-studio-text-tertiary tracking-wider mb-2">SPECIJALNOSTI</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {detailPartner.specialties.map((s) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-studio-surface-2 text-studio-text-secondary">
                        #{s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-studio-border bg-studio-surface-0 rounded-b-2xl">
              <span className={`text-xs px-2.5 py-1 rounded-full border ${tierColors[detailPartner.tier] || ''}`}>
                {detailPartner.tier}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[detailPartner.content_status] || 'bg-studio-surface-2 text-studio-text-secondary'}`}>
                {detailPartner.content_status}
              </span>
              <div className="flex-1" />
              <button
                onClick={() => setDetailPartner(null)}
                className="px-4 py-2 text-sm font-medium text-studio-text-secondary hover:text-studio-text-primary bg-studio-surface-1 border border-studio-border rounded-xl transition-all hover:bg-studio-surface-0"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
