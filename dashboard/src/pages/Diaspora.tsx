import React from 'react';
import Header from '../components/layout/Header';
import { ComparisonBar } from '../components/charts/ComparisonBar';
import { Globe, Users, MapPin, Languages, Calendar, ArrowRight } from 'lucide-react';

const communities = [
  { country: 'Germany', city: 'Multiple cities', population: 500000, activeMembers: 12400, fanClubs: 8, engagement: 4.2, flag: '🇩🇪' },
  { country: 'Austria', city: 'Vienna, Salzburg', population: 150000, activeMembers: 8200, fanClubs: 5, engagement: 5.1, flag: '🇦🇹' },
  { country: 'United States', city: 'Chicago, NYC, LA', population: 130000, activeMembers: 4800, fanClubs: 4, engagement: 3.8, flag: '🇺🇸' },
  { country: 'Canada', city: 'Toronto, Vancouver', population: 80000, activeMembers: 2900, fanClubs: 3, engagement: 3.5, flag: '🇨🇦' },
  { country: 'Switzerland', city: 'Zurich, Basel', population: 60000, activeMembers: 3100, fanClubs: 3, engagement: 4.5, flag: '🇨🇭' },
  { country: 'Australia', city: 'Sydney, Melbourne', population: 50000, activeMembers: 2200, fanClubs: 2, engagement: 3.2, flag: '🇦🇺' },
  { country: 'Sweden', city: 'Stockholm, Malmo', population: 45000, activeMembers: 1800, fanClubs: 2, engagement: 3.9, flag: '🇸🇪' },
  { country: 'Ireland', city: 'Dublin', population: 25000, activeMembers: 1100, fanClubs: 1, engagement: 4.0, flag: '🇮🇪' },
  { country: 'Norway', city: 'Oslo, Bergen', population: 20000, activeMembers: 950, fanClubs: 1, engagement: 3.6, flag: '🇳🇴' },
];

const communityComparison = communities.map(c => ({
  name: c.country,
  value: c.population,
}));

const contentPipeline = [
  {
    id: 1,
    title: 'Match Day Live Thread - UCL',
    languages: ['HR', 'EN', 'DE'],
    platform: 'All Platforms',
    date: 'Mar 7, 2026',
    status: 'Scheduled',
    description: 'Multi-language real-time match updates for diaspora fans across timezones',
  },
  {
    id: 2,
    title: 'Fan Hub Vienna - Event Recap',
    languages: ['HR', 'DE'],
    platform: 'Instagram + Facebook',
    date: 'Mar 8, 2026',
    status: 'In Production',
    description: 'Video recap of diaspora watch party featuring 200+ fans in Vienna',
  },
  {
    id: 3,
    title: 'Dinamo Diaspora Newsletter',
    languages: ['HR', 'EN'],
    platform: 'Email',
    date: 'Mar 10, 2026',
    status: 'Draft',
    description: 'Monthly newsletter with club updates, match highlights, and community spotlights',
  },
  {
    id: 4,
    title: 'How to Watch: Streaming Guide',
    languages: ['EN', 'DE'],
    platform: 'Website + Social',
    date: 'Mar 6, 2026',
    status: 'Ready',
    description: 'Updated guide for diaspora fans on how to watch Dinamo matches by country',
  },
  {
    id: 5,
    title: 'Player Video Message - German Fans',
    languages: ['DE', 'HR'],
    platform: 'TikTok + Instagram',
    date: 'Mar 12, 2026',
    status: 'Script Review',
    description: 'Personalized video greeting from players to German diaspora community',
  },
];

const langColors: Record<string, string> = {
  HR: 'bg-red-900/40 text-red-400 border-red-800/50',
  EN: 'bg-blue-900/40 text-blue-400 border-blue-800/50',
  DE: 'bg-yellow-900/40 text-yellow-400 border-yellow-800/50',
};

export default function Diaspora() {
  const totalPopulation = communities.reduce((sum, c) => sum + c.population, 0);
  const totalActive = communities.reduce((sum, c) => sum + c.activeMembers, 0);
  const totalClubs = communities.reduce((sum, c) => sum + c.fanClubs, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header title="DIASPORA" subtitle="Diaspora Community Engagement & Outreach" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 text-gray-400 mb-1"><Globe size={16} />Countries</div>
            <p className="text-3xl font-bold text-white">{communities.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 text-gray-400 mb-1"><Users size={16} />Total Diaspora</div>
            <p className="text-3xl font-bold text-white">{(totalPopulation / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 text-gray-400 mb-1"><Users size={16} />Active Online</div>
            <p className="text-3xl font-bold text-white">{(totalActive / 1000).toFixed(1)}K</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 text-gray-400 mb-1"><MapPin size={16} />Fan Clubs</div>
            <p className="text-3xl font-bold text-white">{totalClubs}</p>
          </div>
        </div>

        {/* Community Comparison */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <ComparisonBar data={communityComparison} title="Diaspora Population by Country" valueLabel="Population" />
        </div>

        {/* Community List */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Community Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((community) => (
              <div key={community.country} className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors border border-gray-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{community.flag}</span>
                  <div>
                    <h3 className="text-sm font-medium text-white">{community.country}</h3>
                    <p className="text-xs text-gray-500">{community.city}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Population</p>
                    <p className="text-gray-200 font-mono">{(community.population / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Active Members</p>
                    <p className="text-gray-200 font-mono">{(community.activeMembers / 1000).toFixed(1)}K</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Fan Clubs</p>
                    <p className="text-gray-200">{community.fanClubs}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Engagement</p>
                    <p className="text-green-400">{community.engagement}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Language Content Pipeline */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Languages size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Multi-Language Content Pipeline</h2>
          </div>
          <div className="space-y-3">
            {contentPipeline.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium text-white">{item.title}</h3>
                    {item.languages.map((lang) => (
                      <span key={lang} className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${langColors[lang] || 'bg-gray-700 text-gray-300'}`}>
                        {lang}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-600">{item.platform}</span>
                    <span className="text-xs text-gray-700">|</span>
                    <span className="text-xs text-gray-600 flex items-center gap-1"><Calendar size={10} />{item.date}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-4 ${
                  item.status === 'Ready' ? 'bg-green-900/40 text-green-400' :
                  item.status === 'Scheduled' ? 'bg-blue-900/40 text-blue-400' :
                  item.status === 'In Production' ? 'bg-purple-900/40 text-purple-400' :
                  item.status === 'Script Review' ? 'bg-yellow-900/40 text-yellow-400' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
