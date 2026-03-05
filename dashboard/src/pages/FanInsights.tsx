import React from 'react';
import Header from '../components/layout/Header';
import { FunnelChart } from '../components/charts/FunnelChart';
import { Users, UserPlus, Heart, Star, Award, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const fanSegments = [
  { stage: 'Novi', count: 45000, icon: UserPlus, color: 'from-sky-600 to-sky-400', growth: 12.4, description: 'Pridruženi u zadnjih 30 dana' },
  { stage: 'Povremeni', count: 120000, icon: Users, color: 'from-blue-600 to-blue-400', growth: 5.2, description: 'Prate, ali nizak angažman' },
  { stage: 'Aktivni', count: 280000, icon: Heart, color: 'from-indigo-600 to-indigo-400', growth: 8.1, description: 'Redovita interakcija' },
  { stage: 'Superfan', count: 85000, icon: Star, color: 'from-purple-600 to-purple-400', growth: 15.3, description: 'Visoki angažman + kupnje' },
  { stage: 'Ambasador', count: 12000, icon: Award, color: 'from-yellow-600 to-yellow-400', growth: 22.7, description: 'UGC kreatori i zagovornici' },
];

const funnelSteps = [
  { label: 'Awareness (New)', value: 45000, color: '#0ea5e9' },
  { label: 'Casual Follower', value: 120000, color: '#3b82f6' },
  { label: 'Engaged Fan', value: 280000, color: '#6366f1' },
  { label: 'Superfan', value: 85000, color: '#a855f7' },
  { label: 'Ambassador', value: 12000, color: '#eab308' },
];

const clvData = [
  { segment: 'Novi', clv: '€2.10', retention: '35%', churnRisk: 'Visoki' },
  { segment: 'Povremeni', clv: '€8.50', retention: '52%', churnRisk: 'Srednji' },
  { segment: 'Aktivni', clv: '€24.00', retention: '78%', churnRisk: 'Niski' },
  { segment: 'Superfan', clv: '€86.00', retention: '92%', churnRisk: 'Vrlo nizak' },
  { segment: 'Ambasador', clv: '€210.00', retention: '97%', churnRisk: 'Minimalan' },
];

const churnPredictions = [
  { metric: 'Navijači pod rizikom (30 dana)', value: '8,420', trend: 'down', change: '-12%', description: 'Navijači koji će vjerojatno prestati pratiti u sljedećih 30 dana' },
  { metric: 'Ciljevi za reaktivaciju', value: '3,150', trend: 'up', change: '+8%', description: 'Neaktivni navijači s potencijalom reaktivacije' },
  { metric: 'Kandidati za nadogradnju', value: '15,800', trend: 'up', change: '+22%', description: 'Povremeni navijači koji pokazuju signale Superfana' },
];

export default function FanInsights() {
  return (
    <div className="min-h-screen bg-dinamo-dark text-white">
      <Header title="UVIDI O NAVIJAČIMA" subtitle="Segmentacija navijača, životni ciklus i analiza vrijednosti" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Fan Segment Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {fanSegments.map((seg) => {
            const Icon = seg.icon;
            return (
              <div key={seg.stage} className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${seg.color}`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className="text-xs text-green-400 flex items-center gap-0.5">
                    <TrendingUp size={12} />
                    +{seg.growth}%
                  </span>
                </div>
                <div>
                  <p className="text-sm text-dinamo-muted">{seg.stage}</p>
                  <p className="text-2xl font-bold text-white">
                    {seg.count >= 1000 ? `${(seg.count / 1000).toFixed(0)}K` : seg.count}
                  </p>
                </div>
                <p className="text-xs text-dinamo-muted">{seg.description}</p>
              </div>
            );
          })}
        </div>

        {/* Funnel */}
        <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
          <FunnelChart steps={funnelSteps} title="Lijevak životnog ciklusa navijača" />
        </div>

        {/* CLV Table */}
        <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-400" />
            Doživotna vrijednost navijača po segmentu
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-dinamo-muted font-medium">Segment</th>
                  <th className="text-left py-3 px-4 text-dinamo-muted font-medium">Prosj. CLV</th>
                  <th className="text-left py-3 px-4 text-dinamo-muted font-medium">Zadržavanje</th>
                  <th className="text-left py-3 px-4 text-dinamo-muted font-medium">Rizik odljeva</th>
                </tr>
              </thead>
              <tbody>
                {clvData.map((row) => (
                  <tr key={row.segment} className="border-b border-gray-800 hover:bg-dinamo-dark-light/50">
                    <td className="py-3 px-4 text-white font-medium">{row.segment}</td>
                    <td className="py-3 px-4 text-emerald-400 font-mono">{row.clv}</td>
                    <td className="py-3 px-4 text-gray-300">{row.retention}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        row.churnRisk === 'Visoki' ? 'bg-red-900/40 text-red-400' :
                        row.churnRisk === 'Srednji' ? 'bg-yellow-900/40 text-yellow-400' :
                        row.churnRisk === 'Niski' ? 'bg-green-900/40 text-green-400' :
                        'bg-emerald-900/40 text-emerald-400'
                      }`}>
                        {row.churnRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Churn Predictions */}
        <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Prediktivna analitika</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {churnPredictions.map((item) => (
              <div key={item.metric} className="bg-dinamo-dark-light/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-dinamo-muted">{item.metric}</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">{item.value}</span>
                  <span className={`text-xs flex items-center gap-0.5 ${
                    item.trend === 'up' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {item.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {item.change}
                  </span>
                </div>
                <p className="text-xs text-dinamo-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
