import Header from '../components/layout/Header';
import { useApi } from '../hooks/useApi';
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner';
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
    { topic: 'Players', mentions: 1240, sentiment: 'positive', change: '+12%', icon: '⚽' },
    { topic: 'Tactics', mentions: 890, sentiment: 'neutral', change: '+3%', icon: '📋' },
    { topic: 'Management', mentions: 650, sentiment: 'mixed', change: '-5%', icon: '🏢' },
    { topic: 'Results', mentions: 1580, sentiment: 'positive', change: '+18%', icon: '🏆' },
    { topic: 'Referee Decisions', mentions: 420, sentiment: 'negative', change: '+45%', icon: '🟨' },
  ],
  alerts: [
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
  ],
};

export default function SentimentAnalysis() {
  const { data: apiData, loading } = useApi<SentimentOverview>('/sentiment/overview');
  const data = apiData || fallbackData;

  if (loading && !apiData) return (
    <>
      <Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={3} cols="grid grid-cols-1 lg:grid-cols-3 gap-6" />
        <ChartSkeleton />
      </div>
    </>
  );

  return (
    <div className="animate-fade-in">
      <Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" />

      <div className="page-wrapper space-y-6">


        {/* Donut + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <SentimentDonut positive={data.positive} neutral={data.neutral} negative={data.negative} title="Overall Sentiment" />
          </div>
          <div className="lg:col-span-2 card space-y-4">
            <h3 className="section-title">Sažetak sentimenta</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-green-200 rounded-lg p-4">
                <p className="text-3xl font-bold text-green-600">{data.positive}%</p>
                <p className="text-sm text-gray-500 mt-1">Pozitivno</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                  <TrendingUp size={12} /> {data.positiveChange} u odnosu na prošli tjedan
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-3xl font-bold text-gray-500">{data.neutral}%</p>
                <p className="text-sm text-gray-500 mt-1">Neutralno</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                  <TrendingDown size={12} /> {data.neutralChange} u odnosu na prošli tjedan
                </p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-3xl font-bold text-red-700">{data.negative}%</p>
                <p className="text-sm text-gray-500 mt-1">Negativno</p>
                <p className="text-xs text-red-700 flex items-center gap-1 mt-2">
                  <TrendingUp size={12} /> {data.negativeChange} u odnosu na prošli tjedan
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
              <Hash size={20} className="text-blue-700" />
              <h2 className="section-title">Najčešće teme</h2>
            </div>
            <div className="space-y-3">
              {data.topics.map((topic) => (
                <div key={topic.topic} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{topic.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{topic.topic}</p>
                      <p className="text-xs text-gray-500">{topic.mentions.toLocaleString()} spominjanja</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      topic.sentiment === 'positive' ? 'bg-green-50 text-green-700' :
                      topic.sentiment === 'negative' ? 'bg-red-50 text-red-700' :
                      topic.sentiment === 'mixed' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {topic.sentiment}
                    </span>
                    <p className="text-xs mt-1 text-gray-500">
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
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h3 className={`text-sm font-medium ${
                      alert.severity === 'warning' ? 'text-amber-700' : 'text-blue-700'
                    }`}>
                      {alert.title}
                    </h3>
                    <span className="text-xs text-gray-500">{alert.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">{alert.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-gray-500">{alert.platform}</span>
                    <span className="text-xs text-gray-500">|</span>
                    <span className="text-xs text-gray-500">{alert.mentions} spominjanja</span>
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
