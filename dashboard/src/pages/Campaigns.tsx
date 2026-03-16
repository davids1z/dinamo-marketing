import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import MetricCard from '../components/common/MetricCard'
import DataTable from '../components/common/DataTable'
import StatusBadge from '../components/common/StatusBadge'
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import { useApi } from '../hooks/useApi'
import { useProjectStatus } from '../hooks/useProjectStatus'
import { useClient } from '../contexts/ClientContext'
import { campaignsApi, type AdPerformance, type CampaignPerformance } from '../api/campaigns'
import { formatCurrency, formatNumber } from '../utils/formatters'
import {
  Zap, CreditCard, BarChart3, Plus, Pause, Play,
  X, Check, ChevronRight, ChevronLeft, Calendar, Trophy,
  TrendingUp, Eye, MousePointerClick, AlertCircle, CheckCircle,
  Filter, Loader2, Image, RefreshCw, Rocket, FolderKanban,
  AlertTriangle, Info, Sparkles, Lightbulb, Target, DollarSign,
  Activity, PieChart,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from 'recharts'
import { CHART_ANIM, AXIS_STYLE, GRID_STYLE } from '../components/charts/chartConfig'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdVariant {
  variant_label: string
  headline: string
  description: string
  status: string
  impressions: number
  clicks: number
  ctr: number
  spend: number
  conversions: number
  roas: number
}

interface DailyMetric {
  date: string
  day_label: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
}

interface CampaignData {
  id: string
  name: string
  platform: string
  platform_label: string
  objective: string
  status: string
  daily_budget: number
  max_budget: number
  spend: number
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  roas: number
  health_score: number
  start_date: string
  end_date: string
  days_running: number
  budget_utilization: number
  ad_variants: AdVariant[]
  daily_metrics: DailyMetric[]
}

interface PlatformComparison {
  platform: string
  label: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  roas: number
  spend_share: number
}

interface MonthlyTrend {
  month: string
  spend: number
  roas: number
  conversions: number
}

interface Alert {
  campaign_id: string
  campaign_name: string
  severity: 'critical' | 'warning' | 'success'
  icon: string
  title: string
  message: string
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
  active_campaigns: number
  paused_campaigns: number
  total_campaigns: number
  total_spend: number
  avg_roas: number
  avg_ctr: number
  total_impressions: number
  total_clicks: number
  total_conversions: number
  cost_per_conversion: number
}

interface PageData {
  campaigns: CampaignData[]
  summary: Summary
  platform_comparison: PlatformComparison[]
  monthly_trend: MonthlyTrend[]
  alerts: Alert[]
  ai_advice: AIAdvice
  _meta: {
    is_estimate: boolean
    connected_platforms: string[]
    analyzed_at: string
  }
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

type StatusFilter = 'sve' | 'aktivna' | 'pauzirana'

type WizardStep = 1 | 2 | 3

interface NewCampaignForm {
  name: string
  platforms: { meta: boolean; tiktok: boolean; youtube: boolean }
  market: string
  budget: number
  startDate: string
  endDate: string
  objective: 'awareness' | 'engagement' | 'conversions'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const emptyForm: NewCampaignForm = {
  name: '',
  platforms: { meta: false, tiktok: false, youtube: false },
  market: '',
  budget: 0,
  startDate: '',
  endDate: '',
  objective: 'awareness',
}

function platformLabel(p: NewCampaignForm['platforms']): string {
  const parts: string[] = []
  if (p.meta) parts.push('Meta (IG + FB)')
  if (p.tiktok) parts.push('TikTok')
  if (p.youtube) parts.push('YouTube')
  return parts.join(' + ') || '-'
}

function objectiveLabel(o: string): string {
  switch (o) {
    case 'awareness': return 'Svijest o brendu'
    case 'engagement': return 'Angažman'
    case 'conversions': return 'Konverzije'
    default: return o
  }
}

function objectiveIcon(o: string) {
  switch (o) {
    case 'awareness': return Eye
    case 'engagement': return MousePointerClick
    case 'conversions': return TrendingUp
    default: return Target
  }
}

function healthEmoji(score: number): string {
  if (score >= 80) return '🟢'
  if (score >= 60) return '🟡'
  if (score >= 40) return '🟠'
  return '🔴'
}

function healthLabel(score: number): string {
  if (score >= 80) return 'Odlično'
  if (score >= 60) return 'Dobro'
  if (score >= 40) return 'Prosječno'
  return 'Slabo'
}

const ROAS_COLORS = {
  great: '#22c55e',
  good: '#f59e0b',
  poor: '#ef4444',
}

function roasColor(roas: number): string {
  if (roas >= 3) return ROAS_COLORS.great
  if (roas >= 2) return ROAS_COLORS.good
  return ROAS_COLORS.poor
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EstimateBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
      <Info size={16} className="text-amber-500 flex-shrink-0" />
      <p className="text-xs text-amber-400/80">
        <span className="font-semibold text-amber-400">Procijenjeni podaci</span> — prikazane su simulirane kampanje na temelju benchmark podataka.
        Povežite Ad račun (Meta Ads, Google Ads) za stvarne rezultate.
      </p>
    </div>
  )
}

function CampaignAIInsight({ advice, isEstimate, brandName }: {
  advice: AIAdvice
  isEstimate: boolean
  brandName: string
}) {
  const insightIcons: Record<string, typeof Zap> = {
    Trophy, AlertTriangle, BarChart3, Lightbulb, TrendingUp,
    Sparkles, Target, Activity, Zap,
  }

  return (
    <div className="rounded-2xl border border-brand-accent/20 bg-gradient-to-br from-brand-accent/5 to-transparent p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-brand-accent/20 flex items-center justify-center">
          <Sparkles size={16} className="text-brand-accent" />
        </div>
        <div>
          <h3 className="font-headline text-sm text-studio-text-primary">{advice.title}</h3>
          <p className="text-[10px] text-studio-text-tertiary">
            {isEstimate ? 'Na temelju benchmark podataka' : `Analiza za ${brandName}`}
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

function AlertsBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null

  const severityStyles = {
    critical: 'border-red-500/20 bg-red-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    success: 'border-green-500/20 bg-green-500/5',
  }
  const severityIcons = {
    critical: AlertTriangle,
    warning: CreditCard,
    success: TrendingUp,
  }
  const severityColors = {
    critical: 'text-red-400',
    warning: 'text-amber-400',
    success: 'text-green-400',
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, idx) => {
        const Icon = severityIcons[alert.severity] || AlertCircle
        return (
          <div
            key={idx}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${severityStyles[alert.severity]}`}
          >
            <Icon size={16} className={`flex-shrink-0 mt-0.5 ${severityColors[alert.severity]}`} />
            <div className="min-w-0">
              <p className={`text-xs font-semibold ${severityColors[alert.severity]}`}>{alert.title}</p>
              <p className="text-xs text-studio-text-secondary mt-0.5">{alert.message}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PlatformComparisonTable({ data }: { data: PlatformComparison[] }) {
  if (data.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <PieChart size={16} className="text-brand-accent" />
        <h3 className="font-headline text-sm tracking-wider text-studio-text-primary">USPOREDBA PLATFORMI</h3>
      </div>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-studio-border">
              <th className="text-left py-2.5 text-xs text-studio-text-tertiary font-medium">Platforma</th>
              <th className="text-right py-2.5 text-xs text-studio-text-tertiary font-medium">Potrošnja</th>
              <th className="text-right py-2.5 text-xs text-studio-text-tertiary font-medium">Udio</th>
              <th className="text-right py-2.5 text-xs text-studio-text-tertiary font-medium">Klikovi</th>
              <th className="text-right py-2.5 text-xs text-studio-text-tertiary font-medium">CTR</th>
              <th className="text-right py-2.5 text-xs text-studio-text-tertiary font-medium">Konverzije</th>
              <th className="text-right py-2.5 text-xs text-studio-text-tertiary font-medium">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.platform} className="border-b border-studio-border/50 hover:bg-white/[0.02] transition-colors">
                <td className="py-3">
                  <span className="text-studio-text-primary font-medium">{p.label}</span>
                </td>
                <td className="py-3 text-right font-mono text-studio-text-secondary">
                  {formatCurrency(p.spend)}
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 bg-studio-surface-3 rounded-full h-1.5">
                      <div className="bg-brand-accent h-1.5 rounded-full" style={{ width: `${p.spend_share}%` }} />
                    </div>
                    <span className="text-xs text-studio-text-tertiary font-mono w-10 text-right">{p.spend_share}%</span>
                  </div>
                </td>
                <td className="py-3 text-right font-mono text-studio-text-secondary">{formatNumber(p.clicks)}</td>
                <td className="py-3 text-right">
                  <span className={`font-mono ${p.ctr > 2.5 ? 'text-green-400' : p.ctr > 1.5 ? 'text-amber-400' : 'text-red-400'}`}>
                    {p.ctr}%
                  </span>
                </td>
                <td className="py-3 text-right font-mono text-studio-text-secondary">{p.conversions}</td>
                <td className="py-3 text-right">
                  <span className="font-bold font-mono" style={{ color: roasColor(p.roas) }}>
                    {p.roas}x
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Campaigns() {
  const { data: pageData, loading, refetch } = useApi<PageData>('/campaigns/page-data')
  const { hasProjects } = useProjectStatus()
  const { currentClient } = useClient()
  const navigate = useNavigate()
  const brandName = currentClient?.client_name || 'Brend'

  // Local state
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('sve')

  // Wizard modal
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [wizardForm, setWizardForm] = useState<NewCampaignForm>(emptyForm)

  // Detail modal
  const [detailCampaign, setDetailCampaign] = useState<CampaignData | null>(null)
  const [campaignPerf, setCampaignPerf] = useState<CampaignPerformance | null>(null)
  const [perfLoading, setPerfLoading] = useState(false)
  const [refreshingCreative, setRefreshingCreative] = useState(false)

  // Extract data from BFF
  // useMemo prevents a new array reference on every render (react-hooks/exhaustive-deps)
  const campaigns = useMemo(() => pageData?.campaigns ?? [], [pageData?.campaigns])
  const summary = pageData?.summary ?? {
    active_campaigns: 0, paused_campaigns: 0, total_campaigns: 0,
    total_spend: 0, avg_roas: 0, avg_ctr: 0,
    total_impressions: 0, total_clicks: 0,
    total_conversions: 0, cost_per_conversion: 0,
  }
  const platformComparison = pageData?.platform_comparison ?? []
  const monthlyTrend = pageData?.monthly_trend ?? []
  const alerts = pageData?.alerts ?? []
  const aiAdvice = pageData?.ai_advice ?? { title: 'AI Media Buyer', insights: [] }
  const isEstimate = pageData?._meta?.is_estimate ?? false

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    if (statusFilter === 'sve') return campaigns
    if (statusFilter === 'aktivna') return campaigns.filter(c => c.status === 'active')
    return campaigns.filter(c => c.status === 'paused')
  }, [campaigns, statusFilter])

  // Load campaign performance when detail modal opens (only for real campaigns)
  useEffect(() => {
    if (!detailCampaign) {
      setCampaignPerf(null)
      return
    }
    // Estimate campaigns have local ad_variants, no need for API call
    if (detailCampaign.id.startsWith('est_')) return

    const loadPerf = async () => {
      setPerfLoading(true)
      try {
        const data = await campaignsApi.getPerformance(detailCampaign.id)
        setCampaignPerf(data as unknown as CampaignPerformance)
      } catch {
        setCampaignPerf(null)
      } finally {
        setPerfLoading(false)
      }
    }
    loadPerf()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally depends on id only, not the full object
  }, [detailCampaign?.id])

  const handleRefreshCreative = async (campaignId: string) => {
    setRefreshingCreative(true)
    try {
      await campaignsApi.refreshCreative(campaignId)
      addToast('Vizuali su uspješno regenerirani', 'success')
      const data = await campaignsApi.getPerformance(campaignId)
      setCampaignPerf(data as unknown as CampaignPerformance)
    } catch {
      addToast('Greška pri regeneriranju vizuala', 'error')
    } finally {
      setRefreshingCreative(false)
    }
  }

  // -------------------------------------------------------------------------
  // Toast helpers
  // -------------------------------------------------------------------------

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // -------------------------------------------------------------------------
  // Pause / Resume
  // -------------------------------------------------------------------------

  const handlePause = async (id: string) => {
    setActionLoading(id)
    try {
      await campaignsApi.pause(id)
      refetch()
      addToast('Kampanja je pauzirana', 'success')
    } catch {
      addToast('Greška pri pauziranju kampanje.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResume = async (id: string) => {
    setActionLoading(id)
    try {
      await campaignsApi.resume(id)
      refetch()
      addToast('Kampanja je nastavljena', 'success')
    } catch {
      addToast('Greška pri nastavljanju kampanje.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // -------------------------------------------------------------------------
  // Wizard handlers
  // -------------------------------------------------------------------------

  const openWizard = () => {
    setWizardForm(emptyForm)
    setWizardStep(1)
    setShowWizard(true)
  }

  const closeWizard = () => setShowWizard(false)

  const wizardCanNext = (): boolean => {
    if (wizardStep === 1) {
      return wizardForm.name.trim().length > 0
        && (wizardForm.platforms.meta || wizardForm.platforms.tiktok || wizardForm.platforms.youtube)
        && wizardForm.market.trim().length > 0
    }
    if (wizardStep === 2) {
      return wizardForm.budget > 0
        && wizardForm.startDate.length > 0
        && wizardForm.endDate.length > 0
    }
    return true
  }

  const [submitting, setSubmitting] = useState(false)

  const submitWizard = async () => {
    setSubmitting(true)
    try {
      const platform = wizardForm.platforms.meta ? 'meta' : wizardForm.platforms.tiktok ? 'tiktok' : 'meta'
      await campaignsApi.create({
        name: wizardForm.name,
        platform,
        objective: wizardForm.objective,
        daily_budget: Math.round(wizardForm.budget / 30),
        max_budget: wizardForm.budget,
        start_date: wizardForm.startDate,
        end_date: wizardForm.endDate,
        status: 'active',
      })
      closeWizard()
      refetch()
      addToast(`Kampanja "${wizardForm.name}" je uspješno kreirana!`, 'success')
    } catch {
      addToast('Greška pri kreiranju kampanje. Pokušajte ponovo.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Table columns
  // -------------------------------------------------------------------------

  const columns = [
    { key: 'name', header: 'Kampanja', render: (row: CampaignData) => {
      const ObjIcon = objectiveIcon(row.objective)
      return (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-studio-surface-2 flex items-center justify-center flex-shrink-0">
            <ObjIcon size={14} className="text-studio-text-secondary" />
          </div>
          <div className="min-w-0">
            <span className="text-studio-text-primary font-medium truncate block">{row.name}</span>
            <p className="text-xs text-studio-text-tertiary mt-0.5 truncate">
              {row.platform_label} · {objectiveLabel(row.objective)}
            </p>
          </div>
        </div>
      )
    }},
    { key: 'status', header: 'Status', render: (row: CampaignData) => (
      <StatusBadge status={row.status === 'active' ? 'aktivna' : row.status === 'paused' ? 'pauzirana' : row.status} />
    )},
    { key: 'health', header: 'AI Health', render: (row: CampaignData) => (
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{healthEmoji(row.health_score)}</span>
        <span className="text-xs font-mono text-studio-text-secondary">{row.health_score}%</span>
      </div>
    ), align: 'center' as const },
    { key: 'budget', header: 'Budžet', render: (row: CampaignData) => (
      <div>
        <span className="text-studio-text-primary font-mono text-sm">{formatCurrency(row.max_budget)}</span>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-16 bg-studio-surface-3 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                row.budget_utilization > 90 ? 'bg-red-500' : row.budget_utilization > 70 ? 'bg-amber-500' : 'bg-brand-accent'
              }`}
              style={{ width: `${Math.min(row.budget_utilization, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-studio-text-tertiary font-mono">{row.budget_utilization}%</span>
        </div>
      </div>
    ), align: 'right' as const },
    { key: 'spend', header: 'Potrošnja', render: (row: CampaignData) => (
      <span className="text-studio-text-secondary font-mono text-sm">{formatCurrency(row.spend)}</span>
    ), align: 'right' as const },
    { key: 'ctr', header: 'CTR', render: (row: CampaignData) => (
      <span className={`font-mono text-sm ${row.ctr > 3 ? 'text-green-400' : row.ctr > 2 ? 'text-amber-400' : 'text-studio-text-secondary'}`}>
        {row.ctr}%
      </span>
    ), align: 'right' as const },
    { key: 'roas', header: 'ROAS', render: (row: CampaignData) => (
      <span className="font-bold font-mono text-sm" style={{ color: roasColor(row.roas) }}>
        {row.roas}x
      </span>
    ), align: 'right' as const },
    { key: 'actions', header: '', render: (row: CampaignData) => (
      <div className="flex items-center gap-1">
        {row.status === 'active' ? (
          <button
            onClick={(e) => { e.stopPropagation(); handlePause(row.id) }}
            disabled={actionLoading === row.id || isEstimate}
            className="p-1.5 hover:bg-amber-500/10 rounded text-amber-400 disabled:opacity-50"
            title="Pauziraj"
          >
            <Pause size={14} />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); handleResume(row.id) }}
            disabled={actionLoading === row.id || isEstimate}
            className="p-1.5 hover:bg-green-500/10 rounded text-green-400 disabled:opacity-50"
            title="Nastavi"
          >
            <Play size={14} />
          </button>
        )}
      </div>
    ), align: 'right' as const },
  ]

  // -------------------------------------------------------------------------
  // Render: Guards
  // -------------------------------------------------------------------------

  if (!hasProjects) {
    return (
      <div>
        <Header title="KAMPANJE" subtitle="AI Media Buyer — upravljanje kampanjama i performanse" />
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

  if (loading && !pageData) return (
    <>
      <Header title="KAMPANJE" subtitle="AI Media Buyer — upravljanje kampanjama i performanse" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={5} />
        <TableSkeleton rows={6} />
      </div>
    </>
  )

  // -------------------------------------------------------------------------
  // Render: Main
  // -------------------------------------------------------------------------

  return (
    <div>
      <Header
        title="KAMPANJE"
        subtitle="AI Media Buyer — upravljanje kampanjama i performanse"
        actions={
          <button onClick={openWizard} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} />
            Nova kampanja
          </button>
        }
      />

      <div className="page-wrapper space-y-6">
        {/* Estimate banner */}
        {isEstimate && <EstimateBanner />}

        {/* KPI Cards — 5 metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard label="Aktivne kampanje" value={summary.active_campaigns} format="number" icon={Zap} />
          <MetricCard label="Ukupna potrošnja" value={summary.total_spend} format="currency" icon={CreditCard} />
          <MetricCard label="Prosj. ROAS" value={summary.avg_roas} format="number" icon={BarChart3} />
          <MetricCard label="Konverzije" value={summary.total_conversions} format="number" icon={Target} />
          <MetricCard label="Cijena konverzije" value={summary.cost_per_conversion} format="currency" icon={DollarSign} />
        </div>

        {/* Alerts */}
        <AlertsBanner alerts={alerts} />

        {/* Two-column: AI Advice + Monthly Trend */}
        {(aiAdvice.insights.length > 0 || monthlyTrend.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Advice */}
            {aiAdvice.insights.length > 0 && (
              <CampaignAIInsight advice={aiAdvice} isEstimate={isEstimate} brandName={brandName} />
            )}

            {/* Monthly Spend & ROAS Trend */}
            {monthlyTrend.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-brand-accent" />
                  <h3 className="font-headline text-sm tracking-wider text-studio-text-primary">TREND POTROŠNJE I ROAS-a</h3>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="month" {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} tickFormatter={(v: number) => `€${v}`} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.2)',
                        borderRadius: '12px', fontSize: '12px', color: '#e2e8f0',
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'spend' ? `€${value.toFixed(0)}` : `${value}x`,
                        name === 'spend' ? 'Potrošnja' : 'ROAS',
                      ]}
                    />
                    <Bar
                      dataKey="spend"
                      radius={[4, 4, 0, 0]}
                      animationDuration={CHART_ANIM.barDuration}
                      animationEasing={CHART_ANIM.barEasing}
                    >
                      {monthlyTrend.map((_, idx) => (
                        <Cell key={idx} fill="rgb(var(--brand-accent))" opacity={0.3 + (idx / monthlyTrend.length) * 0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={monthlyTrend}>
                    <XAxis dataKey="month" {...AXIS_STYLE} hide />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.2)',
                        borderRadius: '12px', fontSize: '12px', color: '#e2e8f0',
                      }}
                      formatter={(value: number) => [`${value}x`, 'ROAS']}
                    />
                    <Line
                      type="monotone"
                      dataKey="roas"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', r: 4 }}
                      animationDuration={CHART_ANIM.lineDuration}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Platform Comparison */}
        <PlatformComparisonTable data={platformComparison} />

        {/* Campaigns Table */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Sve kampanje</h2>
            <button onClick={openWizard} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} />
              Nova kampanja
            </button>
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-2 mb-4">
            <Filter size={14} className="text-studio-text-tertiary" />
            {(['sve', 'aktivna', 'pauzirana'] as StatusFilter[]).map((f) => {
              const label = f === 'sve' ? 'Sve' : f === 'aktivna' ? 'Aktivne' : 'Pauzirane'
              const count = f === 'sve'
                ? campaigns.length
                : f === 'aktivna'
                  ? campaigns.filter(c => c.status === 'active').length
                  : campaigns.filter(c => c.status === 'paused').length
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    statusFilter === f
                      ? 'bg-brand-accent text-white shadow-sm'
                      : 'bg-studio-surface-2 text-studio-text-secondary hover:bg-studio-surface-3'
                  }`}
                >
                  {label} ({count})
                </button>
              )
            })}
          </div>

          {campaigns.length > 0 ? (
            <div className="overflow-x-auto -mx-5 px-5">
              <DataTable
                columns={columns}
                data={filteredCampaigns}
                onRowClick={(row) => setDetailCampaign(row)}
                emptyMessage="Nema pronađenih kampanja za ovaj filter"
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center mx-auto mb-4">
                <Rocket size={28} className="text-brand-accent" />
              </div>
              <h3 className="text-lg font-bold text-studio-text-primary mb-2">Pokrenite prvu kampanju</h3>
              <p className="text-sm text-studio-text-secondary max-w-md mx-auto mb-6">
                AI Media Buyer automatski kreira varijante oglasa, prati ROAS i predlaže optimizacije u realnom vremenu.
              </p>
              <button
                onClick={openWizard}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover transition-all shadow-lg shadow-brand-accent/20"
              >
                <Plus size={16} />
                Kreiraj prvu kampanju
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ================================================================ */}
      {/* NEW CAMPAIGN WIZARD MODAL                                        */}
      {/* ================================================================ */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeWizard} />
          <div className="relative bg-studio-surface-1 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-studio-border">
              <div>
                <h3 className="text-lg font-bold text-studio-text-primary">AI Campaign Builder</h3>
                <p className="text-xs text-studio-text-secondary mt-0.5">Korak {wizardStep} od 3 — AI automatski kreira varijante i kopiju</p>
              </div>
              <button onClick={closeWizard} className="p-1.5 hover:bg-studio-surface-2 rounded-lg transition-colors">
                <X size={18} className="text-studio-text-tertiary" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2 px-6 pt-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s < wizardStep ? 'bg-green-100 text-green-600'
                    : s === wizardStep ? 'bg-brand-accent text-white'
                    : 'bg-studio-surface-2 text-studio-text-tertiary'
                  }`}>
                    {s < wizardStep ? <Check size={14} /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`flex-1 h-0.5 rounded ${s < wizardStep ? 'bg-green-300' : 'bg-studio-surface-3'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Step 1: Basic info */}
              {wizardStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-studio-text-primary mb-1.5">Naziv kampanje</label>
                    <input
                      type="text"
                      value={wizardForm.name}
                      onChange={e => setWizardForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="npr. Proljetna promocija"
                      className="w-full px-3 py-2.5 border border-studio-border rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all bg-studio-surface-0 text-studio-text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-studio-text-primary mb-2">Platforme</label>
                    <div className="flex flex-wrap gap-3">
                      {([
                        { key: 'meta' as const, label: 'Meta (IG + FB)' },
                        { key: 'tiktok' as const, label: 'TikTok' },
                        { key: 'youtube' as const, label: 'YouTube' },
                      ]).map(({ key, label }) => (
                        <label
                          key={key}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                            wizardForm.platforms[key]
                              ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
                              : 'border-studio-border bg-studio-surface-0 text-studio-text-secondary hover:border-brand-accent/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={wizardForm.platforms[key]}
                            onChange={e => setWizardForm(f => ({
                              ...f,
                              platforms: { ...f.platforms, [key]: e.target.checked },
                            }))}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            wizardForm.platforms[key]
                              ? 'bg-brand-accent border-brand-accent'
                              : 'border-studio-border bg-studio-surface-1'
                          }`}>
                            {wizardForm.platforms[key] && <Check size={10} className="text-white" />}
                          </div>
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-studio-text-primary mb-1.5">Tržište</label>
                    <input
                      type="text"
                      value={wizardForm.market}
                      onChange={e => setWizardForm(f => ({ ...f, market: e.target.value }))}
                      placeholder="npr. HR, BA, DE"
                      className="w-full px-3 py-2.5 border border-studio-border rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all bg-studio-surface-0 text-studio-text-primary"
                    />
                  </div>

                  {/* AI hint */}
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-brand-accent/5 border border-brand-accent/10">
                    <Sparkles size={14} className="text-brand-accent flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-studio-text-secondary">
                      AI automatski kreira 3 varijante oglasa (A/B/C test), prilagođene profilu brenda <strong className="text-studio-text-primary">{brandName}</strong>.
                    </p>
                  </div>
                </>
              )}

              {/* Step 2: Budget & dates */}
              {wizardStep === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-studio-text-primary mb-1.5">Ukupni budžet (EUR)</label>
                    <input
                      type="number"
                      min={0}
                      value={wizardForm.budget || ''}
                      onChange={e => setWizardForm(f => ({ ...f, budget: Number(e.target.value) }))}
                      placeholder="npr. 3000"
                      className="w-full px-3 py-2.5 border border-studio-border rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all font-mono bg-studio-surface-0 text-studio-text-primary"
                    />
                    {wizardForm.budget > 0 && (
                      <p className="text-xs text-studio-text-tertiary mt-1.5">
                        ≈ {formatCurrency(Math.round(wizardForm.budget / 30))}/dan dnevni budžet
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-studio-text-primary mb-1.5">
                        <Calendar size={12} className="inline mr-1" />
                        Datum početka
                      </label>
                      <input
                        type="date"
                        value={wizardForm.startDate}
                        onChange={e => setWizardForm(f => ({ ...f, startDate: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-studio-border rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all bg-studio-surface-0 text-studio-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-studio-text-primary mb-1.5">
                        <Calendar size={12} className="inline mr-1" />
                        Datum završetka
                      </label>
                      <input
                        type="date"
                        value={wizardForm.endDate}
                        onChange={e => setWizardForm(f => ({ ...f, endDate: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-studio-border rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all bg-studio-surface-0 text-studio-text-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-studio-text-primary mb-2">Cilj kampanje</label>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { value: 'awareness' as const, label: 'Svijest', desc: 'Doseg i prepoznatljivost', icon: Eye },
                        { value: 'engagement' as const, label: 'Angažman', desc: 'Klikovi i interakcije', icon: MousePointerClick },
                        { value: 'conversions' as const, label: 'Konverzije', desc: 'Prodaja i registracije', icon: TrendingUp },
                      ]).map(({ value, label, desc, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setWizardForm(f => ({ ...f, objective: value }))}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-all ${
                            wizardForm.objective === value
                              ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
                              : 'border-studio-border bg-studio-surface-0 text-studio-text-secondary hover:border-brand-accent/30'
                          }`}
                        >
                          <Icon size={20} />
                          {label}
                          <span className="text-[10px] text-studio-text-tertiary font-normal">{desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Review */}
              {wizardStep === 3 && (
                <div className="space-y-3">
                  <p className="text-sm text-studio-text-secondary mb-4">Pregledajte podatke prije kreiranja kampanje.</p>

                  <div className="bg-studio-surface-0 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-studio-text-secondary">Naziv</span>
                      <span className="text-studio-text-primary font-medium">{wizardForm.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-studio-text-secondary">Platforme</span>
                      <span className="text-studio-text-primary font-medium">{platformLabel(wizardForm.platforms)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-studio-text-secondary">Tržište</span>
                      <span className="text-studio-text-primary font-medium">{wizardForm.market}</span>
                    </div>
                    <div className="border-t border-studio-border my-1" />
                    <div className="flex justify-between text-sm">
                      <span className="text-studio-text-secondary">Budžet</span>
                      <span className="text-studio-text-primary font-medium font-mono">{formatCurrency(wizardForm.budget)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-studio-text-secondary">Dnevni budžet</span>
                      <span className="text-studio-text-primary font-medium font-mono">{formatCurrency(Math.round(wizardForm.budget / 30))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-studio-text-secondary">Početak</span>
                      <span className="text-studio-text-primary font-medium">{wizardForm.startDate}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-studio-text-secondary">Završetak</span>
                      <span className="text-studio-text-primary font-medium">{wizardForm.endDate}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-studio-text-secondary">Cilj</span>
                      <span className="text-studio-text-primary font-medium">{objectiveLabel(wizardForm.objective)}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-green-500/5 border border-green-500/10">
                    <CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-studio-text-secondary">
                      AI će automatski kreirati <strong className="text-studio-text-primary">3 varijante oglasa</strong> s različitim kreativama i kopijama.
                      A/B test se pokreće automatski.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-studio-border bg-studio-surface-0 rounded-b-2xl">
              {wizardStep > 1 ? (
                <button
                  onClick={() => setWizardStep((wizardStep - 1) as WizardStep)}
                  className="flex items-center gap-1.5 text-sm text-studio-text-secondary hover:text-studio-text-primary font-medium transition-colors"
                >
                  <ChevronLeft size={16} />
                  Natrag
                </button>
              ) : (
                <button
                  onClick={closeWizard}
                  className="text-sm text-studio-text-secondary hover:text-studio-text-primary font-medium transition-colors"
                >
                  Odustani
                </button>
              )}

              {wizardStep < 3 ? (
                <button
                  onClick={() => setWizardStep((wizardStep + 1) as WizardStep)}
                  disabled={!wizardCanNext()}
                  className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Dalje
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={submitWizard}
                  disabled={submitting}
                  className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                  {submitting ? 'AI kreira kampanju...' : 'Pokreni kampanju'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* CAMPAIGN DETAIL MODAL                                            */}
      {/* ================================================================ */}
      {detailCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailCampaign(null)} />

          <div className="relative bg-studio-surface-1 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-studio-border">
              <div>
                <h3 className="text-lg font-bold text-studio-text-primary">{detailCampaign.name}</h3>
                <p className="text-xs text-studio-text-secondary mt-0.5">
                  {detailCampaign.platform_label} · {objectiveLabel(detailCampaign.objective)} · {detailCampaign.days_running} dana aktivno
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-studio-surface-2 text-xs">
                  <span>{healthEmoji(detailCampaign.health_score)}</span>
                  <span className="font-mono text-studio-text-secondary">{detailCampaign.health_score}%</span>
                  <span className="text-studio-text-tertiary">{healthLabel(detailCampaign.health_score)}</span>
                </div>
                <StatusBadge status={detailCampaign.status === 'active' ? 'aktivna' : 'pauzirana'} />
                <button onClick={() => setDetailCampaign(null)} className="p-1.5 hover:bg-studio-surface-2 rounded-lg transition-colors">
                  <X size={18} className="text-studio-text-tertiary" />
                </button>
              </div>
            </div>

            {/* Metrics grid */}
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-studio-surface-0 rounded-xl p-4">
                  <p className="text-xs text-studio-text-secondary mb-1">Budžet</p>
                  <p className="text-lg font-bold text-studio-text-primary font-mono">{formatCurrency(detailCampaign.max_budget)}</p>
                </div>
                <div className="bg-studio-surface-0 rounded-xl p-4">
                  <p className="text-xs text-studio-text-secondary mb-1">Potrošeno</p>
                  <p className="text-lg font-bold text-studio-text-primary font-mono">{formatCurrency(detailCampaign.spend)}</p>
                </div>
                <div className="bg-studio-surface-0 rounded-xl p-4">
                  <p className="text-xs text-studio-text-secondary mb-1">CTR</p>
                  <p className={`text-lg font-bold font-mono ${detailCampaign.ctr > 3 ? 'text-green-400' : detailCampaign.ctr > 2 ? 'text-amber-400' : 'text-studio-text-primary'}`}>
                    {detailCampaign.ctr}%
                  </p>
                </div>
                <div className="bg-studio-surface-0 rounded-xl p-4">
                  <p className="text-xs text-studio-text-secondary mb-1">ROAS</p>
                  <p className="text-lg font-bold font-mono" style={{ color: roasColor(detailCampaign.roas) }}>
                    {detailCampaign.roas}x
                  </p>
                </div>
              </div>

              {/* Budget progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-studio-text-primary">Napredak budžeta</span>
                  <span className="text-sm font-mono text-studio-text-secondary">
                    {detailCampaign.budget_utilization}%
                  </span>
                </div>
                <div className="w-full bg-studio-surface-3 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      detailCampaign.budget_utilization > 90 ? 'bg-red-500'
                        : detailCampaign.budget_utilization > 70 ? 'bg-amber-500'
                        : 'bg-brand-accent'
                    }`}
                    style={{ width: `${Math.min(detailCampaign.budget_utilization, 100)}%` }}
                  />
                </div>
              </div>

              {/* Ad Variants — from estimate data OR API */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Image size={16} className="text-purple-400" />
                    <h4 className="text-sm font-medium text-studio-text-primary">Ad varijante (A/B/C test)</h4>
                  </div>
                  {!isEstimate && (
                    <button
                      onClick={() => handleRefreshCreative(detailCampaign.id)}
                      disabled={refreshingCreative}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-all disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={refreshingCreative ? 'animate-spin' : ''} />
                      {refreshingCreative ? 'Generiranje...' : 'Regeneriraj vizuale'}
                    </button>
                  )}
                </div>

                {(() => {
                  // Use estimate data variants or API performance data
                  const variants = detailCampaign.ad_variants.length > 0
                    ? detailCampaign.ad_variants
                    : campaignPerf?.ads?.map((ad: AdPerformance) => ({
                        variant_label: ad.variant_label,
                        headline: ad.headline,
                        description: ad.description,
                        status: ad.status,
                        impressions: ad.impressions,
                        clicks: ad.clicks,
                        ctr: ad.ctr,
                        spend: ad.spend,
                        conversions: ad.conversions,
                        roas: ad.roas,
                      })) ?? []

                  if (perfLoading) {
                    return (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-studio-text-tertiary" />
                      </div>
                    )
                  }

                  if (variants.length === 0) {
                    return (
                      <div className="bg-studio-surface-0 rounded-xl p-6 text-center">
                        <Image size={24} className="text-studio-text-disabled mx-auto mb-2" />
                        <p className="text-sm text-studio-text-secondary">Nema podataka o varijantama</p>
                      </div>
                    )
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {variants.map((ad) => (
                        <div key={ad.variant_label} className="border border-studio-border rounded-xl overflow-hidden hover:border-brand-accent/30 transition-all">
                          <div className="bg-studio-surface-2 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 bg-brand-accent/20 text-brand-accent rounded-full font-bold">
                                {ad.variant_label}
                              </span>
                              {ad.status === 'winner' && (
                                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                                  <Trophy size={10} /> Pobjednik
                                </span>
                              )}
                            </div>
                            <span className="font-bold font-mono text-xs" style={{ color: roasColor(ad.roas) }}>
                              {ad.roas}x
                            </span>
                          </div>
                          <div className="p-3 space-y-2">
                            <p className="text-sm font-medium text-studio-text-primary line-clamp-2">{ad.headline}</p>
                            {ad.description && (
                              <p className="text-xs text-studio-text-secondary line-clamp-2">{ad.description}</p>
                            )}
                            <div className="grid grid-cols-2 gap-1 pt-2 border-t border-studio-border/50">
                              <div>
                                <p className="text-[10px] text-studio-text-tertiary">CTR</p>
                                <p className="text-xs font-mono font-bold text-studio-text-primary">{ad.ctr}%</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-studio-text-tertiary">Klikovi</p>
                                <p className="text-xs font-mono font-bold text-studio-text-primary">{formatNumber(ad.clicks)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-studio-text-tertiary">Konverzije</p>
                                <p className="text-xs font-mono font-bold text-studio-text-primary">{ad.conversions}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-studio-text-tertiary">Potrošnja</p>
                                <p className="text-xs font-mono font-bold text-studio-text-primary">{formatCurrency(ad.spend)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Daily spend chart */}
              {detailCampaign.daily_metrics.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-studio-text-primary mb-3">Dnevna potrošnja (zadnjih 7 dana)</h4>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={detailCampaign.daily_metrics}>
                      <CartesianGrid {...GRID_STYLE} />
                      <XAxis dataKey="day_label" {...AXIS_STYLE} />
                      <YAxis {...AXIS_STYLE} tickFormatter={(v: number) => `€${v}`} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.2)',
                          borderRadius: '12px', fontSize: '12px', color: '#e2e8f0',
                        }}
                        formatter={(value: number) => [`€${value.toFixed(2)}`, 'Potrošnja']}
                      />
                      <Bar dataKey="spend" fill="rgb(var(--brand-accent))" radius={[4, 4, 0, 0]}
                        animationDuration={CHART_ANIM.barDuration}
                        animationEasing={CHART_ANIM.barEasing}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Conversion metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-studio-surface-0 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-studio-text-tertiary mb-1">Impresije</p>
                  <p className="font-stats text-lg text-studio-text-primary">{formatNumber(detailCampaign.impressions)}</p>
                </div>
                <div className="bg-studio-surface-0 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-studio-text-tertiary mb-1">Klikovi</p>
                  <p className="font-stats text-lg text-studio-text-primary">{formatNumber(detailCampaign.clicks)}</p>
                </div>
                <div className="bg-studio-surface-0 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-studio-text-tertiary mb-1">Konverzije</p>
                  <p className="font-stats text-lg text-studio-text-primary">{detailCampaign.conversions}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-studio-border bg-studio-surface-0 rounded-b-2xl">
              {!isEstimate && (
                <>
                  {detailCampaign.status === 'active' ? (
                    <button
                      onClick={() => { handlePause(detailCampaign.id); setDetailCampaign(null) }}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-all"
                    >
                      <Pause size={14} />
                      Pauziraj
                    </button>
                  ) : (
                    <button
                      onClick={() => { handleResume(detailCampaign.id); setDetailCampaign(null) }}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-xl transition-all"
                    >
                      <Play size={14} />
                      Nastavi
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => setDetailCampaign(null)}
                className="px-4 py-2 text-sm font-medium text-studio-text-secondary hover:text-studio-text-primary bg-studio-surface-1 border border-studio-border rounded-xl transition-all hover:bg-studio-surface-0"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TOAST NOTIFICATIONS                                              */}
      {/* ================================================================ */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-sm text-sm font-medium animate-fade-in ${
                toast.type === 'success'
                  ? 'bg-emerald-600 text-white'
                  : toast.type === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {toast.type === 'success' && <CheckCircle size={16} />}
              {toast.type === 'error' && <AlertCircle size={16} />}
              <span>{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
