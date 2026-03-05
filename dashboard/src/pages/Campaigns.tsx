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
  { id: 1, name: 'UCL Matchday Awareness', platform: 'Meta (IG + FB)', market: 'HR, BA, AT, DE', status: 'active', budget: 4500, spend: 3820, ctr: 3.2, roas: 4.1 },
  { id: 2, name: 'Academy Showcase', platform: 'TikTok', market: 'HR, SI, RS', status: 'active', budget: 2000, spend: 1650, ctr: 4.8, roas: 2.9 },
  { id: 3, name: 'Season Ticket Drive', platform: 'Meta (IG + FB)', market: 'HR', status: 'active', budget: 3000, spend: 2780, ctr: 2.1, roas: 5.2 },
  { id: 4, name: 'Diaspora Community', platform: 'YouTube + Meta', market: 'DE, AT, CH, US', status: 'paused', budget: 2500, spend: 1420, ctr: 1.8, roas: 2.4 },
  { id: 5, name: 'Kit Launch 2026', platform: 'TikTok + IG', market: 'Global', status: 'active', budget: 3500, spend: 2780, ctr: 5.1, roas: 3.8 },
];

const columns = [
  { key: 'name', header: 'Campaign', render: (row: CampaignRow) => (
    <div>
      <span className="text-white font-medium">{row.name}</span>
      <p className="text-xs text-gray-500 mt-0.5">{row.market}</p>
    </div>
  )},
  { key: 'platform', header: 'Platform', render: (row: CampaignRow) => <span className="text-gray-300 text-sm">{row.platform}</span> },
  { key: 'status', header: 'Status', render: (row: CampaignRow) => <StatusBadge status={row.status} /> },
  { key: 'budget', header: 'Budget', render: (row: CampaignRow) => <span className="text-gray-300 font-mono">€{row.budget.toLocaleString()}</span> },
  { key: 'spend', header: 'Spend', render: (row: CampaignRow) => (
    <div>
      <span className="text-gray-200 font-mono">€{row.spend.toLocaleString()}</span>
      <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
        <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${(row.spend / row.budget) * 100}%` }} />
      </div>
    </div>
  )},
  { key: 'ctr', header: 'CTR', render: (row: CampaignRow) => (
    <span className={`font-mono ${row.ctr > 3 ? 'text-green-400' : row.ctr > 2 ? 'text-yellow-400' : 'text-gray-300'}`}>
      {row.ctr}%
    </span>
  )},
  { key: 'roas', header: 'ROAS', render: (row: CampaignRow) => (
    <span className={`font-bold font-mono ${row.roas > 3 ? 'text-green-400' : row.roas > 2 ? 'text-yellow-400' : 'text-red-400'}`}>
      {row.roas}x
    </span>
  )},
];

const abTestResults = {
  campaign: 'Kit Launch 2026',
  variants: [
    { name: 'Variant A', description: 'Player-focused hero shot', impressions: 85000, clicks: 4590, ctr: 5.4, conversions: 312, spend: 920, color: 'bg-blue-500' },
    { name: 'Variant B', description: 'Fan celebration montage', impressions: 82000, clicks: 3936, ctr: 4.8, conversions: 245, spend: 930, color: 'bg-purple-500' },
    { name: 'Variant C', description: 'Kit detail close-ups', impressions: 79000, clicks: 4029, ctr: 5.1, conversions: 289, spend: 930, color: 'bg-emerald-500' },
  ],
};

export default function Campaigns() {
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const avgRoas = campaigns.reduce((sum, c) => sum + c.roas, 0) / campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header title="CAMPAIGNS" subtitle="Campaign Management & Performance" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Active Campaigns" value={activeCampaigns} format="number" icon={Zap} />
          <MetricCard label="Total Spend" value={totalSpend} format="currency" icon={CreditCard} />
          <MetricCard label="Avg ROAS" value={Number(avgRoas.toFixed(1))} format="number" icon={BarChart3} />
        </div>

        {/* Campaigns Table */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">All Campaigns</h2>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
              + New Campaign
            </button>
          </div>
          <DataTable columns={columns} data={campaigns} emptyMessage="No campaigns found" />
        </div>

        {/* A/B Test Results */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Target size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">A/B Test Results: {abTestResults.campaign}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {abTestResults.variants.map((variant) => {
              const isWinner = variant.name === 'Variant A';
              return (
                <div
                  key={variant.name}
                  className={`relative rounded-lg border p-5 space-y-3 ${
                    isWinner ? 'border-green-500/50 bg-green-950/20' : 'border-gray-700 bg-gray-800/30'
                  }`}
                >
                  {isWinner && (
                    <span className="absolute -top-2.5 left-4 text-xs px-2 py-0.5 bg-green-600 text-white rounded-full">
                      Winner
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${variant.color}`} />
                    <h3 className="text-white font-medium">{variant.name}</h3>
                  </div>
                  <p className="text-xs text-gray-400">{variant.description}</p>

                  <div className="space-y-2 pt-2 border-t border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Impressions</span>
                      <span className="text-gray-200 font-mono">{variant.impressions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Clicks</span>
                      <span className="text-gray-200 font-mono">{variant.clicks.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">CTR</span>
                      <span className={`font-mono font-bold ${variant.ctr > 5 ? 'text-green-400' : 'text-gray-200'}`}>{variant.ctr}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Conversions</span>
                      <span className="text-gray-200 font-mono">{variant.conversions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Spend</span>
                      <span className="text-gray-200 font-mono">€{variant.spend}</span>
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
