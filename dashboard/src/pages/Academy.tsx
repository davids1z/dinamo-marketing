import React from 'react';
import Header from '../components/layout/Header';
import MetricCard from '../components/common/MetricCard';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import { GraduationCap, DollarSign, Users, Star, Video, FileText, Calendar } from 'lucide-react';

interface PlayerRow {
  id: number;
  name: string;
  position: string;
  ageGroup: string;
  appearances: number;
  goals: number;
  assists: number;
  featured: boolean;
  socialMentions: number;
}

const academyPlayers: PlayerRow[] = [
  { id: 1, name: 'Luka Stojkovic', position: 'CM', ageGroup: 'U21', appearances: 18, goals: 5, assists: 7, featured: true, socialMentions: 3400 },
  { id: 2, name: 'Mateo Horvat', position: 'CB', ageGroup: 'U19', appearances: 22, goals: 1, assists: 2, featured: true, socialMentions: 2100 },
  { id: 3, name: 'Ivan Juric', position: 'RW', ageGroup: 'U21', appearances: 15, goals: 8, assists: 3, featured: true, socialMentions: 4800 },
  { id: 4, name: 'Ante Radovic', position: 'GK', ageGroup: 'U19', appearances: 20, goals: 0, assists: 0, featured: false, socialMentions: 1200 },
  { id: 5, name: 'Filip Bozic', position: 'LB', ageGroup: 'U21', appearances: 16, goals: 0, assists: 4, featured: false, socialMentions: 890 },
  { id: 6, name: 'Marko Perisic', position: 'ST', ageGroup: 'U17', appearances: 12, goals: 11, assists: 2, featured: true, socialMentions: 5200 },
  { id: 7, name: 'Dario Kovacevic', position: 'AM', ageGroup: 'U19', appearances: 19, goals: 6, assists: 8, featured: true, socialMentions: 3800 },
  { id: 8, name: 'Josip Vukovic', position: 'DM', ageGroup: 'U21', appearances: 21, goals: 2, assists: 5, featured: false, socialMentions: 1500 },
  { id: 9, name: 'Nikola Babic', position: 'RB', ageGroup: 'U17', appearances: 10, goals: 0, assists: 3, featured: false, socialMentions: 720 },
  { id: 10, name: 'Tomislav Maric', position: 'LW', ageGroup: 'U19', appearances: 14, goals: 4, assists: 6, featured: true, socialMentions: 2900 },
];

const columns = [
  { key: 'name', header: 'Player', render: (row: PlayerRow) => (
    <div className="flex items-center gap-2">
      <span className="text-white font-medium">{row.name}</span>
      {row.featured && <Star size={14} className="text-yellow-400" />}
    </div>
  )},
  { key: 'position', header: 'Pos', render: (row: PlayerRow) => (
    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 font-mono">{row.position}</span>
  )},
  { key: 'ageGroup', header: 'Age Group', render: (row: PlayerRow) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      row.ageGroup === 'U17' ? 'bg-green-900/40 text-green-400' :
      row.ageGroup === 'U19' ? 'bg-blue-900/40 text-blue-400' :
      'bg-purple-900/40 text-purple-400'
    }`}>
      {row.ageGroup}
    </span>
  )},
  { key: 'appearances', header: 'Apps', render: (row: PlayerRow) => <span className="text-gray-300 font-mono">{row.appearances}</span> },
  { key: 'goals', header: 'G', render: (row: PlayerRow) => <span className="text-gray-300 font-mono">{row.goals}</span> },
  { key: 'assists', header: 'A', render: (row: PlayerRow) => <span className="text-gray-300 font-mono">{row.assists}</span> },
  { key: 'socialMentions', header: 'Social Mentions', render: (row: PlayerRow) => (
    <span className="text-gray-400 font-mono">{(row.socialMentions / 1000).toFixed(1)}K</span>
  )},
  { key: 'featured', header: 'Content', render: (row: PlayerRow) => (
    <span className={`text-xs ${row.featured ? 'text-green-400' : 'text-gray-600'}`}>
      {row.featured ? 'Featured' : 'Pending'}
    </span>
  )},
];

const contentPipeline = [
  { id: 1, title: 'U19 Final Highlights Reel', type: 'Video', platform: 'Instagram + TikTok', status: 'In Production', due: 'Mar 7' },
  { id: 2, title: 'Perisic: From U17 to First Team', type: 'Documentary', platform: 'YouTube', status: 'Script Review', due: 'Mar 12' },
  { id: 3, title: 'Academy Camp Registration Promo', type: 'Carousel', platform: 'Instagram + Facebook', status: 'Ready', due: 'Mar 6' },
  { id: 4, title: 'Youth Cup Behind the Scenes', type: 'Story Series', platform: 'Instagram', status: 'Shooting', due: 'Mar 9' },
  { id: 5, title: 'Monthly Academy Newsletter', type: 'Email + Web', platform: 'Website', status: 'Draft', due: 'Mar 15' },
];

export default function Academy() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header title="ACADEMY" subtitle="Youth Development & Content Pipeline" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Players Promoted" value={8} previousValue={5} format="number" icon={GraduationCap} />
          <MetricCard label="Transfer Revenue" value={45000000} previousValue={32000000} format="currency" icon={DollarSign} />
          <MetricCard label="Active Camps" value={4} format="number" icon={Users} />
        </div>

        {/* Players Table */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Academy Talent Roster</h2>
          <DataTable columns={columns} data={academyPlayers} emptyMessage="No players found" />
        </div>

        {/* Content Pipeline */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Video size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Content Pipeline</h2>
          </div>
          <div className="space-y-3">
            {contentPipeline.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white">{item.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{item.type}</span>
                    <span className="text-xs text-gray-600">|</span>
                    <span className="text-xs text-gray-500">{item.platform}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === 'Ready' ? 'bg-green-900/40 text-green-400' :
                    item.status === 'In Production' || item.status === 'Shooting' ? 'bg-blue-900/40 text-blue-400' :
                    item.status === 'Script Review' ? 'bg-yellow-900/40 text-yellow-400' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {item.status}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar size={12} />
                    {item.due}
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
