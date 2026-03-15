import { useState } from 'react'
import Header from '../components/layout/Header'
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSpinner'
import { ComparisonBar } from '../components/charts/ComparisonBar'
import { useApi } from '../hooks/useApi'
import { useApiMutation } from '../hooks/useApiMutation'
import { Download, RefreshCw, ChevronDown, ChevronRight, Trophy, MapPin, Calendar, Target } from 'lucide-react'
import { marketResearchApi, type CountryEvents } from '../api/marketResearch'

interface MarketRow {
  id?: string
  country: string
  code: string
  region: string
  population: string
  marketInterest: number
  brandAwareness: number
  trendsScore: number
  totalScore: number
  rank: number
}

function formatPopulation(pop: number | string): string {
  if (typeof pop === 'string') return pop
  if (pop >= 1_000_000_000) return `${(pop / 1_000_000_000).toFixed(1)}B`
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}K`
  return String(pop)
}

// Map API response to frontend interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiData(raw: any[]): MarketRow[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  // Check if it's already in the right format (fallback data)
  if (raw[0].country && raw[0].totalScore !== undefined) return raw as MarketRow[]
  // Map API fields: name→country, region_type→region, total_score→totalScore, etc.
  const mapped = raw.map((r, i) => ({
    id: r.id,
    country: r.name || r.country || '',
    code: r.code || '',
    region: r.region_type || r.region || '',
    population: typeof r.population === 'number' ? formatPopulation(r.population) : (r.population || ''),
    marketInterest: r.market_interest ?? r.marketInterest ?? r.internet_penetration ? Math.round((r.internet_penetration ?? 0) * 100) : 0,
    brandAwareness: r.brand_awareness ?? r.brandAwareness ?? r.football_popularity_index ? Math.round((r.football_popularity_index ?? 0) * 100) : 0,
    trendsScore: r.trends_score ?? r.trendsScore ?? 0,
    totalScore: r.total_score ?? r.totalScore ?? 0,
    rank: r.rank ?? (i + 1),
  }))
  // Deduplicate by code (API can return duplicates)
  const seen = new Set<string>()
  const deduped = mapped.filter(m => {
    if (seen.has(m.code)) return false
    seen.add(m.code)
    return true
  })
  return deduped.sort((a, b) => a.rank - b.rank)
}

const regionLabels: Record<string, string> = {
  diaspora: 'Dijaspora',
  regional: 'Regionalno',
  balkans: 'Balkans',
  dach: 'DACH',
  nordics: 'Nordics',
  americas: 'Americas',
}

// Fallback data
const fallbackData: MarketRow[] = [
  { country: 'Bosnia & Herzegovina', code: 'BA', region: 'Balkans', population: '3.2M', marketInterest: 92, brandAwareness: 95, trendsScore: 88, totalScore: 275, rank: 1 },
  { country: 'Austria', code: 'AT', region: 'DACH', population: '9.1M', marketInterest: 78, brandAwareness: 92, trendsScore: 85, totalScore: 255, rank: 2 },
  { country: 'Germany', code: 'DE', region: 'DACH', population: '84.4M', marketInterest: 85, brandAwareness: 90, trendsScore: 78, totalScore: 253, rank: 3 },
  { country: 'Croatia', code: 'HR', region: 'Balkans', population: '3.9M', marketInterest: 96, brandAwareness: 100, trendsScore: 55, totalScore: 251, rank: 4 },
  { country: 'Switzerland', code: 'CH', region: 'DACH', population: '8.8M', marketInterest: 72, brandAwareness: 82, trendsScore: 76, totalScore: 230, rank: 5 },
  { country: 'Slovenia', code: 'SI', region: 'Balkans', population: '2.1M', marketInterest: 80, brandAwareness: 68, trendsScore: 75, totalScore: 223, rank: 6 },
  { country: 'Serbia', code: 'RS', region: 'Balkans', population: '6.6M', marketInterest: 88, brandAwareness: 55, trendsScore: 72, totalScore: 215, rank: 7 },
  { country: 'Sweden', code: 'SE', region: 'Nordics', population: '10.5M', marketInterest: 70, brandAwareness: 72, trendsScore: 68, totalScore: 210, rank: 8 },
  { country: 'Turkey', code: 'TR', region: 'Other Europe', population: '85.3M', marketInterest: 90, brandAwareness: 30, trendsScore: 82, totalScore: 202, rank: 9 },
  { country: 'United States', code: 'US', region: 'Americas', population: '331M', marketInterest: 45, brandAwareness: 78, trendsScore: 75, totalScore: 198, rank: 10 },
]

function CountryEventsPanel({ countryCode, countryName }: { countryCode: string; countryName: string }) {
  const [events, setEvents] = useState<CountryEvents | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useState(() => {
    marketResearchApi.getEvents(countryCode)
      .then(res => {
        setEvents(res.data)
        setLoading(false)
      })
      .catch(() => {
        setError('Greška pri dohvaćanju podataka')
        setLoading(false)
      })
  })

  if (loading) return (
    <div className="px-6 py-4 bg-studio-surface-0 border-t border-studio-border-subtle">
      <div className="flex items-center gap-2 text-sm text-studio-text-secondary">
        <RefreshCw size={14} className="animate-spin" />
        Učitavanje detalja i prilika za {countryName}...
      </div>
    </div>
  )

  if (error || !events) return (
    <div className="px-6 py-4 bg-studio-surface-0 border-t border-studio-border-subtle">
      <p className="text-sm text-red-400">{error || 'Nema podataka'}</p>
    </div>
  )

  return (
    <div className="px-6 py-4 bg-studio-surface-0 border-t border-studio-border-subtle">
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-yellow-600" />
          <span className="text-sm font-medium text-studio-text-primary">{events.total_leagues} kategorija</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-blue-600" />
          <span className="text-sm font-medium text-studio-text-primary">{events.total_events} prilika</span>
        </div>
      </div>
      {events.leagues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {events.leagues.map(league => (
            <div key={league.league_id} className="flex items-center gap-3 bg-studio-surface-1 rounded-lg p-3 border border-studio-border">
              {league.logo_url && (
                <img src={league.logo_url} alt="" className="w-6 h-6 object-contain" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-studio-text-primary truncate">{league.name}</p>
                <p className="text-xs text-studio-text-secondary">
                  {league.events_count} prilika · Tier {league.tier} · {league.season}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-studio-text-secondary">Nema pronađenih kategorija za ovu državu</p>
      )}
    </div>
  )
}

export default function MarketResearch() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: apiRaw, loading, refetch } = useApi<any[]>('/market-research/countries')
  const scanMutation = useApiMutation('/market-research/scan', 'post')
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<MarketRow | null>(null)

  const mapped = apiRaw ? mapApiData(apiRaw) : null
  const marketData = (mapped && mapped.length > 0) ? mapped : fallbackData
  const topMarkets = marketData.slice(0, 5).map(m => ({ name: m.country, value: m.totalScore || 0 }))

  const handleScan = async () => {
    await scanMutation.mutate()
    refetch()
  }

  const toggleExpand = (code: string) => {
    setExpandedCountry(prev => prev === code ? null : code)
  }

  if (loading && !apiRaw) return (
    <>
      <Header title="ISTRAŽIVANJE TRŽIŠTA" subtitle="Tržišna inteligencija" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={3} cols="grid grid-cols-1 sm:grid-cols-3 gap-4" />
        <TableSkeleton rows={8} />
      </div>
    </>
  )

  return (
    <div>
      <Header
        title="ISTRAŽIVANJE TRŽIŠTA"
        subtitle="Tržišna inteligencija i bodovanje prilika"
      />

      <div className="page-wrapper space-y-6 stagger-sections">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 stagger-cards">
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-studio-text-primary">{marketData.length}</p>
              <p className="text-xs text-studio-text-secondary">Tržišta praćena</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Trophy size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-studio-text-primary">{marketData.filter(m => m.rank <= 3).length}</p>
              <p className="text-xs text-studio-text-secondary">Top tržišta</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Target size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-studio-text-primary">{marketData.length > 0 ? marketData[0]?.country ?? '-' : '-'}</p>
              <p className="text-xs text-studio-text-secondary">#1 Tržište</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Calendar size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-studio-text-primary">
                {Math.round(marketData.reduce((sum, m) => sum + (m.totalScore || 0), 0) / (marketData.length || 1)) || '—'}
              </p>
              <p className="text-xs text-studio-text-secondary">Prosj. rezultat</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-studio-text-secondary text-sm">Bodovanje {marketData.length} ciljnih tržišta — kliknite na red za pregled detalja i prilika</p>
          <div className="flex gap-3">
            <button className="btn-ghost flex items-center gap-2 text-sm">
              <Download size={16} />
              Izvezi CSV
            </button>
            <button
              onClick={handleScan}
              disabled={scanMutation.loading}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <RefreshCw size={16} className={scanMutation.loading ? 'animate-spin' : ''} />
              {scanMutation.loading ? 'Skeniranje...' : 'Pokreni skeniranje'}
            </button>
          </div>
        </div>

        {/* Top Markets Chart */}
        <div className="card">
          <ComparisonBar data={topMarkets} title="Top 5 tržišta po ukupnom rezultatu" valueLabel="Score" />
        </div>

        {/* Full Market Table with expandable rows */}
        <div className="card overflow-hidden">
          <h2 className="section-title mb-4">Matrica tržišnih prilika</h2>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-studio-border">
                  <th className="py-3 px-2 w-8"></th>
                  <th className="py-3 px-2 text-studio-text-secondary font-medium">#</th>
                  <th className="py-3 px-2 text-studio-text-secondary font-medium">Država</th>
                  <th className="py-3 px-2 text-studio-text-secondary font-medium">Regija</th>
                  <th className="py-3 px-2 text-studio-text-secondary font-medium">Populacija</th>
                  <th className="py-3 px-2 text-studio-text-secondary font-medium">Interes za tržište</th>
                  <th className="py-3 px-2 text-studio-text-secondary font-medium">Prepoznatljivost brenda</th>
                  <th className="py-3 px-2 text-studio-text-secondary font-medium">Ukupni rezultat</th>
                </tr>
              </thead>
              <tbody>
                {marketData.map(row => (
                  <tr key={row.code} className="group">
                    <td colSpan={8} className="p-0">
                      <div
                        className={`flex items-center border-b cursor-pointer transition-colors ${
                          expandedCountry === row.code ? 'bg-blue-500/10 border-blue-500/20' : 'hover:bg-studio-surface-0 border-studio-border-subtle'
                        }`}
                        onClick={() => toggleExpand(row.code)}
                      >
                        <div className="py-3 px-2 w-8">
                          {expandedCountry === row.code ? (
                            <ChevronDown size={14} className="text-blue-500" />
                          ) : (
                            <ChevronRight size={14} className="text-studio-text-tertiary" />
                          )}
                        </div>
                        <div className="py-3 px-2 w-12">
                          <span className={`font-mono font-bold ${row.rank <= 3 ? 'text-yellow-600' : 'text-studio-text-tertiary'}`}>
                            {row.rank}
                          </span>
                        </div>
                        <div className="py-3 px-2 flex-1 min-w-[150px]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-studio-text-secondary font-mono w-6">{row.code}</span>
                            <span className="text-studio-text-primary font-medium truncate">{row.country}</span>
                          </div>
                        </div>
                        <div className="py-3 px-2 w-28">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            row.region === 'Balkans' || row.region === 'balkans' ? 'bg-blue-100 text-blue-400' :
                            row.region === 'DACH' || row.region === 'dach' ? 'bg-green-100 text-green-400' :
                            row.region === 'Nordics' || row.region === 'nordics' ? 'bg-indigo-100 text-indigo-700' :
                            row.region === 'Americas' || row.region === 'americas' ? 'bg-orange-100 text-orange-700' :
                            row.region === 'diaspora' || row.region === 'Dijaspora' ? 'bg-purple-100 text-purple-400' :
                            row.region === 'regional' || row.region === 'Regionalno' ? 'bg-teal-100 text-teal-400' :
                            'bg-studio-surface-2 text-studio-text-primary'
                          }`}>
                            {regionLabels[row.region] || row.region}
                          </span>
                        </div>
                        <div className="py-3 px-2 w-24">
                          <span className="text-studio-text-secondary">{row.population}</span>
                        </div>
                        <div className="py-3 px-2 w-40">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-studio-surface-3 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${row.marketInterest}%` }} />
                            </div>
                            <span className="text-studio-text-secondary text-sm">{row.marketInterest}</span>
                          </div>
                        </div>
                        <div className="py-3 px-2 w-32">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-studio-surface-3 rounded-full h-2">
                              <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${row.brandAwareness}%` }} />
                            </div>
                            <span className="text-studio-text-secondary text-sm">{row.brandAwareness}</span>
                          </div>
                        </div>
                        <div className="py-3 px-2 w-28">
                          <span className={`font-bold ${row.rank <= 3 ? 'text-yellow-600' : row.rank <= 10 ? 'text-studio-text-primary' : 'text-studio-text-secondary'}`}>
                            {row.totalScore}
                          </span>
                        </div>
                      </div>
                      {expandedCountry === row.code && (
                        <CountryEventsPanel countryCode={row.code} countryName={row.country} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Country Detail Modal */}
        {selectedCountry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedCountry(null)}>
            <div className="bg-studio-surface-1 rounded-xl shadow-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-studio-text-primary mb-4">{selectedCountry.country}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-studio-surface-0 rounded-lg p-3">
                  <p className="text-xs text-studio-text-secondary">Populacija</p>
                  <p className="text-lg font-bold text-studio-text-primary">{selectedCountry.population}</p>
                </div>
                <div className="bg-studio-surface-0 rounded-lg p-3">
                  <p className="text-xs text-studio-text-secondary">Ukupni rezultat</p>
                  <p className="text-lg font-bold text-yellow-600">{selectedCountry.totalScore}</p>
                </div>
                <div className="bg-studio-surface-0 rounded-lg p-3">
                  <p className="text-xs text-studio-text-secondary">Interes za tržište</p>
                  <p className="text-lg font-bold text-blue-600">{selectedCountry.marketInterest}</p>
                </div>
                <div className="bg-studio-surface-0 rounded-lg p-3">
                  <p className="text-xs text-studio-text-secondary">Prepoznatljivost brenda</p>
                  <p className="text-lg font-bold text-purple-600">{selectedCountry.brandAwareness}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCountry(null)} className="mt-4 w-full btn-ghost text-sm">
                Zatvori
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
