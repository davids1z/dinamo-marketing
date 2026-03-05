import Header from '../components/layout/Header'
import { PageLoader, ErrorState } from '../components/common/LoadingSpinner'
import { ComparisonBar } from '../components/charts/ComparisonBar'
import { useApi } from '../hooks/useApi'
import { Globe, Users, MapPin, Languages, Calendar } from 'lucide-react'

interface Community {
  country: string
  city: string
  population: number
  activeMembers: number
  fanClubs: number
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

interface DiasporaData {
  communities: Community[]
  contentPipeline: ContentItem[]
}

// Fallback mock data for when API is not available
const fallbackData: DiasporaData = {
  communities: [
    { country: 'Germany', city: 'Multiple cities', population: 500000, activeMembers: 12400, fanClubs: 8, engagement: 4.2, flag: '\ud83c\udde9\ud83c\uddea' },
    { country: 'Austria', city: 'Vienna, Salzburg', population: 150000, activeMembers: 8200, fanClubs: 5, engagement: 5.1, flag: '\ud83c\udde6\ud83c\uddf9' },
    { country: 'United States', city: 'Chicago, NYC, LA', population: 130000, activeMembers: 4800, fanClubs: 4, engagement: 3.8, flag: '\ud83c\uddfa\ud83c\uddf8' },
    { country: 'Canada', city: 'Toronto, Vancouver', population: 80000, activeMembers: 2900, fanClubs: 3, engagement: 3.5, flag: '\ud83c\udde8\ud83c\udde6' },
    { country: 'Switzerland', city: 'Zurich, Basel', population: 60000, activeMembers: 3100, fanClubs: 3, engagement: 4.5, flag: '\ud83c\udde8\ud83c\udded' },
    { country: 'Australia', city: 'Sydney, Melbourne', population: 50000, activeMembers: 2200, fanClubs: 2, engagement: 3.2, flag: '\ud83c\udde6\ud83c\uddfa' },
    { country: 'Sweden', city: 'Stockholm, Malmo', population: 45000, activeMembers: 1800, fanClubs: 2, engagement: 3.9, flag: '\ud83c\uddf8\ud83c\uddea' },
    { country: 'Ireland', city: 'Dublin', population: 25000, activeMembers: 1100, fanClubs: 1, engagement: 4.0, flag: '\ud83c\uddee\ud83c\uddea' },
    { country: 'Norway', city: 'Oslo, Bergen', population: 20000, activeMembers: 950, fanClubs: 1, engagement: 3.6, flag: '\ud83c\uddf3\ud83c\uddf4' },
  ],
  contentPipeline: [
    {
      id: 1,
      title: 'Utakmica u\u017eivo thread \u2014 UCL',
      languages: ['HR', 'EN', 'DE'],
      platform: 'Sve platforme',
      date: 'Mar 7, 2026',
      status: 'Zakazano',
      description: 'Vi\u0161ejezi\u010dna a\u017euriranja utakmica u realnom vremenu za navija\u010de dijaspore u svim vremenskim zonama',
    },
    {
      id: 2,
      title: 'Fan hub Be\u010d \u2014 pregled eventa',
      languages: ['HR', 'DE'],
      platform: 'Instagram + Facebook',
      date: 'Mar 8, 2026',
      status: 'U produkciji',
      description: 'Video pregled watch partyja dijaspore s 200+ navija\u010da u Be\u010du',
    },
    {
      id: 3,
      title: 'Dinamo bilten dijaspore',
      languages: ['HR', 'EN'],
      platform: 'Email',
      date: 'Mar 10, 2026',
      status: 'Nacrt',
      description: 'Mjese\u010dni bilten s novostima kluba, highlightsima utakmica i pregledom zajednice',
    },
    {
      id: 4,
      title: 'Kako gledati: Vodi\u010d za streaming',
      languages: ['EN', 'DE'],
      platform: 'Website + Social',
      date: 'Mar 6, 2026',
      status: 'Spremno',
      description: 'A\u017eurirani vodi\u010d za navija\u010de dijaspore o gledanju Dinamovih utakmica po dr\u017eavama',
    },
    {
      id: 5,
      title: 'Video poruka igra\u010da \u2014 njema\u010dki navija\u010di',
      languages: ['DE', 'HR'],
      platform: 'TikTok + Instagram',
      date: 'Mar 12, 2026',
      status: 'Pregled scenarija',
      description: 'Personalizirani video pozdrav igra\u010da zajednici njema\u010dke dijaspore',
    },
  ],
}

const langColors: Record<string, string> = {
  HR: 'bg-red-100 text-red-600 border-red-200',
  EN: 'bg-blue-100 text-blue-600 border-blue-200',
  DE: 'bg-yellow-100 text-yellow-600 border-yellow-200',
}

export default function Diaspora() {
  const { data: apiData, loading, error, refetch } = useApi<DiasporaData>('/diaspora/populations')
  const data = apiData || fallbackData

  if (loading && !apiData) return <><Header title="DIJASPORA" subtitle="Anga\u017eman i pristup zajednicama dijaspore" /><PageLoader /></>

  const communities = data.communities || fallbackData.communities
  const contentPipeline = data.contentPipeline || fallbackData.contentPipeline

  const communityComparison = communities.map(c => ({
    name: c.country,
    value: c.population,
  }))

  const totalPopulation = communities.reduce((sum, c) => sum + c.population, 0)
  const totalActive = communities.reduce((sum, c) => sum + c.activeMembers, 0)
  const totalClubs = communities.reduce((sum, c) => sum + c.fanClubs, 0)

  return (
    <div className="animate-fade-in">
      <Header title="DIJASPORA" subtitle="Anga\u017eman i pristup zajednicama dijaspore" />

      <div className="page-wrapper space-y-6">
        

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 text-dinamo-muted mb-1"><Globe size={16} />Dr\u017eava</div>
            <p className="text-3xl font-bold text-gray-900">{communities.length}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-dinamo-muted mb-1"><Users size={16} />Ukupna dijaspora</div>
            <p className="text-3xl font-bold text-gray-900">{(totalPopulation / 1000).toFixed(0)}K</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-dinamo-muted mb-1"><Users size={16} />Aktivni online</div>
            <p className="text-3xl font-bold text-gray-900">{(totalActive / 1000).toFixed(1)}K</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-dinamo-muted mb-1"><MapPin size={16} />Navija\u010dki klubovi</div>
            <p className="text-3xl font-bold text-gray-900">{totalClubs}</p>
          </div>
        </div>

        {/* Community Comparison */}
        <div className="card">
          <ComparisonBar data={communityComparison} title="Populacija dijaspore po dr\u017eavama" valueLabel="Population" />
        </div>

        {/* Community List */}
        <div className="card">
          <h2 className="section-title mb-4">Detalji zajednice</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((community) => (
              <div key={community.country} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{community.flag}</span>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{community.country}</h3>
                    <p className="text-xs text-dinamo-muted">{community.city}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-dinamo-muted text-xs">Population</p>
                    <p className="text-gray-700 font-mono">{(community.population / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-dinamo-muted text-xs">Active Members</p>
                    <p className="text-gray-700 font-mono">{(community.activeMembers / 1000).toFixed(1)}K</p>
                  </div>
                  <div>
                    <p className="text-dinamo-muted text-xs">Fan Clubs</p>
                    <p className="text-gray-700">{community.fanClubs}</p>
                  </div>
                  <div>
                    <p className="text-dinamo-muted text-xs">Engagement</p>
                    <p className="text-green-600">{community.engagement}%</p>
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
            <h2 className="section-title">Vi\u0161ejezi\u010dni sadr\u017eajni pipeline</h2>
          </div>
          <div className="space-y-3">
            {contentPipeline.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                    {item.languages.map((lang) => (
                      <span key={lang} className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${langColors[lang] || 'bg-gray-100 text-gray-600'}`}>
                        {lang}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-dinamo-muted mt-1">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-dinamo-muted">{item.platform}</span>
                    <span className="text-xs text-gray-200">|</span>
                    <span className="text-xs text-dinamo-muted flex items-center gap-1"><Calendar size={10} />{item.date}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-4 ${
                  item.status === 'Spremno' ? 'bg-green-100 text-green-600' :
                  item.status === 'Zakazano' ? 'bg-blue-100 text-blue-600' :
                  item.status === 'U produkciji' ? 'bg-purple-100 text-purple-600' :
                  item.status === 'Pregled scenarija' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-600'
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
