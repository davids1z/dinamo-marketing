import React from 'react';
import Header from '../components/layout/Header';
import DataTable from '../components/common/DataTable';
import { ComparisonBar } from '../components/charts/ComparisonBar';
import { Search, Download } from 'lucide-react';

interface MarketRow {
  country: string;
  code: string;
  region: string;
  population: string;
  footballInterest: number;
  diaspora: number;
  trendsScore: number;
  totalScore: number;
  rank: number;
}

const marketData: MarketRow[] = [
  { country: 'Bosnia & Herzegovina', code: 'BA', region: 'Balkans', population: '3.2M', footballInterest: 92, diaspora: 95, trendsScore: 88, totalScore: 275, rank: 1 },
  { country: 'Austria', code: 'AT', region: 'DACH', population: '9.1M', footballInterest: 78, diaspora: 92, trendsScore: 85, totalScore: 255, rank: 2 },
  { country: 'Germany', code: 'DE', region: 'DACH', population: '84.4M', footballInterest: 85, diaspora: 90, trendsScore: 78, totalScore: 253, rank: 3 },
  { country: 'Croatia', code: 'HR', region: 'Balkans', population: '3.9M', footballInterest: 96, diaspora: 100, trendsScore: 55, totalScore: 251, rank: 4 },
  { country: 'Switzerland', code: 'CH', region: 'DACH', population: '8.8M', footballInterest: 72, diaspora: 82, trendsScore: 76, totalScore: 230, rank: 5 },
  { country: 'Slovenia', code: 'SI', region: 'Balkans', population: '2.1M', footballInterest: 80, diaspora: 68, trendsScore: 75, totalScore: 223, rank: 6 },
  { country: 'Serbia', code: 'RS', region: 'Balkans', population: '6.6M', footballInterest: 88, diaspora: 55, trendsScore: 72, totalScore: 215, rank: 7 },
  { country: 'Sweden', code: 'SE', region: 'Nordics', population: '10.5M', footballInterest: 70, diaspora: 72, trendsScore: 68, totalScore: 210, rank: 8 },
  { country: 'Turkey', code: 'TR', region: 'Other Europe', population: '85.3M', footballInterest: 90, diaspora: 30, trendsScore: 82, totalScore: 202, rank: 9 },
  { country: 'United States', code: 'US', region: 'Americas', population: '331M', footballInterest: 45, diaspora: 78, trendsScore: 75, totalScore: 198, rank: 10 },
  { country: 'Ireland', code: 'IE', region: 'Other Europe', population: '5.1M', footballInterest: 65, diaspora: 60, trendsScore: 70, totalScore: 195, rank: 11 },
  { country: 'Norway', code: 'NO', region: 'Nordics', population: '5.5M', footballInterest: 68, diaspora: 62, trendsScore: 62, totalScore: 192, rank: 12 },
  { country: 'Canada', code: 'CA', region: 'Americas', population: '38.2M', footballInterest: 42, diaspora: 75, trendsScore: 68, totalScore: 185, rank: 13 },
  { country: 'Australia', code: 'AU', region: 'APAC', population: '26M', footballInterest: 40, diaspora: 72, trendsScore: 65, totalScore: 177, rank: 14 },
  { country: 'Netherlands', code: 'NL', region: 'Other Europe', population: '17.7M', footballInterest: 82, diaspora: 25, trendsScore: 65, totalScore: 172, rank: 15 },
  { country: 'United Kingdom', code: 'UK', region: 'Other Europe', population: '67.3M', footballInterest: 88, diaspora: 28, trendsScore: 55, totalScore: 171, rank: 16 },
  { country: 'Montenegro', code: 'ME', region: 'Balkans', population: '0.6M', footballInterest: 78, diaspora: 42, trendsScore: 48, totalScore: 168, rank: 17 },
  { country: 'North Macedonia', code: 'MK', region: 'Balkans', population: '1.8M', footballInterest: 75, diaspora: 40, trendsScore: 50, totalScore: 165, rank: 18 },
  { country: 'Belgium', code: 'BE', region: 'Other Europe', population: '11.6M', footballInterest: 80, diaspora: 30, trendsScore: 52, totalScore: 162, rank: 19 },
  { country: 'Hungary', code: 'HU', region: 'Other Europe', population: '9.7M', footballInterest: 72, diaspora: 35, trendsScore: 50, totalScore: 157, rank: 20 },
  { country: 'Czech Republic', code: 'CZ', region: 'Other Europe', population: '10.5M', footballInterest: 74, diaspora: 30, trendsScore: 48, totalScore: 152, rank: 21 },
  { country: 'Kosovo', code: 'XK', region: 'Balkans', population: '1.8M', footballInterest: 70, diaspora: 38, trendsScore: 40, totalScore: 148, rank: 22 },
];

const columns = [
  { key: 'rank', header: '#', render: (row: MarketRow) => <span className="text-dinamo-muted font-mono">{row.rank}</span> },
  { key: 'country', header: 'Država', render: (row: MarketRow) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-dinamo-muted font-mono w-6">{row.code}</span>
      <span className="text-gray-900 font-medium">{row.country}</span>
    </div>
  )},
  { key: 'region', header: 'Regija', render: (row: MarketRow) => <span className="text-dinamo-muted">{row.region}</span> },
  { key: 'population', header: 'Populacija', render: (row: MarketRow) => <span className="text-gray-600">{row.population}</span> },
  { key: 'footballInterest', header: 'Interes za nogomet', render: (row: MarketRow) => (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-200 rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${row.footballInterest}%` }} />
      </div>
      <span className="text-gray-600 text-sm">{row.footballInterest}</span>
    </div>
  )},
  { key: 'diaspora', header: 'Dijaspora', render: (row: MarketRow) => (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-200 rounded-full h-2">
        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${row.diaspora}%` }} />
      </div>
      <span className="text-gray-600 text-sm">{row.diaspora}</span>
    </div>
  )},
  { key: 'trendsScore', header: 'Trendovi', render: (row: MarketRow) => (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-200 rounded-full h-2">
        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${row.trendsScore}%` }} />
      </div>
      <span className="text-gray-600 text-sm">{row.trendsScore}</span>
    </div>
  )},
  { key: 'totalScore', header: 'Ukupni rezultat', render: (row: MarketRow) => (
    <span className={`font-bold ${row.rank <= 3 ? 'text-yellow-600' : row.rank <= 10 ? 'text-gray-900' : 'text-dinamo-muted'}`}>
      {row.totalScore}
    </span>
  )},
];

const topMarkets = marketData.slice(0, 5).map(m => ({ name: m.country, value: m.totalScore }));

export default function MarketResearch() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header title="ISTRAŽIVANJE TRŽIŠTA" subtitle="Tržišna inteligencija i bodovanje prilika" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-dinamo-muted text-sm">Bodovanje {marketData.length} ciljnih tržišta po 4 dimenzije</p>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors">
              <Download size={16} />
              Izvezi CSV
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-colors">
              <Search size={16} />
              Pokreni skeniranje
            </button>
          </div>
        </div>

        {/* Top Markets Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ComparisonBar data={topMarkets} title="Top 5 tržišta po ukupnom rezultatu" valueLabel="Score" />
        </div>

        {/* Full Market Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Matrica tržišnih prilika</h2>
          <DataTable columns={columns} data={marketData} emptyMessage="Nema dostupnih tržišnih podataka" />
        </div>
      </main>
    </div>
  );
}
