import { useState } from 'react'
import Header from '../components/layout/Header'
import MetricCard from '../components/common/MetricCard'
import DataTable from '../components/common/DataTable'
import StatusBadge from '../components/common/StatusBadge'
import { PageLoader, ErrorState } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { campaignsApi } from '../api/campaigns'
import { Zap, CreditCard, BarChart3, Target, Plus, Pause, Play, RefreshCw } from 'lucide-react'

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

interface ABVariant {
  name: string
  description: string
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  spend: number
  color: string
}

const fallbackCampaigns: CampaignRow[] = [
  { id: '1', name: 'UCL svijest o utakmici', platform: 'Meta (IG + FB)', market: 'HR, BA, AT, DE', status: 'aktivna', budget: 4500, spend: 3820, ctr: 3.2, roas: 4.1 },
  { id: '2', name: 'Prezentacija akademije', platform: 'TikTok', market: 'HR, SI, RS', status: 'aktivna', budget: 2000, spend: 1650, ctr: 4.8, roas: 2.9 },
  { id: '3', name: 'Akcija sezonskih ulaznica', platform: 'Meta (IG + FB)', market: 'HR', status: 'aktivna', budget: 3000, spend: 2780, ctr: 2.1, roas: 5.2 },
  { id: '4', name: 'Zajednica dijaspore', platform: 'YouTube + Meta', market: 'DE, AT, CH, US', status: 'pauzirana', budget: 2500, spend: 1420, ctr: 1.8, roas: 2.4 },
  { id: '5', name: 'Lansiranje dresa 2026', platform: 'TikTok + IG', market: 'Global', status: 'aktivna', budget: 3500, spend: 2780, ctr: 5.1, roas: 3.8 },
]

const fallbackABTest = {
  campaign: 'Lansiranje dresa 2026',
  variants: [
    { name: 'Varijanta A', description: 'Fokus na igracu', impressions: 85000, clicks: 4590, ctr: 5.4, conversions: 312, spend: 920, color: 'bg-blue-500' },
    { name: 'Varijanta B', description: 'Montaza slavlja navijaca', impressions: 82000, clicks: 3936, ctr: 4.8, conversions: 245, spend: 930, color: 'bg-purple-500' },
    { name: 'Varijanta C', description: 'Detalji dresa izbliza', impressions: 79000, clicks: 4029, ctr: 5.1, conversions: 289, spend: 930, color: 'bg-emerald-500' },
  ],
}

export default function Campaigns() {
  const { data: apiData, loading, error, refetch } = useApi<CampaignRow[]>('/campaigns')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const campaigns = apiData || fallbackCampaigns
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0)
  const avgRoas = campaigns.reduce((sum, c) => sum + c.roas, 0) / campaigns.length
  const activeCampaigns = campaigns.filter(c => c.status === 'aktivna' || c.status === 'active').length

  const handlePause = async (id: string) => {
    setActionLoading(id)
    await campaignsApi.pause(id)
    refetch()
    setActionLoading(null)
  }

  const handleResume = async (id: string) => {
    setActionLoading(id)
    await campaignsApi.resume(id)
    refetch()
    setActionLoading(null)
  }

  const columns = [
    { key: 'name', header: 'Kampanja', render: (row: CampaignRow) => (
      <div className="min-w-0">
        <span className="text-gray-900 font-medium truncate block">{row.name}</span>
        <p className="text-xs text-dinamo-muted mt-0.5 truncate">{row.market}</p>
      </div>
    )},
    { key: 'platform', header: 'Platforma', render: (row: CampaignRow) => <span className="text-gray-600 text-sm">{row.platform}</span> },
    { key: 'status', header: 'Status', render: (row: CampaignRow) => <StatusBadge status={row.status} /> },
    { key: 'budget', header: 'Budzet', render: (row: CampaignRow) => <span className="text-gray-600 font-mono">EUR{row.budget.toLocaleString()}</span>, align: 'right' as const },
    { key: 'spend', header: 'Potrosnja', render: (row: CampaignRow) => (
      <div>
        <span className="text-gray-700 font-mono">EUR{row.spend.toLocaleString()}</span>
        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
          <div className="bg-dinamo-accent h-1 rounded-full transition-all" style={{ width: `${(row.spend / row.budget) * 100}%` }} />
        </div>
      </div>
    ), align: 'right' as const },
    { key: 'ctr', header: 'CTR', render: (row: CampaignRow) => (
      <span className={`font-mono ${row.ctr > 3 ? 'text-green-600' : row.ctr > 2 ? 'text-yellow-600' : 'text-gray-600'}`}>{row.ctr}%</span>
    ), align: 'right' as const },
    { key: 'roas', header: 'ROAS', render: (row: CampaignRow) => (
      <span className={`font-bold font-mono ${row.roas > 3 ? 'text-green-600' : row.roas > 2 ? 'text-yellow-600' : 'text-red-600'}`}>{row.roas}x</span>
    ), align: 'right' as const },
    { key: 'actions', header: '', render: (row: CampaignRow) => (
      <div className="flex items-center gap-1">
        {(row.status === 'aktivna' || row.status === 'active') ? (
          <button onClick={() => handlePause(row.id)} disabled={actionLoading === row.id} className="p-1.5 hover:bg-yellow-50 rounded text-yellow-600" title="Pauziraj">
            <Pause size={14} />
          </button>
        ) : (
          <button onClick={() => handleResume(row.id)} disabled={actionLoading === row.id} className="p-1.5 hover:bg-green-50 rounded text-green-600" title="Nastavi">
            <Play size={14} />
          </button>
        )}
      </div>
    ), align: 'right' as const },
  ]

  if (loading && !apiData) return <><Header title="KAMPANJE" subtitle="Upravljanje kampanjama" /><PageLoader /></>

  return (
    <div className="animate-fade-in">
      <Header title="KAMPANJE" subtitle="Upravljanje kampanjama i performanse" />

      <div className="page-wrapper space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Aktivne kampanje" value={activeCampaigns} format="number" icon={Zap} />
          <MetricCard label="Ukupna potrosnja" value={totalSpend} format="currency" icon={CreditCard} />
          <MetricCard label="Prosj. ROAS" value={Number(avgRoas.toFixed(1))} format="number" icon={BarChart3} />
        </div>

        {error && <ErrorState message={error} onRetry={refetch} />}

        {/* Campaigns Table */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Sve kampanje</h2>
            <button className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} />
              Nova kampanja
            </button>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <DataTable columns={columns} data={campaigns} emptyMessage="Nema pronadjenih kampanja" />
          </div>
        </div>

        {/* A/B Test Results */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Target size={20} className="text-purple-600" />
            <h2 className="section-title">A/B test rezultati: {fallbackABTest.campaign}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {fallbackABTest.variants.map((variant) => {
              const isWinner = variant.name === 'Varijanta A'
              return (
                <div
                  key={variant.name}
                  className={`relative rounded-lg border p-5 space-y-3 transition-all hover:-translate-y-0.5 ${
                    isWinner ? 'border-green-300 bg-green-50 shadow-md' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {isWinner && (
                    <span className="absolute -top-2.5 left-4 text-xs px-2 py-0.5 bg-green-600 text-white rounded-full">Pobjednik</span>
                  )}
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${variant.color}`} />
                    <h3 className="text-gray-900 font-medium">{variant.name}</h3>
                  </div>
                  <p className="text-xs text-dinamo-muted">{variant.description}</p>
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-sm"><span className="text-dinamo-muted">Prikazivanja</span><span className="text-gray-700 font-mono">{variant.impressions.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-dinamo-muted">Klikovi</span><span className="text-gray-700 font-mono">{variant.clicks.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-dinamo-muted">CTR</span><span className={`font-mono font-bold ${variant.ctr > 5 ? 'text-green-600' : 'text-gray-700'}`}>{variant.ctr}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-dinamo-muted">Konverzije</span><span className="text-gray-700 font-mono">{variant.conversions}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-dinamo-muted">Potrosnja</span><span className="text-gray-700 font-mono">EUR{variant.spend}</span></div>
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
