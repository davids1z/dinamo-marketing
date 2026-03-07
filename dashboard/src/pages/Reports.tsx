import { useState, useCallback, useEffect } from 'react'
import Header from '../components/layout/Header'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { reportsApi } from '../api/reports'
import {
  FileText, Download, Calendar, Clock, CheckCircle, Loader2,
  AlertCircle, Plus, Mail, TrendingUp, TrendingDown, Users,
  BarChart3, ArrowUpRight, ArrowDownRight, X, GitCompareArrows,
  Eye, ThumbsUp, Share2
} from 'lucide-react'

type ReportTab = 'weekly' | 'monthly'

interface Report {
  id: number
  title: string
  period: string
  date: string
  status: 'completed' | 'generating' | 'failed'
  pages: number
  size: string
  engagementChange?: number
  followerGrowth?: number
  topPost?: string
  topPostInteractions?: number
  totalReach?: number
}

interface ReportsData {
  reports: Report[]
  totalReports: number
  lastGenerated: string
  lastGeneratedTitle: string
  nextScheduled: string
  nextScheduledNote: string
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

// Fallback mock data for when API is not available
const fallbackWeekly: ReportsData = {
  reports: [
    { id: 1, title: 'Tjedni izvještaj o performansama', period: 'Feb 24 - Mar 2, 2026', date: 'Mar 3, 2026', status: 'completed', pages: 12, size: '2.4 MB', engagementChange: 4.2, followerGrowth: 1247, topPost: 'Dinamo vs Hajduk - Highlights', topPostInteractions: 12456, totalReach: 156789 },
    { id: 2, title: 'Tjedni izvještaj o performansama', period: 'Feb 17 - Feb 23, 2026', date: 'Feb 24, 2026', status: 'completed', pages: 11, size: '2.1 MB', engagementChange: 3.8, followerGrowth: 892, topPost: 'Petković gol iz voleja', topPostInteractions: 9823, totalReach: 134562 },
    { id: 3, title: 'Tjedni izvještaj o performansama', period: 'Feb 10 - Feb 16, 2026', date: 'Feb 17, 2026', status: 'completed', pages: 13, size: '2.8 MB', engagementChange: -0.5, followerGrowth: 654, topPost: 'Trening dan - iza kulisa', topPostInteractions: 7234, totalReach: 98432 },
    { id: 4, title: 'Tjedni izvještaj o performansama', period: 'Feb 3 - Feb 9, 2026', date: 'Feb 10, 2026', status: 'completed', pages: 10, size: '1.9 MB', engagementChange: 2.1, followerGrowth: 1102, topPost: 'Novi dresovi 2026', topPostInteractions: 15678, totalReach: 178234 },
    { id: 5, title: 'Tjedni izvještaj o performansama', period: 'Jan 27 - Feb 2, 2026', date: 'Feb 3, 2026', status: 'completed', pages: 11, size: '2.2 MB', engagementChange: 1.3, followerGrowth: 734, topPost: 'Akademija U-19 pobijeda', topPostInteractions: 5432, totalReach: 87654 },
    { id: 6, title: 'Tjedni izvještaj o performansama', period: 'Jan 20 - Jan 26, 2026', date: 'Jan 27, 2026', status: 'completed', pages: 9, size: '1.7 MB', engagementChange: -1.2, followerGrowth: 423, topPost: 'Fan zona - Advent', topPostInteractions: 4567, totalReach: 67890 },
  ],
  totalReports: 11,
  lastGenerated: 'Mar 3, 2026',
  lastGeneratedTitle: 'Tjedni izvještaj o performansama',
  nextScheduled: 'Mar 9, 2026',
  nextScheduledNote: 'Tjedno automatsko generiranje (ponedjeljak 8:00)',
}

const fallbackMonthly: ReportsData = {
  reports: [
    { id: 10, title: 'Mjesečni marketinški izvještaj', period: 'February 2026', date: 'Mar 1, 2026', status: 'generating', pages: 0, size: '--', engagementChange: 0, followerGrowth: 0 },
    { id: 11, title: 'Mjesečni marketinški izvještaj', period: 'January 2026', date: 'Feb 1, 2026', status: 'completed', pages: 28, size: '5.6 MB', engagementChange: 5.7, followerGrowth: 4823, topPost: 'Zimski mercato - pojačanja', topPostInteractions: 28456, totalReach: 456789 },
    { id: 12, title: 'Mjesečni marketinški izvještaj', period: 'December 2025', date: 'Jan 1, 2026', status: 'completed', pages: 32, size: '6.2 MB', engagementChange: 8.3, followerGrowth: 6234, topPost: 'Božićna kampanja', topPostInteractions: 34567, totalReach: 567890 },
    { id: 13, title: 'Mjesečni marketinški izvještaj', period: 'November 2025', date: 'Dec 1, 2025', status: 'completed', pages: 26, size: '4.8 MB', engagementChange: -2.1, followerGrowth: 3456, topPost: 'Liga prvaka grupna faza', topPostInteractions: 45678, totalReach: 678901 },
    { id: 14, title: 'Mjesečni marketinški izvještaj', period: 'October 2025', date: 'Nov 1, 2025', status: 'completed', pages: 24, size: '4.5 MB', engagementChange: 3.4, followerGrowth: 2987, topPost: 'Derbi krug - GNK Dinamo', topPostInteractions: 23456, totalReach: 345678 },
  ],
  totalReports: 11,
  lastGenerated: 'Mar 1, 2026',
  lastGeneratedTitle: 'Mjesečni marketinški izvještaj',
  nextScheduled: 'Apr 1, 2026',
  nextScheduledNote: 'Mjesečno automatsko generiranje (1. u mjesecu)',
}

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
        <CheckCircle size={12} />
        Završen
      </span>
    )
  }
  if (status === 'generating') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
        <Loader2 size={12} className="animate-spin" />
        Generira se
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-200">
      <AlertCircle size={12} />
      Neuspjelo
    </span>
  )
}

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
      <div className="flex justify-between text-xs text-blue-600 mb-1">
        <span>Generiranje</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('weekly')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [emailingId, setEmailingId] = useState<number | null>(null)
  const [localReports, setLocalReports] = useState<Record<ReportTab, Report[]>>({ weekly: [], monthly: [] })
  const [comparisonId, setComparisonId] = useState<number | null>(null)

  const { data: weeklyApi, loading: weeklyLoading } = useApi<ReportsData>('/reports/weekly')
  const { data: monthlyApi, loading: monthlyLoading } = useApi<ReportsData>('/reports/monthly')

  const weeklyData = weeklyApi || fallbackWeekly
  const monthlyData = monthlyApi || fallbackMonthly

  const loading = activeTab === 'weekly' ? weeklyLoading : monthlyLoading

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

  if (loading && !(weeklyApi || monthlyApi)) return (
    <>
      <Header title="IZVJEŠTAJI" subtitle="Automatsko generiranje izvještaja i arhiva" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={3} cols="grid grid-cols-1 sm:grid-cols-3 gap-4" />
        <ChartSkeleton />
      </div>
    </>
  )

  const currentData = activeTab === 'weekly' ? weeklyData : monthlyData
  const allReports = [...(localReports[activeTab] || []), ...(currentData.reports || [])]
  const totalReports = (weeklyData.reports?.length || fallbackWeekly.reports.length) + (monthlyData.reports?.length || fallbackMonthly.reports.length) + localReports.weekly.length + localReports.monthly.length

  // Latest completed report for summary
  const latestCompleted = allReports.find(r => r.status === 'completed')

  const handleGenerate = async () => {
    setIsGenerating(true)
    addToast('Generiranje izvještaja pokrenuto...', 'info')

    // Simulate report generation (2.5s delay)
    await new Promise(resolve => setTimeout(resolve, 2500))

    const now = new Date()
    const newReport: Report = {
      id: Date.now(),
      title: activeTab === 'weekly' ? 'Tjedni izvještaj o performansama' : 'Mjesečni marketinški izvještaj',
      period: activeTab === 'weekly'
        ? `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(now.getTime() + 7 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'completed',
      pages: Math.floor(Math.random() * 10) + 8,
      size: `${(Math.random() * 3 + 1.5).toFixed(1)} MB`,
      engagementChange: +(Math.random() * 6 - 1).toFixed(1),
      followerGrowth: Math.floor(Math.random() * 1500) + 300,
      topPost: 'Novi generirani sadržaj',
      topPostInteractions: Math.floor(Math.random() * 10000) + 3000,
      totalReach: Math.floor(Math.random() * 100000) + 50000,
    }

    setLocalReports(prev => ({
      ...prev,
      [activeTab]: [newReport, ...prev[activeTab]],
    }))

    setIsGenerating(false)
    addToast('Izvještaj uspješno generiran!', 'success')
  }

  const handleDownload = async (reportId: number) => {
    setDownloadingId(reportId)
    try {
      await reportsApi.downloadPdf(String(reportId), activeTab)
      addToast('PDF izvještaj preuzet!', 'success')
    } catch {
      addToast('Greška pri preuzimanju PDF-a', 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleEmail = async (reportId: number) => {
    setEmailingId(reportId)
    try {
      await reportsApi.emailReport(String(reportId), activeTab)
      addToast('Izvještaj uspješno poslan na email!', 'success')
    } catch {
      addToast('Greška pri slanju emaila', 'error')
    } finally {
      setEmailingId(null)
    }
  }

  const handleCompare = (reportId: number) => {
    if (comparisonId === reportId) {
      setComparisonId(null)
    } else {
      setComparisonId(reportId)
      addToast('Usporedba s prošlim periodom prikazana', 'info')
    }
  }

  // Find previous report for comparison
  const getComparisonReport = (reportId: number): Report | undefined => {
    const idx = allReports.findIndex(r => r.id === reportId)
    if (idx >= 0 && idx < allReports.length - 1) {
      return allReports[idx + 1]
    }
    return undefined
  }

  return (
    <div className="animate-fade-in">
      <Header title="IZVJEŠTAJI" subtitle="Automatsko generiranje izvještaja i arhiva" />

      <div className="page-wrapper space-y-6">

        {/* Actions & Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 border-b border-gray-200 pb-1">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'weekly'
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tjedni izvještaji
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'monthly'
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Mjesečni izvještaji
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {isGenerating ? 'Generira se...' : 'Generiraj izvještaj'}
          </button>
        </div>

        {/* Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 text-gray-500 mb-1"><FileText size={16} />Ukupno izvještaja</div>
            <p className="text-3xl font-bold text-gray-900">{totalReports}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-gray-500 mb-1"><Calendar size={16} />Zadnje generirano</div>
            <p className="text-lg font-bold text-gray-900">{currentData.lastGenerated}</p>
            <p className="text-xs text-gray-500 mt-1">{currentData.lastGeneratedTitle}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-gray-500 mb-1"><Clock size={16} />Sljedeći zakazan</div>
            <p className="text-lg font-bold text-gray-900">{currentData.nextScheduled}</p>
            <p className="text-xs text-gray-500 mt-1">{currentData.nextScheduledNote}</p>
          </div>
        </div>

        {/* Key Metrics from Latest Report */}
        {latestCompleted && (
          <div className="card border border-blue-100 bg-gradient-to-r from-blue-50/50 to-white">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-800">Ključne metrike - {latestCompleted.period}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Engagement Change */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                  <ThumbsUp size={12} />
                  Engagement
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-gray-900">
                    {latestCompleted.engagementChange !== undefined ? Math.abs(latestCompleted.engagementChange).toFixed(1) : '0'}%
                  </span>
                  {(latestCompleted.engagementChange ?? 0) >= 0 ? (
                    <span className="flex items-center gap-0.5 text-emerald-600 text-xs font-medium bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      <ArrowUpRight size={10} />+{latestCompleted.engagementChange}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-red-600 text-xs font-medium bg-red-50 px-1.5 py-0.5 rounded-full">
                      <ArrowDownRight size={10} />{latestCompleted.engagementChange}%
                    </span>
                  )}
                </div>
              </div>
              {/* Follower Growth */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                  <Users size={12} />
                  Novi pratitelji
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-gray-900">
                    {latestCompleted.followerGrowth?.toLocaleString() || '0'}
                  </span>
                  <TrendingUp size={14} className="text-emerald-500" />
                </div>
              </div>
              {/* Total Reach */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                  <Eye size={12} />
                  Ukupni doseg
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {latestCompleted.totalReach ? (latestCompleted.totalReach / 1000).toFixed(1) + 'K' : '--'}
                </span>
              </div>
              {/* Top Post */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                  <Share2 size={12} />
                  Top objava
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate" title={latestCompleted.topPost}>
                  {latestCompleted.topPost || '--'}
                </p>
                {latestCompleted.topPostInteractions && (
                  <p className="text-xs text-gray-500 mt-0.5">{latestCompleted.topPostInteractions.toLocaleString()} interakcija</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Generating indicator */}
        {isGenerating && (
          <div className="card border-2 border-dashed border-blue-300 bg-blue-50/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Loader2 size={20} className="text-blue-600 animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Generiranje novog izvještaja...</h3>
                <p className="text-xs text-gray-500 mt-0.5">Prikupljanje podataka s platformi i analiza performansi</p>
                <div className="mt-2 w-full">
                  <GeneratingProgress />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report List */}
        <div className="card">
          <h2 className="section-title mb-4">
            {activeTab === 'weekly' ? 'Tjedni izvještaji' : 'Mjesečni izvještaji'}
            <span className="text-gray-400 font-normal ml-2">({allReports.length})</span>
          </h2>
          <div className="space-y-3">
            {allReports.map((report) => (
              <div key={report.id}>
                <div
                  className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                    comparisonId === report.id
                      ? 'bg-blue-50 border border-blue-200 shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      report.status === 'completed' ? 'bg-emerald-100' :
                      report.status === 'generating' ? 'bg-blue-100' : 'bg-red-100'
                    }`}>
                      <FileText size={18} className={
                        report.status === 'completed' ? 'text-emerald-600' :
                        report.status === 'generating' ? 'text-blue-600' : 'text-red-600'
                      } />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{report.title}</h3>
                        <StatusBadge status={report.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{report.period}</span>
                        <span className="text-xs text-gray-300">|</span>
                        <span className="text-xs text-gray-500">Generirano: {report.date}</span>
                        {report.status === 'completed' && report.engagementChange !== undefined && (
                          <>
                            <span className="text-xs text-gray-300">|</span>
                            <span className={`text-xs font-medium flex items-center gap-0.5 ${
                              report.engagementChange >= 0 ? 'text-emerald-600' : 'text-red-600'
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
                    {report.status === 'completed' && (
                      <>
                        <span className="text-xs text-gray-400 hidden sm:inline">{report.pages} str.</span>
                        <span className="text-xs text-gray-400 hidden sm:inline">{report.size}</span>

                        {/* Comparison toggle */}
                        <button
                          onClick={() => handleCompare(report.id)}
                          title="Usporedi s prošlim periodom"
                          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-all ${
                            comparisonId === report.id
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          <GitCompareArrows size={13} />
                          <span className="hidden lg:inline">Usporedi</span>
                        </button>

                        {/* Email button */}
                        <button
                          onClick={() => handleEmail(report.id)}
                          disabled={emailingId === report.id}
                          title="Email izvještaj"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-amber-50 text-gray-600 hover:text-amber-600 text-xs rounded-lg transition-all disabled:opacity-50"
                        >
                          {emailingId === report.id ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                          <span className="hidden lg:inline">Email</span>
                        </button>

                        {/* Download button */}
                        <button
                          onClick={() => handleDownload(report.id)}
                          disabled={downloadingId === report.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 shadow-sm"
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
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition-colors"
                      >
                        <AlertCircle size={13} />
                        Ponovi generiranje
                      </button>
                    )}
                  </div>
                </div>

                {/* Comparison view */}
                {comparisonId === report.id && (() => {
                  const prev = getComparisonReport(report.id)
                  if (!prev || prev.status !== 'completed') {
                    return (
                      <div className="ml-14 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500">
                        Nema prethodnog izvještaja za usporedbu.
                      </div>
                    )
                  }
                  const engDiff = (report.engagementChange ?? 0) - (prev.engagementChange ?? 0)
                  const follDiff = (report.followerGrowth ?? 0) - (prev.followerGrowth ?? 0)
                  const reachDiff = (report.totalReach ?? 0) - (prev.totalReach ?? 0)
                  return (
                    <div className="ml-14 mt-2 p-4 bg-white rounded-xl border border-blue-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <GitCompareArrows size={14} className="text-blue-600" />
                        <span className="text-xs font-semibold text-gray-700">
                          Usporedba: {report.period} vs {prev.period}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Engagement promjena</p>
                          <p className={`text-sm font-bold ${engDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {engDiff >= 0 ? '+' : ''}{engDiff.toFixed(1)} p.p.
                          </p>
                          <p className="text-xs text-gray-400">
                            {report.engagementChange}% vs {prev.engagementChange}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Rast pratitelja</p>
                          <p className={`text-sm font-bold ${follDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {follDiff >= 0 ? '+' : ''}{follDiff.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {report.followerGrowth?.toLocaleString()} vs {prev.followerGrowth?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Doseg promjena</p>
                          <p className={`text-sm font-bold ${reachDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {reachDiff >= 0 ? '+' : ''}{(reachDiff / 1000).toFixed(1)}K
                          </p>
                          <p className="text-xs text-gray-400">
                            {report.totalReach ? (report.totalReach / 1000).toFixed(1) + 'K' : '--'} vs {prev.totalReach ? (prev.totalReach / 1000).toFixed(1) + 'K' : '--'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            ))}

            {allReports.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nema izvještaja. Kliknite "Generiraj izvještaj" za početak.</p>
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
                  : 'bg-blue-600 text-white'
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
