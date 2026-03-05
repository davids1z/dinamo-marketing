import React from 'react';
import Header from '../components/layout/Header';
import { SentimentDonut } from '../components/charts/SentimentDonut';
import { EngagementChart } from '../components/charts/EngagementChart';
import { AlertTriangle, TrendingUp, TrendingDown, MessageSquare, Hash } from 'lucide-react';

// Repurpose EngagementChart data as sentiment over time (engagement = positive, reach = negative scaled)
const sentimentTimeline = Array.from({ length: 14 }, (_, i) => {
  const date = new Date(2026, 1, 20 + i);
  const hasSpike = i === 8; // Simulate a negative spike
  return {
    date: date.toISOString().split('T')[0],
    engagement: Math.round(55 + Math.random() * 20 + (hasSpike ? -15 : 0)), // positive %
    reach: Math.round(8 + Math.random() * 8 + (hasSpike ? 25 : 0)),         // negative %
  };
});

const topTopics = [
  { topic: 'Players', mentions: 1240, sentiment: 'positive', change: '+12%', icon: '⚽' },
  { topic: 'Tactics', mentions: 890, sentiment: 'neutral', change: '+3%', icon: '📋' },
  { topic: 'Management', mentions: 650, sentiment: 'mixed', change: '-5%', icon: '🏢' },
  { topic: 'Results', mentions: 1580, sentiment: 'positive', change: '+18%', icon: '🏆' },
  { topic: 'Referee Decisions', mentions: 420, sentiment: 'negative', change: '+45%', icon: '🟨' },
];

const alerts = [
  {
    id: 1,
    severity: 'warning',
    title: 'Detektiran porast negativnog sentimenta',
    description: 'Kontroverza oko sudaca s utakmice Dinamo — Rijeka generira 420+ negativnih spominjanja. 68% negativnog sentimenta na Facebooku. Razmotriti objavu službene izjave ili sadržaja iza kulisa za promjenu narativa.',
    time: 'prije 3 sata',
    platform: 'Facebook',
    mentions: 420,
  },
  {
    id: 2,
    severity: 'info',
    title: 'Pozitivan trend: Sadržaj akademije',
    description: 'Sadržaj o pobjedi akademije na omladinskom kupu prima 92% pozitivnog sentimenta na svim platformama. Razmotriti pojačanje s dodatnim sadržajem koji prikazuje pobjedničke igrače.',
    time: 'prije 1 dan',
    platform: 'All Platforms',
    mentions: 890,
  },
];

export default function SentimentAnalysis() {
  return (
    <div className="min-h-screen bg-dinamo-dark text-white">
      <Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Donut + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
            <SentimentDonut positive={65} neutral={25} negative={10} title="Overall Sentiment" />
          </div>
          <div className="lg:col-span-2 bg-dinamo-dark-card rounded-xl border border-gray-800 p-6 space-y-4">
            <h3 className="text-sm text-dinamo-muted font-medium">Sažetak sentimenta</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-950/30 border border-green-900/30 rounded-lg p-4">
                <p className="text-3xl font-bold text-green-400">65%</p>
                <p className="text-sm text-dinamo-muted mt-1">Pozitivno</p>
                <p className="text-xs text-green-400 flex items-center gap-1 mt-2">
                  <TrendingUp size={12} /> +4.2% u odnosu na prošli tjedan
                </p>
              </div>
              <div className="bg-dinamo-dark-light/50 border border-gray-700 rounded-lg p-4">
                <p className="text-3xl font-bold text-gray-300">25%</p>
                <p className="text-sm text-dinamo-muted mt-1">Neutralno</p>
                <p className="text-xs text-dinamo-muted flex items-center gap-1 mt-2">
                  <TrendingDown size={12} /> -2.1% u odnosu na prošli tjedan
                </p>
              </div>
              <div className="bg-red-950/30 border border-red-900/30 rounded-lg p-4">
                <p className="text-3xl font-bold text-red-400">10%</p>
                <p className="text-sm text-dinamo-muted mt-1">Negativno</p>
                <p className="text-xs text-red-400 flex items-center gap-1 mt-2">
                  <TrendingUp size={12} /> +2.1% u odnosu na prošli tjedan
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment Over Time */}
        <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
          <EngagementChart
            data={sentimentTimeline}
            title="Trend sentimenta (pozitivni % vs negativni %)"
          />
        </div>

        {/* Topics + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Topics */}
          <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Hash size={20} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Najčešće teme</h2>
            </div>
            <div className="space-y-3">
              {topTopics.map((topic) => (
                <div key={topic.topic} className="flex items-center justify-between p-3 bg-dinamo-dark-light/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{topic.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{topic.topic}</p>
                      <p className="text-xs text-dinamo-muted">{topic.mentions.toLocaleString()} spominjanja</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      topic.sentiment === 'positive' ? 'bg-green-900/40 text-green-400' :
                      topic.sentiment === 'negative' ? 'bg-red-900/40 text-red-400' :
                      topic.sentiment === 'mixed' ? 'bg-yellow-900/40 text-yellow-400' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {topic.sentiment}
                    </span>
                    <p className={`text-xs mt-1 ${topic.change.startsWith('+') ? 'text-dinamo-muted' : 'text-dinamo-muted'}`}>
                      {topic.change} volume
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-yellow-400" />
              <h2 className="text-lg font-semibold text-white">Upozorenja sentimenta</h2>
            </div>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.severity === 'warning'
                      ? 'bg-yellow-950/20 border-yellow-900/30'
                      : 'bg-blue-950/20 border-blue-900/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h3 className={`text-sm font-medium ${
                      alert.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                    }`}>
                      {alert.title}
                    </h3>
                    <span className="text-xs text-dinamo-muted">{alert.time}</span>
                  </div>
                  <p className="text-xs text-dinamo-muted mt-2 leading-relaxed">{alert.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-dinamo-muted">{alert.platform}</span>
                    <span className="text-xs text-dinamo-muted">|</span>
                    <span className="text-xs text-dinamo-muted">{alert.mentions} spominjanja</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
