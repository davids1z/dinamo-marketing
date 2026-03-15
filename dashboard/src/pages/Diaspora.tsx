import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import { ComparisonBar } from '../components/charts/ComparisonBar'
import { useApi } from '../hooks/useApi'
import { useChannelStatus } from '../hooks/useChannelStatus'
import { Globe, Users, MapPin, Languages, Calendar, Link2 } from 'lucide-react'

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


const langColors: Record<string, string> = {
  HR: 'bg-red-500/10 text-red-400 border-red-200',
  EN: 'bg-blue-500/10 text-blue-400 border-blue-200',
  DE: 'bg-yellow-100 text-yellow-600 border-yellow-200',
}

export default function GeographicMarkets() {
  const { data: apiData, loading } = useApi<GeographicMarketsData>('/diaspora/populations')
  const { hasConnectedChannels } = useChannelStatus()
  const navigate = useNavigate()
  const data = apiData || { communities: [], contentPipeline: [] }

  if (!hasConnectedChannels) {
    return (
      <div>
        <Header title="GEOGRAFSKA TRŽIŠTA" subtitle="Analiza i pristup regionalnim tržištima" />
        <div className="page-wrapper">
          <EmptyState
            icon={Globe}
            title="Nema podataka o geografskim tržištima"
            description="Povežite kanale za praćenje dijaspore i međunarodnih tržišta."
            variant="hero"
            action={
              <button
                onClick={() => navigate('/brand-profile')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent-hover transition-all shadow-sm"
              >
                <Link2 size={16} />
                Poveži kanale
              </button>
            }
          />
        </div>
      </div>
    )
  }

  if (loading && !apiData) return (
    <>
      <Header title="GEOGRAFSKA TRŽIŠTA" subtitle="Analiza i pristup regionalnim tržištima" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={4} cols="grid grid-cols-1 sm:grid-cols-4 gap-4" />
        <ChartSkeleton />
      </div>
    </>
  )

  const regions = data.communities || []
  const contentPipeline = data.contentPipeline || []

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
