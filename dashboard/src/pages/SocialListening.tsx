import React from 'react';
import Header from '../components/layout/Header';
import MetricCard from '../components/common/MetricCard';
import PlatformIcon from '../components/common/PlatformIcon';
import { MessageSquare, Volume2, TrendingUp, Hash, Globe, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

const recentMentions = [
  {
    id: 1,
    platform: 'twitter',
    author: '@FootballCroatia',
    text: 'Dinamo Zagreb continues to impress in the UCL group stage. Their academy pipeline is unmatched in the region. #DynamoZagreb #UCL',
    sentiment: 'positive',
    time: '15 min ago',
    reach: 12400,
  },
  {
    id: 2,
    platform: 'instagram',
    author: '@balkan_football_daily',
    text: 'Petkovic scores a brace! Dinamo showing why they are the dominant force in Croatian football. The new kit looks incredible too.',
    sentiment: 'positive',
    time: '1 hour ago',
    reach: 8900,
  },
  {
    id: 3,
    platform: 'facebook',
    author: 'Dinamo Fan Club Vienna',
    text: 'Watching tonight\'s match at our fan hub in Wien. 200+ Croatian diaspora fans. Atmosphere is electric! Ajmo Dinamo!',
    sentiment: 'positive',
    time: '2 hours ago',
    reach: 3200,
  },
  {
    id: 4,
    platform: 'tiktok',
    author: '@hrvatski_sport',
    text: 'Another questionable referee decision against Dinamo. The league needs VAR consistency. This is getting ridiculous.',
    sentiment: 'negative',
    time: '3 hours ago',
    reach: 45000,
  },
  {
    id: 5,
    platform: 'youtube',
    author: 'Balkan Sports TV',
    text: 'Analysis: How Dinamo Zagreb\'s 3-4-3 formation is revolutionizing their attacking play this season. Full breakdown in our latest video.',
    sentiment: 'neutral',
    time: '5 hours ago',
    reach: 18500,
  },
];

const trendingTopics = [
  { id: 1, topic: '#DinamoZagreb', mentions: 4250, change: '+32%', velocity: 'rising' },
  { id: 2, topic: '#UCL', mentions: 3800, change: '+28%', velocity: 'rising' },
  { id: 3, topic: 'Petkovic', mentions: 2100, change: '+65%', velocity: 'spiking' },
  { id: 4, topic: '#Maksimir', mentions: 1450, change: '+12%', velocity: 'stable' },
  { id: 5, topic: '#HNL', mentions: 1200, change: '+8%', velocity: 'stable' },
  { id: 6, topic: '#DynamoAcademy', mentions: 890, change: '+45%', velocity: 'rising' },
  { id: 7, topic: 'Transfer Rumors', mentions: 760, change: '+120%', velocity: 'spiking' },
];

const sentimentIcon = (s: string) => {
  if (s === 'positive') return <ThumbsUp size={14} className="text-green-400" />;
  if (s === 'negative') return <ThumbsDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-gray-400" />;
};

export default function SocialListening() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header title="SOCIAL LISTENING" subtitle="Brand Monitoring & Mention Tracking" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Total Mentions" value={2450} previousValue={1980} format="number" icon={MessageSquare} />
          <MetricCard label="Share of Voice" value={38} previousValue={32} format="percent" icon={Volume2} />
          <MetricCard label="Trending Topics" value={7} format="number" icon={TrendingUp} />
        </div>

        {/* Mentions + Topics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Mentions */}
          <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={20} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Recent Mentions</h2>
            </div>
            <div className="space-y-3">
              {recentMentions.map((mention) => (
                <div key={mention.id} className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={mention.platform} size={16} />
                      <span className="text-sm font-medium text-blue-400">{mention.author}</span>
                      {sentimentIcon(mention.sentiment)}
                    </div>
                    <span className="text-xs text-gray-500">{mention.time}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-2 leading-relaxed">{mention.text}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      mention.sentiment === 'positive' ? 'bg-green-900/40 text-green-400' :
                      mention.sentiment === 'negative' ? 'bg-red-900/40 text-red-400' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {mention.sentiment}
                    </span>
                    <span className="text-xs text-gray-500">Reach: {(mention.reach / 1000).toFixed(1)}K</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Topics */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Hash size={20} className="text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Trending Topics</h2>
            </div>
            <div className="space-y-3">
              {trendingTopics.map((topic, index) => (
                <div key={topic.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-mono w-4">{index + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{topic.topic}</p>
                      <p className="text-xs text-gray-500">{topic.mentions.toLocaleString()} mentions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-mono ${
                      topic.velocity === 'spiking' ? 'text-red-400' :
                      topic.velocity === 'rising' ? 'text-green-400' :
                      'text-gray-400'
                    }`}>
                      {topic.change}
                    </span>
                    <p className={`text-xs mt-0.5 ${
                      topic.velocity === 'spiking' ? 'text-red-400' :
                      topic.velocity === 'rising' ? 'text-green-400' :
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
      </main>
    </div>
  );
}
