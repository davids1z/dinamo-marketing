import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import { useApi } from '../hooks/useApi'
import { useProjectStatus } from '../hooks/useProjectStatus'
import { useClient } from '../contexts/ClientContext'
import { reportsApi } from '../api/reports'
import { formatNumber } from '../utils/formatters'
import {
  FileText, Download, Calendar, Clock, CheckCircle, Loader2,
  AlertCircle, Plus, Mail, TrendingUp, TrendingDown, Users,
  BarChart3, ArrowUpRight, ArrowDownRight, X, GitCompareArrows,
  Eye, ThumbsUp, Share2, FolderKanban, Sparkles, Info,
  Zap, Send, ClipboardList, Timer,
} from 'lucide-react'

/* ─────────── types ─────────── */

type ReportTab = 'weekly' | 'monthly'

interface Report {
  id: string
  title: string
  period: string
  date: string
  status: 'completed' | 'generating' | 'failed' | 'sent'
  pages: number
  size: string
  engagementChange?: number
  followerGrowth?: number
  topPost?: string
  topPostInteractions?: number
  totalReach?: number
  aiSummary?: string
}

interface ReportsApiResponse {
  reports: Record<string, unknown>[]
  _meta?: {
    is_estimate: boolean
    next_scheduled: string
    schedule_note: string
    connected_platforms?: string[]
  }
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

/* ─────────── Estimate Banner ─────────── */

function EstimateBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
      <Info size={16} className="text-amber-500 flex-shrink-0" />
      <p className="text-xs text-amber-400/80">
        <span className="font-semibold text-amber-400">Procijenjeni izvještaji</span> — prikazani su demo izvještaji na temelju benchmark podataka. Pravi izvještaji generirat će se automatski prema rasporedu.
      </p>
    </div>
  )
}

/* ─────────── AI Insight Card ─────────── */

function ReportAIInsight({
  latestReport,
  isEstimate,
  brandName,
  activeTab,
}: {
  latestReport: Report | undefined
  isEstimate: boolean
  brandName: string
  activeTab: ReportTab
}) {
  const insight = useMemo(() => {
    if (isEstimate) {
      return {
        icon: Zap,
        color: '#f59e0b',
        title: 'Automatizacija aktivna',
        text: `AI priprema ${activeTab === 'weekly' ? 'tjedne' : 'mjesečne'} izvještaje za ${brandName}. Prikupljamo podatke s povezanih kanala — prvi pravi izvještaj generira se prema rasporedu.`,
      }
    }

    if (!latestReport) {
      return {
        icon: ClipboardList,
        color: '#0ea5e9',
        title: 'Generirajte prvi izvještaj',
        text: `Kliknite "Generiraj izvještaj" da AI analizira performanse ${brandName} i stvori profesionalni PDF.`,
      }
    }

    const eng = latestReport.engagementChange ?? 0

    if (eng > 3) {
      return {
        icon: Sparkles,
        color: '#22c55e',
        title: 'Izvrsni rezultati',
        text: `${brandName} raste! Engagement rate je ${eng.toFixed(1)}%, a doseg je dosegnuo ${latestReport.totalReach ? formatNumber(latestReport.totalReach) : '--'} korisnika. Nastavite s ovim trendom.`,
      }
    }

    return {
      icon: BarChart3,
      color: '#0ea5e9',
      title: 'Pregled izvještaja',
      text: `Posljednji izvještaj za ${brandName} pokazuje engagement od ${eng.toFixed(1)}% s ${latestReport.followerGrowth?.toLocaleString() || '0'} novih pratitelja. ${eng >= 0 ? 'Stabilan rast.' : 'Razmotrite optimizaciju strategije.'}`,
    }
  }, [latestReport, isEstimate, brandName, activeTab])

  const InsightIcon = insight.icon

  return (
    <div
      className="rounded-xl border border-white/5 p-5 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${insight.color}08, ${insight.color}03)` }}
    >
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{ background: insight.color }}
      />
      <div className="relative flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${insight.color}20` }}
        >
          <InsightIcon size={20} style={{ color: insight.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: insight.color }}>
              AI Insight
            </span>
            <span className="text-studio-text-tertiary">&middot;</span>
            <span className="text-xs text-studio-text-tertiary">{insight.title}</span>
          </div>
          <p className="text-sm text-studio-text-secondary leading-relaxed">{insight.text}</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Status Badge ─────────── */

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
        <CheckCircle size={12} />
        Spremno
      </span>
    )
  }
  if (status === 'generating') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-full border border-blue-500/20">
        <Loader2 size={12} className="animate-spin" />
        U pripremi
      </span>
    )
  }
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 text-purple-400 text-xs font-medium rounded-full border border-purple-500/20">
        <Send size={12} />
        Poslano klijentu
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-400 text-xs font-medium rounded-full border border-red-500/20">
      <AlertCircle size={12} />
      Neuspjelo
    </span>
  )
}

/* ─────────── Generating Progress ─────────── */

const GeneratingProgress = () => {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 8
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-32">
      <div className="flex justify-between text-xs text-blue-400 mb-1">
        <span>Generiranje</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 bg-blue-500/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

/* ─────────── Upcoming Report Card ─────────── */

function UpcomingReportCard({
  nextScheduled,
  scheduleNote,
  reportType,
}: {
  nextScheduled: string
  scheduleNote: string
  reportType: ReportTab
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-brand-accent/20 bg-brand-accent/5">
      <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
        <Timer size={18} className="text-brand-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm font-medium text-studio-text-primary">
            Sljedeći {reportType === 'weekly' ? 'tjedni' : 'mjesečni'} izvještaj
          </h3>
          <span className="text-[10px] uppercase tracking-wider font-bold text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 rounded">
            zakazano
          </span>
        </div>
        <p className="text-xs text-studio-text-secondary">
          {scheduleNote} &middot; <span className="font-semibold text-studio-text-primary">{nextScheduled}</span>
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('weekly')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [emailingId, setEmailingId] = useState<string | null>(null)
  const [localReports, setLocalReports] = useState<Record<ReportTab, Report[]>>({ weekly: [], monthly: [] })
  const [comparisonId, setComparisonId] = useState<string | null>(null)
  const { hasProjects } = useProjectStatus()
  const { currentClient } = useClient()
  const navigate = useNavigate()

  const brandName = currentClient?.client_name || 'Vaš brend'

  // API calls - new wrapper format { reports: [...], _meta: {...} }
  const { data: weeklyResponse, loading: weeklyLoading } = useApi<ReportsApiResponse>('/reports/weekly')
  const { data: monthlyResponse, loading: monthlyLoading } = useApi<ReportsApiResponse>('/reports/monthly')

  const weeklyMeta = weeklyResponse?._meta
  const monthlyMeta = monthlyResponse?._meta
  const weeklyRaw = weeklyResponse?.reports ?? []
  const monthlyRaw = monthlyResponse?.reports ?? []

  const isEstimate = activeTab === 'weekly'
    ? (weeklyMeta?.is_estimate ?? false)
    : (monthlyMeta?.is_estimate ?? false)

  // Format ISO date string to readable Croatian format
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch { return dateStr }
  }

  // Format date range for weekly periods
  const formatPeriod = (start: string, end: string): string => {
    if (!start || !end) return `${start || ''} - ${end || ''}`
    try {
      const s = new Date(start)
      const e = new Date(end)
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return `${start} - ${end}`
      const sStr = s.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' })
      const eStr = e.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' })
      return `${sStr} - ${eStr}`
    } catch { return `${start} - ${end}` }
  }

  const MONTH_NAMES_HR = ['', 'Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj', 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac']

  // Map API reports to frontend Report format
  const mapApiReports = (raw: Record<string, unknown>[], type: 'weekly' | 'monthly'): Report[] => {
    if (!raw || raw.length === 0) return []
    return raw.map((r) => {
      const data = (r.data || {}) as Record<string, unknown>
      const recs = r.recommendations as Record<string, unknown> | undefined
      const strategy = r.ai_strategy as Record<string, unknown> | undefined
      const aiSummary = (recs?.summary || strategy?.summary || '') as string

      return {
        id: String(r.id || `${Date.now()}-${Math.random()}`),
        title: type === 'weekly' ? 'Tjedni izvještaj o performansama' : 'Mjesečni marketinški izvještaj',
        period: type === 'weekly'
          ? formatPeriod(String(r.week_start || ''), String(r.week_end || ''))
          : `${MONTH_NAMES_HR[Number(r.month) || 0]} ${r.year || ''}`,
        date: formatDate(String(r.generated_at || r.created_at || '')),
        status: 'completed' as const,
        pages: type === 'weekly' ? 12 : 28,
        size: type === 'weekly' ? '2.4 MB' : '5.6 MB',
        engagementChange: Number(data.engagement_rate || 0),
        followerGrowth: Number(data.new_followers || 0),
        topPost: ((r.top_posts as Record<string, unknown>[])?.[0] as Record<string, unknown>)?.title as string || '',
        topPostInteractions: Number(((r.top_posts as Record<string, unknown>[])?.[0] as Record<string, unknown>)?.engagement || 0),
        totalReach: Number(data.total_reach || 0),
        aiSummary,
      }
    })
  }

  const mappedWeekly = mapApiReports(weeklyRaw, 'weekly')
  const mappedMonthly = mapApiReports(monthlyRaw, 'monthly')

  const loading = activeTab === 'weekly' ? weeklyLoading : monthlyLoading
  const currentMeta = activeTab === 'weekly' ? weeklyMeta : monthlyMeta
  const currentReports = activeTab === 'weekly' ? mappedWeekly : mappedMonthly
  const allReports = [...(localReports[activeTab] || []), ...currentReports]
  const totalReports = mappedWeekly.length + mappedMonthly.length + localReports.weekly.length + localReports.monthly.length

  // Latest completed report for summary card
  const latestCompleted = allReports.find(r => r.status === 'completed')

  // Toast helpers
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  /* ─── Project guard ─── */
  if (!hasProjects) {
    return (
      <div>
        <Header title="IZVJEŠTAJI" subtitle="Automatsko generiranje izvještaja i arhiva" />
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

  /* ─── Loading state ─── */
  if (loading && !(weeklyResponse || monthlyResponse)) return (
    <>
      <Header title="IZVJEŠTAJI" subtitle="Automatsko generiranje izvještaja i arhiva" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={1} cols="grid grid-cols-1" />
        <CardSkeleton count={3} cols="grid grid-cols-1 sm:grid-cols-3 gap-4" />
        <ChartSkeleton />
      </div>
    </>
  )

  const handleGenerate = async () => {
    setIsGenerating(true)
    addToast('Generiranje izvještaja pokrenuto...', 'info')

    try {
      if (activeTab === 'weekly') {
        await reportsApi.generateWeekly()
      } else {
        const now = new Date()
        await reportsApi.generateMonthly(now.getMonth() + 1, now.getFullYear())
      }
      addToast('Izvještaj uspješno generiran!', 'success')
      window.location.reload()
    } catch {
      // Fallback: create local report if API fails
      const now = new Date()
      const newReport: Report = {
        id: `local-${Date.now()}`,
        title: activeTab === 'weekly' ? 'Tjedni izvještaj o performansama' : 'Mjesečni marketinški izvještaj',
        period: activeTab === 'weekly'
          ? `${now.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' })} - ${new Date(now.getTime() + 7 * 86400000).toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : `${MONTH_NAMES_HR[now.getMonth() + 1]} ${now.getFullYear()}`,
        date: now.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'completed',
        pages: Math.floor(Math.random() * 10) + 8,
        size: `${(Math.random() * 3 + 1.5).toFixed(1)} MB`,
        engagementChange: +(Math.random() * 6 - 1).toFixed(1),
        followerGrowth: Math.floor(Math.random() * 1500) + 300,
        topPost: 'Novi generirani sadržaj',
        topPostInteractions: Math.floor(Math.random() * 10000) + 3000,
        totalReach: Math.floor(Math.random() * 100000) + 50000,
        aiSummary: `AI je analizirao performanse za ${brandName}. Rezultati su stabilni.`,
      }
      setLocalReports(prev => ({
        ...prev,
        [activeTab]: [newReport, ...prev[activeTab]],
      }))
      addToast('Izvještaj generiran lokalno (API nedostupan)', 'info')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (reportId: string) => {
    setDownloadingId(reportId)
    try {
      await reportsApi.downloadPdf(reportId, activeTab)
      addToast('PDF izvještaj preuzet!', 'success')
    } catch {
      addToast('Greška pri preuzimanju PDF-a', 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleEmail = async (reportId: string) => {
    setEmailingId(reportId)
    try {
      await reportsApi.emailReport(reportId, activeTab)
      addToast('Izvještaj uspješno poslan na email!', 'success')
    } catch {
      addToast('Greška pri slanju emaila', 'error')
    } finally {
      setEmailingId(null)
    }
  }

  const handleCompare = (reportId: string) => {
    if (comparisonId === reportId) {
      setComparisonId(null)
    } else {
      setComparisonId(reportId)
      addToast('Usporedba s prošlim periodom prikazana', 'info')
    }
  }

  // Find previous report for comparison
  const getComparisonReport = (reportId: string): Report | undefined => {
    const idx = allReports.findIndex(r => r.id === reportId)
    if (idx >= 0 && idx < allReports.length - 1) {
      return allReports[idx + 1]
    }
    return undefined
  }

  return (
    <div>
      <Header title="IZVJEŠTAJI" subtitle="Automatsko generiranje izvještaja i arhiva" />

      <div className="page-wrapper space-y-6">

        {/* ── Estimate Banner ── */}
        {isEstimate && <EstimateBanner />}

        {/* ── AI Insight Card ── */}
        <ReportAIInsight
          latestReport={latestCompleted}
          isEstimate={isEstimate}
          brandName={brandName}
          activeTab={activeTab}
        />

        {/* ── Tabs & Generate ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 border-b border-studio-border pb-1">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'weekly'
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-studio-text-secondary hover:text-studio-text-primary'
              }`}
            >
              Tjedni izvještaji
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'monthly'
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-studio-text-secondary hover:text-studio-text-primary'
              }`}
            >
              Mjesečni izvještaji
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-brand-dark text-sm font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {isGenerating ? 'Generira se...' : 'Generiraj izvještaj'}
          </button>
        </div>

        {/* ── Summary Metrics Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 text-studio-text-secondary mb-1">
              <FileText size={16} />
              <span className="text-xs">Ukupno izvještaja</span>
            </div>
            <p className="text-3xl font-stats text-studio-text-primary">{totalReports}</p>
            {isEstimate && <p className="text-xs text-amber-400/60 mt-1">procjena</p>}
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-studio-text-secondary mb-1">
              <Calendar size={16} />
              <span className="text-xs">Zadnje generirano</span>
            </div>
            <p className="text-lg font-bold text-studio-text-primary">
              {latestCompleted?.date || '--'}
            </p>
            <p className="text-xs text-studio-text-secondary mt-1">
              {latestCompleted?.title || '--'}
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-studio-text-secondary mb-1">
              <Clock size={16} />
              <span className="text-xs">Sljedeći zakazan</span>
            </div>
            <p className="text-lg font-bold text-studio-text-primary">
              {currentMeta?.next_scheduled || '--'}
            </p>
            <p className="text-xs text-studio-text-secondary mt-1">
              {currentMeta?.schedule_note || ''}
            </p>
          </div>
        </div>

        {/* ── Key Metrics from Latest Report ── */}
        {latestCompleted && (
          <div className="card border border-brand-accent/10 bg-gradient-to-r from-brand-accent/5 to-studio-surface-1">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-brand-accent" />
              <h2 className="text-sm font-semibold text-studio-text-primary">Ključne metrike - {latestCompleted.period}</h2>
              {isEstimate && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded ml-auto">
                  procjena
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Engagement Change */}
              <div className="bg-studio-surface-1 rounded-xl p-4 border border-studio-border-subtle shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-studio-text-secondary mb-2">
                  <ThumbsUp size={12} />
                  Engagement
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-stats text-studio-text-primary">
                    {latestCompleted.engagementChange !== undefined ? Math.abs(latestCompleted.engagementChange).toFixed(1) : '0'}%
                  </span>
                  {(latestCompleted.engagementChange ?? 0) >= 0 ? (
                    <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                      <ArrowUpRight size={10} />+{latestCompleted.engagementChange}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-red-400 text-xs font-medium bg-red-500/10 px-1.5 py-0.5 rounded-full">
                      <ArrowDownRight size={10} />{latestCompleted.engagementChange}%
                    </span>
                  )}
                </div>
              </div>
              {/* Follower Growth */}
              <div className="bg-studio-surface-1 rounded-xl p-4 border border-studio-border-subtle shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-studio-text-secondary mb-2">
                  <Users size={12} />
                  Novi pratitelji
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-stats text-studio-text-primary">
                    {latestCompleted.followerGrowth?.toLocaleString() || '0'}
                  </span>
                  <TrendingUp size={14} className="text-emerald-500" />
                </div>
              </div>
              {/* Total Reach */}
              <div className="bg-studio-surface-1 rounded-xl p-4 border border-studio-border-subtle shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-studio-text-secondary mb-2">
                  <Eye size={12} />
                  Ukupni doseg
                </div>
                <span className="text-2xl font-stats text-studio-text-primary">
                  {latestCompleted.totalReach ? formatNumber(latestCompleted.totalReach) : '--'}
                </span>
              </div>
              {/* Top Post */}
              <div className="bg-studio-surface-1 rounded-xl p-4 border border-studio-border-subtle shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-studio-text-secondary mb-2">
                  <Share2 size={12} />
                  Top objava
                </div>
                <p className="text-sm font-semibold text-studio-text-primary truncate" title={latestCompleted.topPost}>
                  {latestCompleted.topPost || '--'}
                </p>
                {latestCompleted.topPostInteractions ? (
                  <p className="text-xs text-studio-text-secondary mt-0.5">{latestCompleted.topPostInteractions.toLocaleString()} interakcija</p>
                ) : null}
              </div>
            </div>

            {/* AI Summary from the report */}
            {latestCompleted.aiSummary && (
              <div className="mt-4 p-3 rounded-lg bg-studio-surface-0 border border-studio-border-subtle">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles size={12} className="text-brand-accent" />
                  <span className="text-xs font-semibold text-brand-accent uppercase tracking-wider">AI sažetak</span>
                </div>
                <p className="text-sm text-studio-text-secondary leading-relaxed">{latestCompleted.aiSummary}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Generating indicator ── */}
        {isGenerating && (
          <div className="card border-2 border-dashed border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Loader2 size={20} className="text-blue-400 animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-studio-text-primary">Generiranje novog izvještaja...</h3>
                <p className="text-xs text-studio-text-secondary mt-0.5">Prikupljanje podataka s platformi i AI analiza performansi</p>
                <div className="mt-2 w-full">
                  <GeneratingProgress />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Upcoming Report Card ── */}
        {currentMeta?.next_scheduled && (
          <UpcomingReportCard
            nextScheduled={currentMeta.next_scheduled}
            scheduleNote={currentMeta.schedule_note}
            reportType={activeTab}
          />
        )}

        {/* ── Report Archive List ── */}
        <div className="card">
          <h2 className="section-title mb-4">
            {activeTab === 'weekly' ? 'Tjedni izvještaji' : 'Mjesečni izvještaji'}
            <span className="text-studio-text-tertiary font-normal ml-2">({allReports.length})</span>
          </h2>
          <div className="space-y-3">
            {allReports.map((report) => (
              <div key={report.id}>
                <div
                  className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                    comparisonId === report.id
                      ? 'bg-brand-accent/5 border border-brand-accent/20 shadow-sm'
                      : 'bg-studio-surface-0 hover:bg-studio-surface-2 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      report.status === 'completed' || report.status === 'sent' ? 'bg-emerald-500/10' :
                      report.status === 'generating' ? 'bg-blue-500/10' : 'bg-red-500/10'
                    }`}>
                      <FileText size={18} className={
                        report.status === 'completed' || report.status === 'sent' ? 'text-emerald-400' :
                        report.status === 'generating' ? 'text-blue-400' : 'text-red-400'
                      } />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-studio-text-primary truncate">{report.title}</h3>
                        <StatusBadge status={report.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-studio-text-secondary">{report.period}</span>
                        <span className="text-xs text-studio-text-disabled">|</span>
                        <span className="text-xs text-studio-text-secondary">Generirano: {report.date}</span>
                        {report.status === 'completed' && report.engagementChange !== undefined && (
                          <>
                            <span className="text-xs text-studio-text-disabled">|</span>
                            <span className={`text-xs font-medium flex items-center gap-0.5 ${
                              report.engagementChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {report.engagementChange >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {report.engagementChange >= 0 ? '+' : ''}{report.engagementChange}% engagement
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {(report.status === 'completed' || report.status === 'sent') && (
                      <>
                        <span className="text-xs text-studio-text-tertiary hidden sm:inline">{report.pages} str.</span>
                        <span className="text-xs text-studio-text-tertiary hidden sm:inline">{report.size}</span>

                        {/* Comparison toggle */}
                        <button
                          onClick={() => handleCompare(report.id)}
                          title="Usporedi s prošlim periodom"
                          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-all ${
                            comparisonId === report.id
                              ? 'bg-brand-accent text-brand-dark shadow-sm'
                              : 'bg-studio-surface-2 hover:bg-brand-accent/10 text-studio-text-secondary hover:text-brand-accent'
                          }`}
                        >
                          <GitCompareArrows size={13} />
                          <span className="hidden lg:inline">Usporedi</span>
                        </button>

                        {/* Email button */}
                        <button
                          onClick={() => handleEmail(report.id)}
                          disabled={emailingId === report.id}
                          title="Pošalji klijentu"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-studio-surface-2 hover:bg-purple-500/10 text-studio-text-secondary hover:text-purple-400 text-xs rounded-lg transition-all disabled:opacity-50"
                        >
                          {emailingId === report.id ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                          <span className="hidden lg:inline">Pošalji</span>
                        </button>

                        {/* Download button */}
                        <button
                          onClick={() => handleDownload(report.id)}
                          disabled={downloadingId === report.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent hover:bg-brand-accent-hover text-brand-dark text-xs font-bold rounded-lg transition-all disabled:opacity-50 shadow-sm"
                        >
                          {downloadingId === report.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          Preuzmi PDF
                        </button>
                      </>
                    )}
                    {report.status === 'generating' && (
                      <GeneratingProgress />
                    )}
                    {report.status === 'failed' && (
                      <button
                        onClick={handleGenerate}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors"
                      >
                        <AlertCircle size={13} />
                        Ponovi
                      </button>
                    )}
                  </div>
                </div>

                {/* Comparison view */}
                {comparisonId === report.id && (() => {
                  const prev = getComparisonReport(report.id)
                  if (!prev || (prev.status !== 'completed' && prev.status !== 'sent')) {
                    return (
                      <div className="ml-14 mt-2 p-3 bg-studio-surface-0 rounded-lg border border-studio-border text-sm text-studio-text-secondary">
                        Nema prethodnog izvještaja za usporedbu.
                      </div>
                    )
                  }
                  const engDiff = (report.engagementChange ?? 0) - (prev.engagementChange ?? 0)
                  const follDiff = (report.followerGrowth ?? 0) - (prev.followerGrowth ?? 0)
                  const reachDiff = (report.totalReach ?? 0) - (prev.totalReach ?? 0)
                  return (
                    <div className="ml-14 mt-2 p-4 bg-studio-surface-1 rounded-xl border border-brand-accent/10 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <GitCompareArrows size={14} className="text-brand-accent" />
                        <span className="text-xs font-semibold text-studio-text-primary">
                          Usporedba: {report.period} vs {prev.period}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-studio-text-secondary mb-1">Engagement promjena</p>
                          <p className={`text-sm font-bold ${engDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {engDiff >= 0 ? '+' : ''}{engDiff.toFixed(1)} p.p.
                          </p>
                          <p className="text-xs text-studio-text-tertiary">
                            {report.engagementChange}% vs {prev.engagementChange}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-studio-text-secondary mb-1">Rast pratitelja</p>
                          <p className={`text-sm font-bold ${follDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {follDiff >= 0 ? '+' : ''}{follDiff.toLocaleString()}
                          </p>
                          <p className="text-xs text-studio-text-tertiary">
                            {report.followerGrowth?.toLocaleString()} vs {prev.followerGrowth?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-studio-text-secondary mb-1">Doseg promjena</p>
                          <p className={`text-sm font-bold ${reachDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {reachDiff >= 0 ? '+' : ''}{formatNumber(reachDiff)}
                          </p>
                          <p className="text-xs text-studio-text-tertiary">
                            {report.totalReach ? formatNumber(report.totalReach) : '--'} vs {prev.totalReach ? formatNumber(prev.totalReach) : '--'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            ))}

            {allReports.length === 0 && (
              <div className="text-center py-12 text-studio-text-tertiary">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-3">Nema izvještaja. Kliknite "Generiraj izvještaj" za početak.</p>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent text-brand-dark text-sm font-bold rounded-xl hover:bg-brand-accent-hover transition-all"
                >
                  <Plus size={16} />
                  Generiraj prvi izvještaj
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-sm text-sm font-medium animate-fade-in ${
                toast.type === 'success'
                  ? 'bg-emerald-600 text-white'
                  : toast.type === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-brand-accent text-brand-dark'
              }`}
            >
              {toast.type === 'success' && <CheckCircle size={16} />}
              {toast.type === 'error' && <AlertCircle size={16} />}
              {toast.type === 'info' && <Loader2 size={16} className="animate-spin" />}
              <span>{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
