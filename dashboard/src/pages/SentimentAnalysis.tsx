import React from 'react';
import Header from '../components/layout/Header';
import { useApi } from '../hooks/useApi';
import { PageLoader, ErrorState } from '../components/common/LoadingSpinner';
import { SentimentDonut } from '../components/charts/SentimentDonut';
import { EngagementChart } from '../components/charts/EngagementChart';
import { AlertTriangle, TrendingUp, TrendingDown, Hash } from 'lucide-react';

interface SentimentOverview {
  positive: number;
  neutral: number;
  negative: number;
  positiveChange: string;
  neutralChange: string;
  negativeChange: string;
  timeline: Array<{ date: string; engagement: number; reach: number }>;
  topics: Array<{ topic: string; mentions: number; sentiment: string; change: string; icon: string }>;
  alerts: Array<{
    id: number;
    severity: string;
    title: string;
    description: string;
    time: string;
    platform: string;
    mentions: number;
  }>;
}

// Fallback mock data for when API is not available
const fallbackData: SentimentOverview = {
  positive: 65,
  neutral: 25,
  negative: 10,
  positiveChange: '+4.2%',
  neutralChange: '-2.1%',
  negativeChange: '+2.1%',
  timeline: Array.from({ length: 14 }, (_, i) => {
    const date = new Date(2026, 1, 20 + i);
    const hasSpike = i === 8;
    return {
      date: date.toISOString().split('T')[0] as string,
      engagement: Math.round(55 + Math.random() * 20 + (hasSpike ? -15 : 0)),
      reach: Math.round(8 + Math.random() * 8 + (hasSpike ? 25 : 0)),
    };
  }),
  topics: [
    { topic: 'Players', mentions: 1240, sentiment: 'positive', change: '+12%', icon: '\u26BD' },
    { topic: 'Tactics', mentions: 890, sentiment: 'neutral', change: '+3%', icon: '\uD83D\uDCCB' },
    { topic: 'Management', mentions: 650, sentiment: 'mixed', change: '-5%', icon: '\uD83C\uDFE2' },
    { topic: 'Results', mentions: 1580, sentiment: 'positive', change: '+18%', icon: '\uD83C\uDFC6' },
    { topic: 'Referee Decisions', mentions: 420, sentiment: 'negative', change: '+45%', icon: '\uD83D\uDFE8' },
  ],
  alerts: [
    {
      id: 1,
      severity: 'warning',
      title: 'Detektiran porast negativnog sentimenta',
      description: 'Kontroverza oko sudaca s utakmice Dinamo \u2014 Rijeka generira 420+ negativnih spominjanja. 68% negativnog sentimenta na Facebooku. Razmotriti objavu slu\u017Ebene izjave ili sadr\u017Eaja iza kulisa za promjenu narativa.',
      time: 'prije 3 sata',
      platform: 'Facebook',
      mentions: 420,
    },
    {
      id: 2,
      severity: 'info',
      title: 'Pozitivan trend: Sadr\u017Eaj akademije',
      description: 'Sadr\u017Eaj o pobjedi akademije na omladinskom kupu prima 92% pozitivnog sentimenta na svim platformama. Razmotriti poja\u010Danje s dodatnim sadr\u017Eajem koji prikazuje pobjedni\u010Dke igra\u010De.',
      time: 'prije 1 dan',
      platform: 'All Platforms',
      mentions: 890,
    },
  ],
};

export default function SentimentAnalysis() {
  const { data: apiData, loading, error, refetch } = useApi<SentimentOverview>('/sentiment/overview');
  const data = apiData || fallbackData;

  if (loading && !apiData) return <><Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" /><PageLoader /></>;

  return (
    <div className="animate-fade-in">
      <Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" />

      <div className="page-wrapper space-y-6">
        {error && <ErrorState message={error} onRetry={refetch} />}

        {/* Donut + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <SentimentDonut positive={data.positive} neutral={data.neutral} negative={data.negative} title="Overall Sentiment" />
          </div>
          <div className="lg:col-span-2 card space-y-4">
            <h3 className="section-title">Sa\u017Eetak sentimenta</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-3xl font-bold text-green-600">{data.positive}%</p>
                <p className="text-sm text-dinamo-muted mt-1">Pozitivno</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                  <TrendingUp size={12} /> {data.positiveChange} u odnosu na pro\u0161li tjedan
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-3xl font-bold text-gray-600">{data.neutral}%</p>
                <p className="text-sm text-dinamo-muted mt-1">Neutralno</p>
                <p className="text-xs text-dinamo-muted flex items-center gap-1 mt-2">
                  <TrendingDown size={12} /> {data.neutralChange} u odnosu na pro\u0161li tjedan
                </p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-3xl font-bold text-red-600">{data.negative}%</p>
                <p className="text-sm text-dinamo-muted mt-1">Negativno</p>
                <p className="text-xs text-red-600 flex items-center gap-1 mt-2">
                  <TrendingUp size={12} /> {data.negativeChange} u odnosu na pro\u0161li tjedan
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment Over Time */}
        <div className="card">
          <EngagementChart
            data={data.timeline}
            title="Trend sentimenta (pozitivni % vs negativni %)"
          />
        </div>

        {/* Topics + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Topics */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Hash size={20} className="text-blue-600" />
              <h2 className="section-title">Naj\u010De\u0161\u0107e teme</h2>
            </div>
            <div className="space-y-3">
              {data.topics.map((topic) => (
                <div key={topic.topic} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{topic.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{topic.topic}</p>
                      <p className="text-xs text-dinamo-muted">{topic.mentions.toLocaleString()} spominjanja</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      topic.sentiment === 'positive' ? 'bg-green-100 text-green-600' :
                      topic.sentiment === 'negative' ? 'bg-red-100 text-red-600' :
                      topic.sentiment === 'mixed' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {topic.sentiment}
                    </span>
                    <p className="text-xs mt-1 text-dinamo-muted">
                      {topic.change} volume
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-yellow-600" />
              <h2 className="section-title">Upozorenja sentimenta</h2>
            </div>
            <div className="space-y-4">
              {data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.severity === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h3 className={`text-sm font-medium ${
                      alert.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
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
      </div>
    </div>
  );
}
