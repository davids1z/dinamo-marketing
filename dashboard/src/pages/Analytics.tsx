import React from 'react';
import Header from '../components/layout/Header';
import { ReachChart } from '../components/charts/ReachChart';
import { CampaignChart } from '../components/charts/CampaignChart';
import { FunnelChart } from '../components/charts/FunnelChart';
import { Eye, Heart, MessageCircle, Share2, Trophy } from 'lucide-react';

const reachData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 1, 4 + i);
  const isMatchDay = [0, 3, 7, 10, 14, 17, 21, 24, 28].includes(i);
  return {
    date: date.toISOString().split('T')[0],
    reach: Math.round(120000 + Math.random() * 80000 + (isMatchDay ? 180000 : 0)),
    impressions: Math.round(250000 + Math.random() * 150000 + (isMatchDay ? 350000 : 0)),
  };
});

const campaignData = [
  { name: 'UCL Matchday', meta: 42000, tiktok: 18000, youtube: 12000 },
  { name: 'Academy', meta: 15000, tiktok: 28000, youtube: 8000 },
  { name: 'Season Ticket', meta: 38000, tiktok: 5000, youtube: 3000 },
  { name: 'Diaspora', meta: 22000, tiktok: 12000, youtube: 18000 },
  { name: 'Kit Launch', meta: 35000, tiktok: 42000, youtube: 15000 },
];

const campaignBars = [
  { key: 'meta', name: 'Meta (IG + FB)', color: '#3b82f6' },
  { key: 'tiktok', name: 'TikTok', color: '#a855f7' },
  { key: 'youtube', name: 'YouTube', color: '#ef4444' },
];

const funnelSteps = [
  { label: 'Impressions', value: 4200000, color: '#60a5fa' },
  { label: 'Engagements', value: 315000, color: '#3b82f6' },
  { label: 'Profile Visits / Follows', value: 89000, color: '#6366f1' },
  { label: 'Website Visits', value: 42000, color: '#a855f7' },
  { label: 'Conversions', value: 8500, color: '#22c55e' },
];

const topPosts = [
  {
    id: 1,
    title: 'Reakcija na ždrijeb UCL grupe',
    platform: 'Instagram Reel',
    date: 'Feb 28, 2026',
    reach: 892000,
    engagement: 45200,
    engRate: 5.1,
  },
  {
    id: 2,
    title: 'Predstavljanje novog dresa — sezona 2026/27',
    platform: 'TikTok',
    date: 'Mar 1, 2026',
    reach: 756000,
    engagement: 52800,
    engRate: 7.0,
  },
  {
    id: 3,
    title: 'Petković hat-trick highlights',
    platform: 'Instagram Reel',
    date: 'Mar 2, 2026',
    reach: 645000,
    engagement: 38900,
    engRate: 6.0,
  },
  {
    id: 4,
    title: 'Pobjeda U19 akademije u finalu',
    platform: 'YouTube Short',
    date: 'Feb 25, 2026',
    reach: 412000,
    engagement: 21500,
    engRate: 5.2,
  },
  {
    id: 5,
    title: 'Navijačka koreografija — Maksimir',
    platform: 'Instagram Carousel',
    date: 'Feb 22, 2026',
    reach: 389000,
    engagement: 28400,
    engRate: 7.3,
  },
];

export default function Analytics() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header title="ANALITIKA" subtitle="Dubinska analitika performansi i uvidi" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Reach Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ReachChart data={reachData} title="Doseg i prikazivanja (30 dana)" />
        </div>

        {/* Campaign Comparison + Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <CampaignChart data={campaignData} bars={campaignBars} title="Performanse kampanja po platformi" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <FunnelChart steps={funnelSteps} title="Konverzijski lijevak" />
          </div>
        </div>

        {/* Top Performing Posts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={20} className="text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">Top 5 objava po performansu</h2>
          </div>

          <div className="space-y-3">
            {topPosts.map((post, index) => (
              <div key={post.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{post.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-dinamo-muted">{post.platform}</span>
                    <span className="text-xs text-dinamo-muted">|</span>
                    <span className="text-xs text-dinamo-muted">{post.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-dinamo-muted">
                      <Eye size={14} />
                      <span className="font-mono">{(post.reach / 1000).toFixed(0)}K</span>
                    </div>
                    <p className="text-xs text-dinamo-muted">Doseg</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-dinamo-muted">
                      <Heart size={14} />
                      <span className="font-mono">{(post.engagement / 1000).toFixed(1)}K</span>
                    </div>
                    <p className="text-xs text-dinamo-muted">Angažman</p>
                  </div>
                  <div className="text-center">
                    <span className={`font-mono font-bold ${post.engRate > 5 ? 'text-green-600' : 'text-gray-600'}`}>
                      {post.engRate}%
                    </span>
                    <p className="text-xs text-dinamo-muted">Stopa ang.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
