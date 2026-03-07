import Header from '../components/layout/Header'
import DataTable from '../components/common/DataTable'
import { ComparisonBar } from '../components/charts/ComparisonBar'
import { PageLoader, ErrorState } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface CompetitorRow {
  club: string
  country: string
  igFollowers: number
  igEngagement: number
  tiktokFollowers: number
  gapVsDinamo: number
  tier: string
}

interface CompetitorData {
  competitors: CompetitorRow[]
  dinamoIg: number
  summary: {
    directCount: number
    dinamoLeadsIn: number
    dinamoIgFormatted: string
    dinamoRank: string
    avgEngagementDirect: number
    dinamoEngagement: number
  }
}

const formatFollowers = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  return `${(n / 1000).toFixed(0)}K`
}

// Fallback mock data for when API is not available
const fallbackData: CompetitorData = {
  competitors: [
    { club: 'Galatasaray SK', country: 'Turkey', igFollowers: 15600000, igEngagement: 1.2, tiktokFollowers: 4200000, gapVsDinamo: 15033000, tier: 'aspirational' },
    { club: 'Ajax Amsterdam', country: 'Netherlands', igFollowers: 9000000, igEngagement: 1.8, tiktokFollowers: 2100000, gapVsDinamo: 8433000, tier: 'aspirational' },
    { club: 'Besiktas JK', country: 'Turkey', igFollowers: 5600000, igEngagement: 1.4, tiktokFollowers: 1800000, gapVsDinamo: 5033000, tier: 'aspirational' },
    { club: 'Sporting CP', country: 'Portugal', igFollowers: 2800000, igEngagement: 2.1, tiktokFollowers: 950000, gapVsDinamo: 2233000, tier: 'stretch' },
    { club: 'Red Bull Salzburg', country: 'Austria', igFollowers: 542000, igEngagement: 2.4, tiktokFollowers: 320000, gapVsDinamo: -25000, tier: 'direct' },
    { club: 'Slavia Praha', country: 'Czech Republic', igFollowers: 413000, igEngagement: 2.6, tiktokFollowers: 185000, gapVsDinamo: -154000, tier: 'direct' },
    { club: 'Hajduk Split', country: 'Croatia', igFollowers: 302000, igEngagement: 3.1, tiktokFollowers: 145000, gapVsDinamo: -265000, tier: 'direct' },
    { club: 'Ferencvaros TC', country: 'Hungary', igFollowers: 280000, igEngagement: 2.8, tiktokFollowers: 120000, gapVsDinamo: -287000, tier: 'direct' },
  ],
  dinamoIg: 567000,
  summary: {
    directCount: 4,
    dinamoLeadsIn: 3,
    dinamoIgFormatted: '567K',
    dinamoRank: '#1 u direktnoj skupini',
    avgEngagementDirect: 2.7,
    dinamoEngagement: 3.2,
  },
}

const columns = [
  { key: 'club', header: 'Klub', render: (row: CompetitorRow) => (
    <div className="min-w-0">
      <span className="text-white font-medium truncate">{row.club}</span>
      <span className="text-xs text-dinamo-muted ml-2 hidden sm:inline">{row.country}</span>
    </div>
  )},
  { key: 'tier', header: 'Skupina', render: (row: CompetitorRow) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      row.tier === 'aspirational' ? 'bg-purple-100 text-purple-600' :
      row.tier === 'stretch' ? 'bg-yellow-100 text-yellow-600' :
      'bg-blue-500/15 text-blue-400'
    }`}>
      {row.tier}
    </span>
  )},
  { key: 'igFollowers', header: 'IG pratitelji', render: (row: CompetitorRow) => (
    <span className="text-gray-300 font-mono">{formatFollowers(row.igFollowers)}</span>
  )},
  { key: 'igEngagement', header: 'IG angažman', render: (row: CompetitorRow) => (
    <div className="flex items-center gap-2">
      <span className={`text-sm ${row.igEngagement > 2.5 ? 'text-green-600' : row.igEngagement > 1.5 ? 'text-yellow-600' : 'text-red-400'}`}>
        {row.igEngagement}%
      </span>
    </div>
  )},
  { key: 'tiktokFollowers', header: 'TikTok', render: (row: CompetitorRow) => (
    <span className="text-gray-300 font-mono">{formatFollowers(row.tiktokFollowers)}</span>
  )},
  { key: 'gapVsDinamo', header: 'Jaz prema Dinamu', render: (row: CompetitorRow) => {
    const icon = row.gapVsDinamo > 0 ? <TrendingUp size={14} /> : row.gapVsDinamo < 0 ? <TrendingDown size={14} /> : <Minus size={14} />
    return (
      <div className={`flex items-center gap-1 text-sm font-mono ${
        row.gapVsDinamo > 0 ? 'text-red-400' : 'text-green-600'
      }`}>
        {icon}
        {row.gapVsDinamo > 0 ? '+' : ''}{formatFollowers(Math.abs(row.gapVsDinamo))}
      </div>
    )
  }},
]

export default function Competitors() {
  const { data: apiData, loading, error, refetch } = useApi<CompetitorData>('/competitors')
  const data = apiData || fallbackData

  if (loading && !apiData) return <><Header title="KONKURENCIJA" subtitle="Usporedba s konkurencijom i analiza jaza" /><PageLoader /></>

  const competitorList = data.competitors || fallbackData.competitors
  const summary = data.summary || fallbackData.summary

  const followerComparison = [
    { name: 'Dinamo Zagreb', value: data.dinamoIg || fallbackData.dinamoIg },
    ...competitorList.filter(c => c.tier === 'direct').map(c => ({ name: c.club, value: c.igFollowers })),
  ]

  return (
    <div className="animate-fade-in">
      <Header title="KONKURENCIJA" subtitle="Usporedba s konkurencijom i analiza jaza" />

      <div className="page-wrapper space-y-6">


        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-dinamo-muted">Direktni konkurenti</p>
            <p className="text-3xl font-bold text-white mt-1">{summary.directCount}</p>
            <p className="text-xs text-green-600 mt-1">Dinamo vodi u {summary.dinamoLeadsIn} od {summary.directCount}</p>
          </div>
          <div className="card">
            <p className="text-sm text-dinamo-muted">Dinamo IG pratitelji</p>
            <p className="text-3xl font-bold text-white mt-1">{summary.dinamoIgFormatted}</p>
            <p className="text-xs text-blue-400 mt-1">Rangirani {summary.dinamoRank}</p>
          </div>
          <div className="card">
            <p className="text-sm text-dinamo-muted">Prosj. angažman (direktni)</p>
            <p className="text-3xl font-bold text-white mt-1">{summary.avgEngagementDirect}%</p>
            <p className="text-xs text-yellow-600 mt-1">Dinamo: {summary.dinamoEngagement}% (iznad prosjeka)</p>
          </div>
        </div>

        {/* Direct Competitor Comparison */}
        <div className="card">
          <ComparisonBar data={followerComparison} title="Instagram pratitelji — direktni konkurenti" valueLabel="Followers" />
        </div>

        {/* Full Competitor Table */}
        <div className="card">
          <h2 className="section-title mb-4">Svi praćeni konkurenti</h2>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={competitorList} emptyMessage="Nema praćenih konkurenata" />
          </div>
        </div>
      </div>
    </div>
  )
}
