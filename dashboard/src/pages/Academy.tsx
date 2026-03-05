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
  { key: 'name', header: 'Igrač', render: (row: PlayerRow) => (
    <div className="flex items-center gap-2">
      <span className="text-white font-medium">{row.name}</span>
      {row.featured && <Star size={14} className="text-yellow-400" />}
    </div>
  )},
  { key: 'position', header: 'Poz', render: (row: PlayerRow) => (
    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 font-mono">{row.position}</span>
  )},
  { key: 'ageGroup', header: 'Dobna skupina', render: (row: PlayerRow) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      row.ageGroup === 'U17' ? 'bg-green-900/40 text-green-400' :
      row.ageGroup === 'U19' ? 'bg-blue-900/40 text-blue-400' :
      'bg-purple-900/40 text-purple-400'
    }`}>
      {row.ageGroup}
    </span>
  )},
  { key: 'appearances', header: 'Nast', render: (row: PlayerRow) => <span className="text-gray-300 font-mono">{row.appearances}</span> },
  { key: 'goals', header: 'G', render: (row: PlayerRow) => <span className="text-gray-300 font-mono">{row.goals}</span> },
  { key: 'assists', header: 'A', render: (row: PlayerRow) => <span className="text-gray-300 font-mono">{row.assists}</span> },
  { key: 'socialMentions', header: 'Spominjanja', render: (row: PlayerRow) => (
    <span className="text-dinamo-muted font-mono">{(row.socialMentions / 1000).toFixed(1)}K</span>
  )},
  { key: 'featured', header: 'Sadržaj', render: (row: PlayerRow) => (
    <span className={`text-xs ${row.featured ? 'text-green-400' : 'text-dinamo-muted'}`}>
      {row.featured ? 'Istaknuto' : 'U čekanju'}
    </span>
  )},
];

const contentPipeline = [
  { id: 1, title: 'U19 finale highlights reel', type: 'Video', platform: 'Instagram + TikTok', status: 'U produkciji', due: 'Mar 7' },
  { id: 2, title: 'Perišić: Od U17 do prvog tima', type: 'Dokumentarac', platform: 'YouTube', status: 'Pregled scenarija', due: 'Mar 12' },
  { id: 3, title: 'Promocija upisa na kamp akademije', type: 'Karusel', platform: 'Instagram + Facebook', status: 'Spremno', due: 'Mar 6' },
  { id: 4, title: 'Omladinski kup iza kulisa', type: 'Serija priča', platform: 'Instagram', status: 'Snimanje', due: 'Mar 9' },
  { id: 5, title: 'Mjesečni bilten akademije', type: 'Email + Web', platform: 'Web stranica', status: 'Nacrt', due: 'Mar 15' },
];

export default function Academy() {
  return (
    <div className="min-h-screen bg-dinamo-dark text-white">
      <Header title="AKADEMIJA" subtitle="Razvoj mladih i sadržajni pipeline" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Promovirani igrači" value={8} previousValue={5} format="number" icon={GraduationCap} />
          <MetricCard label="Prihodi od transfera" value={45000000} previousValue={32000000} format="currency" icon={DollarSign} />
          <MetricCard label="Aktivni kampovi" value={4} format="number" icon={Users} />
        </div>

        {/* Players Table */}
        <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Popis talenata akademije</h2>
          <DataTable columns={columns} data={academyPlayers} emptyMessage="Nema pronađenih igrača" />
        </div>

        {/* Content Pipeline */}
        <div className="bg-dinamo-dark-card rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Video size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Sadržajni pipeline</h2>
          </div>
          <div className="space-y-3">
            {contentPipeline.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-dinamo-dark-light/50 rounded-lg hover:bg-dinamo-dark-light transition-colors">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white">{item.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-dinamo-muted">{item.type}</span>
                    <span className="text-xs text-dinamo-muted">|</span>
                    <span className="text-xs text-dinamo-muted">{item.platform}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === 'Spremno' ? 'bg-green-900/40 text-green-400' :
                    item.status === 'U produkciji' || item.status === 'Snimanje' ? 'bg-blue-900/40 text-blue-400' :
                    item.status === 'Pregled scenarija' ? 'bg-yellow-900/40 text-yellow-400' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {item.status}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-dinamo-muted">
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
