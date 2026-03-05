import React from 'react';
import Header from '../components/layout/Header';
import MetricCard from '../components/common/MetricCard';
import { EngagementChart } from '../components/charts/EngagementChart';
import { SentimentDonut } from '../components/charts/SentimentDonut';
import { Users, Eye, TrendingUp, CreditCard, BarChart3, Heart, MessageCircle, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';

const engagementData = [
  { date: '2026-02-27', engagement: 4200, reach: 125000 },
  { date: '2026-02-28', engagement: 5100, reach: 142000 },
  { date: '2026-03-01', engagement: 6800, reach: 198000 },
  { date: '2026-03-02', engagement: 4900, reach: 137000 },
  { date: '2026-03-03', engagement: 7200, reach: 215000 },
  { date: '2026-03-04', engagement: 5600, reach: 168000 },
  { date: '2026-03-05', engagement: 6100, reach: 182000 },
];

const recentActivity = [
  { id: 1, icon: UserPlus, text: '+2.340 novih pratitelja na Instagramu ovaj tjedan', time: 'prije 2 sata', color: 'text-green-400' },
  { id: 2, icon: MessageCircle, text: '148 novih komentara na highlights reel utakmice', time: 'prije 4 sata', color: 'text-blue-400' },
  { id: 3, icon: TrendingUp, text: 'TikTok kampanja premašila ciljani CTR za 18%', time: 'prije 6 sati', color: 'text-purple-400' },
  { id: 4, icon: AlertTriangle, text: 'Detektiran porast negativnog sentimenta na Facebooku (kontroverza oko sudaca)', time: 'prije 8 sati', color: 'text-yellow-400' },
  { id: 5, icon: CheckCircle, text: 'Mjesečni izvještaj generiran i poslan dionicima', time: 'prije 12 sati', color: 'text-emerald-400' },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-dinamo-dark text-white">
      <Header title="NADZORNA PLOČA" subtitle="Pregled" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard label="Ukupno pratitelja" value={1121000} previousValue={1050000} format="number" icon={Users} />
          <MetricCard label="Mjesečni doseg" value={4200000} previousValue={3800000} format="number" icon={Eye} />
          <MetricCard label="Stopa angažmana" value={2.8} previousValue={2.5} format="percent" icon={TrendingUp} />
          <MetricCard label="Potrošnja na oglase" value={12450} previousValue={11200} format="currency" icon={CreditCard} />
          <MetricCard label="ROAS" value={3.2} previousValue={2.8} format="number" icon={BarChart3} />
          <MetricCard label="Ocjena sentimenta" value={78} previousValue={72} format="percent" icon={Heart} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
            <EngagementChart data={engagementData} title="Angažman i doseg (zadnjih 7 dana)" />
          </div>
          <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
            <SentimentDonut positive={65} neutral={25} negative={10} title="Ukupni sentiment" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Nedavna aktivnost</h2>
          <div className="space-y-4">
            {recentActivity.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-dinamo-dark-light/50 hover:bg-dinamo-dark-light transition-colors">
                  <div className={`mt-0.5 ${item.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200">{item.text}</p>
                    <p className="text-xs text-dinamo-muted mt-1">{item.time}</p>
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
