import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import { useApi } from '../hooks/useApi'
import { useProjectStatus } from '../hooks/useProjectStatus'
import { type PartnersData, type PartnerRow } from '../api/partners'
import { formatNumber } from '../utils/formatters'
import {
  Users, TrendingUp, Eye, Star, Handshake, FolderKanban,
  Instagram, Youtube, Globe, ExternalLink, Search,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useState, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.01a8.16 8.16 0 0 0 4.77 1.52V7.09a4.85 4.85 0 0 1-1-.4z" />
    </svg>
  ),
  multi: Globe,
}

function PlatformBadge({ platform }: { platform: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? Globe
  const colorMap: Record<string, string> = {
    instagram: 'bg-pink-100 text-pink-700',
    youtube: 'bg-red-100 text-red-700',
    tiktok: 'bg-slate-900 text-white',
    multi: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', colorMap[platform] ?? 'bg-slate-100 text-slate-600')}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      {platform.charAt(0).toUpperCase() + platform.slice(1)}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    prospect: 'bg-blue-100 text-blue-700',
    paused: 'bg-amber-100 text-amber-700',
    ended: 'bg-slate-100 text-slate-500',
  }
  const labels: Record<string, string> = {
    active: 'Aktivan',
    prospect: 'Prospect',
    paused: 'Pauzirano',
    ended: 'Završeno',
  }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', map[status] ?? 'bg-slate-100 text-slate-500')}>
      {labels[status] ?? status}
    </span>
  )
}

function MatchScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    score >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' :
    'bg-red-100 text-red-700 border-red-200'

  const barColor =
    score >= 80 ? 'bg-emerald-500' :
    score >= 50 ? 'bg-amber-500' :
    'bg-red-400'

  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold border', color)}>
        {score}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KpiProps {
  label: string
  value: string | number
  icon: React.ElementType
  sub?: string
}

function KpiCard({ label, value, icon: Icon, sub }: KpiProps) {
  return (
    <div className="bg-studio-surface-1 border border-studio-border rounded-2xl p-5 shadow-studio-panel hover:shadow-card-hover hover:border-studio-border-hover hover:-translate-y-0.5 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs uppercase tracking-wider text-studio-text-secondary font-medium">{label}</p>
        <div className="w-9 h-9 rounded-xl bg-brand-accent/10 flex items-center justify-center group-hover:bg-brand-accent/15 transition-colors">
          <Icon size={17} className="text-brand-accent" />
        </div>
      </div>
      <p className="stat-number">{value}</p>
      {sub && <p className="text-[11px] text-studio-text-tertiary mt-2">{sub}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type FilterStatus = 'all' | 'active' | 'prospect' | 'paused' | 'ended'

export default function Partners() {
  const navigate = useNavigate()
  const { hasProjects } = useProjectStatus()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortBy, setSortBy] = useState<'match_score' | 'followers' | 'engagement_rate' | 'name'>('match_score')

  const { data, loading, error } = useApi<PartnersData>('/partners/')

  // Guard: no project selected
  if (!hasProjects) {
    return (
      <div className="page-container">
        <Header title="PARTNERI & KREATORI" subtitle="Influencer & Brand Partnership Hub" />
        <div className="content-area">
          <EmptyState
            icon={FolderKanban}
            title="Kreiraj projekt"
            description="Da bi pristupio partnerima, najprije kreiraj projekt."
            action={
              <button onClick={() => navigate('/brand-profile')} className="btn-primary">
                Kreiraj projekt
              </button>
            }
          />
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="page-container">
        <Header title="PARTNERI & KREATORI" subtitle="Influencer & Brand Partnership Hub" />
        <div className="content-area space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
          <TableSkeleton rows={8} />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="page-container">
        <Header title="PARTNERI & KREATORI" subtitle="Influencer & Brand Partnership Hub" />
        <div className="content-area">
          <EmptyState
            icon={Handshake}
            title="Nema podataka o partnerima"
            description="Dodaj prvog partnera ili influencera da bi počeo graditi svoju partnersku mrežu."
          />
        </div>
      </div>
    )
  }

  const { partners, summary } = data

  // Filter + search + sort
  const filtered = useMemo(() => {
    let rows = [...partners]
    if (filterStatus !== 'all') rows = rows.filter(p => p.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    }
    rows.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return (b[sortBy] as number) - (a[sortBy] as number)
    })
    return rows
  }, [partners, filterStatus, search, sortBy])

  const STATUS_FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'Svi' },
    { key: 'active', label: 'Aktivni' },
    { key: 'prospect', label: 'Prospekti' },
    { key: 'paused', label: 'Pauzirani' },
    { key: 'ended', label: 'Završeni' },
  ]

  return (
    <div className="page-container">
      <Header title="PARTNERI & KREATORI" subtitle="Influencer & Brand Partnership Hub" />

      <div className="content-area space-y-6">

        {/* KPI Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Ukupno partnera"
            value={summary.total}
            icon={Users}
            sub="U bazi"
          />
          <KpiCard
            label="Aktivna partnerstva"
            value={summary.active}
            icon={Handshake}
            sub={summary.total > 0 ? `${Math.round((summary.active / summary.total) * 100)}% aktivnih` : '—'}
          />
          <KpiCard
            label="Ukupni doseg"
            value={formatNumber(summary.total_reach_delivered)}
            icon={Eye}
            sub="Isporučeni impressioni"
          />
          <KpiCard
            label="Prosj. engagement"
            value={`${summary.avg_engagement_rate}%`}
            icon={TrendingUp}
            sub="Prosjek svih partnera"
          />
          <KpiCard
            label="Prosj. match score"
            value={`${summary.avg_match_score}/100`}
            icon={Star}
            sub="AI kompatibilnost"
          />
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                  filterStatus === f.key
                    ? 'bg-brand-accent text-white'
                    : 'bg-studio-surface-2 text-studio-text-secondary hover:bg-studio-surface-1'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-studio-text-tertiary" />
            <input
              type="text"
              placeholder="Pretraži partnere..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-studio-surface-1 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent text-studio-text-primary placeholder:text-studio-text-tertiary"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs bg-studio-surface-1 border border-studio-border rounded-xl px-3 py-2 text-studio-text-primary focus:outline-none focus:border-brand-accent"
          >
            <option value="match_score">Sortiraj: Match score</option>
            <option value="followers">Sortiraj: Followeri</option>
            <option value="engagement_rate">Sortiraj: Engagement</option>
            <option value="name">Sortiraj: Ime</option>
          </select>
        </div>

        {/* Partners Table */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title="Nema pronađenih partnera"
            description={search ? 'Pokušaj s drugim pojmom pretrage.' : 'Nema partnera u odabranom filteru.'}
          />
        ) : (
          <div className="bg-studio-surface-1 border border-studio-border rounded-2xl overflow-hidden shadow-studio-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-studio-border bg-studio-surface-2">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-studio-text-secondary">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-studio-text-secondary">Platforma</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-studio-text-secondary">Kategorija</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-studio-text-secondary">Followeri</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-studio-text-secondary">Eng. rate</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-studio-text-secondary">Overlap</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-studio-text-secondary">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-studio-text-secondary min-w-[120px]">
                      Match score
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-studio-border">
                  {filtered.map((p: PartnerRow) => (
                    <tr key={p.id} className="hover:bg-studio-surface-2/50 transition-colors">
                      {/* Partner name + handle */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-brand-accent">
                              {p.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-studio-text-primary text-sm leading-tight">{p.name}</p>
                            {p.handle && (
                              <p className="text-[11px] text-studio-text-tertiary">{p.handle}</p>
                            )}
                          </div>
                          {p.website && (
                            <a
                              href={p.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-studio-text-tertiary hover:text-brand-accent transition-colors ml-1"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                      {/* Platform */}
                      <td className="px-4 py-3">
                        <PlatformBadge platform={p.platform} />
                      </td>
                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-studio-text-secondary capitalize">
                          {p.category || '—'}
                        </span>
                      </td>
                      {/* Followers */}
                      <td className="px-4 py-3 text-right font-mono text-sm text-studio-text-primary">
                        {formatNumber(p.followers)}
                      </td>
                      {/* Engagement */}
                      <td className="px-4 py-3 text-right font-mono text-sm text-studio-text-primary">
                        <span className={clsx(
                          'font-semibold',
                          p.engagement_rate >= 3 ? 'text-emerald-600' :
                          p.engagement_rate >= 1.5 ? 'text-amber-600' : 'text-red-500'
                        )}>
                          {p.engagement_rate.toFixed(1)}%
                        </span>
                      </td>
                      {/* Audience overlap */}
                      <td className="px-4 py-3 text-right text-sm text-studio-text-secondary font-mono">
                        {p.audience_overlap_pct > 0 ? `${p.audience_overlap_pct.toFixed(0)}%` : '—'}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={p.status} />
                      </td>
                      {/* Match score */}
                      <td className="px-4 py-3">
                        <MatchScoreBadge score={p.match_score} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="px-4 py-3 border-t border-studio-border bg-studio-surface-2/50 flex items-center justify-between">
              <span className="text-xs text-studio-text-tertiary">
                {filtered.length} od {partners.length} partnera
              </span>
              <div className="flex items-center gap-4 text-[11px] text-studio-text-tertiary">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 80+ = Odlično
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 50–79 = Dobro
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &lt;50 = Slab fit
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Match score explainer */}
        <div className="bg-studio-surface-1 border border-studio-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-studio-text-primary mb-2 flex items-center gap-2">
            <Star size={14} className="text-brand-accent" />
            Kako se računa Match Score?
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-studio-text-secondary">
            <div>
              <p className="font-semibold text-studio-text-primary mb-0.5">Kategorija (+20)</p>
              <p>Poklapanje niše partnera s industrijskim opisom brenda</p>
            </div>
            <div>
              <p className="font-semibold text-studio-text-primary mb-0.5">Engagement (+15)</p>
              <p>Engagement rate ≥3% donosi maksimalne bodove</p>
            </div>
            <div>
              <p className="font-semibold text-studio-text-primary mb-0.5">Overlap publike (+15)</p>
              <p>Postotak preklapanja ciljne publike s brendom</p>
            </div>
            <div>
              <p className="font-semibold text-studio-text-primary mb-0.5">Veličina (+10)</p>
              <p>Mid-tier kreatori (10K–500K) idealni su za ROI</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
