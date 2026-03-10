import { useState } from 'react'
import Header from '../components/layout/Header'
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSpinner'
import { ComparisonBar } from '../components/charts/ComparisonBar'
import { useApi } from '../hooks/useApi'
import { useApiMutation } from '../hooks/useApiMutation'
import { Download, RefreshCw, ChevronDown, ChevronRight, Trophy, MapPin, Calendar, Target } from 'lucide-react'
import AiInsightsPanel from '../components/common/AiInsightsPanel'
import { marketResearchApi, type CountryEvents } from '../api/marketResearch'

interface MarketRow {
  id?: string
  country: string
  code: string
  region: string
  population: string
  footballInterest: number
  diaspora: number
  trendsScore: number
  totalScore: number
  rank: number
}

// Fallback data
const fallbackData: MarketRow[] = [
  { country: 'Bosnia & Herzegovina', code: 'BA', region: 'Balkans', population: '3.2M', footballInterest: 92, diaspora: 95, trendsScore: 88, totalScore: 275, rank: 1 },
  { country: 'Austria', code: 'AT', region: 'DACH', population: '9.1M', footballInterest: 78, diaspora: 92, trendsScore: 85, totalScore: 255, rank: 2 },
  { country: 'Germany', code: 'DE', region: 'DACH', population: '84.4M', footballInterest: 85, diaspora: 90, trendsScore: 78, totalScore: 253, rank: 3 },
  { country: 'Croatia', code: 'HR', region: 'Balkans', population: '3.9M', footballInterest: 96, diaspora: 100, trendsScore: 55, totalScore: 251, rank: 4 },
  { country: 'Switzerland', code: 'CH', region: 'DACH', population: '8.8M', footballInterest: 72, diaspora: 82, trendsScore: 76, totalScore: 230, rank: 5 },
  { country: 'Slovenia', code: 'SI', region: 'Balkans', population: '2.1M', footballInterest: 80, diaspora: 68, trendsScore: 75, totalScore: 223, rank: 6 },
  { country: 'Serbia', code: 'RS', region: 'Balkans', population: '6.6M', footballInterest: 88, diaspora: 55, trendsScore: 72, totalScore: 215, rank: 7 },
  { country: 'Sweden', code: 'SE', region: 'Nordics', population: '10.5M', footballInterest: 70, diaspora: 72, trendsScore: 68, totalScore: 210, rank: 8 },
  { country: 'Turkey', code: 'TR', region: 'Other Europe', population: '85.3M', footballInterest: 90, diaspora: 30, trendsScore: 82, totalScore: 202, rank: 9 },
  { country: 'United States', code: 'US', region: 'Americas', population: '331M', footballInterest: 45, diaspora: 78, trendsScore: 75, totalScore: 198, rank: 10 },
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
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <RefreshCw size={14} className="animate-spin" />
        Učitavanje liga i evenata za {countryName}...
      </div>
    </div>
  )

  if (error || !events) return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
      <p className="text-sm text-red-500">{error || 'Nema podataka'}</p>
    </div>
  )

  return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-yellow-600" />
          <span className="text-sm font-medium text-gray-700">{events.total_leagues} liga</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-blue-600" />
          <span className="text-sm font-medium text-gray-700">{events.total_events} evenata</span>
        </div>
      </div>
      {events.leagues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {events.leagues.map(league => (
            <div key={league.league_id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
              {league.logo_url && (
                <img src={league.logo_url} alt="" className="w-6 h-6 object-contain" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{league.name}</p>
                <p className="text-xs text-gray-500">
                  {league.events_count} utakmica · Tier {league.tier} · {league.season}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Nema pronađenih liga za ovu državu</p>
      )}
    </div>
  )
}

export default function MarketResearch() {
  const { data: apiData, loading, refetch } = useApi<MarketRow[]>('/market-research/countries')
  const scanMutation = useApiMutation('/market-research/scan', 'post')
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<MarketRow | null>(null)

  const marketData = apiData || fallbackData
  const topMarkets = marketData.slice(0, 5).map(m => ({ name: m.country, value: m.totalScore }))

  const handleScan = async () => {
    await scanMutation.mutate()
    refetch()
  }

  const toggleExpand = (code: string) => {
    setExpandedCountry(prev => prev === code ? null : code)
  }

  if (loading && !apiData) return (
    <>
      <Header title="ISTRAŽIVANJE TRŽIŠTA" subtitle="Tržišna inteligencija" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={3} cols="grid grid-cols-1 sm:grid-cols-3 gap-4" />
        <TableSkeleton rows={8} />
      </div>
    </>
  )

  return (
    <div className="animate-fade-in">
      <Header
        title="ISTRAŽIVANJE TRŽIŠTA"
        subtitle="Tržišna inteligencija i bodovanje prilika"
      />

      <div className="page-wrapper space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{marketData.length}</p>
              <p className="text-xs text-gray-500">Tržišta praćena</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Trophy size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{marketData.filter(m => m.rank <= 3).length}</p>
              <p className="text-xs text-gray-500">Top tržišta</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Target size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{marketData.length > 0 ? marketData[0]?.country ?? '-' : '-'}</p>
              <p className="text-xs text-gray-500">#1 Tržište</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Calendar size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(marketData.reduce((sum, m) => sum + m.totalScore, 0) / (marketData.length || 1))}
              </p>
              <p className="text-xs text-gray-500">Prosj. rezultat</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-gray-500 text-sm">Bodovanje {marketData.length} ciljnih tržišta — kliknite na red za pregled liga i evenata</p>
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
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-2 w-8"></th>
                  <th className="py-3 px-2 text-gray-500 font-medium">#</th>
                  <th className="py-3 px-2 text-gray-500 font-medium">Država</th>
                  <th className="py-3 px-2 text-gray-500 font-medium">Regija</th>
                  <th className="py-3 px-2 text-gray-500 font-medium">Populacija</th>
                  <th className="py-3 px-2 text-gray-500 font-medium">Interes za nogomet</th>
                  <th className="py-3 px-2 text-gray-500 font-medium">Dijaspora</th>
                  <th className="py-3 px-2 text-gray-500 font-medium">Ukupni rezultat</th>
                </tr>
              </thead>
              <tbody>
                {marketData.map(row => (
                  <tr key={row.code} className="group">
                    <td colSpan={8} className="p-0">
                      <div
                        className={`flex items-center border-b cursor-pointer transition-colors ${
                          expandedCountry === row.code ? 'bg-blue-50 border-blue-100' : 'hover:bg-gray-50 border-gray-100'
                        }`}
                        onClick={() => toggleExpand(row.code)}
                      >
                        <div className="py-3 px-2 w-8">
                          {expandedCountry === row.code ? (
                            <ChevronDown size={14} className="text-blue-500" />
                          ) : (
                            <ChevronRight size={14} className="text-gray-400" />
                          )}
                        </div>
                        <div className="py-3 px-2 w-12">
                          <span className={`font-mono font-bold ${row.rank <= 3 ? 'text-yellow-600' : 'text-gray-400'}`}>
                            {row.rank}
                          </span>
                        </div>
                        <div className="py-3 px-2 flex-1 min-w-[150px]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-mono w-6">{row.code}</span>
                            <span className="text-gray-900 font-medium truncate">{row.country}</span>
                          </div>
                        </div>
                        <div className="py-3 px-2 w-28">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            row.region === 'Balkans' ? 'bg-blue-100 text-blue-700' :
                            row.region === 'DACH' ? 'bg-green-100 text-green-700' :
                            row.region === 'Nordics' ? 'bg-indigo-100 text-indigo-700' :
                            row.region === 'Americas' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {row.region}
                          </span>
                        </div>
                        <div className="py-3 px-2 w-24">
                          <span className="text-gray-500">{row.population}</span>
                        </div>
                        <div className="py-3 px-2 w-40">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${row.footballInterest}%` }} />
                            </div>
                            <span className="text-gray-500 text-sm">{row.footballInterest}</span>
                          </div>
                        </div>
                        <div className="py-3 px-2 w-32">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${row.diaspora}%` }} />
                            </div>
                            <span className="text-gray-500 text-sm">{row.diaspora}</span>
                          </div>
                        </div>
                        <div className="py-3 px-2 w-28">
                          <span className={`font-bold ${row.rank <= 3 ? 'text-yellow-600' : row.rank <= 10 ? 'text-gray-900' : 'text-gray-500'}`}>
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
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-4">{selectedCountry.country}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Populacija</p>
                  <p className="text-lg font-bold text-gray-900">{selectedCountry.population}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Ukupni rezultat</p>
                  <p className="text-lg font-bold text-yellow-600">{selectedCountry.totalScore}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Interes za nogomet</p>
                  <p className="text-lg font-bold text-blue-600">{selectedCountry.footballInterest}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Dijaspora</p>
                  <p className="text-lg font-bold text-purple-600">{selectedCountry.diaspora}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCountry(null)} className="mt-4 w-full btn-ghost text-sm">
                Zatvori
              </button>
            </div>
          </div>
        )}

        <AiInsightsPanel pageKey="market_research" pageData={{ markets: marketData.slice(0, 5).map(m => ({ country: m.country, footballInterest: m.footballInterest, diaspora: m.diaspora, totalScore: m.totalScore, rank: m.rank })) }} />
      </div>
    </div>
  )
}
