import React from 'react';
import Header from '../components/layout/Header';
import MetricCard from '../components/common/MetricCard';
import { EngagementChart } from '../components/charts/EngagementChart';
import { SentimentDonut } from '../components/charts/SentimentDonut';
import { Users, Eye, TrendingUp, CreditCard, BarChart3, Heart, MessageCircle, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';

const engagementData = [
  { date: '2026-02-27', engagement: 4200, reach: 125000 },
  { date: '2026-02-28', engagement: 5100, reach: 142000 },
  { date: '2026-03-01', engagement: 6800, reach: 198000 },
  { date: '2026-03-02', engagement: 4900, reach: 137000 },
  { date: '2026-03-03', engagement: 7200, reach: 215000 },
  { date: '2026-03-04', engagement: 5600, reach: 168000 },
  { date: '2026-03-05', engagement: 6100, reach: 182000 },
];

const recentActivity = [
  { id: 1, icon: UserPlus, text: '+2,340 new followers on Instagram this week', time: '2 hours ago', color: 'text-green-400' },
  { id: 2, icon: MessageCircle, text: '148 new comments on match day highlights reel', time: '4 hours ago', color: 'text-blue-400' },
  { id: 3, icon: TrendingUp, text: 'TikTok campaign CTR exceeded target by 18%', time: '6 hours ago', color: 'text-purple-400' },
  { id: 4, icon: AlertTriangle, text: 'Negative sentiment spike detected on Facebook (referee controversy)', time: '8 hours ago', color: 'text-yellow-400' },
  { id: 5, icon: CheckCircle, text: 'Monthly report generated and sent to stakeholders', time: '12 hours ago', color: 'text-emerald-400' },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header title="DASHBOARD" subtitle="Overview" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard label="Total Followers" value={1121000} previousValue={1050000} format="number" icon={Users} />
          <MetricCard label="Monthly Reach" value={4200000} previousValue={3800000} format="number" icon={Eye} />
          <MetricCard label="Engagement Rate" value={2.8} previousValue={2.5} format="percent" icon={TrendingUp} />
          <MetricCard label="Ad Spend" value={12450} previousValue={11200} format="currency" icon={CreditCard} />
          <MetricCard label="ROAS" value={3.2} previousValue={2.8} format="number" icon={BarChart3} />
          <MetricCard label="Sentiment Score" value={78} previousValue={72} format="percent" icon={Heart} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-6">
            <EngagementChart data={engagementData} title="Engagement & Reach (Last 7 Days)" />
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <SentimentDonut positive={65} neutral={25} negative={10} title="Overall Sentiment" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                  <div className={`mt-0.5 ${item.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200">{item.text}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
