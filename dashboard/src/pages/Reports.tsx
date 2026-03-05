import { useState } from 'react'
import Header from '../components/layout/Header'
import { PageLoader, ErrorState } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { useApiMutation } from '../hooks/useApiMutation'
import { FileText, Download, Calendar, Clock, CheckCircle, Loader2, AlertCircle, Plus } from 'lucide-react'

type ReportTab = 'weekly' | 'monthly'

interface Report {
  id: number
  title: string
  period: string
  date: string
  status: 'completed' | 'generating' | 'failed'
  pages: number
  size: string
}

interface ReportsData {
  reports: Report[]
  totalReports: number
  lastGenerated: string
  lastGeneratedTitle: string
  nextScheduled: string
  nextScheduledNote: string
}

// Fallback mock data for when API is not available
const fallbackWeekly: ReportsData = {
  reports: [
    { id: 1, title: 'Tjedni izvje\u0161taj o performansama', period: 'Feb 24 - Mar 2, 2026', date: 'Mar 3, 2026', status: 'completed', pages: 12, size: '2.4 MB' },
    { id: 2, title: 'Tjedni izvje\u0161taj o performansama', period: 'Feb 17 - Feb 23, 2026', date: 'Feb 24, 2026', status: 'completed', pages: 11, size: '2.1 MB' },
    { id: 3, title: 'Tjedni izvje\u0161taj o performansama', period: 'Feb 10 - Feb 16, 2026', date: 'Feb 17, 2026', status: 'completed', pages: 13, size: '2.8 MB' },
    { id: 4, title: 'Tjedni izvje\u0161taj o performansama', period: 'Feb 3 - Feb 9, 2026', date: 'Feb 10, 2026', status: 'completed', pages: 10, size: '1.9 MB' },
    { id: 5, title: 'Tjedni izvje\u0161taj o performansama', period: 'Jan 27 - Feb 2, 2026', date: 'Feb 3, 2026', status: 'completed', pages: 11, size: '2.2 MB' },
    { id: 6, title: 'Tjedni izvje\u0161taj o performansama', period: 'Jan 20 - Jan 26, 2026', date: 'Jan 27, 2026', status: 'completed', pages: 9, size: '1.7 MB' },
  ],
  totalReports: 11,
  lastGenerated: 'Mar 3, 2026',
  lastGeneratedTitle: 'Tjedni izvje\u0161taj o performansama',
  nextScheduled: 'Mar 9, 2026',
  nextScheduledNote: 'Tjedno automatsko generiranje (ponedjeljak 8:00)',
}

const fallbackMonthly: ReportsData = {
  reports: [
    { id: 10, title: 'Mjese\u010dni marketin\u0161ki izvje\u0161taj', period: 'February 2026', date: 'Mar 1, 2026', status: 'generating', pages: 0, size: '--' },
    { id: 11, title: 'Mjese\u010dni marketin\u0161ki izvje\u0161taj', period: 'January 2026', date: 'Feb 1, 2026', status: 'completed', pages: 28, size: '5.6 MB' },
    { id: 12, title: 'Mjese\u010dni marketin\u0161ki izvje\u0161taj', period: 'December 2025', date: 'Jan 1, 2026', status: 'completed', pages: 32, size: '6.2 MB' },
    { id: 13, title: 'Mjese\u010dni marketin\u0161ki izvje\u0161taj', period: 'November 2025', date: 'Dec 1, 2025', status: 'completed', pages: 26, size: '4.8 MB' },
    { id: 14, title: 'Mjese\u010dni marketin\u0161ki izvje\u0161taj', period: 'October 2025', date: 'Nov 1, 2025', status: 'completed', pages: 24, size: '4.5 MB' },
  ],
  totalReports: 11,
  lastGenerated: 'Mar 1, 2026',
  lastGeneratedTitle: 'Mjese\u010dni marketin\u0161ki izvje\u0161taj',
  nextScheduled: 'Apr 1, 2026',
  nextScheduledNote: 'Mjese\u010dno automatsko generiranje (1. u mjesecu)',
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'completed') return <CheckCircle size={16} className="text-green-600" />
  if (status === 'generating') return <Loader2 size={16} className="text-blue-600 animate-spin" />
  return <AlertCircle size={16} className="text-red-600" />
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('weekly')

  const { data: weeklyApi, loading: weeklyLoading, error: weeklyError, refetch: refetchWeekly } = useApi<ReportsData>('/reports/weekly')
  const { data: monthlyApi, loading: monthlyLoading, error: monthlyError, refetch: refetchMonthly } = useApi<ReportsData>('/reports/monthly')

  const { mutate: generateWeekly, loading: generatingWeekly } = useApiMutation('/reports/generate/weekly')
  const { mutate: generateMonthly, loading: generatingMonthly } = useApiMutation('/reports/generate/monthly')

  const weeklyData = weeklyApi || fallbackWeekly
  const monthlyData = monthlyApi || fallbackMonthly

  const loading = activeTab === 'weekly' ? weeklyLoading : monthlyLoading
  const error = activeTab === 'weekly' ? weeklyError : monthlyError
  const refetch = activeTab === 'weekly' ? refetchWeekly : refetchMonthly

  if (loading && !(weeklyApi || monthlyApi)) return <><Header title="IZVJE\u0160TAJI" subtitle="Automatsko generiranje izvje\u0161taja i arhiva" /><PageLoader /></>

  const currentData = activeTab === 'weekly' ? weeklyData : monthlyData
  const reports = currentData.reports || []
  const totalReports = (weeklyData.reports?.length || fallbackWeekly.reports.length) + (monthlyData.reports?.length || fallbackMonthly.reports.length)

  const handleGenerate = async () => {
    if (activeTab === 'weekly') {
      await generateWeekly()
      refetchWeekly()
    } else {
      await generateMonthly()
      refetchMonthly()
    }
  }

  const isGenerating = activeTab === 'weekly' ? generatingWeekly : generatingMonthly

  return (
    <div className="animate-fade-in">
      <Header title="IZVJE\u0160TAJI" subtitle="Automatsko generiranje izvje\u0161taja i arhiva" />

      <div className="page-wrapper space-y-6">
        {error && <ErrorState message={error} onRetry={refetch} />}

        {/* Actions & Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 border-b border-gray-200 pb-1">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'weekly'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-dinamo-muted hover:text-gray-700'
              }`}
            >
              Tjedni izvje\u0161taji
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'monthly'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-dinamo-muted hover:text-gray-700'
              }`}
            >
              Mjese\u010dni izvje\u0161taji
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {isGenerating ? 'Generira se...' : 'Generiraj izvje\u0161taj'}
          </button>
        </div>

        {/* Report Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 text-dinamo-muted mb-1"><FileText size={16} />Ukupno izvje\u0161taja</div>
            <p className="text-3xl font-bold text-gray-900">{totalReports}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-dinamo-muted mb-1"><Calendar size={16} />Zadnje generirano</div>
            <p className="text-lg font-bold text-gray-900">{currentData.lastGenerated}</p>
            <p className="text-xs text-dinamo-muted mt-1">{currentData.lastGeneratedTitle}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-dinamo-muted mb-1"><Clock size={16} />Sljede\u0107i zakazan</div>
            <p className="text-lg font-bold text-gray-900">{currentData.nextScheduled}</p>
            <p className="text-xs text-dinamo-muted mt-1">{currentData.nextScheduledNote}</p>
          </div>
        </div>

        {/* Report List */}
        <div className="card">
          <h2 className="section-title mb-4">
            {activeTab === 'weekly' ? 'Tjedni izvje\u0161taji' : 'Mjese\u010dni izvje\u0161taji'}
          </h2>
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <StatusIcon status={report.status} />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{report.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-dinamo-muted">{report.period}</span>
                      <span className="text-xs text-dinamo-muted">|</span>
                      <span className="text-xs text-dinamo-muted">Generated: {report.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {report.status === 'completed' && (
                    <>
                      <span className="text-xs text-dinamo-muted">{report.pages} stranica</span>
                      <span className="text-xs text-dinamo-muted">{report.size}</span>
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition-colors">
                        <Download size={14} />
                        Preuzmi
                      </button>
                    </>
                  )}
                  {report.status === 'generating' && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Generira se...
                    </span>
                  )}
                  {report.status === 'failed' && (
                    <button className="text-xs text-red-600 hover:text-red-300">
                      Ponovi
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
