import Header from '../components/layout/Header'
import DataTable from '../components/common/DataTable'
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSpinner'
import { ComparisonBar } from '../components/charts/ComparisonBar'
import { useApi } from '../hooks/useApi'
import { useApiMutation } from '../hooks/useApiMutation'
import { Download, RefreshCw } from 'lucide-react'

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

const columns = [
  { key: 'rank', header: '#', render: (row: MarketRow) => <span className="text-gray-500 font-mono">{row.rank}</span> },
  { key: 'country', header: 'Država', render: (row: MarketRow) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 font-mono w-6">{row.code}</span>
      <span className="text-gray-900 font-medium truncate">{row.country}</span>
    </div>
  )},
  { key: 'region', header: 'Regija', render: (row: MarketRow) => <span className="text-gray-500">{row.region}</span> },
  { key: 'population', header: 'Populacija', render: (row: MarketRow) => <span className="text-gray-500">{row.population}</span> },
  { key: 'footballInterest', header: 'Interes za nogomet', render: (row: MarketRow) => (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-200 rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${row.footballInterest}%` }} />
      </div>
      <span className="text-gray-500 text-sm">{row.footballInterest}</span>
    </div>
  )},
  { key: 'diaspora', header: 'Dijaspora', render: (row: MarketRow) => (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-200 rounded-full h-2">
        <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${row.diaspora}%` }} />
      </div>
      <span className="text-gray-500 text-sm">{row.diaspora}</span>
    </div>
  )},
  { key: 'totalScore', header: 'Ukupni rezultat', render: (row: MarketRow) => (
    <span className={`font-bold ${row.rank <= 3 ? 'text-yellow-600' : row.rank <= 10 ? 'text-gray-900' : 'text-gray-500'}`}>
      {row.totalScore}
    </span>
  )},
]

export default function MarketResearch() {
  const { data: apiData, loading, refetch } = useApi<MarketRow[]>('/market-research/countries')
  const scanMutation = useApiMutation('/market-research/scan', 'post')

  const marketData = apiData || fallbackData
  const topMarkets = marketData.slice(0, 5).map(m => ({ name: m.country, value: m.totalScore }))

  const handleScan = async () => {
    await scanMutation.mutate()
    refetch()
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
        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-gray-500 text-sm">Bodovanje {marketData.length} ciljnih tržišta po 4 dimenzije</p>
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

        {/* Full Market Table */}
        <div className="card overflow-hidden">
          <h2 className="section-title mb-4">Matrica tržišnih prilika</h2>
          <div className="overflow-x-auto -mx-5 px-5">
            <DataTable columns={columns} data={marketData} emptyMessage="Nema dostupnih tržišnih podataka" />
          </div>
        </div>
      </div>
    </div>
  )
}
