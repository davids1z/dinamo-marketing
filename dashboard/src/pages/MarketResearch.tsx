import { useState, useMemo } from 'react'
import Header from '../components/layout/Header'
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSpinner'
import { ComparisonBar } from '../components/charts/ComparisonBar'
import { useApi } from '../hooks/useApi'
import { useApiMutation } from '../hooks/useApiMutation'
import { useClient } from '../contexts/ClientContext'
import { useToast } from '../hooks/useToast'
import {
  Download, RefreshCw, ChevronDown, ChevronRight, Trophy, MapPin,
  Calendar, Target, Sparkles, AlertTriangle, Globe, TrendingUp,
  BarChart3, Eye, Info,
} from 'lucide-react'
import { marketResearchApi, type CountryEvents } from '../api/marketResearch'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPopulation(pop: number | string): string {
  if (typeof pop === 'string') return pop
  if (pop >= 1_000_000_000) return `${(pop / 1_000_000_000).toFixed(1)}B`
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}K`
  return String(pop)
}

/** Truncate long country names for the Y-axis label */
function truncateCountry(name: string, maxLen = 18): string {
  if (name.length <= maxLen) return name
  // Try abbreviation for well-known long names
  const abbrevs: Record<string, string> = {
    'Bosnia & Herzegovina': 'BiH',
    'Bosnia and Herzegovina': 'BiH',
    'United States': 'SAD',
    'United Kingdom': 'UK',
    'North Macedonia': 'Sj. Makedonija',
    'Czech Republic': 'Češka',
  }
  return abbrevs[name] || name.slice(0, maxLen - 1) + '…'
}

// Map API response to frontend interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiData(raw: any[]): MarketRow[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  if (raw[0].country && raw[0].totalScore !== undefined) return raw as MarketRow[]
  const mapped = raw.map((r, i) => ({
    id: r.id,
    country: r.name || r.country || '',
    code: r.code || '',
    region: r.region_type || r.region || '',
    population: typeof r.population === 'number' ? formatPopulation(r.population) : (r.population || ''),
    marketInterest: r.market_interest ?? r.marketInterest ?? (r.internet_penetration != null ? Math.round(r.internet_penetration * 100) : 0),
    brandAwareness: r.brand_awareness ?? r.brandAwareness ?? (r.football_popularity_index != null ? Math.round(r.football_popularity_index * 100) : 0),
    trendsScore: r.trends_score ?? r.trendsScore ?? 0,
    totalScore: r.total_score ?? r.totalScore ?? 0,
    rank: r.rank ?? (i + 1),
  }))
  const seen = new Set<string>()
  const deduped = mapped.filter(m => {
    if (seen.has(m.code)) return false
    seen.add(m.code)
    return true
  })
  return deduped.sort((a, b) => a.rank - b.rank)
}

/** Map language code to relevant countries */
const LANGUAGE_COUNTRIES: Record<string, string[]> = {
  hr: ['HR', 'BA', 'RS', 'ME', 'SI'],
  de: ['DE', 'AT', 'CH'],
  en: ['US', 'GB', 'AU', 'CA', 'IE'],
  it: ['IT', 'CH'],
  fr: ['FR', 'BE', 'CH', 'CA'],
  es: ['ES', 'MX', 'AR', 'CO'],
  pt: ['PT', 'BR'],
  nl: ['NL', 'BE'],
  sv: ['SE'],
  da: ['DK'],
  no: ['NO'],
  fi: ['FI'],
  pl: ['PL'],
  cs: ['CZ'],
  sk: ['SK'],
  hu: ['HU'],
  tr: ['TR'],
  sl: ['SI'],
  sr: ['RS'],
  bs: ['BA'],
  mk: ['MK'],
  sq: ['AL', 'XK'],
  el: ['GR', 'CY'],
  ro: ['RO', 'MD'],
  bg: ['BG'],
  uk: ['UA'],
  ru: ['RU'],
  ja: ['JP'],
  ko: ['KR'],
  zh: ['CN', 'TW', 'HK'],
  ar: ['SA', 'AE', 'EG'],
}

const regionLabels: Record<string, string> = {
  diaspora: 'Dijaspora',
  regional: 'Regionalno',
  balkans: 'Balkans',
  dach: 'DACH',
  nordics: 'Nordics',
  americas: 'Americas',
  expansion: 'Ekspanzija',
}

const SCORE_EXPLANATIONS: Record<string, string> = {
  marketInterest: 'Interes za tržište — koliko je publika u toj zemlji zainteresirana za vašu industriju/nišu',
  brandAwareness: 'Prepoznatljivost brenda — razina svijesti o vašem brendu na temelju društvenih mreža i pretraživanja',
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

/** Score bar with tooltip */
function ScoreBar({ value, color, label, explanation }: {
  value: number; color: string; label: string; explanation?: string
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  return (
    <div className="flex items-center gap-2 relative">
      <div
        className="w-20 bg-studio-surface-3 rounded-full h-3 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          className="h-3 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
      <span className="text-studio-text-secondary text-sm font-medium w-8">{value}</span>
      {showTooltip && explanation && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-[#0f172a]/95 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-2xl w-64 pointer-events-none">
          <p className="text-xs text-white/90 font-medium mb-1">{label}: {value}/100</p>
          <p className="text-[11px] text-white/60">{explanation}</p>
        </div>
      )}
    </div>
  )
}

/** Region badge */
function RegionBadge({ region }: { region: string }) {
  const lower = region.toLowerCase()
  const colorClass =
    lower === 'balkans' ? 'bg-blue-100 text-blue-600' :
    lower === 'dach' ? 'bg-green-100 text-green-600' :
    lower === 'nordics' ? 'bg-indigo-100 text-indigo-700' :
    lower === 'americas' ? 'bg-orange-100 text-orange-700' :
    lower === 'diaspora' || lower === 'dijaspora' ? 'bg-purple-100 text-purple-600' :
    lower === 'regional' || lower === 'regionalno' ? 'bg-teal-100 text-teal-600' :
    lower === 'expansion' || lower === 'ekspanzija' ? 'bg-amber-100 text-amber-700' :
    'bg-studio-surface-2 text-studio-text-primary'

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
      {regionLabels[lower] || region}
    </span>
  )
}

/** Empty state shown before first scan — blurred preview of data */
function EmptyState({ onScan, scanning }: { onScan: () => void; scanning: boolean }) {
  return (
    <div className="relative">
      {/* Blurred preview of what data would look like */}
      <div className="select-none pointer-events-none filter blur-[6px] opacity-40">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-studio-surface-2" />
              <div>
                <div className="h-6 w-12 bg-studio-surface-3 rounded" />
                <div className="h-3 w-20 bg-studio-surface-2 rounded mt-1" />
              </div>
            </div>
          ))}
        </div>
        <div className="card mb-6">
          <div className="h-[300px] bg-studio-surface-0 rounded-lg" />
        </div>
        <div className="card">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-studio-surface-0 rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* CTA overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/90 dark:bg-studio-surface-1/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-studio-border p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Globe size={28} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-studio-text-primary mb-2">
            Pokrenite tržišnu analizu
          </h3>
          <p className="text-sm text-studio-text-secondary mb-6 leading-relaxed">
            AI će analizirati vaš profil brenda, ciljnu publiku i jezike
            kako bi identificirao top 5 tržišta s najvećim potencijalom za rast.
          </p>
          <button
            onClick={onScan}
            disabled={scanning}
            className="btn-primary flex items-center gap-2 text-sm mx-auto px-6 py-3"
          >
            {scanning ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {scanning ? 'Analiziram...' : 'Pokreni skeniranje'}
          </button>
          <div className="mt-4 flex items-start gap-2 text-left bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Za najbolje rezultate, popunite profil brenda — opis poslovanja, ciljnu publiku i jezike komunikacije.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Language priority indicator */
function LanguagePriorityBadge({ languages, countryCode }: { languages: string[]; countryCode: string }) {
  const isLanguageMatch = languages.some(lang => {
    const countries = LANGUAGE_COUNTRIES[lang.toLowerCase()] || []
    return countries.includes(countryCode)
  })
  if (!isLanguageMatch) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-brand-accent/15 text-brand-accent font-medium" title="Jezik klijenta podudara se s ovom zemljom">
      <Globe size={10} />
      Jezik
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MarketResearch() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: apiRaw, loading, refetch } = useApi<any[]>('/market-research/countries')
  const scanMutation = useApiMutation('/market-research/scan', 'post')
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null)
  const { currentClient } = useClient()

  const clientLanguages = useMemo(() => {
    const langs = currentClient?.languages
    if (!Array.isArray(langs)) return []
    return langs.map((l: string) => l.toLowerCase())
  }, [currentClient?.languages])

  const mapped = apiRaw ? mapApiData(apiRaw) : null
  const hasRealData = mapped !== null && mapped.length > 0
  const marketData = hasRealData ? mapped : fallbackData
  const showEmptyState = !hasRealData && !loading

  // Sort: language-matching countries get boosted if they aren't already top
  const sortedData = useMemo(() => {
    if (clientLanguages.length === 0) return marketData
    // Don't re-sort if data came from API (already ranked)
    if (hasRealData) return marketData
    return [...marketData]
  }, [marketData, clientLanguages, hasRealData])

  // Chart data: truncate long names
  const topMarkets = sortedData.slice(0, 5).map(m => ({
    name: truncateCountry(m.country),
    value: m.totalScore || 0,
  }))

  const { addToast } = useToast()

  const handleScan = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await scanMutation.mutate() as any
    if (result?.message) {
      addToast(result.message, result.hasData ? 'success' : 'info')
    }
    refetch()
  }

  const toggleExpand = (code: string) => {
    setExpandedCountry(prev => prev === code ? null : code)
  }

  if (loading && !apiRaw) return (
    <>
      <Header title="ISTRAŽIVANJE TRŽIŠTA" subtitle="Tržišna inteligencija" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={4} cols="grid grid-cols-1 sm:grid-cols-4 gap-4" />
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
        {showEmptyState ? (
          <EmptyState onScan={handleScan} scanning={scanMutation.loading} />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 stagger-cards">
              <div className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <MapPin size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-studio-text-primary">{sortedData.length}</p>
                  <p className="text-xs text-studio-text-secondary">Tržišta praćena</p>
                </div>
              </div>
              <div className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Trophy size={20} className="text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-studio-text-primary">{sortedData.filter(m => m.rank <= 3).length}</p>
                  <p className="text-xs text-studio-text-secondary">Top tržišta</p>
                </div>
              </div>
              <div className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Target size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-studio-text-primary truncate max-w-[120px]">
                    {sortedData.length > 0 ? truncateCountry(sortedData[0]?.country ?? '-', 14) : '-'}
                  </p>
                  <p className="text-xs text-studio-text-secondary">#1 Tržište</p>
                </div>
              </div>
              <div className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-studio-text-primary">
                    {Math.round(sortedData.reduce((sum, m) => sum + (m.totalScore || 0), 0) / (sortedData.length || 1)) || '—'}
                  </p>
                  <p className="text-xs text-studio-text-secondary">Prosj. rezultat</p>
                </div>
              </div>
            </div>

            {/* Language hint */}
            {clientLanguages.length > 0 && (
              <div className="flex items-center gap-2 bg-brand-accent/5 border border-brand-accent/15 rounded-lg px-4 py-2.5">
                <Globe size={14} className="text-brand-accent shrink-0" />
                <p className="text-xs text-studio-text-secondary">
                  <span className="font-medium text-studio-text-primary">Jezici klijenta:</span>{' '}
                  {clientLanguages.map(l => l.toUpperCase()).join(', ')}
                  {' — '} Zemlje koje odgovaraju tim jezicima označene su oznakom <span className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0 rounded bg-brand-accent/15 text-brand-accent font-medium"><Globe size={8} /> Jezik</span>
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-studio-text-secondary text-sm">
                Bodovanje {sortedData.length} ciljnih tržišta — kliknite na red za pregled detalja
              </p>
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
              <ComparisonBar
                data={topMarkets}
                title="Top 5 tržišta po ukupnom rezultatu"
                valueLabel="Ukupni rezultat"
                yAxisWidth={130}
                tooltipFormatter={(value) => `${value} bodova`}
              />
            </div>

            {/* Score Legend */}
            <div className="flex flex-wrap gap-4 px-1">
              <div className="flex items-center gap-2 text-xs text-studio-text-secondary">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                Interes za tržište
                <span title={SCORE_EXPLANATIONS.marketInterest}><Info size={12} className="text-studio-text-tertiary cursor-help" /></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-studio-text-secondary">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                Prepoznatljivost brenda
                <span title={SCORE_EXPLANATIONS.brandAwareness}><Info size={12} className="text-studio-text-tertiary cursor-help" /></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-studio-text-secondary">
                <BarChart3 size={12} className="text-yellow-600" />
                Ukupni rezultat = težinski prosjek svih faktora
              </div>
            </div>

            {/* Full Market Table */}
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
                      <th className="py-3 px-2 text-studio-text-secondary font-medium">
                        <span className="flex items-center gap-1">
                          Interes za tržište
                          <span title={SCORE_EXPLANATIONS.marketInterest}><Info size={11} className="text-studio-text-tertiary cursor-help" /></span>
                        </span>
                      </th>
                      <th className="py-3 px-2 text-studio-text-secondary font-medium">
                        <span className="flex items-center gap-1">
                          Prepoznatljivost
                          <span title={SCORE_EXPLANATIONS.brandAwareness}><Info size={11} className="text-studio-text-tertiary cursor-help" /></span>
                        </span>
                      </th>
                      <th className="py-3 px-2 text-studio-text-secondary font-medium">Ukupni rezultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map(row => (
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
                                <span className="text-studio-text-primary font-medium truncate max-w-[180px]" title={row.country}>
                                  {truncateCountry(row.country, 22)}
                                </span>
                                {clientLanguages.length > 0 && (
                                  <LanguagePriorityBadge languages={clientLanguages} countryCode={row.code} />
                                )}
                              </div>
                            </div>
                            <div className="py-3 px-2 w-28">
                              <RegionBadge region={row.region} />
                            </div>
                            <div className="py-3 px-2 w-24">
                              <span className="text-studio-text-secondary">{row.population}</span>
                            </div>
                            <div className="py-3 px-2 w-44">
                              <ScoreBar
                                value={row.marketInterest}
                                color="#3b82f6"
                                label="Interes za tržište"
                                explanation={SCORE_EXPLANATIONS.marketInterest}
                              />
                            </div>
                            <div className="py-3 px-2 w-40">
                              <ScoreBar
                                value={row.brandAwareness}
                                color="#a855f7"
                                label="Prepoznatljivost brenda"
                                explanation={SCORE_EXPLANATIONS.brandAwareness}
                              />
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

            {/* Not real data indicator */}
            {!hasRealData && (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-4 py-3">
                <Eye size={14} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Prikazani su <strong>demo podaci</strong>. Pokrenite skeniranje za stvarne rezultate temeljene na vašem profilu brenda.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
