import React from 'react';
import Header from '../components/layout/Header';
import MetricCard from '../components/common/MetricCard';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import { Zap, CreditCard, BarChart3, TrendingUp, Target } from 'lucide-react';

interface CampaignRow {
  id: number;
  name: string;
  platform: string;
  market: string;
  status: string;
  budget: number;
  spend: number;
  ctr: number;
  roas: number;
}

const campaigns: CampaignRow[] = [
  { id: 1, name: 'UCL svijest o utakmici', platform: 'Meta (IG + FB)', market: 'HR, BA, AT, DE', status: 'aktivna', budget: 4500, spend: 3820, ctr: 3.2, roas: 4.1 },
  { id: 2, name: 'Prezentacija akademije', platform: 'TikTok', market: 'HR, SI, RS', status: 'aktivna', budget: 2000, spend: 1650, ctr: 4.8, roas: 2.9 },
  { id: 3, name: 'Akcija sezonskih ulaznica', platform: 'Meta (IG + FB)', market: 'HR', status: 'aktivna', budget: 3000, spend: 2780, ctr: 2.1, roas: 5.2 },
  { id: 4, name: 'Zajednica dijaspore', platform: 'YouTube + Meta', market: 'DE, AT, CH, US', status: 'pauzirana', budget: 2500, spend: 1420, ctr: 1.8, roas: 2.4 },
  { id: 5, name: 'Lansiranje dresa 2026', platform: 'TikTok + IG', market: 'Global', status: 'aktivna', budget: 3500, spend: 2780, ctr: 5.1, roas: 3.8 },
];

const columns = [
  { key: 'name', header: 'Kampanja', render: (row: CampaignRow) => (
    <div>
      <span className="text-gray-900 font-medium">{row.name}</span>
      <p className="text-xs text-dinamo-muted mt-0.5">{row.market}</p>
    </div>
  )},
  { key: 'platform', header: 'Platforma', render: (row: CampaignRow) => <span className="text-gray-600 text-sm">{row.platform}</span> },
  { key: 'status', header: 'Status', render: (row: CampaignRow) => <StatusBadge status={row.status} /> },
  { key: 'budget', header: 'Budžet', render: (row: CampaignRow) => <span className="text-gray-600 font-mono">€{row.budget.toLocaleString()}</span> },
  { key: 'spend', header: 'Potrošnja', render: (row: CampaignRow) => (
    <div>
      <span className="text-gray-700 font-mono">€{row.spend.toLocaleString()}</span>
      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
        <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${(row.spend / row.budget) * 100}%` }} />
      </div>
    </div>
  )},
  { key: 'ctr', header: 'CTR', render: (row: CampaignRow) => (
    <span className={`font-mono ${row.ctr > 3 ? 'text-green-600' : row.ctr > 2 ? 'text-yellow-600' : 'text-gray-600'}`}>
      {row.ctr}%
    </span>
  )},
  { key: 'roas', header: 'ROAS', render: (row: CampaignRow) => (
    <span className={`font-bold font-mono ${row.roas > 3 ? 'text-green-600' : row.roas > 2 ? 'text-yellow-600' : 'text-red-600'}`}>
      {row.roas}x
    </span>
  )},
];

const abTestResults = {
  campaign: 'Lansiranje dresa 2026',
  variants: [
    { name: 'Varijanta A', description: 'Fokus na igraču', impressions: 85000, clicks: 4590, ctr: 5.4, conversions: 312, spend: 920, color: 'bg-blue-500' },
    { name: 'Varijanta B', description: 'Montaža slavlja navijača', impressions: 82000, clicks: 3936, ctr: 4.8, conversions: 245, spend: 930, color: 'bg-purple-500' },
    { name: 'Varijanta C', description: 'Detalji dresa izbliza', impressions: 79000, clicks: 4029, ctr: 5.1, conversions: 289, spend: 930, color: 'bg-emerald-500' },
  ],
};

export default function Campaigns() {
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const avgRoas = campaigns.reduce((sum, c) => sum + c.roas, 0) / campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'aktivna').length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header title="KAMPANJE" subtitle="Upravljanje kampanjama i performanse" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Aktivne kampanje" value={activeCampaigns} format="number" icon={Zap} />
          <MetricCard label="Ukupna potrošnja" value={totalSpend} format="currency" icon={CreditCard} />
          <MetricCard label="Prosj. ROAS" value={Number(avgRoas.toFixed(1))} format="number" icon={BarChart3} />
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Sve kampanje</h2>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
              + Nova kampanja
            </button>
          </div>
          <DataTable columns={columns} data={campaigns} emptyMessage="Nema pronađenih kampanja" />
        </div>

        {/* A/B Test Results */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Target size={20} className="text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">A/B test rezultati: {abTestResults.campaign}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {abTestResults.variants.map((variant) => {
              const isWinner = variant.name === 'Varijanta A';
              return (
                <div
                  key={variant.name}
                  className={`relative rounded-lg border p-5 space-y-3 ${
                    isWinner ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {isWinner && (
                    <span className="absolute -top-2.5 left-4 text-xs px-2 py-0.5 bg-green-600 text-white rounded-full">
                      Pobjednik
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${variant.color}`} />
                    <h3 className="text-gray-900 font-medium">{variant.name}</h3>
                  </div>
                  <p className="text-xs text-dinamo-muted">{variant.description}</p>

                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-dinamo-muted">Prikazivanja</span>
                      <span className="text-gray-700 font-mono">{variant.impressions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-dinamo-muted">Klikovi</span>
                      <span className="text-gray-700 font-mono">{variant.clicks.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-dinamo-muted">CTR</span>
                      <span className={`font-mono font-bold ${variant.ctr > 5 ? 'text-green-600' : 'text-gray-700'}`}>{variant.ctr}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-dinamo-muted">Konverzije</span>
                      <span className="text-gray-700 font-mono">{variant.conversions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-dinamo-muted">Potrošnja</span>
                      <span className="text-gray-700 font-mono">€{variant.spend}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
