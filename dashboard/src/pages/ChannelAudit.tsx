import React from 'react';
import Header from '../components/layout/Header';
import MetricCard from '../components/common/MetricCard';
import PlatformIcon from '../components/common/PlatformIcon';
import { EngagementChart } from '../components/charts/EngagementChart';
import { Users, TrendingUp, Eye, BarChart3, Globe } from 'lucide-react';

const platformStats = [
  { platform: 'instagram', followers: 567000, prevFollowers: 542000, engagement: 3.2, prevEngagement: 2.9, reach: 1800000, icon: Users },
  { platform: 'facebook', followers: 320000, prevFollowers: 312000, engagement: 1.8, prevEngagement: 1.6, reach: 950000, icon: Users },
  { platform: 'tiktok', followers: 89000, prevFollowers: 72000, engagement: 5.4, prevEngagement: 4.8, reach: 620000, icon: Users },
  { platform: 'youtube', followers: 145000, prevFollowers: 138000, engagement: 2.1, prevEngagement: 1.9, reach: 480000, icon: Users },
  { platform: 'web', followers: 180000, prevFollowers: 165000, engagement: 1.2, prevEngagement: 1.0, reach: 320000, icon: Globe },
];

const engagementData30 = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 1, 4 + i);
  const isMatchDay = [0, 3, 7, 10, 14, 17, 21, 24, 28].includes(i);
  return {
    date: date.toISOString().split('T')[0],
    engagement: Math.round(3000 + Math.random() * 4000 + (isMatchDay ? 5000 : 0)),
    reach: Math.round(80000 + Math.random() * 120000 + (isMatchDay ? 150000 : 0)),
  };
});

const formatBreakdown = [
  { type: 'Reels / Short Video', share: 42, posts: 126, avgEngagement: 4.8 },
  { type: 'Static Image', share: 24, posts: 72, avgEngagement: 2.1 },
  { type: 'Carousel', share: 18, posts: 54, avgEngagement: 3.4 },
  { type: 'Stories', share: 10, posts: 30, avgEngagement: 1.8 },
  { type: 'Long-form Video', share: 6, posts: 18, avgEngagement: 2.9 },
];

export default function ChannelAudit() {
  return (
    <div className="min-h-screen bg-dinamo-dark text-white">
      <Header title="AUDIT KANALA" subtitle="Performanse platformi i provjera zdravlja" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Platform Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {platformStats.map((p) => (
            <div key={p.platform} className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <PlatformIcon platform={p.platform} size={28} showLabel />
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  p.followers > p.prevFollowers ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                }`}>
                  {p.followers > p.prevFollowers ? '+' : ''}{(((p.followers - p.prevFollowers) / p.prevFollowers) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {p.platform === 'web'
                    ? `${(p.followers / 1000).toFixed(0)}K visits`
                    : p.followers >= 1000000
                      ? `${(p.followers / 1000000).toFixed(1)}M`
                      : `${(p.followers / 1000).toFixed(0)}K`
                  }
                </p>
                <p className="text-xs text-dinamo-muted mt-1">
                  Stopa ang.: <span className="text-gray-300">{p.engagement}%</span>
                </p>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(p.engagement * 15, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Engagement Over Time */}
        <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
          <EngagementChart data={engagementData30} title="30-dnevni angažman i doseg (sve platforme)" />
        </div>

        {/* Format Breakdown */}
        <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Raspodjela formata sadržaja</h2>
          <div className="space-y-3">
            {formatBreakdown.map((f) => (
              <div key={f.type} className="flex items-center gap-4">
                <span className="text-sm text-gray-300 w-40 shrink-0">{f.type}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-blue-400 h-3 rounded-full transition-all"
                    style={{ width: `${f.share}%` }}
                  />
                </div>
                <span className="text-sm text-dinamo-muted w-12 text-right">{f.share}%</span>
                <span className="text-sm text-dinamo-muted w-20 text-right">{f.posts} objava</span>
                <span className="text-sm text-emerald-400 w-16 text-right">{f.avgEngagement}% ang</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
