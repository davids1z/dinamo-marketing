import { useState, useMemo, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from 'react-simple-maps'
import { scaleLinear } from 'd3-scale'
import Header from '../components/layout/Header'
import MetricCard from '../components/common/MetricCard'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import { useApi } from '../hooks/useApi'
import { useProjectStatus } from '../hooks/useProjectStatus'
import { useClient } from '../contexts/ClientContext'
import { formatNumber, formatCurrency } from '../utils/formatters'
import { CHART_ANIM, AXIS_STYLE, GRID_STYLE } from '../components/charts/chartConfig'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  Globe, Users, MapPin, Languages, Calendar, TrendingUp, TrendingDown,
  DollarSign, Info, Zap, Sparkles, Search, ChevronDown, X,
  FolderKanban, ArrowUpRight, Building2, Eye, Target,
} from 'lucide-react'

/* ─────────── types ─────────── */

interface CityData {
  name: string
  reach: number
  active: number
}

interface Market {
  id: string
  country: string
  code: string
  flag: string
  region: string
  language: string
  reach: number
  active_users: number
  engagement: number
  growth_7d: number
  growth_30d: number
  ad_cost_cpm: number
  monthly_ad_spend: number
  conversions: number
  revenue: number
  market_score: number
  cities: CityData[]
  offices: number
}

interface RegionComparison {
  region: string
  reach: number
  active: number
  countries: number
  share: number
  ad_spend: number
}

interface ContentItem {
  id: string
  title: string
  languages: string[]
  platform: string
  type: string
  date: string
  due_date?: string
  status: string
  description: string
}

interface HeatmapEntry {
  code: string
  country: string
  intensity: number
  reach: number
  growth: number
}

interface AIInsightItem {
  icon: string
  text: string
  type: 'success' | 'info' | 'warning'
}

interface PageData {
  markets: Market[]
  regionComparison: RegionComparison[]
  contentPipeline: ContentItem[]
  heatmapData: HeatmapEntry[]
  summary: {
    total_markets: number
    total_reach: number
    total_active: number
    total_offices: number
    total_ad_spend: number
    total_conversions: number
    total_revenue: number
    avg_engagement: number
    languages: string[]
  }
  aiInsights: {
    title: string
    insights: AIInsightItem[]
  }
  _meta?: {
    is_estimate: boolean
    connected_platforms?: string[]
    analyzed_at: string | null
  }
}

/* ─────────── ISO alpha-2 → numeric-3 mapping ─────────── */
// world-atlas topojson uses numeric ISO 3166-1 codes as feature IDs
const ISO_A2_TO_NUMERIC: Record<string, string> = {
  AF: '004', AL: '008', DZ: '012', AD: '020', AO: '024', AG: '028', AR: '032',
  AM: '051', AU: '036', AT: '040', AZ: '031', BS: '044', BH: '048', BD: '050',
  BB: '052', BY: '112', BE: '056', BZ: '084', BJ: '204', BT: '064', BO: '068',
  BA: '070', BW: '072', BR: '076', BN: '096', BG: '100', BF: '854', BI: '108',
  CV: '132', KH: '116', CM: '120', CA: '124', CF: '140', TD: '148', CL: '152',
  CN: '156', CO: '170', KM: '174', CD: '180', CG: '178', CR: '188', HR: '191',
  CU: '192', CY: '196', CZ: '203', DK: '208', DJ: '262', DM: '212', DO: '214',
  EC: '218', EG: '818', SV: '222', GQ: '226', ER: '232', EE: '233', SZ: '748',
  ET: '231', FJ: '242', FI: '246', FR: '250', GA: '266', GM: '270', GE: '268',
  DE: '276', GH: '288', GR: '300', GD: '308', GT: '320', GN: '324', GW: '624',
  GY: '328', HT: '332', HN: '340', HU: '348', IS: '352', IN: '356', ID: '360',
  IR: '364', IQ: '368', IE: '372', IL: '376', IT: '380', JM: '388', JP: '392',
  JO: '400', KZ: '398', KE: '404', KI: '296', KW: '414', KG: '417', LA: '418',
  LV: '428', LB: '422', LS: '426', LR: '430', LY: '434', LI: '438', LT: '440',
  LU: '442', MG: '450', MW: '454', MY: '458', MV: '462', ML: '466', MT: '470',
  MH: '584', MR: '478', MU: '480', MX: '484', FM: '583', MD: '498', MC: '492',
  MN: '496', ME: '499', MA: '504', MZ: '508', MM: '104', NA: '516', NR: '520',
  NP: '524', NL: '528', NZ: '554', NI: '558', NE: '562', NG: '566', NO: '578',
  OM: '512', PK: '586', PW: '585', PA: '591', PG: '598', PY: '600', PE: '604',
  PH: '608', PL: '616', PT: '620', QA: '634', RO: '642', RU: '643', RW: '646',
  KN: '659', LC: '662', VC: '670', WS: '882', SM: '674', ST: '678', SA: '682',
  SN: '686', RS: '688', SC: '690', SL: '694', SG: '702', SK: '703', SI: '705',
  SB: '090', SO: '706', ZA: '710', SS: '728', ES: '724', LK: '144', SD: '729',
  SR: '740', SE: '752', CH: '756', SY: '760', TW: '158', TJ: '762', TZ: '834',
  TH: '764', TL: '626', TG: '768', TO: '776', TT: '780', TN: '788', TR: '792',
  TM: '795', TV: '798', UG: '800', UA: '804', AE: '784', GB: '826', US: '840',
  UY: '858', UZ: '860', VU: '548', VE: '862', VN: '704', YE: '887', ZM: '894',
  ZW: '716', MK: '807', XK: '383', TF: '260', EH: '732', PS: '275', CX: '162',
  NF: '574', MO: '446', HK: '344', GF: '254', GP: '312', MQ: '474', RE: '638',
  PM: '666', YT: '175', AW: '533', CW: '531', SX: '534', BQ: '535', NC: '540',
  PF: '258', WF: '876', FK: '238', GS: '239', AQ: '010', BV: '074', HM: '334',
  IO: '086', UM: '581', VI: '850', PR: '630', GU: '316', MP: '580', AS: '016',
}

/* ─────────── helpers ─────────── */

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const langColors: Record<string, string> = {
  HR: 'bg-red-500/10 text-red-400 border-red-500/20',
  EN: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DE: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  hr: 'bg-red-500/10 text-red-400 border-red-500/20',
  en: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  de: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
}

const langLabel: Record<string, string> = {
  hr: 'Hrvatski', en: 'Engleski', de: 'Njemački',
  HR: 'Hrvatski', EN: 'Engleski', DE: 'Njemački',
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-blue-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500/10'
  if (score >= 60) return 'bg-blue-500/10'
  if (score >= 40) return 'bg-yellow-500/10'
  return 'bg-red-500/10'
}

function growthBadge(growth: number) {
  const isPositive = growth >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
      isPositive ? 'text-green-400' : 'text-red-400'
    }`}>
      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {isPositive ? '+' : ''}{growth.toFixed(1)}%
    </span>
  )
}

const insightIconMap: Record<string, typeof TrendingUp> = {
  TrendingUp,
  Globe,
  DollarSign,
  Languages,
}

/* ─────────── EstimateBanner ─────────── */

function EstimateBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
      <Info size={16} className="text-amber-500 flex-shrink-0" />
      <p className="text-xs text-amber-400/80">
        <span className="font-semibold text-amber-400">Procijenjeni podaci</span> — prikazani su benchmark rezultati temeljeni na sličnim brendovima. Analiza započinje automatski nakon prikupljanja prvih podataka.
      </p>
    </div>
  )
}

/* ─────────── AI Geo-Intelligence Insight ─────────── */

function GeoAIInsight({
  aiInsights,
  isEstimate,
  brandName,
}: {
  aiInsights: PageData['aiInsights']
  isEstimate: boolean
  brandName: string
}) {
  const insight = useMemo(() => {
    if (isEstimate) {
      return {
        icon: Zap,
        color: '#f59e0b',
        title: 'Analiziramo vaša tržišta',
        text: `AI mapira geografsku prisutnost za ${brandName}. Prikazani su procijenjeni podaci na temelju benchmark podataka sličnih brendova u regiji.`,
      }
    }
    return {
      icon: Sparkles,
      color: '#22c55e',
      title: aiInsights.title || 'AI Geo-Intelligence',
      text: aiInsights.insights?.[0]?.text || `${brandName} ima aktivnu prisutnost na više tržišta. Pogledajte AI preporuke ispod.`,
    }
  }, [isEstimate, brandName, aiInsights])

  const InsightIcon = insight.icon

  return (
    <div
      className="rounded-xl border border-white/5 p-5 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${insight.color}08, ${insight.color}03)` }}
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: insight.color }} />
      <div className="relative flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${insight.color}20` }}>
          <InsightIcon size={20} style={{ color: insight.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: insight.color }}>AI Geo-Intelligence</span>
            <span className="text-studio-text-tertiary">&middot;</span>
            <span className="text-xs text-studio-text-tertiary">{insight.title}</span>
          </div>
          <p className="text-sm text-studio-text-secondary leading-relaxed">{insight.text}</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────── World Choropleth Map ─────────── */

interface TooltipState {
  x: number
  y: number
  market: Market
}

function WorldChoroplethMap({
  markets,
  onSelect,
}: {
  markets: Market[]
  onSelect: (m: Market) => void
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Build lookup: ISO numeric code → market
  const marketByNumeric = useMemo(() => {
    const map: Record<string, Market> = {}
    for (const m of markets) {
      const numericCode = ISO_A2_TO_NUMERIC[m.code.toUpperCase()]
      if (numericCode) {
        map[numericCode] = m
      }
    }
    return map
  }, [markets])

  const maxReach = useMemo(() => {
    return Math.max(...markets.map((m) => m.reach), 1)
  }, [markets])

  // Color scale: dark bg → brand accent
  const colorScale = useMemo(
    () =>
      scaleLinear<string>()
        .domain([0, maxReach])
        .range(['#1c2a18', '#B8FF00'])
        .clamp(true),
    [maxReach]
  )

  const handleMouseEnter = useCallback(
    (geo: { id: string }, evt: React.MouseEvent<SVGPathElement>) => {
      const market = marketByNumeric[geo.id]
      if (market) {
        setTooltip({ x: evt.clientX, y: evt.clientY, market })
      }
    },
    [marketByNumeric]
  )

  const handleMouseMove = useCallback(
    (geo: { id: string }, evt: React.MouseEvent<SVGPathElement>) => {
      const market = marketByNumeric[geo.id]
      if (market) {
        setTooltip({ x: evt.clientX, y: evt.clientY, market })
      }
    },
    [marketByNumeric]
  )

  const handleMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  const handleClick = useCallback(
    (geo: { id: string }) => {
      const market = marketByNumeric[geo.id]
      if (market) {
        onSelect(market)
      }
    },
    [marketByNumeric, onSelect]
  )

  // Top 5 markets for the legend list
  const top5 = useMemo(
    () => [...markets].sort((a, b) => b.reach - a.reach).slice(0, 5),
    [markets]
  )

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-brand-accent" />
          <h3 className="font-headline text-base tracking-wider text-studio-text-primary">
            Geografska mapa tržišta
          </h3>
        </div>
        <span className="text-xs text-studio-text-tertiary">
          {markets.length} aktivnih tržišta
        </span>
      </div>

      {/* Map container */}
      <div
        className="relative w-full rounded-xl overflow-hidden border border-studio-border-subtle"
        style={{ background: '#0a1a28' }}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 130, center: [15, 30] }}
          width={800}
          height={400}
          style={{ width: '100%', height: 'auto' }}
        >
          <Sphere
            id="rsm-sphere"
            fill="#0a1a28"
            stroke="#1e3a4a"
            strokeWidth={0.5}
          />
          <Graticule
            stroke="#1e3a4a"
            strokeWidth={0.3}
            fill="transparent"
          />
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const market = marketByNumeric[geo.id as string]
                const fill = market
                  ? colorScale(market.reach)
                  : '#132233'
                const isActive = !!market

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#1e3a4a"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: {
                        outline: 'none',
                        fill: isActive ? '#d4ff4d' : '#1a2f40',
                        cursor: isActive ? 'pointer' : 'default',
                      },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(evt) => handleMouseEnter(geo as { id: string }, evt)}
                    onMouseMove={(evt) => handleMouseMove(geo as { id: string }, evt)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(geo as { id: string })}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>

        {/* Color scale legend */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="text-[10px] text-white/40">Niski doseg</span>
          <div
            className="w-24 h-2 rounded-full"
            style={{
              background: 'linear-gradient(to right, #1c2a18, #B8FF00)',
            }}
          />
          <span className="text-[10px] text-white/40">Visoki doseg</span>
        </div>
      </div>

      {/* Tooltip rendered at mouse position via portal-like fixed div */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="bg-brand-primary border border-brand-accent/20 rounded-xl px-3 py-2.5 shadow-2xl min-w-[160px]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl leading-none">{tooltip.market.flag}</span>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">{tooltip.market.country}</p>
                <p className="text-[10px] text-white/50">{tooltip.market.region}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-[10px] text-white/40">Doseg</span>
              <span className="text-[10px] font-mono text-brand-accent text-right">{formatNumber(tooltip.market.reach)}</span>
              <span className="text-[10px] text-white/40">Angažman</span>
              <span className="text-[10px] font-mono text-white/80 text-right">{tooltip.market.engagement}%</span>
              <span className="text-[10px] text-white/40">Rast 7d</span>
              <span className={`text-[10px] font-mono text-right ${tooltip.market.growth_7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {tooltip.market.growth_7d >= 0 ? '+' : ''}{tooltip.market.growth_7d}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top 5 market bars below map */}
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-studio-text-secondary mb-3">
          Top 5 tržišta po dosegu
        </p>
        <div className="space-y-2.5">
          {top5.map((m, idx) => {
            const pct = (m.reach / maxReach) * 100
            return (
              <button
                key={m.code}
                className="w-full text-left group"
                onClick={() => onSelect(m)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-studio-text-disabled w-4">#{idx + 1}</span>
                    <span className="text-base leading-none">{m.flag}</span>
                    <span className="text-sm text-studio-text-primary font-medium group-hover:text-brand-accent transition-colors">
                      {m.country}
                    </span>
                    <span className="text-[10px] text-studio-text-tertiary hidden sm:inline">{m.region}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-studio-text-secondary">{formatNumber(m.reach)}</span>
                    {growthBadge(m.growth_7d)}
                  </div>
                </div>
                <div className="h-1.5 bg-studio-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: `hsl(${85 - idx * 12}, 100%, ${60 - idx * 5}%)`,
                    }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend note */}
      <p className="text-[10px] text-studio-text-disabled mt-3">
        Klikni na državu ili redak za detalje tržišta
      </p>
    </div>
  )
}

/* ─────────── Region Comparison Chart ─────────── */

function RegionChart({ regions }: { regions: RegionComparison[] }) {
  if (regions.length === 0) return null
  const chartData = regions.map((r) => ({
    name: r.region.replace('Dijaspora — ', ''),
    reach: r.reach,
    countries: r.countries,
    share: r.share,
  }))

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <Target size={18} className="text-brand-accent" />
        <h3 className="font-headline text-base tracking-wider text-studio-text-primary">Doseg po regijama</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
          <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
          <XAxis type="number" {...AXIS_STYLE} tickFormatter={(v: number) => formatNumber(v)} />
          <YAxis type="category" dataKey="name" {...AXIS_STYLE} width={120} />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 12 }}
            labelStyle={{ color: '#fff', fontWeight: 600 }}
            formatter={(value: number) => [formatNumber(value), 'Doseg']}
          />
          <Bar
            dataKey="reach"
            radius={[0, 6, 6, 0]}
            animationDuration={CHART_ANIM.barDuration}
            animationEasing={CHART_ANIM.barEasing}
          >
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={idx === 0 ? 'rgb(var(--brand-accent-rgb, 184, 255, 0))' : `rgba(var(--brand-accent-rgb, 184, 255, 0), ${0.6 - idx * 0.1})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Region share breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-studio-border-subtle">
        {regions.map((r) => (
          <div key={r.region} className="text-center">
            <p className="text-lg font-stats text-studio-text-primary">{r.share}%</p>
            <p className="text-[10px] text-studio-text-secondary truncate">{r.region}</p>
            <p className="text-[10px] text-studio-text-tertiary">{r.countries} {r.countries === 1 ? 'država' : 'država'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────── AI Insights Section ─────────── */

function AIInsightsSection({ insights }: { insights: AIInsightItem[] }) {
  if (insights.length === 0) return null

  const defaultStyle = { bg: 'bg-blue-500/5', border: 'border-blue-500/15', icon: 'text-blue-400' }
  const typeStyle: Record<string, { bg: string; border: string; icon: string }> = {
    success: { bg: 'bg-green-500/5', border: 'border-green-500/15', icon: 'text-green-400' },
    info: defaultStyle,
    warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/15', icon: 'text-amber-400' },
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles size={18} className="text-brand-accent" />
        <h3 className="font-headline text-base tracking-wider text-studio-text-primary">AI Geo-Intelligence — Preporuke</h3>
      </div>
      <div className="space-y-3">
        {insights.map((item, idx) => {
          const style = typeStyle[item.type] ?? defaultStyle
          const Icon = insightIconMap[item.icon] ?? Globe
          return (
            <div key={idx} className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                <Icon size={16} className={style.icon} />
              </div>
              <p className="text-sm text-studio-text-secondary leading-relaxed">{item.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────── Market Detail Modal ─────────── */

function MarketDetailModal({ market, onClose }: { market: Market; onClose: () => void }) {
  const totalCityReach = market.cities.reduce((s, c) => s + c.reach, 0) || 1

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-studio-surface-1 border border-studio-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-studio-surface-1 border-b border-studio-border p-5 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{market.flag}</span>
            <div>
              <h2 className="text-lg font-headline tracking-wider text-studio-text-primary">{market.country}</h2>
              <p className="text-xs text-studio-text-secondary">{market.region} · {langLabel[market.language] || market.language}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${scoreBg(market.market_score)} ${scoreColor(market.market_score)}`}>
              Score: {market.market_score}/100
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-studio-surface-2 flex items-center justify-center hover:bg-studio-surface-3 transition-colors">
              <X size={16} className="text-studio-text-secondary" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-studio-surface-0 rounded-xl p-3 border border-studio-border-subtle">
              <p className="text-[10px] uppercase tracking-wider text-studio-text-secondary mb-1">Doseg</p>
              <p className="text-lg font-stats text-studio-text-primary">{formatNumber(market.reach)}</p>
            </div>
            <div className="bg-studio-surface-0 rounded-xl p-3 border border-studio-border-subtle">
              <p className="text-[10px] uppercase tracking-wider text-studio-text-secondary mb-1">Aktivni</p>
              <p className="text-lg font-stats text-studio-text-primary">{formatNumber(market.active_users)}</p>
            </div>
            <div className="bg-studio-surface-0 rounded-xl p-3 border border-studio-border-subtle">
              <p className="text-[10px] uppercase tracking-wider text-studio-text-secondary mb-1">Angažman</p>
              <p className="text-lg font-stats text-studio-text-primary">{market.engagement}%</p>
            </div>
            <div className="bg-studio-surface-0 rounded-xl p-3 border border-studio-border-subtle">
              <p className="text-[10px] uppercase tracking-wider text-studio-text-secondary mb-1">Uredi</p>
              <p className="text-lg font-stats text-studio-text-primary">{market.offices}</p>
            </div>
          </div>

          {/* Growth */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-studio-surface-0 rounded-xl p-4 border border-studio-border-subtle">
              <p className="text-xs text-studio-text-secondary mb-2">Rast (7 dana)</p>
              <div className="flex items-center gap-2">
                {growthBadge(market.growth_7d)}
                <span className="text-sm text-studio-text-primary font-stats">{market.growth_7d > 0 ? '+' : ''}{market.growth_7d}%</span>
              </div>
            </div>
            <div className="bg-studio-surface-0 rounded-xl p-4 border border-studio-border-subtle">
              <p className="text-xs text-studio-text-secondary mb-2">Rast (30 dana)</p>
              <div className="flex items-center gap-2">
                {growthBadge(market.growth_30d)}
                <span className="text-sm text-studio-text-primary font-stats">{market.growth_30d > 0 ? '+' : ''}{market.growth_30d}%</span>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-studio-surface-0 rounded-xl p-4 border border-studio-border-subtle">
            <h4 className="text-xs font-bold uppercase tracking-wider text-studio-text-secondary mb-3">Financijski pregled</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-studio-text-tertiary">CPM</p>
                <p className="text-sm font-stats text-studio-text-primary">{formatCurrency(market.ad_cost_cpm)}</p>
              </div>
              <div>
                <p className="text-[10px] text-studio-text-tertiary">Mj. potrošnja</p>
                <p className="text-sm font-stats text-studio-text-primary">{formatCurrency(market.monthly_ad_spend)}</p>
              </div>
              <div>
                <p className="text-[10px] text-studio-text-tertiary">Konverzije</p>
                <p className="text-sm font-stats text-studio-text-primary">{market.conversions}</p>
              </div>
              <div>
                <p className="text-[10px] text-studio-text-tertiary">Prihod</p>
                <p className="text-sm font-stats text-green-400">{formatCurrency(market.revenue)}</p>
              </div>
            </div>
          </div>

          {/* City breakdown */}
          {market.cities.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-studio-text-secondary mb-3">Gradovi</h4>
              <div className="space-y-2">
                {market.cities.map((city) => {
                  const pct = (city.reach / totalCityReach) * 100
                  return (
                    <div key={city.name} className="flex items-center gap-3">
                      <span className="text-sm text-studio-text-primary w-28 shrink-0 truncate">{city.name}</span>
                      <div className="flex-1 bg-studio-surface-3 rounded-full h-2.5 overflow-hidden">
                        <div className="h-full rounded-full bg-brand-accent/60 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-studio-text-secondary w-16 text-right font-mono">{formatNumber(city.reach)}</span>
                      <span className="text-xs text-studio-text-tertiary w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action */}
          <div className="flex gap-3 pt-2">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-accent text-brand-dark rounded-xl text-sm font-semibold hover:bg-brand-accent/90 transition-colors">
              <Languages size={16} />
              Lokaliziraj kampanju
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-studio-surface-2 text-studio-text-primary rounded-xl text-sm font-medium hover:bg-studio-surface-3 transition-colors">
              <ArrowUpRight size={16} />
              Kreiraj oglasnu kampanju
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Ad Cost Comparison Table ─────────── */

function AdCostTable({ markets }: { markets: Market[] }) {
  const sorted = useMemo(() => [...markets].sort((a, b) => a.ad_cost_cpm - b.ad_cost_cpm), [markets])
  const maxCpm = sorted[sorted.length - 1]?.ad_cost_cpm ?? 1

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <DollarSign size={18} className="text-brand-accent" />
        <h3 className="font-headline text-base tracking-wider text-studio-text-primary">Trošak oglašavanja po tržištima (CPM)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-studio-border">
              <th className="text-left py-3 px-4 text-studio-text-secondary font-medium">Tržište</th>
              <th className="text-right py-3 px-4 text-studio-text-secondary font-medium">CPM</th>
              <th className="text-right py-3 px-4 text-studio-text-secondary font-medium hidden sm:table-cell">Mj. potrošnja</th>
              <th className="text-right py-3 px-4 text-studio-text-secondary font-medium hidden md:table-cell">Konverzije</th>
              <th className="text-right py-3 px-4 text-studio-text-secondary font-medium hidden md:table-cell">Prihod</th>
              <th className="text-left py-3 px-4 text-studio-text-secondary font-medium w-40 hidden lg:table-cell">Relativni trošak</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr key={m.code} className="border-b border-studio-border-subtle hover:bg-studio-surface-1 transition-colors">
                <td className="py-3 px-4">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{m.flag}</span>
                    <span className="text-studio-text-primary font-medium">{m.country}</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-stats text-studio-text-primary">{formatCurrency(m.ad_cost_cpm)}</td>
                <td className="py-3 px-4 text-right font-mono text-studio-text-secondary hidden sm:table-cell">{formatCurrency(m.monthly_ad_spend)}</td>
                <td className="py-3 px-4 text-right font-mono text-studio-text-secondary hidden md:table-cell">{m.conversions}</td>
                <td className="py-3 px-4 text-right font-mono text-green-400 hidden md:table-cell">{formatCurrency(m.revenue)}</td>
                <td className="py-3 px-4 hidden lg:table-cell">
                  <div className="h-2 bg-studio-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-accent/50 transition-all"
                      style={{ width: `${(m.ad_cost_cpm / maxCpm) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function GeographicMarkets() {
  const { data: apiData, loading } = useApi<PageData>('/diaspora/page-data')
  const { hasProjects } = useProjectStatus()
  const { currentClient } = useClient()
  const navigate = (path: string) => { window.location.href = path }

  const brandName = currentClient?.client_name || 'Vaš brend'

  // State
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'reach' | 'growth' | 'score' | 'cpm'>('reach')

  const data = apiData || {
    markets: [], regionComparison: [], contentPipeline: [],
    heatmapData: [], summary: {
      total_markets: 0, total_reach: 0, total_active: 0, total_offices: 0,
      total_ad_spend: 0, total_conversions: 0, total_revenue: 0, avg_engagement: 0, languages: [],
    },
    aiInsights: { title: '', insights: [] },
  }

  const isEstimate = apiData?._meta?.is_estimate ?? false
  // useMemo prevents a new array reference on every render (react-hooks/exhaustive-deps)
  const markets = useMemo(() => data.markets || [], [data.markets])
  const regions = data.regionComparison || []
  const contentPipeline = data.contentPipeline || []
  const summary = data.summary
  const aiInsights = data.aiInsights

  // Unique region names for filter
  const uniqueRegions = useMemo(() => {
    const set = new Set(markets.map((m) => m.region))
    return Array.from(set)
  }, [markets])

  // Filtered & sorted markets
  const filteredMarkets = useMemo(() => {
    let result = [...markets]
    if (regionFilter !== 'all') {
      result = result.filter((m) => m.region === regionFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) => m.country.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)
      )
    }
    switch (sortBy) {
      case 'reach': result.sort((a, b) => b.reach - a.reach); break
      case 'growth': result.sort((a, b) => b.growth_7d - a.growth_7d); break
      case 'score': result.sort((a, b) => b.market_score - a.market_score); break
      case 'cpm': result.sort((a, b) => a.ad_cost_cpm - b.ad_cost_cpm); break
    }
    return result
  }, [markets, regionFilter, searchQuery, sortBy])

  /* ─── Project guard ─── */
  if (!hasProjects) {
    return (
      <div>
        <Header title="GEOGRAFSKA TRŽIŠTA" subtitle="Globalna ekspanzija i regionalna analiza" />
        <div className="page-wrapper">
          <EmptyState
            icon={FolderKanban}
            variant="hero"
            title="Kreirajte prvi projekt"
            description="Projekti organiziraju kampanje, sadržaj i izvještaje. Kreirajte projekt za pristup ovoj stranici."
            action={
              <button
                onClick={() => navigate('/onboarding')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover transition-all shadow-md shadow-brand-accent/20"
              >
                <FolderKanban size={16} />
                Kreiraj projekt
              </button>
            }
          />
        </div>
      </div>
    )
  }

  /* ─── Loading ─── */
  if (loading && !apiData) {
    return (
      <>
        <Header title="GEOGRAFSKA TRŽIŠTA" subtitle="Globalna ekspanzija i regionalna analiza" />
        <div className="page-wrapper space-y-6">
          <CardSkeleton count={5} cols="grid grid-cols-1 sm:grid-cols-5 gap-4" />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </>
    )
  }

  /* ─── No data at all ─── */
  if (!apiData || (markets.length === 0 && !isEstimate)) {
    return (
      <div>
        <Header title="GEOGRAFSKA TRŽIŠTA" subtitle="Globalna ekspanzija i regionalna analiza" />
        <div className="page-wrapper">
          <EmptyState
            icon={Globe}
            title="Nema podataka o tržištima"
            description="Unesite profile društvenih mreža u Profil brenda kako bi AI mogao analizirati vašu geografsku prisutnost."
            variant="hero"
            action={
              <button
                onClick={() => navigate('/brand-profile?tab=mreze')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent-hover transition-all shadow-sm"
              >
                <Globe size={16} />
                Postavi kanale
              </button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header
        title="GEOGRAFSKA TRŽIŠTA"
        subtitle="Globalna ekspanzija i regionalna analiza"
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-brand-dark rounded-xl text-sm font-semibold hover:bg-brand-accent/90 transition-colors">
            <Languages size={16} />
            Lokaliziraj kampanju
          </button>
        }
      />

      <div className="page-wrapper space-y-6">

        {/* ── Estimate Banner ── */}
        {isEstimate && <EstimateBanner />}

        {/* ── AI Insight Card ── */}
        <GeoAIInsight aiInsights={aiInsights} isEstimate={isEstimate} brandName={brandName} />

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 stagger-children">
          <MetricCard label="Aktivna tržišta" value={summary.total_markets} icon={Globe} />
          <MetricCard label="Ukupni doseg" value={summary.total_reach} icon={Users} />
          <MetricCard label="Aktivni korisnici" value={summary.total_active} icon={Eye} />
          <MetricCard label="Regionalni uredi" value={summary.total_offices} icon={Building2} />
          <MetricCard label="Prosj. angažman" value={summary.avg_engagement} format="percent" icon={Target} />
        </div>

        {/* ── World Choropleth Map ── */}
        <WorldChoroplethMap markets={markets} onSelect={setSelectedMarket} />

        {/* ── Region Comparison + Language Coverage ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RegionChart regions={regions} />

          {/* Language coverage */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Languages size={18} className="text-brand-accent" />
              <h3 className="font-headline text-base tracking-wider text-studio-text-primary">Jezična pokrivenost</h3>
            </div>
            <div className="space-y-4">
              {summary.languages.map((lang) => {
                const langMarkets = markets.filter((m) => m.language === lang)
                const langReach = langMarkets.reduce((s, m) => s + m.reach, 0)
                const pct = summary.total_reach > 0 ? (langReach / summary.total_reach) * 100 : 0
                return (
                  <div key={lang}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded border font-mono ${langColors[lang] || 'bg-studio-surface-2 text-studio-text-secondary border-studio-border'}`}>
                          {lang.toUpperCase()}
                        </span>
                        <span className="text-sm text-studio-text-primary font-medium">{langLabel[lang] || lang}</span>
                      </div>
                      <span className="text-sm font-stats text-studio-text-primary">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 bg-studio-surface-3 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-brand-accent/60 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-studio-text-tertiary mt-1">{langMarkets.length} {langMarkets.length === 1 ? 'tržište' : 'tržišta'} · {formatNumber(langReach)} doseg</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Market Table with filters ── */}
        <div className="card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <h3 className="font-headline text-base tracking-wider text-studio-text-primary flex items-center gap-2">
              <MapPin size={18} className="text-brand-accent" />
              Detalji tržišta
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-studio-text-tertiary" />
                <input
                  type="text"
                  placeholder="Traži..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-studio-surface-0 border border-studio-border-subtle rounded-lg text-xs text-studio-text-primary placeholder:text-studio-text-tertiary focus:outline-none focus:border-brand-accent/30 w-36"
                />
              </div>
              {/* Region filter */}
              <div className="relative">
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 bg-studio-surface-0 border border-studio-border-subtle rounded-lg text-xs text-studio-text-primary cursor-pointer focus:outline-none focus:border-brand-accent/30"
                >
                  <option value="all">Sve regije</option>
                  {uniqueRegions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-studio-text-tertiary pointer-events-none" />
              </div>
              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="appearance-none pl-3 pr-7 py-1.5 bg-studio-surface-0 border border-studio-border-subtle rounded-lg text-xs text-studio-text-primary cursor-pointer focus:outline-none focus:border-brand-accent/30"
                >
                  <option value="reach">Doseg ↓</option>
                  <option value="growth">Rast ↓</option>
                  <option value="score">Score ↓</option>
                  <option value="cpm">CPM ↑</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-studio-text-tertiary pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-studio-border">
                  <th className="text-left py-3 px-4 text-studio-text-secondary font-medium">Tržište</th>
                  <th className="text-right py-3 px-4 text-studio-text-secondary font-medium">Doseg</th>
                  <th className="text-right py-3 px-4 text-studio-text-secondary font-medium hidden sm:table-cell">Angažman</th>
                  <th className="text-right py-3 px-4 text-studio-text-secondary font-medium hidden md:table-cell">Rast 7d</th>
                  <th className="text-right py-3 px-4 text-studio-text-secondary font-medium hidden md:table-cell">CPM</th>
                  <th className="text-right py-3 px-4 text-studio-text-secondary font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarkets.map((m, idx) => (
                  <tr
                    key={m.id}
                    className={`border-b border-studio-border-subtle hover:bg-studio-surface-1 transition-colors cursor-pointer ${idx === 0 && sortBy === 'reach' ? 'bg-brand-accent/5' : ''}`}
                    onClick={() => setSelectedMarket(m)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{m.flag}</span>
                        <div>
                          <p className="text-studio-text-primary font-medium">{m.country}</p>
                          <p className="text-[10px] text-studio-text-tertiary">{m.region}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-stats text-studio-text-primary">{formatNumber(m.reach)}</td>
                    <td className="py-3 px-4 text-right text-studio-text-primary hidden sm:table-cell">{m.engagement}%</td>
                    <td className="py-3 px-4 text-right hidden md:table-cell">{growthBadge(m.growth_7d)}</td>
                    <td className="py-3 px-4 text-right font-mono text-studio-text-secondary hidden md:table-cell">{formatCurrency(m.ad_cost_cpm)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${scoreBg(m.market_score)} ${scoreColor(m.market_score)}`}>
                        {m.market_score}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredMarkets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-studio-text-secondary">
                      Nema rezultata za zadane filtere
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Ad Cost Comparison ── */}
        <AdCostTable markets={markets} />

        {/* ── AI Insights ── */}
        <AIInsightsSection insights={aiInsights.insights || []} />

        {/* ── Multi-Language Content Pipeline ── */}
        {contentPipeline.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Languages size={18} className="text-purple-500" />
              <h3 className="font-headline text-base tracking-wider text-studio-text-primary">Višejezični sadržajni pipeline</h3>
            </div>
            <div className="space-y-3">
              {contentPipeline.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-studio-surface-0 rounded-xl hover:bg-studio-surface-2 transition-colors border border-studio-border-subtle"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="text-sm font-medium text-studio-text-primary">{item.title}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-surface-2 text-studio-text-secondary border border-studio-border-subtle">
                        {item.type}
                      </span>
                      {item.languages.map((lang) => (
                        <span key={lang} className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${langColors[lang] || 'bg-studio-surface-0 text-studio-text-secondary border-studio-border'}`}>
                          {lang}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-studio-text-secondary mb-1">{item.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-studio-text-tertiary">{item.platform}</span>
                      <span className="text-studio-text-disabled">·</span>
                      <span className="text-[10px] text-studio-text-tertiary flex items-center gap-1"><Calendar size={10} />{item.date}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ml-4 font-medium ${
                    item.status === 'Spremno' ? 'bg-green-500/10 text-green-400' :
                    item.status === 'Zakazano' ? 'bg-blue-500/10 text-blue-400' :
                    item.status === 'U produkciji' ? 'bg-purple-500/10 text-purple-400' :
                    item.status === 'Pregled' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-studio-surface-2 text-studio-text-secondary'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Market Detail Modal ── */}
      {selectedMarket && (
        <MarketDetailModal market={selectedMarket} onClose={() => setSelectedMarket(null)} />
      )}
    </div>
  )
}
