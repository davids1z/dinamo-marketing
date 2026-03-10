import Header from '../components/layout/Header';
import { useApi } from '../hooks/useApi';
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSpinner';
import MetricCard from '../components/common/MetricCard';
import DataTable from '../components/common/DataTable';
import { GraduationCap, DollarSign, Users, Star, Video, Calendar } from 'lucide-react';
import AiInsightsPanel from '../components/common/AiInsightsPanel';

interface PartnerRow extends Record<string, unknown> {
  id: number;
  name: string;
  category: string;
  tier: string;
  campaigns: number;
  reach: number;
  conversions: number;
  featured: boolean;
  socialMentions: number;
}

interface PartnersData {
  metrics: {
    promotedPartners: number;
    prevPromotedPartners: number;
    partnerRevenue: number;
    prevPartnerRevenue: number;
    activePrograms: number;
  };
  partners: PartnerRow[];
  contentPipeline: Array<{
    id: number;
    title: string;
    type: string;
    platform: string;
    status: string;
    due: string;
  }>;
}

// Fallback mock data for when API is not available
const fallbackData: PartnersData = {
  metrics: {
    promotedPartners: 8,
    prevPromotedPartners: 5,
    partnerRevenue: 45000000,
    prevPartnerRevenue: 32000000,
    activePrograms: 4,
  },
  partners: [
    { id: 1, name: 'TechNova Solutions', category: 'Tehnologija', tier: 'Premium', campaigns: 18, reach: 5000, conversions: 7, featured: true, socialMentions: 3400 },
    { id: 2, name: 'EcoVerde Brand', category: 'Održivost', tier: 'Standard', campaigns: 22, reach: 1000, conversions: 2, featured: true, socialMentions: 2100 },
    { id: 3, name: 'UrbanStyle Co.', category: 'Moda', tier: 'Premium', campaigns: 15, reach: 8000, conversions: 3, featured: true, socialMentions: 4800 },
    { id: 4, name: 'FreshBite Foods', category: 'Hrana', tier: 'Standard', campaigns: 20, reach: 0, conversions: 0, featured: false, socialMentions: 1200 },
    { id: 5, name: 'MoveWell Fitness', category: 'Zdravlje', tier: 'Premium', campaigns: 16, reach: 0, conversions: 4, featured: false, socialMentions: 890 },
    { id: 6, name: 'BrightSpark Media', category: 'Mediji', tier: 'Kreator', campaigns: 12, reach: 11000, conversions: 2, featured: true, socialMentions: 5200 },
    { id: 7, name: 'CloudPeak Digital', category: 'SaaS', tier: 'Standard', campaigns: 19, reach: 6000, conversions: 8, featured: true, socialMentions: 3800 },
    { id: 8, name: 'GreenLeaf Organics', category: 'Organska hrana', tier: 'Premium', campaigns: 21, reach: 2000, conversions: 5, featured: false, socialMentions: 1500 },
    { id: 9, name: 'PixelCraft Studio', category: 'Dizajn', tier: 'Kreator', campaigns: 10, reach: 0, conversions: 3, featured: false, socialMentions: 720 },
    { id: 10, name: 'VitalWave Health', category: 'Wellness', tier: 'Standard', campaigns: 14, reach: 4000, conversions: 6, featured: true, socialMentions: 2900 },
  ],
  contentPipeline: [
    { id: 1, title: 'Highlights kampanje TechNova', type: 'Video', platform: 'Instagram + TikTok', status: 'U produkciji', due: 'Mar 7' },
    { id: 2, title: 'BrightSpark: Od kreatora do partnera', type: 'Case study', platform: 'YouTube', status: 'Pregled scenarija', due: 'Mar 12' },
    { id: 3, title: 'Promocija partnerskog programa', type: 'Karusel', platform: 'Instagram + Facebook', status: 'Spremno', due: 'Mar 6' },
    { id: 4, title: 'Iza kulisa suradnje s EcoVerde', type: 'Serija priča', platform: 'Instagram', status: 'Snimanje', due: 'Mar 9' },
    { id: 5, title: 'Mjesečni bilten partnera', type: 'Email + Web', platform: 'Web stranica', status: 'Nacrt', due: 'Mar 15' },
  ],
};

const columns = [
  { key: 'name', header: 'Partner', render: (row: PartnerRow) => (
    <div className="flex items-center gap-2">
      <span className="text-studio-text-primary font-medium">{row.name}</span>
      {row.featured && <Star size={14} className="text-yellow-600" />}
    </div>
  )},
  { key: 'category', header: 'Kategorija', render: (row: PartnerRow) => (
    <span className="text-xs px-2 py-0.5 rounded bg-studio-surface-0 text-studio-text-secondary font-mono">{row.category}</span>
  )},
  { key: 'tier', header: 'Razina', render: (row: PartnerRow) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      row.tier === 'Kreator' ? 'bg-green-500/10 text-green-400' :
      row.tier === 'Standard' ? 'bg-blue-500/10 text-blue-400' :
      'bg-purple-100 text-purple-600'
    }`}>
      {row.tier}
    </span>
  )},
  { key: 'campaigns', header: 'Kampanje', render: (row: PartnerRow) => <span className="text-studio-text-secondary font-mono">{row.campaigns}</span> },
  { key: 'reach', header: 'Doseg', render: (row: PartnerRow) => <span className="text-studio-text-secondary font-mono">{row.reach}</span> },
  { key: 'conversions', header: 'Konverzije', render: (row: PartnerRow) => <span className="text-studio-text-secondary font-mono">{row.conversions}</span> },
  { key: 'socialMentions', header: 'Spominjanja', render: (row: PartnerRow) => (
    <span className="text-studio-text-secondary font-mono">{(row.socialMentions / 1000).toFixed(1)}K</span>
  )},
  { key: 'featured', header: 'Sadržaj', render: (row: PartnerRow) => (
    <span className={`text-xs ${row.featured ? 'text-green-600' : 'text-studio-text-secondary'}`}>
      {row.featured ? 'Istaknuto' : 'U čekanju'}
    </span>
  )},
];

export default function PartnersCreators() {
  const { data: apiData, loading } = useApi<PartnersData>('/academy/players');
  const data = apiData || fallbackData;

  if (loading && !apiData) return (
    <>
      <Header title="PARTNERI & KREATORI" subtitle="Upravljanje partnerima i sadržajni pipeline" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={3} cols="grid grid-cols-1 sm:grid-cols-3 gap-4" />
        <TableSkeleton rows={6} />
      </div>
    </>
  );

  return (
    <div className="animate-fade-in">
      <Header title="PARTNERI & KREATORI" subtitle="Upravljanje partnerima i sadržajni pipeline" />

      <div className="page-wrapper space-y-6">


        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Promovirani partneri" value={data.metrics.promotedPartners} previousValue={data.metrics.prevPromotedPartners} format="number" icon={GraduationCap} />
          <MetricCard label="Prihodi od partnerstava" value={data.metrics.partnerRevenue} previousValue={data.metrics.prevPartnerRevenue} format="currency" icon={DollarSign} />
          <MetricCard label="Aktivni programi" value={data.metrics.activePrograms} format="number" icon={Users} />
        </div>

        {/* Partners Table */}
        <div className="card">
          <h2 className="section-title mb-4">Popis partnera i kreatora</h2>
          <DataTable columns={columns} data={data.partners} emptyMessage="Nema pronađenih partnera" />
        </div>

        {/* Content Pipeline */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Video size={20} className="text-purple-600" />
            <h2 className="section-title">Sadržajni pipeline</h2>
          </div>
          <div className="space-y-3">
            {data.contentPipeline.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-studio-surface-0 rounded-lg hover:bg-studio-surface-2 transition-colors">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-studio-text-primary">{item.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-studio-text-secondary">{item.type}</span>
                    <span className="text-xs text-studio-text-secondary">|</span>
                    <span className="text-xs text-studio-text-secondary">{item.platform}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === 'Spremno' ? 'bg-green-500/10 text-green-400' :
                    item.status === 'U produkciji' || item.status === 'Snimanje' ? 'bg-blue-500/10 text-blue-400' :
                    item.status === 'Pregled scenarija' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-studio-surface-0 text-studio-text-secondary'
                  }`}>
                    {item.status}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-studio-text-secondary">
                    <Calendar size={12} />
                    {item.due}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AiInsightsPanel pageKey="academy" pageData={{ metrics: data.metrics, topPartners: data.partners.slice(0, 5).map(p => ({ name: p.name, category: p.category, reach: p.reach, conversions: p.conversions, socialMentions: p.socialMentions })), pipeline: data.contentPipeline.map(c => ({ title: c.title, status: c.status })) }} />
      </div>
    </div>
  );
}
