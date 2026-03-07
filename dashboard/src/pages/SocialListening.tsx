import React from 'react';
import Header from '../components/layout/Header';
import { useApi } from '../hooks/useApi';
import { PageLoader, ErrorState } from '../components/common/LoadingSpinner';
import MetricCard from '../components/common/MetricCard';
import PlatformIcon from '../components/common/PlatformIcon';
import { MessageSquare, Volume2, TrendingUp, Hash, Globe, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

interface SocialListeningData {
  metrics: {
    totalMentions: number;
    prevMentions: number;
    shareOfVoice: number;
    prevShareOfVoice: number;
    trendingCount: number;
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
}

// Fallback mock data for when API is not available
const fallbackData: SocialListeningData = {
  metrics: {
    totalMentions: 2450,
    prevMentions: 1980,
    shareOfVoice: 38,
    prevShareOfVoice: 32,
    trendingCount: 7,
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
      text: 'Watching tonight\'s match at our fan hub in Wien. 200+ Croatian diaspora fans. Atmosphere is electric! Ajmo Dinamo!',
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
      text: 'Analysis: How Dinamo Zagreb\'s 3-4-3 formation is revolutionizing their attacking play this season. Full breakdown in our latest video.',
      sentiment: 'neutral',
      time: 'prije 5 sati',
      reach: 18500,
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
};

const sentimentIcon = (s: string) => {
  if (s === 'positive') return <ThumbsUp size={14} className="text-green-600" />;
  if (s === 'negative') return <ThumbsDown size={14} className="text-red-700" />;
  return <Minus size={14} className="text-gray-500" />;
};

export default function SocialListening() {
  const { data: apiData, loading, error, refetch } = useApi<SocialListeningData>('/social-listening/trending');
  const data = apiData || fallbackData;

  if (loading && !apiData) return <><Header title="SOCIAL LISTENING" subtitle="Pra\u0107enje brenda i spominjanja" /><PageLoader /></>;

  return (
    <div className="animate-fade-in">
      <Header title="SOCIAL LISTENING" subtitle="Pra\u0107enje brenda i spominjanja" />

      <div className="page-wrapper space-y-6">


        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Ukupno spominjanja" value={data.metrics.totalMentions} previousValue={data.metrics.prevMentions} format="number" icon={MessageSquare} />
          <MetricCard label="Udio u komunikaciji" value={data.metrics.shareOfVoice} previousValue={data.metrics.prevShareOfVoice} format="percent" icon={Volume2} />
          <MetricCard label="Trendovi" value={data.metrics.trendingCount} format="number" icon={TrendingUp} />
        </div>

        {/* Mentions + Topics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Mentions */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={20} className="text-blue-700" />
              <h2 className="section-title">Nedavna spominjanja</h2>
            </div>
            <div className="space-y-3">
              {data.recentMentions.map((mention) => (
                <div key={mention.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={mention.platform} size="sm" />
                      <span className="text-sm font-medium text-blue-700">{mention.author}</span>
                      {sentimentIcon(mention.sentiment)}
                    </div>
                    <span className="text-xs text-gray-500">{mention.time}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">{mention.text}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      mention.sentiment === 'positive' ? 'bg-green-50 text-green-700' :
                      mention.sentiment === 'negative' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {mention.sentiment}
                    </span>
                    <span className="text-xs text-gray-500">Doseg: {(mention.reach / 1000).toFixed(1)}K</span>
                  </div>
                </div>
              ))}
            </div>
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
      </div>
    </div>
  );
}
