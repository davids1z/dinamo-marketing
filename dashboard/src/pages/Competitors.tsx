import React from 'react';
import Header from '../components/layout/Header';
import DataTable from '../components/common/DataTable';
import { ComparisonBar } from '../components/charts/ComparisonBar';
import StatusBadge from '../components/common/StatusBadge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CompetitorRow {
  club: string;
  country: string;
  igFollowers: number;
  igEngagement: number;
  tiktokFollowers: number;
  gapVsDinamo: number;
  tier: string;
}

const competitors: CompetitorRow[] = [
  { club: 'Galatasaray SK', country: 'Turkey', igFollowers: 15600000, igEngagement: 1.2, tiktokFollowers: 4200000, gapVsDinamo: 15033000, tier: 'aspirational' },
  { club: 'Ajax Amsterdam', country: 'Netherlands', igFollowers: 9000000, igEngagement: 1.8, tiktokFollowers: 2100000, gapVsDinamo: 8433000, tier: 'aspirational' },
  { club: 'Besiktas JK', country: 'Turkey', igFollowers: 5600000, igEngagement: 1.4, tiktokFollowers: 1800000, gapVsDinamo: 5033000, tier: 'aspirational' },
  { club: 'Sporting CP', country: 'Portugal', igFollowers: 2800000, igEngagement: 2.1, tiktokFollowers: 950000, gapVsDinamo: 2233000, tier: 'stretch' },
  { club: 'Red Bull Salzburg', country: 'Austria', igFollowers: 542000, igEngagement: 2.4, tiktokFollowers: 320000, gapVsDinamo: -25000, tier: 'direct' },
  { club: 'Slavia Praha', country: 'Czech Republic', igFollowers: 413000, igEngagement: 2.6, tiktokFollowers: 185000, gapVsDinamo: -154000, tier: 'direct' },
  { club: 'Hajduk Split', country: 'Croatia', igFollowers: 302000, igEngagement: 3.1, tiktokFollowers: 145000, gapVsDinamo: -265000, tier: 'direct' },
  { club: 'Ferencvaros TC', country: 'Hungary', igFollowers: 280000, igEngagement: 2.8, tiktokFollowers: 120000, gapVsDinamo: -287000, tier: 'direct' },
];

const dinamoIg = 567000;

const formatFollowers = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  return `${(n / 1000).toFixed(0)}K`;
};

const columns = [
  { key: 'club', header: 'Club', render: (row: CompetitorRow) => (
    <div>
      <span className="text-white font-medium">{row.club}</span>
      <span className="text-xs text-gray-500 ml-2">{row.country}</span>
    </div>
  )},
  { key: 'tier', header: 'Tier', render: (row: CompetitorRow) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      row.tier === 'aspirational' ? 'bg-purple-900/40 text-purple-400' :
      row.tier === 'stretch' ? 'bg-yellow-900/40 text-yellow-400' :
      'bg-blue-900/40 text-blue-400'
    }`}>
      {row.tier}
    </span>
  )},
  { key: 'igFollowers', header: 'IG Followers', render: (row: CompetitorRow) => (
    <span className="text-gray-200 font-mono">{formatFollowers(row.igFollowers)}</span>
  )},
  { key: 'igEngagement', header: 'IG Engagement', render: (row: CompetitorRow) => (
    <div className="flex items-center gap-2">
      <span className={`text-sm ${row.igEngagement > 2.5 ? 'text-green-400' : row.igEngagement > 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
        {row.igEngagement}%
      </span>
    </div>
  )},
  { key: 'tiktokFollowers', header: 'TikTok', render: (row: CompetitorRow) => (
    <span className="text-gray-200 font-mono">{formatFollowers(row.tiktokFollowers)}</span>
  )},
  { key: 'gapVsDinamo', header: 'Gap vs Dinamo', render: (row: CompetitorRow) => {
    const icon = row.gapVsDinamo > 0 ? <TrendingUp size={14} /> : row.gapVsDinamo < 0 ? <TrendingDown size={14} /> : <Minus size={14} />;
    return (
      <div className={`flex items-center gap-1 text-sm font-mono ${
        row.gapVsDinamo > 0 ? 'text-red-400' : 'text-green-400'
      }`}>
        {icon}
        {row.gapVsDinamo > 0 ? '+' : ''}{formatFollowers(Math.abs(row.gapVsDinamo))}
      </div>
    );
  }},
];

const followerComparison = [
  { name: 'Dinamo Zagreb', value: 567000 },
  ...competitors.filter(c => c.tier === 'direct').map(c => ({ name: c.club, value: c.igFollowers })),
];

export default function Competitors() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header title="COMPETITORS" subtitle="Competitive Benchmarking & Gap Analysis" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <p className="text-sm text-gray-400">Direct Competitors</p>
            <p className="text-3xl font-bold text-white mt-1">4</p>
            <p className="text-xs text-green-400 mt-1">Dinamo leads 3 of 4</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <p className="text-sm text-gray-400">Dinamo IG Followers</p>
            <p className="text-3xl font-bold text-white mt-1">567K</p>
            <p className="text-xs text-blue-400 mt-1">Ranked #1 in direct tier</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <p className="text-sm text-gray-400">Avg Engagement (Direct)</p>
            <p className="text-3xl font-bold text-white mt-1">2.7%</p>
            <p className="text-xs text-yellow-400 mt-1">Dinamo: 3.2% (above avg)</p>
          </div>
        </div>

        {/* Direct Competitor Comparison */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <ComparisonBar data={followerComparison} title="Instagram Followers -- Direct Competitors" valueLabel="Followers" />
        </div>

        {/* Full Competitor Table */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">All Tracked Competitors</h2>
          <DataTable columns={columns} data={competitors} emptyMessage="No competitors tracked" />
        </div>
      </main>
    </div>
  );
}
