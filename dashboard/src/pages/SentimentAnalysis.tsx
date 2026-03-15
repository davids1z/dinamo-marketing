import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { useApi } from '../hooks/useApi';
import { useChannelStatus } from '../hooks/useChannelStatus';
import { useProjectStatus } from '../hooks/useProjectStatus';
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { SentimentDonut } from '../components/charts/SentimentDonut';
import { EngagementChart } from '../components/charts/EngagementChart';
import { AlertTriangle, TrendingUp, TrendingDown, Hash, Heart, Link2, FolderKanban } from 'lucide-react';

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

const emptyData: SentimentOverview = {
  positive: 0,
  neutral: 0,
  negative: 0,
  positiveChange: '0%',
  neutralChange: '0%',
  negativeChange: '0%',
  timeline: [],
  topics: [],
  alerts: [],
};

export default function SentimentAnalysis() {
  const { data: apiData, loading } = useApi<SentimentOverview>('/sentiment/overview');
  const { hasConnectedChannels } = useChannelStatus();
  const { hasProjects } = useProjectStatus();
  const navigate = useNavigate();
  const data = apiData || emptyData;

  if (!hasProjects) {
    return (
      <div>
        <Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" />
        <div className="page-wrapper">
          <EmptyState
            icon={FolderKanban}
            variant="hero"
            title="Kreirajte prvi projekt"
            description="Projekti organiziraju kampanje, sadržaj i izvještaje. Kreirajte projekt za pristup ovoj stranici."
            action={
              <button
                onClick={() => navigate('/onboarding')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover transition-all shadow-md shadow-brand-accent/20"
              >
                <FolderKanban size={16} />
                Kreiraj projekt
              </button>
            }
          />
        </div>
      </div>
    );
  }

  if (!hasConnectedChannels) {
    return (
      <div>
        <Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" />
        <div className="page-wrapper">
          <EmptyState
            icon={Heart}
            title="Nema podataka za sentiment"
            description="Povežite kanale za analizu sentimenta komentara i interakcija."
            variant="hero"
            action={
              <button
                onClick={() => navigate('/brand-profile')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent-hover transition-all shadow-sm"
              >
                <Link2 size={16} />
                Poveži kanale
              </button>
            }
          />
        </div>
      </div>
    );
  }

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
    <div>
      <Header title="ANALIZA SENTIMENTA" subtitle="Sentiment brenda i javna percepcija" />

      <div className="page-wrapper space-y-6">


        {/* Donut + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <SentimentDonut positive={data.positive} neutral={data.neutral} negative={data.negative} title="Ukupni sentiment" />
          </div>
          <div className="lg:col-span-2 card space-y-4">
            <h3 className="section-title">Sažetak sentimenta</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-500/10 border border-green-200 rounded-lg p-4">
                <p className="text-3xl font-bold text-green-600">{data.positive}%</p>
                <p className="text-sm text-studio-text-secondary mt-1">Pozitivno</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                  <TrendingUp size={12} /> {data.positiveChange} u odnosu na prošli tjedan
                </p>
              </div>
              <div className="bg-studio-surface-0 border border-studio-border rounded-lg p-4">
                <p className="text-3xl font-bold text-studio-text-secondary">{data.neutral}%</p>
                <p className="text-sm text-studio-text-secondary mt-1">Neutralno</p>
                <p className="text-xs text-studio-text-secondary flex items-center gap-1 mt-2">
                  <TrendingDown size={12} /> {data.neutralChange} u odnosu na prošli tjedan
                </p>
              </div>
              <div className="bg-red-500/10 border border-red-200 rounded-lg p-4">
                <p className="text-3xl font-bold text-red-400">{data.negative}%</p>
                <p className="text-sm text-studio-text-secondary mt-1">Negativno</p>
                <p className="text-xs text-red-400 flex items-center gap-1 mt-2">
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
              <Hash size={20} className="text-blue-400" />
              <h2 className="section-title">Najčešće teme</h2>
            </div>
            <div className="space-y-3">
              {data.topics.map((topic) => (
                <div key={topic.topic} className="flex items-center justify-between p-3 bg-studio-surface-0 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{topic.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-studio-text-primary">{topic.topic}</p>
                      <p className="text-xs text-studio-text-secondary">{topic.mentions.toLocaleString()} spominjanja</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      topic.sentiment === 'positive' ? 'bg-green-500/10 text-green-400' :
                      topic.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' :
                      topic.sentiment === 'mixed' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-studio-surface-0 text-studio-text-secondary'
                    }`}>
                      {topic.sentiment === 'positive' ? 'pozitivno' : topic.sentiment === 'negative' ? 'negativno' : topic.sentiment === 'mixed' ? 'mješovito' : 'neutralno'}
                    </span>
                    <p className="text-xs mt-1 text-studio-text-secondary">
                      {topic.change} obujam
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
                      ? 'bg-amber-500/10 border-amber-200'
                      : 'bg-blue-500/10 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h3 className={`text-sm font-medium ${
                      alert.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                    }`}>
                      {alert.title}
                    </h3>
                    <span className="text-xs text-studio-text-secondary">{alert.time}</span>
                  </div>
                  <p className="text-xs text-studio-text-secondary mt-2 leading-relaxed">{alert.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-studio-text-secondary">{alert.platform}</span>
                    <span className="text-xs text-studio-text-secondary">|</span>
                    <span className="text-xs text-studio-text-secondary">{alert.mentions} spominjanja</span>
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
