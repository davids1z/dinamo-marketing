import { useState, useCallback, useEffect } from 'react'
import Header from '../components/layout/Header'
import MetricCard from '../components/common/MetricCard'
import DataTable from '../components/common/DataTable'
import StatusBadge from '../components/common/StatusBadge'
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { campaignsApi, type AdPerformance, type CampaignPerformance } from '../api/campaigns'
import {
  Zap, CreditCard, BarChart3, Target, Plus, Pause, Play,
  X, Check, ChevronRight, ChevronLeft, Calendar, Trophy,
  TrendingUp, Eye, MousePointerClick, AlertCircle, CheckCircle,
  Filter, Loader2, Image, RefreshCw,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignRow {
  id: string
  name: string
  platform: string
  market: string
  status: string
  budget: number
  spend: number
  ctr: number
  roas: number
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

type ABMetricKey = 'ctr' | 'conversions' | 'impressions' | 'clicks'

// ---------------------------------------------------------------------------
// Fallback data
// ---------------------------------------------------------------------------

const fallbackCampaigns: CampaignRow[] = [
  { id: '1', name: 'Brand awareness Q1', platform: 'Meta (IG + FB)', market: 'HR, BA, AT, DE', status: 'aktivna', budget: 4500, spend: 3820, ctr: 3.2, roas: 4.1 },
  { id: '2', name: 'Product launch video', platform: 'TikTok', market: 'HR, SI, RS', status: 'aktivna', budget: 2000, spend: 1650, ctr: 4.8, roas: 2.9 },
  { id: '3', name: 'Sezonska rasprodaja', platform: 'Meta (IG + FB)', market: 'HR', status: 'aktivna', budget: 3000, spend: 2780, ctr: 2.1, roas: 5.2 },
  { id: '4', name: 'Medjunarodni doseg', platform: 'YouTube + Meta', market: 'DE, AT, CH, US', status: 'pauzirana', budget: 2500, spend: 1420, ctr: 1.8, roas: 2.4 },
  { id: '5', name: 'Lansiranje kolekcije 2026', platform: 'TikTok + IG', market: 'Global', status: 'aktivna', budget: 3500, spend: 2780, ctr: 5.1, roas: 3.8 },
]

const fallbackABTest = {
  campaign: 'Lansiranje kolekcije 2026',
  variants: [
    { name: 'Varijanta A', description: 'Fokus na proizvodu', impressions: 85000, clicks: 4590, ctr: 5.4, conversions: 312, spend: 920, color: 'bg-blue-500' },
    { name: 'Varijanta B', description: 'Montaza korisnickih recenzija', impressions: 82000, clicks: 3936, ctr: 4.8, conversions: 245, spend: 930, color: 'bg-purple-500' },
    { name: 'Varijanta C', description: 'Detalji proizvoda izbliza', impressions: 79000, clicks: 4029, ctr: 5.1, conversions: 289, spend: 930, color: 'bg-emerald-500' },
  ],
}

// Mock daily spend data for campaign detail modal
const mockDailySpend = [
  { day: 'Pon', spend: 145 },
  { day: 'Uto', spend: 210 },
  { day: 'Sri', spend: 180 },
  { day: 'Cet', spend: 260 },
  { day: 'Pet', spend: 320 },
  { day: 'Sub', spend: 190 },
  { day: 'Ned', spend: 130 },
]

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
    case 'awareness': return 'Svijest'
    case 'engagement': return 'Angažman'
    case 'conversions': return 'Konverzije'
    default: return o
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Campaigns() {
  const { data: apiData, loading, refetch } = useApi<CampaignRow[]>('/campaigns')

  // Local campaigns state (for adding new ones)
  const [localCampaigns, setLocalCampaigns] = useState<CampaignRow[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('sve')

  // Wizard modal
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [wizardForm, setWizardForm] = useState<NewCampaignForm>(emptyForm)

  // Detail modal
  const [detailCampaign, setDetailCampaign] = useState<CampaignRow | null>(null)
  const [campaignPerf, setCampaignPerf] = useState<CampaignPerformance | null>(null)
  const [perfLoading, setPerfLoading] = useState(false)
  const [refreshingCreative, setRefreshingCreative] = useState(false)

  // Load campaign performance when detail modal opens
  useEffect(() => {
    if (!detailCampaign) {
      setCampaignPerf(null)
      return
    }
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
  }, [detailCampaign?.id])

  const handleRefreshCreative = async (campaignId: string) => {
    setRefreshingCreative(true)
    try {
      await campaignsApi.refreshCreative(campaignId)
      addToast('Vizuali su uspješno regenerirani', 'success')
      // Reload performance data
      const data = await campaignsApi.getPerformance(campaignId)
      setCampaignPerf(data as unknown as CampaignPerformance)
    } catch {
      addToast('Greška pri regeneriranju vizuala', 'error')
    } finally {
      setRefreshingCreative(false)
    }
  }

  // A/B test metric selector
  const [abMetric, setAbMetric] = useState<ABMetricKey>('ctr')

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
  // Campaign data
  // -------------------------------------------------------------------------

  // Map API campaigns (which have different field names) to CampaignRow
  const mappedApi: CampaignRow[] = (apiData && apiData.length > 0)
    ? (apiData as unknown as Record<string, unknown>[]).map(c => ({
        id: String(c.id || ''),
        name: String(c.name || ''),
        platform: String(c.platform || 'meta'),
        market: '',
        status: String(c.status || 'draft') === 'active' ? 'aktivna' : String(c.status || 'draft') === 'paused' ? 'pauzirana' : String(c.status || 'draft'),
        budget: Number(c.max_budget || c.daily_budget || 0),
        spend: Number(c.total_spend || 0),
        ctr: 0,
        roas: 0,
      }))
    : fallbackCampaigns
  const allCampaigns = [...mappedApi, ...localCampaigns]
  const filteredCampaigns = statusFilter === 'sve'
    ? allCampaigns
    : allCampaigns.filter(c => {
        if (statusFilter === 'aktivna') return c.status === 'aktivna' || c.status === 'active'
        return c.status === 'pauzirana' || c.status === 'paused'
      })

  const totalSpend = allCampaigns.reduce((sum, c) => sum + c.spend, 0)
  const avgRoas = allCampaigns.length > 0
    ? allCampaigns.reduce((sum, c) => sum + c.roas, 0) / allCampaigns.length
    : 0
  const activeCampaignsCount = allCampaigns.filter(c => c.status === 'aktivna' || c.status === 'active').length

  // -------------------------------------------------------------------------
  // Pause / Resume with error handling
  // -------------------------------------------------------------------------

  const handlePause = async (id: string) => {
    setActionLoading(id)
    try {
      await campaignsApi.pause(id)
      // Update local campaigns if the paused campaign is local
      setLocalCampaigns(prev =>
        prev.map(c => c.id === id ? { ...c, status: 'pauzirana' } : c)
      )
      refetch()
      addToast('Kampanja je pauzirana', 'success')
    } catch {
      addToast('Greška pri pauziranju kampanje. Pokušajte ponovo.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResume = async (id: string) => {
    setActionLoading(id)
    try {
      await campaignsApi.resume(id)
      setLocalCampaigns(prev =>
        prev.map(c => c.id === id ? { ...c, status: 'aktivna' } : c)
      )
      refetch()
      addToast('Kampanja je nastavljena', 'success')
    } catch {
      addToast('Greška pri nastavljanju kampanje. Pokušajte ponovo.', 'error')
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

  const closeWizard = () => {
    setShowWizard(false)
  }

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
      // Determine platform string for backend
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
      // Fallback to local if API fails
      const newCampaign: CampaignRow = {
        id: `local_${Date.now()}`,
        name: wizardForm.name,
        platform: platformLabel(wizardForm.platforms),
        market: wizardForm.market,
        status: 'aktivna',
        budget: wizardForm.budget,
        spend: 0,
        ctr: 0,
        roas: 0,
      }
      setLocalCampaigns(prev => [...prev, newCampaign])
      closeWizard()
      addToast(`Kampanja kreirana lokalno (API nedostupan)`, 'info')
    } finally {
      setSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // A/B test helpers
  // -------------------------------------------------------------------------

  const abMetricLabel: Record<ABMetricKey, string> = {
    ctr: 'CTR',
    conversions: 'Konverzije',
    impressions: 'Prikazivanja',
    clicks: 'Klikovi',
  }

  const getABWinner = (metric: ABMetricKey) => {
    const best = fallbackABTest.variants.reduce((a, b) => a[metric] > b[metric] ? a : b)
    return best.name
  }

  const winnerName = getABWinner(abMetric)

  // Max value for the selected metric (for bar chart)
  const abMaxValue = Math.max(...fallbackABTest.variants.map(v => v[abMetric]))

  // -------------------------------------------------------------------------
  // Table columns
  // -------------------------------------------------------------------------

  const columns = [
    { key: 'name', header: 'Kampanja', render: (row: CampaignRow) => (
      <div className="min-w-0">
        <span className="text-studio-text-primary font-medium truncate block">{row.name}</span>
        <p className="text-xs text-studio-text-secondary mt-0.5 truncate">{row.market}</p>
      </div>
    )},
    { key: 'platform', header: 'Platforma', render: (row: CampaignRow) => <span className="text-studio-text-secondary text-sm">{row.platform}</span> },
    { key: 'status', header: 'Status', render: (row: CampaignRow) => <StatusBadge status={row.status} /> },
    { key: 'budget', header: 'Budžet', render: (row: CampaignRow) => <span className="text-studio-text-secondary font-mono">EUR{row.budget.toLocaleString()}</span>, align: 'right' as const },
    { key: 'spend', header: 'Potrošnja', render: (row: CampaignRow) => (
      <div>
        <span className="text-studio-text-primary font-mono">EUR{row.spend.toLocaleString()}</span>
        <div className="w-full bg-studio-surface-3 rounded-full h-1 mt-1">
          <div className="bg-brand-accent h-1 rounded-full transition-all" style={{ width: `${Math.min((row.spend / row.budget) * 100, 100)}%` }} />
        </div>
      </div>
    ), align: 'right' as const },
    { key: 'ctr', header: 'CTR', render: (row: CampaignRow) => (
      <span className={`font-mono ${row.ctr > 3 ? 'text-green-600' : row.ctr > 2 ? 'text-yellow-600' : 'text-studio-text-secondary'}`}>{row.ctr}%</span>
    ), align: 'right' as const },
    { key: 'roas', header: 'ROAS', render: (row: CampaignRow) => (
      <span className={`font-bold font-mono ${row.roas > 3 ? 'text-green-600' : row.roas > 2 ? 'text-yellow-600' : 'text-red-400'}`}>{row.roas}x</span>
    ), align: 'right' as const },
    { key: 'actions', header: '', render: (row: CampaignRow) => (
      <div className="flex items-center gap-1">
        {(row.status === 'aktivna' || row.status === 'active') ? (
          <button
            onClick={(e) => { e.stopPropagation(); handlePause(row.id) }}
            disabled={actionLoading === row.id}
            className="p-1.5 hover:bg-amber-500/10 rounded text-yellow-600 disabled:opacity-50"
            title="Pauziraj"
          >
            <Pause size={14} />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); handleResume(row.id) }}
            disabled={actionLoading === row.id}
            className="p-1.5 hover:bg-green-500/10 rounded text-green-600 disabled:opacity-50"
            title="Nastavi"
          >
            <Play size={14} />
          </button>
        )}
      </div>
    ), align: 'right' as const },
  ]

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading && !apiData) return (
    <>
      <Header title="KAMPANJE" subtitle="Upravljanje kampanjama" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={4} />
        <TableSkeleton rows={6} />
      </div>
    </>
  )

  return (
    <div>
      <Header title="KAMPANJE" subtitle="Upravljanje kampanjama i performanse" />

      <div className="page-wrapper space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Aktivne kampanje" value={activeCampaignsCount} format="number" icon={Zap} />
          <MetricCard label="Ukupna potrošnja" value={totalSpend} format="currency" icon={CreditCard} />
          <MetricCard label="Prosj. ROAS" value={Number(avgRoas.toFixed(1))} format="number" icon={BarChart3} />
        </div>

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
                ? allCampaigns.length
                : f === 'aktivna'
                  ? allCampaigns.filter(c => c.status === 'aktivna' || c.status === 'active').length
                  : allCampaigns.filter(c => c.status === 'pauzirana' || c.status === 'paused').length
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

          <div className="overflow-x-auto -mx-5 px-5">
            <DataTable
              columns={columns}
              data={filteredCampaigns}
              onRowClick={(row) => setDetailCampaign(row)}
              emptyMessage="Nema pronađenih kampanja"
            />
          </div>
        </div>

        {/* A/B Test Results */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Target size={20} className="text-purple-600" />
              <h2 className="section-title">A/B test rezultati: {fallbackABTest.campaign}</h2>
            </div>
            {/* Metric selector */}
            <div className="flex items-center gap-1 bg-studio-surface-2 rounded-lg p-1">
              {(Object.keys(abMetricLabel) as ABMetricKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setAbMetric(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    abMetric === key
                      ? 'bg-studio-surface-1 text-purple-700 shadow-sm'
                      : 'text-studio-text-secondary hover:text-studio-text-primary'
                  }`}
                >
                  {abMetricLabel[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {fallbackABTest.variants.map((variant) => {
              const isWinner = variant.name === winnerName
              const barWidth = abMaxValue > 0 ? (variant[abMetric] / abMaxValue) * 100 : 0
              return (
                <div
                  key={variant.name}
                  className={`relative rounded-lg border p-5 space-y-3 transition-all hover:-translate-y-0.5 ${
                    isWinner
                      ? 'border-green-300 bg-green-500/10 shadow-md ring-1 ring-green-200'
                      : 'border-studio-border bg-studio-surface-0'
                  }`}
                >
                  {isWinner && (
                    <span className="absolute -top-2.5 left-4 text-xs px-2 py-0.5 bg-green-600 text-white rounded-full flex items-center gap-1">
                      <Trophy size={10} />
                      Pobjednik
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${variant.color}`} />
                    <h3 className="text-studio-text-primary font-medium">{variant.name}</h3>
                  </div>
                  <p className="text-xs text-studio-text-secondary">{variant.description}</p>

                  {/* Highlighted metric with bar */}
                  <div className="bg-studio-surface-1 rounded-md p-3 border border-studio-border-subtle">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-studio-text-secondary">{abMetricLabel[abMetric]}</span>
                      <span className={`text-sm font-bold font-mono ${isWinner ? 'text-green-600' : 'text-studio-text-primary'}`}>
                        {abMetric === 'ctr' ? `${variant[abMetric]}%` : variant[abMetric].toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-studio-surface-2 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${isWinner ? 'bg-green-500' : 'bg-studio-surface-3'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-studio-border">
                    <div className="flex justify-between text-sm"><span className="text-studio-text-secondary">Prikazivanja</span><span className="text-studio-text-primary font-mono">{variant.impressions.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-studio-text-secondary">Klikovi</span><span className="text-studio-text-primary font-mono">{variant.clicks.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-studio-text-secondary">CTR</span><span className={`font-mono font-bold ${variant.ctr > 5 ? 'text-green-600' : 'text-studio-text-primary'}`}>{variant.ctr}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-studio-text-secondary">Konverzije</span><span className="text-studio-text-primary font-mono">{variant.conversions}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-studio-text-secondary">Potrošnja</span><span className="text-studio-text-primary font-mono">EUR{variant.spend}</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* NEW CAMPAIGN WIZARD MODAL                                        */}
      {/* ================================================================ */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeWizard} />

          {/* Modal */}
          <div className="relative bg-studio-surface-1 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-studio-border">
              <div>
                <h3 className="text-lg font-bold text-studio-text-primary">Nova kampanja</h3>
                <p className="text-xs text-studio-text-secondary mt-0.5">Korak {wizardStep} od 3</p>
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
                      className="w-full px-3 py-2.5 border border-studio-border rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
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
                              : 'border-studio-border bg-studio-surface-0 text-studio-text-secondary hover:border-studio-border'
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
                      className="w-full px-3 py-2.5 border border-studio-border rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                    />
                  </div>
                </>
              )}

              {/* Step 2: Budget & dates */}
              {wizardStep === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-studio-text-primary mb-1.5">Budžet (EUR)</label>
                    <input
                      type="number"
                      min={0}
                      value={wizardForm.budget || ''}
                      onChange={e => setWizardForm(f => ({ ...f, budget: Number(e.target.value) }))}
                      placeholder="npr. 3000"
                      className="w-full px-3 py-2.5 border border-studio-border rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all font-mono"
                    />
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
                        className="w-full px-3 py-2.5 border border-studio-border rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
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
                        className="w-full px-3 py-2.5 border border-studio-border rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-studio-text-primary mb-2">Cilj kampanje</label>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { value: 'awareness' as const, label: 'Svijest', icon: Eye },
                        { value: 'engagement' as const, label: 'Angažman', icon: MousePointerClick },
                        { value: 'conversions' as const, label: 'Konverzije', icon: TrendingUp },
                      ]).map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setWizardForm(f => ({ ...f, objective: value }))}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-all ${
                            wizardForm.objective === value
                              ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
                              : 'border-studio-border bg-studio-surface-0 text-studio-text-secondary hover:border-studio-border'
                          }`}
                        >
                          <Icon size={20} />
                          {label}
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
                      <span className="text-studio-text-primary font-medium font-mono">EUR{wizardForm.budget.toLocaleString()}</span>
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
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {submitting ? 'Kreiranje...' : 'Kreiraj kampanju'}
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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailCampaign(null)} />

          {/* Modal */}
          <div className="relative bg-studio-surface-1 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-studio-border">
              <div>
                <h3 className="text-lg font-bold text-studio-text-primary">{detailCampaign.name}</h3>
                <p className="text-xs text-studio-text-secondary mt-0.5">{detailCampaign.platform} &middot; {detailCampaign.market}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={detailCampaign.status} />
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
                  <p className="text-lg font-bold text-studio-text-primary font-mono">EUR{detailCampaign.budget.toLocaleString()}</p>
                </div>
                <div className="bg-studio-surface-0 rounded-xl p-4">
                  <p className="text-xs text-studio-text-secondary mb-1">Potrošeno</p>
                  <p className="text-lg font-bold text-studio-text-primary font-mono">EUR{detailCampaign.spend.toLocaleString()}</p>
                </div>
                <div className="bg-studio-surface-0 rounded-xl p-4">
                  <p className="text-xs text-studio-text-secondary mb-1">CTR</p>
                  <p className={`text-lg font-bold font-mono ${detailCampaign.ctr > 3 ? 'text-green-600' : detailCampaign.ctr > 2 ? 'text-yellow-600' : 'text-studio-text-primary'}`}>{detailCampaign.ctr}%</p>
                </div>
                <div className="bg-studio-surface-0 rounded-xl p-4">
                  <p className="text-xs text-studio-text-secondary mb-1">ROAS</p>
                  <p className={`text-lg font-bold font-mono ${detailCampaign.roas > 3 ? 'text-green-600' : detailCampaign.roas > 2 ? 'text-yellow-600' : 'text-red-400'}`}>{detailCampaign.roas}x</p>
                </div>
              </div>

              {/* Budget progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-studio-text-primary">Napredak budžeta</span>
                  <span className="text-sm font-mono text-studio-text-secondary">
                    {detailCampaign.budget > 0 ? Math.round((detailCampaign.spend / detailCampaign.budget) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-studio-surface-3 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      detailCampaign.budget > 0 && (detailCampaign.spend / detailCampaign.budget) > 0.9
                        ? 'bg-red-500'
                        : detailCampaign.budget > 0 && (detailCampaign.spend / detailCampaign.budget) > 0.7
                          ? 'bg-yellow-500'
                          : 'bg-brand-accent'
                    }`}
                    style={{ width: `${detailCampaign.budget > 0 ? Math.min((detailCampaign.spend / detailCampaign.budget) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Ad Creatives / Variants Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Image size={16} className="text-purple-600" />
                    <h4 className="text-sm font-medium text-studio-text-primary">Ad varijante i vizuali</h4>
                  </div>
                  <button
                    onClick={() => handleRefreshCreative(detailCampaign.id)}
                    disabled={refreshingCreative}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-200 rounded-lg transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={refreshingCreative ? 'animate-spin' : ''} />
                    {refreshingCreative ? 'Generiranje...' : 'Regeneriraj vizuale'}
                  </button>
                </div>

                {perfLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-studio-text-tertiary" />
                  </div>
                ) : campaignPerf?.ads && campaignPerf.ads.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {campaignPerf.ads.map((ad: AdPerformance) => (
                      <div key={ad.ad_id} className="border border-studio-border rounded-xl overflow-hidden hover:shadow-md transition-all">
                        {/* Visual preview */}
                        <div className="aspect-square bg-studio-surface-2 relative">
                          {ad.image_url ? (
                            <img
                              src={ad.image_url}
                              alt={`Varijanta ${ad.variant_label}`}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-studio-text-tertiary">
                              <Image size={32} />
                            </div>
                          )}
                          <span className="absolute top-2 left-2 text-xs px-2 py-0.5 bg-black/60 text-white rounded-full font-bold">
                            {ad.variant_label}
                          </span>
                          {ad.status === 'winner' && (
                            <span className="absolute top-2 right-2 text-xs px-2 py-0.5 bg-green-600 text-white rounded-full flex items-center gap-1">
                              <Trophy size={10} /> Pobjednik
                            </span>
                          )}
                        </div>
                        {/* Ad info */}
                        <div className="p-3 space-y-2">
                          <p className="text-sm font-medium text-studio-text-primary line-clamp-1">{ad.headline}</p>
                          {ad.description && (
                            <p className="text-xs text-studio-text-secondary line-clamp-2">{ad.description}</p>
                          )}
                          <div className="grid grid-cols-2 gap-1 pt-1 border-t border-studio-border-subtle">
                            <div>
                              <p className="text-[10px] text-studio-text-tertiary">CTR</p>
                              <p className="text-xs font-mono font-bold text-studio-text-primary">{ad.ctr}%</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-studio-text-tertiary">Klikovi</p>
                              <p className="text-xs font-mono font-bold text-studio-text-primary">{ad.clicks.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-studio-text-tertiary">Konverzije</p>
                              <p className="text-xs font-mono font-bold text-studio-text-primary">{ad.conversions}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-studio-text-tertiary">Potrošnja</p>
                              <p className="text-xs font-mono font-bold text-studio-text-primary">EUR{ad.spend}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-studio-surface-0 rounded-xl p-6 text-center">
                    <Image size={24} className="text-studio-text-disabled mx-auto mb-2" />
                    <p className="text-sm text-studio-text-secondary">Nema podataka o varijantama</p>
                    <p className="text-xs text-studio-text-tertiary mt-1">Vizuali će se automatski generirati pri kreiranju kampanje</p>
                  </div>
                )}
              </div>

              {/* Daily spend chart */}
              <div>
                <h4 className="text-sm font-medium text-studio-text-primary mb-3">Dnevna potrošnja (zadnjih 7 dana)</h4>
                <div className="flex items-end gap-2 h-32">
                  {(campaignPerf?.ads?.[0]?.daily_metrics?.length
                    ? campaignPerf.ads[0].daily_metrics.map(m => ({ day: m.date.slice(5), spend: m.spend }))
                    : mockDailySpend
                  ).map((d) => {
                    const items = campaignPerf?.ads?.[0]?.daily_metrics?.length
                      ? campaignPerf.ads[0].daily_metrics.map(m => m.spend)
                      : mockDailySpend.map(m => m.spend)
                    const maxSpend = Math.max(...items, 1)
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-mono text-studio-text-secondary">EUR{d.spend}</span>
                        <div
                          className="w-full bg-brand-accent/80 rounded-t-md transition-all hover:bg-brand-accent"
                          style={{ height: `${(d.spend / maxSpend) * 80}px` }}
                        />
                        <span className="text-[10px] text-studio-text-tertiary">{d.day}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-studio-border bg-studio-surface-0 rounded-b-2xl">
              {(detailCampaign.status === 'aktivna' || detailCampaign.status === 'active') ? (
                <button
                  onClick={() => { handlePause(detailCampaign.id); setDetailCampaign(null) }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-yellow-400 bg-amber-500/10 hover:bg-amber-500/20 border border-yellow-200 rounded-xl transition-all"
                >
                  <Pause size={14} />
                  Pauziraj
                </button>
              ) : (
                <button
                  onClick={() => { handleResume(detailCampaign.id); setDetailCampaign(null) }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-200 rounded-xl transition-all"
                >
                  <Play size={14} />
                  Nastavi
                </button>
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
