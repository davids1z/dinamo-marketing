import { useState, useMemo } from 'react';
import Header from '../components/layout/Header';
import { useApi } from '../hooks/useApi';
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner';
import MetricCard from '../components/common/MetricCard';
import PlatformIcon from '../components/common/PlatformIcon';
import { SentimentDonut } from '../components/charts/SentimentDonut';
import {
  MessageSquare, Volume2, TrendingUp, Hash, Globe,
  ThumbsUp, ThumbsDown, Minus, AlertTriangle, ShieldCheck,
  Filter, Reply, Search,
} from 'lucide-react';
import AiInsightsPanel from '../components/common/AiInsightsPanel';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { SHIFTONEZERO_BRAND } from '../utils/constants';

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
// Helpers to generate 14-day fallback data
// ---------------------------------------------------------------------------

function generateDates(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(`${d.getDate()}.${d.getMonth() + 1}.`);
  }
  return dates;
}

const dates14 = generateDates(14);

// ---------------------------------------------------------------------------
// Fallback mock data
// ---------------------------------------------------------------------------

const fallbackData: SocialListeningData = {
  metrics: {
    totalMentions: 2450,
    prevMentions: 1980,
    shareOfVoice: 38,
    prevShareOfVoice: 32,
    trendingCount: 7,
    sentimentPositive: 1420,
    sentimentNeutral: 680,
    sentimentNegative: 350,
  },
  recentMentions: [
    {
      id: 1,
      platform: 'twitter',
      author: '@FootballCroatia',
      text: 'Dinamo Zagreb continues to impress in the UCL group stage. Their academy pipeline is unmatched in the region. #DynamoZagreb #UCL',
      sentiment: 'positive',
      time: 'prije 15 min',
      reach: 12400,
    },
    {
      id: 2,
      platform: 'instagram',
      author: '@balkan_football_daily',
      text: 'Petkovic scores a brace! Dinamo showing why they are the dominant force in Croatian football. The new kit looks incredible too.',
      sentiment: 'positive',
      time: 'prije 1 sat',
      reach: 8900,
    },
    {
      id: 3,
      platform: 'facebook',
      author: 'Dinamo Fan Club Vienna',
      text: "Watching tonight's match at our fan hub in Wien. 200+ Croatian diaspora fans. Atmosphere is electric! Ajmo Dinamo!",
      sentiment: 'positive',
      time: 'prije 2 sata',
      reach: 3200,
    },
    {
      id: 4,
      platform: 'tiktok',
      author: '@hrvatski_sport',
      text: 'Another questionable referee decision against Dinamo. The league needs VAR consistency. This is getting ridiculous.',
      sentiment: 'negative',
      time: 'prije 3 sata',
      reach: 45000,
    },
    {
      id: 5,
      platform: 'youtube',
      author: 'Balkan Sports TV',
      text: "Analysis: How Dinamo Zagreb's 3-4-3 formation is revolutionizing their attacking play this season. Full breakdown in our latest video.",
      sentiment: 'neutral',
      time: 'prije 5 sati',
      reach: 18500,
    },
    {
      id: 6,
      platform: 'twitter',
      author: '@ZagrebLife',
      text: 'Dinamo merchandise pop-up event at Ban Jelacic today - long queues but great atmosphere. New away kit is sold out already!',
      sentiment: 'positive',
      time: 'prije 6 sati',
      reach: 6700,
    },
    {
      id: 7,
      platform: 'facebook',
      author: 'HNL Fan Zone',
      text: 'Stadium food prices at Maksimir need to be reviewed. Fans deserve better options for what they are paying.',
      sentiment: 'negative',
      time: 'prije 7 sati',
      reach: 2100,
    },
    {
      id: 8,
      platform: 'instagram',
      author: '@dinamo_ultras',
      text: 'Choreography for the next derby is going to be massive. Stay tuned. #BBB #Dinamo',
      sentiment: 'neutral',
      time: 'prije 8 sati',
      reach: 15400,
    },
  ],
  trendingTopics: [
    { id: 1, topic: '#DinamoZagreb', mentions: 4250, change: '+32%', velocity: 'raste' },
    { id: 2, topic: '#UCL', mentions: 3800, change: '+28%', velocity: 'raste' },
    { id: 3, topic: 'Petkovic', mentions: 2100, change: '+65%', velocity: 'u porastu' },
    { id: 4, topic: '#Maksimir', mentions: 1450, change: '+12%', velocity: 'stabilno' },
    { id: 5, topic: '#HNL', mentions: 1200, change: '+8%', velocity: 'stabilno' },
    { id: 6, topic: '#DynamoAcademy', mentions: 890, change: '+45%', velocity: 'raste' },
    { id: 7, topic: 'Transfer Rumors', mentions: 760, change: '+120%', velocity: 'u porastu' },
  ],
  sentimentTimeline: dates14.map((date, i) => {
    // Slightly varied percentages for realistic chart
    const base: [number, number, number][] = [
      [62, 24, 14], [58, 26, 16], [65, 22, 13], [60, 25, 15],
      [55, 27, 18], [52, 28, 20], [48, 29, 23], [54, 28, 18],
      [61, 25, 14], [63, 23, 14], [59, 26, 15], [57, 27, 16],
      [64, 22, 14], [60, 25, 15],
    ];
    const [p, n, neg] = base[i]!;
    return { date, positive: p, neutral: n, negative: neg };
  }),
  mentionVolume: dates14.map((date, i) => {
    const volumes = [145, 162, 178, 210, 195, 230, 285, 260, 198, 175, 220, 240, 205, 190];
    return { date, mentions: volumes[i]! };
  }),
  competitorMentions: [
    { name: 'Dinamo Zagreb', mentions: 2450, color: SHIFTONEZERO_BRAND.colors.blue },
    { name: 'Hajduk Split', mentions: 1820, color: '#E4405F' },
    { name: 'Rijeka', mentions: 680, color: '#6B7280' },
    { name: 'Osijek', mentions: 520, color: '#F59E0B' },
  ],
};

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
  if (s === 'negative') return <ThumbsDown size={14} className="text-red-700" />;
  return <Minus size={14} className="text-gray-500" />;
};

const sentimentLabel = (s: string) => {
  if (s === 'positive') return 'pozitivno';
  if (s === 'negative') return 'negativno';
  return 'neutralno';
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SocialListening() {
  const { data: apiData, loading } = useApi<SocialListeningData>('/social-listening/trending');
  const data = apiData || fallbackData;

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
    <div className="animate-fade-in">
      <Header title="SOCIAL LISTENING" subtitle="Pracenje brenda i spominjanja" />

      <div className="page-wrapper space-y-6">

        {/* ---------------------------------------------------------------- */}
        {/* Crisis Detection Alert                                           */}
        {/* ---------------------------------------------------------------- */}
        {isCrisis ? (
          <div className="flex items-center justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                    Krizni signal
                  </span>
                </div>
                <p className="text-sm text-red-800">
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
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} className="text-green-600" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                Nema kriznih signala
              </span>
              <p className="text-sm text-green-800 mt-1">
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
            <h3 className="font-headline text-base tracking-wider text-gray-900 mb-5">Volumen spominjanja (14 dana)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.mentionVolume} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mentionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SHIFTONEZERO_BRAND.colors.blue} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={SHIFTONEZERO_BRAND.colors.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    padding: '8px 12px',
                    fontSize: '13px',
                  }}
                  formatter={(value: number) => [value, 'Spominjanja']}
                />
                <Area
                  type="monotone"
                  dataKey="mentions"
                  stroke={SHIFTONEZERO_BRAND.colors.blue}
                  strokeWidth={2}
                  fill="url(#mentionGrad)"
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
            <h3 className="font-headline text-base tracking-wider text-gray-900 mb-5">Kretanje sentimenta (14 dana)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.sentimentTimeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    padding: '8px 12px',
                    fontSize: '13px',
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = { positive: 'Pozitivno', neutral: 'Neutralno', negative: 'Negativno' };
                    return [`${value}%`, labels[name] || name];
                  }}
                />
                <Line type="monotone" dataKey="positive" stroke={SHIFTONEZERO_BRAND.colors.positive} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="neutral" stroke={SHIFTONEZERO_BRAND.colors.neutral} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="negative" stroke={SHIFTONEZERO_BRAND.colors.negative} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: SHIFTONEZERO_BRAND.colors.positive }} />
                <span className="text-xs text-gray-500">Pozitivno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: SHIFTONEZERO_BRAND.colors.neutral }} />
                <span className="text-xs text-gray-500">Neutralno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: SHIFTONEZERO_BRAND.colors.negative }} />
                <span className="text-xs text-gray-500">Negativno</span>
              </div>
            </div>
          </div>

          {/* Competitor Mention Comparison */}
          <div className="card">
            <h3 className="font-headline text-base tracking-wider text-gray-900 mb-5">Usporedba s konkurencijom</h3>
            <div className="space-y-4">
              {data.competitorMentions.map((comp) => {
                const pct = (comp.mentions / maxCompetitorMentions) * 100;
                return (
                  <div key={comp.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{comp.name}</span>
                      <span className="text-xs font-mono text-gray-500">{comp.mentions.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
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
                <Globe size={20} className="text-blue-700" />
                <h2 className="section-title">Nedavna spominjanja</h2>
              </div>
              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select
                    value={sentimentFilter}
                    onChange={(e) => setSentimentFilter(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none cursor-pointer"
                  >
                    {SENTIMENT_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none cursor-pointer"
                  >
                    {PLATFORM_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {filteredMentions.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">Nema rezultata za odabrane filtere.</div>
            ) : (
              <div className="space-y-3">
                {filteredMentions.map((mention) => {
                  const reachPct = (mention.reach / maxReach) * 100;
                  return (
                    <div key={mention.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={mention.platform} size="sm" />
                          <span className="text-sm font-medium text-blue-700">{mention.author}</span>
                          {sentimentIcon(mention.sentiment)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{mention.time}</span>
                          <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                            <Reply size={12} />
                            Odgovori
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{mention.text}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          mention.sentiment === 'positive' ? 'bg-green-50 text-green-700' :
                          mention.sentiment === 'negative' ? 'bg-red-50 text-red-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {sentimentLabel(mention.sentiment)}
                        </span>
                        <span className="text-xs text-gray-500">Doseg: {(mention.reach / 1000).toFixed(1)}K</span>
                        {/* Reach magnitude bar */}
                        <div className="flex-1 max-w-[120px]">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
                <div key={topic.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-mono w-4">{index + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{topic.topic}</p>
                      <p className="text-xs text-gray-500">{topic.mentions.toLocaleString()} spominjanja</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-mono ${
                      topic.velocity === 'u porastu' ? 'text-red-700' :
                      topic.velocity === 'raste' ? 'text-green-600' :
                      'text-gray-500'
                    }`}>
                      {topic.change}
                    </span>
                    <p className={`text-xs mt-0.5 ${
                      topic.velocity === 'u porastu' ? 'text-red-700' :
                      topic.velocity === 'raste' ? 'text-green-600' :
                      'text-gray-500'
                    }`}>
                      {topic.velocity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* AI Insights Panel                                                */}
        {/* ---------------------------------------------------------------- */}
        <AiInsightsPanel
          pageKey="social_listening"
          pageData={{
            metrics: data.metrics,
            topics: data.trendingTopics.slice(0, 5),
            mentions: data.recentMentions.slice(0, 3).map((m) => ({
              author: m.author,
              sentiment: m.sentiment,
              reach: m.reach,
            })),
          }}
        />
      </div>
    </div>
  );
}
