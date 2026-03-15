import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { useApi } from '../hooks/useApi';
import { useChannelStatus } from '../hooks/useChannelStatus';
import { useProjectStatus } from '../hooks/useProjectStatus';
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import MetricCard from '../components/common/MetricCard';
import PlatformIcon from '../components/common/PlatformIcon';
import { SentimentDonut } from '../components/charts/SentimentDonut';
import {
  MessageSquare, Volume2, TrendingUp, Hash, Globe,
  ThumbsUp, ThumbsDown, Minus, AlertTriangle, ShieldCheck,
  Filter, Reply, Search, Link2, FolderKanban,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { SHIFTONEZERO_BRAND } from '../utils/constants';
import { ChartTooltip } from '../components/charts/ChartTooltip';
import { CHART_ANIM, AXIS_STYLE, GRID_STYLE } from '../components/charts/chartConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SentimentDay {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
}

interface MentionVolumeDay {
  date: string;
  mentions: number;
}

interface CompetitorMention {
  name: string;
  mentions: number;
  color: string;
}

interface SocialListeningData {
  metrics: {
    totalMentions: number;
    prevMentions: number;
    shareOfVoice: number;
    prevShareOfVoice: number;
    trendingCount: number;
    sentimentPositive: number;
    sentimentNeutral: number;
    sentimentNegative: number;
  };
  recentMentions: Array<{
    id: number;
    platform: string;
    author: string;
    text: string;
    sentiment: string;
    time: string;
    reach: number;
  }>;
  trendingTopics: Array<{
    id: number;
    topic: string;
    mentions: number;
    change: string;
    velocity: string;
  }>;
  sentimentTimeline: SentimentDay[];
  mentionVolume: MentionVolumeDay[];
  competitorMentions: CompetitorMention[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CRISIS_THRESHOLD = 20; // percent negative

const SENTIMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'Svi' },
  { value: 'positive', label: 'Pozitivni' },
  { value: 'neutral', label: 'Neutralni' },
  { value: 'negative', label: 'Negativni' },
] as const;

const PLATFORM_FILTER_OPTIONS = [
  { value: 'all', label: 'Sve platforme' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
] as const;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const sentimentIcon = (s: string) => {
  if (s === 'positive') return <ThumbsUp size={14} className="text-green-600" />;
  if (s === 'negative') return <ThumbsDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-studio-text-secondary" />;
};

const sentimentLabel = (s: string) => {
  if (s === 'positive') return 'pozitivno';
  if (s === 'negative') return 'negativno';
  return 'neutralno';
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const emptyMetrics: SocialListeningData['metrics'] = {
  totalMentions: 0,
  prevMentions: 0,
  shareOfVoice: 0,
  prevShareOfVoice: 0,
  trendingCount: 0,
  sentimentPositive: 0,
  sentimentNeutral: 0,
  sentimentNegative: 0,
};

export default function SocialListening() {
  const { data: apiData, loading } = useApi<SocialListeningData>('/social-listening/trending');
  const { hasConnectedChannels } = useChannelStatus();
  const { hasProjects } = useProjectStatus();
  const navigate = useNavigate();
  const data: SocialListeningData = apiData
    ? {
        metrics: apiData.metrics ?? emptyMetrics,
        recentMentions: apiData.recentMentions ?? [],
        trendingTopics: apiData.trendingTopics ?? [],
        sentimentTimeline: apiData.sentimentTimeline ?? [],
        mentionVolume: apiData.mentionVolume ?? [],
        competitorMentions: apiData.competitorMentions ?? [],
      }
    : { metrics: emptyMetrics, recentMentions: [], trendingTopics: [], sentimentTimeline: [], mentionVolume: [], competitorMentions: [] };

  // Filters
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Derived
  const totalSentiment = data.metrics.sentimentPositive + data.metrics.sentimentNeutral + data.metrics.sentimentNegative;
  const negativePercent = totalSentiment > 0 ? (data.metrics.sentimentNegative / totalSentiment) * 100 : 0;
  const isCrisis = negativePercent > CRISIS_THRESHOLD;

  const maxReach = useMemo(
    () => Math.max(...data.recentMentions.map((m) => m.reach), 1),
    [data.recentMentions],
  );

  const filteredMentions = useMemo(() => {
    return data.recentMentions.filter((m) => {
      if (sentimentFilter !== 'all' && m.sentiment !== sentimentFilter) return false;
      if (platformFilter !== 'all' && m.platform !== platformFilter) return false;
      return true;
    });
  }, [data.recentMentions, sentimentFilter, platformFilter]);

  const maxCompetitorMentions = useMemo(
    () => Math.max(...data.competitorMentions.map((c) => c.mentions), 1),
    [data.competitorMentions],
  );

  if (!hasProjects) {
    return (
      <div>
        <Header title="SOCIAL LISTENING" subtitle="Pracenje brenda i spominjanja" />
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

  // Empty state when no channels connected
  if (!hasConnectedChannels) {
    return (
      <div>
        <Header title="SOCIAL LISTENING" subtitle="Pracenje brenda i spominjanja" />
        <div className="page-wrapper">
          <EmptyState
            icon={MessageSquare}
            title="Nema podataka za social listening"
            description="Povežite kanale za praćenje spomena, sentimenta i trendova."
            variant="hero"
            action={
              <button
                onClick={() => navigate('/brand-profile?tab=mreze')}
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

  // Loading state
  if (loading && !apiData) return (
    <>
      <Header title="SOCIAL LISTENING" subtitle="Pracenje brenda i spominjanja" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={3} cols="grid grid-cols-1 sm:grid-cols-3 gap-4" />
        <div className="content-grid"><ChartSkeleton /><ChartSkeleton /></div>
      </div>
    </>
  );

  return (
    <div>
      <Header title="SOCIAL LISTENING" subtitle="Pracenje brenda i spominjanja" />

      <div className="page-wrapper space-y-6">

        {/* ---------------------------------------------------------------- */}
        {/* Crisis Detection Alert                                           */}
        {/* ---------------------------------------------------------------- */}
        {isCrisis ? (
          <div className="flex items-center justify-between gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">
                    Krizni signal
                  </span>
                </div>
                <p className="text-sm text-red-300">
                  Negativni sentiment je na <span className="font-semibold">{negativePercent.toFixed(1)}%</span> &mdash; iznad praga od {CRISIS_THRESHOLD}%.
                  Potrebna pažnja za recentne negativne reakcije.
                </p>
              </div>
            </div>
            <button className="flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors">
              Istraži
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} className="text-green-400" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full">
                Nema kriznih signala
              </span>
              <p className="text-sm text-green-300 mt-1">
                Negativni sentiment je na {negativePercent.toFixed(1)}% &mdash; ispod praga od {CRISIS_THRESHOLD}%. Sve je u redu.
              </p>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Metric Cards                                                     */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Ukupno spominjanja" value={data.metrics.totalMentions} previousValue={data.metrics.prevMentions} format="number" icon={MessageSquare} />
          <MetricCard label="Udio u komunikaciji" value={data.metrics.shareOfVoice} previousValue={data.metrics.prevShareOfVoice} format="percent" icon={Volume2} />
          <MetricCard label="Trendovi" value={data.metrics.trendingCount} format="number" icon={TrendingUp} />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Charts row: Sentiment Donut + Mention Volume                    */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sentiment Donut */}
          <div className="card">
            <SentimentDonut
              positive={data.metrics.sentimentPositive}
              neutral={data.metrics.sentimentNeutral}
              negative={data.metrics.sentimentNegative}
              title="Distribucija sentimenta"
            />
          </div>

          {/* Mention Volume Area Chart */}
          <div className="card">
            <h3 className="font-headline text-base tracking-wider text-studio-text-primary mb-5">Volumen spominjanja (14 dana)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.mentionVolume} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mentionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SHIFTONEZERO_BRAND.colors.blue} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={SHIFTONEZERO_BRAND.colors.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="date" {...AXIS_STYLE} dy={8} />
                <YAxis {...AXIS_STYLE} dx={-4} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="mentions"
                  stroke={SHIFTONEZERO_BRAND.colors.blue}
                  strokeWidth={2.5}
                  fill="url(#mentionGrad)"
                  dot={{ r: 3, fill: SHIFTONEZERO_BRAND.colors.blue, stroke: '#1e293b', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: SHIFTONEZERO_BRAND.colors.blue, stroke: '#fff', strokeWidth: 2 }}
                  name="Spominjanja"
                  animationDuration={CHART_ANIM.areaDuration}
                  animationEasing={CHART_ANIM.areaEasing}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Sentiment Timeline + Competitor Comparison                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sentiment Timeline Line Chart */}
          <div className="lg:col-span-2 card">
            <h3 className="font-headline text-base tracking-wider text-studio-text-primary mb-5">Kretanje sentimenta (14 dana)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.sentimentTimeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="date" {...AXIS_STYLE} dy={8} />
                <YAxis {...AXIS_STYLE} dx={-4} unit="%" domain={[0, 100]} />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(value: number) => `${value}%`}
                    />
                  }
                />
                <Line type="monotone" dataKey="positive" stroke={SHIFTONEZERO_BRAND.colors.positive} strokeWidth={2.5}
                  dot={{ r: 2, fill: SHIFTONEZERO_BRAND.colors.positive, stroke: '#1e293b', strokeWidth: 2 }}
                  activeDot={{ r: 4, fill: SHIFTONEZERO_BRAND.colors.positive, stroke: '#fff', strokeWidth: 2 }}
                  name="Pozitivno"
                  animationDuration={CHART_ANIM.lineDuration} animationEasing={CHART_ANIM.lineEasing} />
                <Line type="monotone" dataKey="neutral" stroke={SHIFTONEZERO_BRAND.colors.neutral} strokeWidth={2.5}
                  dot={{ r: 2, fill: SHIFTONEZERO_BRAND.colors.neutral, stroke: '#1e293b', strokeWidth: 2 }}
                  activeDot={{ r: 4, fill: SHIFTONEZERO_BRAND.colors.neutral, stroke: '#fff', strokeWidth: 2 }}
                  name="Neutralno"
                  animationDuration={CHART_ANIM.lineDuration} animationEasing={CHART_ANIM.lineEasing} animationBegin={200} />
                <Line type="monotone" dataKey="negative" stroke={SHIFTONEZERO_BRAND.colors.negative} strokeWidth={2.5}
                  dot={{ r: 2, fill: SHIFTONEZERO_BRAND.colors.negative, stroke: '#1e293b', strokeWidth: 2 }}
                  activeDot={{ r: 4, fill: SHIFTONEZERO_BRAND.colors.negative, stroke: '#fff', strokeWidth: 2 }}
                  name="Negativno"
                  animationDuration={CHART_ANIM.lineDuration} animationEasing={CHART_ANIM.lineEasing} animationBegin={400} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: SHIFTONEZERO_BRAND.colors.positive }} />
                <span className="text-xs text-studio-text-secondary">Pozitivno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: SHIFTONEZERO_BRAND.colors.neutral }} />
                <span className="text-xs text-studio-text-secondary">Neutralno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: SHIFTONEZERO_BRAND.colors.negative }} />
                <span className="text-xs text-studio-text-secondary">Negativno</span>
              </div>
            </div>
          </div>

          {/* Competitor Mention Comparison */}
          <div className="card">
            <h3 className="font-headline text-base tracking-wider text-studio-text-primary mb-5">Usporedba s konkurencijom</h3>
            <div className="space-y-4">
              {data.competitorMentions.map((comp) => {
                const pct = (comp.mentions / maxCompetitorMentions) * 100;
                return (
                  <div key={comp.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-studio-text-primary">{comp.name}</span>
                      <span className="text-xs font-mono text-studio-text-secondary">{comp.mentions.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 bg-studio-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: comp.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Mentions + Trending Topics                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Mentions List */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe size={20} className="text-brand-accent" />
                <h2 className="section-title">Nedavna spominjanja</h2>
              </div>
              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-studio-text-tertiary pointer-events-none" />
                  <select
                    value={sentimentFilter}
                    onChange={(e) => setSentimentFilter(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-studio-border rounded-lg bg-studio-surface-1 text-studio-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent/40 appearance-none cursor-pointer"
                  >
                    {SENTIMENT_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-studio-text-tertiary pointer-events-none" />
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-studio-border rounded-lg bg-studio-surface-1 text-studio-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent/40 appearance-none cursor-pointer"
                  >
                    {PLATFORM_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {filteredMentions.length === 0 ? (
              <div className="py-10 text-center text-sm text-studio-text-tertiary">Nema rezultata za odabrane filtere.</div>
            ) : (
              <div className="space-y-3">
                {filteredMentions.map((mention) => {
                  const reachPct = (mention.reach / maxReach) * 100;
                  return (
                    <div key={mention.id} className="p-4 bg-studio-surface-0 rounded-lg hover:bg-studio-surface-2 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={mention.platform} size="sm" />
                          <span className="text-sm font-medium text-brand-accent">{mention.author}</span>
                          {sentimentIcon(mention.sentiment)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-studio-text-secondary">{mention.time}</span>
                          <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-accent bg-brand-accent/10 rounded-lg hover:bg-brand-accent/20 transition-colors">
                            <Reply size={12} />
                            Odgovori
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-studio-text-secondary mt-2 leading-relaxed">{mention.text}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          mention.sentiment === 'positive' ? 'bg-green-500/10 text-green-400' :
                          mention.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' :
                          'bg-studio-surface-2 text-studio-text-secondary'
                        }`}>
                          {sentimentLabel(mention.sentiment)}
                        </span>
                        <span className="text-xs text-studio-text-secondary">Doseg: {(mention.reach / 1000).toFixed(1)}K</span>
                        {/* Reach magnitude bar */}
                        <div className="flex-1 max-w-[120px]">
                          <div className="h-1.5 bg-studio-surface-3 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${reachPct}%`,
                                backgroundColor:
                                  reachPct > 70 ? SHIFTONEZERO_BRAND.colors.positive :
                                  reachPct > 40 ? SHIFTONEZERO_BRAND.colors.blue :
                                  SHIFTONEZERO_BRAND.colors.neutral,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trending Topics */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Hash size={20} className="text-purple-600" />
              <h2 className="section-title">Trendovi</h2>
            </div>
            <div className="space-y-3">
              {data.trendingTopics.map((topic, index) => (
                <div key={topic.id} className="flex items-center justify-between p-3 bg-studio-surface-0 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-studio-text-secondary font-mono w-4">{index + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-studio-text-primary">{topic.topic}</p>
                      <p className="text-xs text-studio-text-secondary">{topic.mentions.toLocaleString()} spominjanja</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-mono ${
                      topic.velocity === 'u porastu' ? 'text-red-400' :
                      topic.velocity === 'raste' ? 'text-green-600' :
                      'text-studio-text-secondary'
                    }`}>
                      {topic.change}
                    </span>
                    <p className={`text-xs mt-0.5 ${
                      topic.velocity === 'u porastu' ? 'text-red-400' :
                      topic.velocity === 'raste' ? 'text-green-600' :
                      'text-studio-text-secondary'
                    }`}>
                      {topic.velocity}
                    </p>
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
