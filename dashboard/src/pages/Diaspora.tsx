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
    title: 'Utakmica uživo thread — UCL',
    languages: ['HR', 'EN', 'DE'],
    platform: 'Sve platforme',
    date: 'Mar 7, 2026',
    status: 'Zakazano',
    description: 'Višejezična ažuriranja utakmica u realnom vremenu za navijače dijaspore u svim vremenskim zonama',
  },
  {
    id: 2,
    title: 'Fan hub Beč — pregled eventa',
    languages: ['HR', 'DE'],
    platform: 'Instagram + Facebook',
    date: 'Mar 8, 2026',
    status: 'U produkciji',
    description: 'Video pregled watch partyja dijaspore s 200+ navijača u Beču',
  },
  {
    id: 3,
    title: 'Dinamo bilten dijaspore',
    languages: ['HR', 'EN'],
    platform: 'Email',
    date: 'Mar 10, 2026',
    status: 'Nacrt',
    description: 'Mjesečni bilten s novostima kluba, highlightsima utakmica i pregledom zajednice',
  },
  {
    id: 4,
    title: 'Kako gledati: Vodič za streaming',
    languages: ['EN', 'DE'],
    platform: 'Website + Social',
    date: 'Mar 6, 2026',
    status: 'Spremno',
    description: 'Ažurirani vodič za navijače dijaspore o gledanju Dinamovih utakmica po državama',
  },
  {
    id: 5,
    title: 'Video poruka igrača — njemački navijači',
    languages: ['DE', 'HR'],
    platform: 'TikTok + Instagram',
    date: 'Mar 12, 2026',
    status: 'Pregled scenarija',
    description: 'Personalizirani video pozdrav igrača zajednici njemačke dijaspore',
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
    <div className="min-h-screen bg-dinamo-dark text-white">
      <Header title="DIJASPORA" subtitle="Angažman i pristup zajednicama dijaspore" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 text-dinamo-muted mb-1"><Globe size={16} />Država</div>
            <p className="text-3xl font-bold text-white">{communities.length}</p>
          </div>
          <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 text-dinamo-muted mb-1"><Users size={16} />Ukupna dijaspora</div>
            <p className="text-3xl font-bold text-white">{(totalPopulation / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 text-dinamo-muted mb-1"><Users size={16} />Aktivni online</div>
            <p className="text-3xl font-bold text-white">{(totalActive / 1000).toFixed(1)}K</p>
          </div>
          <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 text-dinamo-muted mb-1"><MapPin size={16} />Navijački klubovi</div>
            <p className="text-3xl font-bold text-white">{totalClubs}</p>
          </div>
        </div>

        {/* Community Comparison */}
        <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
          <ComparisonBar data={communityComparison} title="Populacija dijaspore po državama" valueLabel="Population" />
        </div>

        {/* Community List */}
        <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Detalji zajednice</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((community) => (
              <div key={community.country} className="bg-dinamo-dark-light/50 rounded-lg p-4 hover:bg-dinamo-dark-light transition-colors border border-gray-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{community.flag}</span>
                  <div>
                    <h3 className="text-sm font-medium text-white">{community.country}</h3>
                    <p className="text-xs text-dinamo-muted">{community.city}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-dinamo-muted text-xs">Population</p>
                    <p className="text-gray-200 font-mono">{(community.population / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-dinamo-muted text-xs">Active Members</p>
                    <p className="text-gray-200 font-mono">{(community.activeMembers / 1000).toFixed(1)}K</p>
                  </div>
                  <div>
                    <p className="text-dinamo-muted text-xs">Fan Clubs</p>
                    <p className="text-gray-200">{community.fanClubs}</p>
                  </div>
                  <div>
                    <p className="text-dinamo-muted text-xs">Engagement</p>
                    <p className="text-green-400">{community.engagement}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Language Content Pipeline */}
        <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Languages size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Višejezični sadržajni pipeline</h2>
          </div>
          <div className="space-y-3">
            {contentPipeline.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-dinamo-dark-light/50 rounded-lg hover:bg-dinamo-dark-light transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium text-white">{item.title}</h3>
                    {item.languages.map((lang) => (
                      <span key={lang} className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${langColors[lang] || 'bg-gray-700 text-gray-300'}`}>
                        {lang}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-dinamo-muted mt-1">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-dinamo-muted">{item.platform}</span>
                    <span className="text-xs text-gray-700">|</span>
                    <span className="text-xs text-dinamo-muted flex items-center gap-1"><Calendar size={10} />{item.date}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-4 ${
                  item.status === 'Spremno' ? 'bg-green-900/40 text-green-400' :
                  item.status === 'Zakazano' ? 'bg-blue-900/40 text-blue-400' :
                  item.status === 'U produkciji' ? 'bg-purple-900/40 text-purple-400' :
                  item.status === 'Pregled scenarija' ? 'bg-yellow-900/40 text-yellow-400' :
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
