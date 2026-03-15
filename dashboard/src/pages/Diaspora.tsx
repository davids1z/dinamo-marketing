import Header from '../components/layout/Header'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import { ComparisonBar } from '../components/charts/ComparisonBar'
import { useApi } from '../hooks/useApi'
import { Globe, Users, MapPin, Languages, Calendar } from 'lucide-react'

interface MarketRegion {
  country: string
  city: string
  population: number
  activeMembers: number
  offices: number
  engagement: number
  flag: string
}

interface ContentItem {
  id: number
  title: string
  languages: string[]
  platform: string
  date: string
  status: string
  description: string
}

interface GeographicMarketsData {
  communities: MarketRegion[]
  contentPipeline: ContentItem[]
}

// Fallback mock data for when API is not available
const fallbackData: GeographicMarketsData = {
  communities: [
    { country: 'Germany', city: 'Multiple cities', population: 500000, activeMembers: 12400, offices: 8, engagement: 4.2, flag: '' },
    { country: 'Austria', city: 'Vienna, Salzburg', population: 150000, activeMembers: 8200, offices: 5, engagement: 5.1, flag: '' },
    { country: 'United States', city: 'Chicago, NYC, LA', population: 130000, activeMembers: 4800, offices: 4, engagement: 3.8, flag: '' },
    { country: 'Canada', city: 'Toronto, Vancouver', population: 80000, activeMembers: 2900, offices: 3, engagement: 3.5, flag: '' },
    { country: 'Switzerland', city: 'Zurich, Basel', population: 60000, activeMembers: 3100, offices: 3, engagement: 4.5, flag: '' },
    { country: 'Australia', city: 'Sydney, Melbourne', population: 50000, activeMembers: 2200, offices: 2, engagement: 3.2, flag: '' },
    { country: 'Sweden', city: 'Stockholm, Malmo', population: 45000, activeMembers: 1800, offices: 2, engagement: 3.9, flag: '' },
    { country: 'Ireland', city: 'Dublin', population: 25000, activeMembers: 1100, offices: 1, engagement: 4.0, flag: '' },
    { country: 'Norway', city: 'Oslo, Bergen', population: 20000, activeMembers: 950, offices: 1, engagement: 3.6, flag: '' },
  ],
  contentPipeline: [
    {
      id: 1,
      title: 'Kampanja uživo thread — Globalni launch',
      languages: ['HR', 'EN', 'DE'],
      platform: 'Sve platforme',
      date: 'Mar 7, 2026',
      status: 'Zakazano',
      description: 'Višejezična ažuriranja kampanja u realnom vremenu za korisnike u svim vremenskim zonama',
    },
    {
      id: 2,
      title: 'Hub Beč — pregled eventa',
      languages: ['HR', 'DE'],
      platform: 'Instagram + Facebook',
      date: 'Mar 8, 2026',
      status: 'U produkciji',
      description: 'Video pregled networking eventa s 200+ korisnika u Beču',
    },
    {
      id: 3,
      title: 'ShiftOneZero bilten za tržišta',
      languages: ['HR', 'EN'],
      platform: 'Email',
      date: 'Mar 10, 2026',
      status: 'Nacrt',
      description: 'Mjesečni bilten s novostima platforme, highlightsima kampanja i pregledom tržišta',
    },
    {
      id: 4,
      title: 'Kako koristiti: Vodič za onboarding',
      languages: ['EN', 'DE'],
      platform: 'Website + Social',
      date: 'Mar 6, 2026',
      status: 'Spremno',
      description: 'Ažurirani vodič za korisnike o korištenju platforme po regijama',
    },
    {
      id: 5,
      title: 'Video poruka tima — njemačko tržište',
      languages: ['DE', 'HR'],
      platform: 'TikTok + Instagram',
      date: 'Mar 12, 2026',
      status: 'Pregled scenarija',
      description: 'Personalizirani video pozdrav tima za zajednicu korisnika na njemačkom tržištu',
    },
  ],
}

const langColors: Record<string, string> = {
  HR: 'bg-red-500/10 text-red-400 border-red-200',
  EN: 'bg-blue-500/10 text-blue-400 border-blue-200',
  DE: 'bg-yellow-100 text-yellow-600 border-yellow-200',
}

export default function GeographicMarkets() {
  const { data: apiData, loading } = useApi<GeographicMarketsData>('/diaspora/populations')
  const data = apiData || fallbackData

  if (loading && !apiData) return (
    <>
      <Header title="GEOGRAFSKA TRŽIŠTA" subtitle="Analiza i pristup regionalnim tržištima" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={4} cols="grid grid-cols-1 sm:grid-cols-4 gap-4" />
        <ChartSkeleton />
      </div>
    </>
  )

  const regions = data.communities || fallbackData.communities
  const contentPipeline = data.contentPipeline || fallbackData.contentPipeline

  const regionComparison = regions.map(c => ({
    name: c.country,
    value: c.population,
  }))

  const totalPopulation = regions.reduce((sum, c) => sum + c.population, 0)
  const totalActive = regions.reduce((sum, c) => sum + c.activeMembers, 0)
  const totalOffices = regions.reduce((sum, c) => sum + c.offices, 0)

  return (
    <div>
      <Header title="GEOGRAFSKA TRŽIŠTA" subtitle="Analiza i pristup regionalnim tržištima" />

      <div className="page-wrapper space-y-6">


        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 text-studio-text-secondary mb-1"><Globe size={16} />Tržišta</div>
            <p className="text-3xl font-bold text-studio-text-primary">{regions.length}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-studio-text-secondary mb-1"><Users size={16} />Ukupni doseg</div>
            <p className="text-3xl font-bold text-studio-text-primary">{(totalPopulation / 1000).toFixed(0)}K</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-studio-text-secondary mb-1"><Users size={16} />Aktivni korisnici</div>
            <p className="text-3xl font-bold text-studio-text-primary">{(totalActive / 1000).toFixed(1)}K</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-studio-text-secondary mb-1"><MapPin size={16} />Regionalni uredi</div>
            <p className="text-3xl font-bold text-studio-text-primary">{totalOffices}</p>
          </div>
        </div>

        {/* Region Comparison */}
        <div className="card">
          <ComparisonBar data={regionComparison} title="Veličina tržišta po državama" valueLabel="Population" />
        </div>

        {/* Region List */}
        <div className="card">
          <h2 className="section-title mb-4">Detalji tržišta</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regions.map((region) => (
              <div key={region.country} className="bg-studio-surface-0 rounded-lg p-4 hover:bg-studio-surface-2 transition-colors border border-studio-border">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{region.flag}</span>
                  <div>
                    <h3 className="text-sm font-medium text-studio-text-primary">{region.country}</h3>
                    <p className="text-xs text-studio-text-secondary">{region.city}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-studio-text-secondary text-xs">Veličina tržišta</p>
                    <p className="text-studio-text-primary font-mono">{(region.population / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-studio-text-secondary text-xs">Aktivni korisnici</p>
                    <p className="text-studio-text-primary font-mono">{(region.activeMembers / 1000).toFixed(1)}K</p>
                  </div>
                  <div>
                    <p className="text-studio-text-secondary text-xs">Uredi</p>
                    <p className="text-studio-text-primary">{region.offices}</p>
                  </div>
                  <div>
                    <p className="text-studio-text-secondary text-xs">Angažman</p>
                    <p className="text-green-600">{region.engagement}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Language Content Pipeline */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Languages size={20} className="text-purple-600" />
            <h2 className="section-title">Višejezični sadržajni pipeline</h2>
          </div>
          <div className="space-y-3">
            {contentPipeline.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-studio-surface-0 rounded-lg hover:bg-studio-surface-2 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium text-studio-text-primary">{item.title}</h3>
                    {item.languages.map((lang) => (
                      <span key={lang} className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${langColors[lang] || 'bg-studio-surface-0 text-studio-text-secondary'}`}>
                        {lang}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-studio-text-secondary mt-1">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-studio-text-secondary">{item.platform}</span>
                    <span className="text-xs text-studio-text-disabled">|</span>
                    <span className="text-xs text-studio-text-secondary flex items-center gap-1"><Calendar size={10} />{item.date}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-4 ${
                  item.status === 'Spremno' ? 'bg-green-500/10 text-green-400' :
                  item.status === 'Zakazano' ? 'bg-blue-500/10 text-blue-400' :
                  item.status === 'U produkciji' ? 'bg-purple-100 text-purple-600' :
                  item.status === 'Pregled scenarija' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-studio-surface-0 text-studio-text-secondary'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
