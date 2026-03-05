import { useState, useMemo } from 'react'
import Header from '../components/layout/Header'
import StatusBadge from '../components/common/StatusBadge'
import PlatformIcon from '../components/common/PlatformIcon'
import { PageLoader } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { useApiMutation } from '../hooks/useApiMutation'
import { contentApi } from '../api/content'
import {
  Calendar, ChevronLeft, ChevronRight, Check, X, Clock, Sparkles,
  Eye, Heart, Share2, ArrowRight, LayoutGrid, List, CalendarDays,
} from 'lucide-react'
import { PLATFORMS } from '../utils/constants'

const DAYS_OF_WEEK = ['Pon', 'Uto', 'Sri', 'Cet', 'Pet', 'Sub', 'Ned']

interface Post {
  id: string
  platform: string
  type: string
  title?: string
  caption_hr?: string
  status?: string
  scheduled_at?: string
  content_pillar?: string
  metrics?: { impressions: number; reach: number; engagement: number }
}

interface CalendarDay {
  posts: Post[]
}

interface QueueItem {
  id: string
  title: string
  platform: string
  author: string
  submitted: string
  pillar: string
  status?: string
}

// Fallback data
const fallbackCalendar: Record<number, Post[]> = {
  1: [{ id: '1', platform: 'instagram', type: 'reel', title: 'Najava utakmice' }],
  2: [{ id: '2', platform: 'tiktok', type: 'video', title: 'Trening highlights' }, { id: '3', platform: 'facebook', type: 'image', title: 'Matchday countdown' }],
  3: [{ id: '4', platform: 'youtube', type: 'video', title: 'Analiza protivnika' }],
  4: [{ id: '5', platform: 'instagram', type: 'story', title: 'Behind the scenes' }, { id: '6', platform: 'tiktok', type: 'video', title: 'Player challenge' }, { id: '7', platform: 'facebook', type: 'post', title: 'Fan Q&A' }],
  5: [{ id: '8', platform: 'instagram', type: 'reel', title: 'Gol highlights' }],
  7: [{ id: '11', platform: 'tiktok', type: 'video' }, { id: '12', platform: 'facebook', type: 'event' }, { id: '13', platform: 'instagram', type: 'reel' }],
  10: [{ id: '16', platform: 'instagram', type: 'reel' }, { id: '17', platform: 'facebook', type: 'image' }],
  14: [{ id: '21', platform: 'instagram', type: 'reel' }, { id: '22', platform: 'facebook', type: 'post' }, { id: '23', platform: 'youtube', type: 'short' }],
  18: [{ id: '28', platform: 'youtube', type: 'video' }],
  20: [{ id: '30', platform: 'instagram', type: 'carousel' }, { id: '31', platform: 'tiktok', type: 'video' }, { id: '32', platform: 'facebook', type: 'post' }],
  25: [{ id: '38', platform: 'facebook', type: 'image' }, { id: '39', platform: 'youtube', type: 'video' }],
  28: [{ id: '43', platform: 'instagram', type: 'carousel' }],
  30: [{ id: '45', platform: 'instagram', type: 'reel' }, { id: '46', platform: 'youtube', type: 'short' }],
}

const fallbackQueue: QueueItem[] = [
  { id: '1', title: 'Najava utakmice: Dinamo vs Hajduk', platform: 'Instagram Reel', author: 'Tim za sadrzaj', submitted: 'prije 2 sata', pillar: 'Dan utakmice' },
  { id: '2', title: 'Akademija u fokusu: Highlights omladinskog kupa', platform: 'TikTok video', author: 'Mediji akademije', submitted: 'prije 5 sati', pillar: 'Akademija' },
  { id: '3', title: 'Fan Q&A s Petkovicem', platform: 'YouTube Short', author: 'Odnosi s igracima', submitted: 'prije 1 dan', pillar: 'Igraci' },
  { id: '4', title: 'Iza kulisa: Trening', platform: 'Instagram karusel', author: 'Tim za sadrzaj', submitted: 'prije 1 dan', pillar: 'Iza kulisa' },
  { id: '5', title: 'Navijacki event dijaspore — Bec', platform: 'Facebook event', author: 'Tim za zajednicu', submitted: 'prije 2 dana', pillar: 'Zajednica' },
]

const platformColors: Record<string, string> = {
  instagram: 'bg-pink-500',
  facebook: 'bg-blue-500',
  tiktok: 'bg-purple-500',
  youtube: 'bg-red-500',
  twitter: 'bg-sky-500',
  web: 'bg-gray-500',
}

type ViewMode = 'month' | 'week' | 'sixmonth'
type TabMode = 'calendar' | 'approvals'

export default function ContentCalendar() {
  const [activeTab, setActiveTab] = useState<TabMode>('calendar')
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentMonth, setCurrentMonth] = useState(2) // March 2026 (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)

  const { data: calendarApi, loading, refetch: refetchCalendar } = useApi<Record<string, unknown>>(`/content/calendar?month=${currentMonth + 1}&year=${currentYear}`)
  const { data: queueApi, refetch: refetchQueue } = useApi<QueueItem[]>('/content/queue')

  // Normalize calendar data
  const calendarData: Record<number, Post[]> = useMemo(() => {
    if (calendarApi && typeof calendarApi === 'object') {
      const normalized: Record<number, Post[]> = {}
      for (const [key, val] of Object.entries(calendarApi)) {
        const dayNum = parseInt(key)
        if (!isNaN(dayNum) && Array.isArray(val)) {
          normalized[dayNum] = val as Post[]
        }
      }
      return Object.keys(normalized).length > 0 ? normalized : fallbackCalendar
    }
    return fallbackCalendar
  }, [calendarApi])

  const queue = queueApi || fallbackQueue

  const monthNames = ['Sijecanj', 'Veljaca', 'Ozujak', 'Travanj', 'Svibanj', 'Lipanj', 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac']

  const firstDay = new Date(currentYear, currentMonth, 1)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  let firstDayOffset = firstDay.getDay() - 1 // Monday-start
  if (firstDayOffset < 0) firstDayOffset = 6
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7
  const today = new Date()
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear
  const todayDay = isCurrentMonth ? today.getDate() : -1

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
    setSelectedDay(null)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await contentApi.generatePlan({ month: currentMonth + 1, year: currentYear })
      refetchCalendar()
    } finally {
      setGenerating(false)
    }
  }

  const handleApprove = async (id: string) => {
    await contentApi.approvePost(id)
    refetchQueue()
  }

  const handleReject = async (id: string) => {
    await contentApi.rejectPost(id, 'Odbijeno od strane marketera')
    refetchQueue()
  }

  const selectedDayPosts = selectedDay ? (calendarData[selectedDay] || []) : []

  return (
    <div className="animate-fade-in">
      <Header
        title="KALENDAR SADRZAJA"
        subtitle={`${monthNames[currentMonth]} ${currentYear} — Planiranje i odobrenja`}
        actions={
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Sparkles size={16} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generiranje...' : 'AI Generiraj plan'}
          </button>
        }
      />

      <div className="page-wrapper space-y-6">
        {/* Tabs + View Mode */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 border-b border-gray-200 pb-1">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'calendar' ? 'border-dinamo-accent text-dinamo-accent-dark' : 'border-transparent text-dinamo-muted hover:text-gray-700'
              }`}
            >
              <Calendar size={16} className="inline mr-2" />
              Kalendar
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'approvals' ? 'border-dinamo-accent text-dinamo-accent-dark' : 'border-transparent text-dinamo-muted hover:text-gray-700'
              }`}
            >
              <Clock size={16} className="inline mr-2" />
              Red za odobrenje
              <span className="ml-2 text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded-full">{queue.length}</span>
            </button>
          </div>

          {activeTab === 'calendar' && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {([['month', LayoutGrid, 'Mjesec'], ['week', List, 'Tjedan'], ['sixmonth', CalendarDays, '6 mjeseci']] as const).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === mode ? 'bg-white shadow-sm text-gray-900' : 'text-dinamo-muted hover:text-gray-700'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'calendar' && viewMode === 'month' && (
          <div className="flex gap-6">
            {/* Calendar Grid */}
            <div className={`card flex-1 ${selectedDay ? 'lg:flex-[2]' : ''}`}>
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-6">
                <button onClick={prevMonth} className="p-2 text-dinamo-muted hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-gray-900">{monthNames[currentMonth]} {currentYear}</h2>
                <button onClick={nextMonth} className="p-2 text-dinamo-muted hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="text-center text-xs text-dinamo-muted font-medium py-2">{day}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: totalCells }, (_, i) => {
                  const dayNum = i - firstDayOffset + 1
                  const isValid = dayNum >= 1 && dayNum <= daysInMonth
                  const isToday = dayNum === todayDay
                  const isSelected = dayNum === selectedDay
                  const posts = isValid ? (calendarData[dayNum] || []) : []

                  return (
                    <div
                      key={i}
                      onClick={() => isValid && setSelectedDay(isSelected ? null : dayNum)}
                      className={`min-h-[72px] sm:min-h-[80px] p-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-dinamo-accent bg-dinamo-accent/5 ring-1 ring-dinamo-accent/20'
                          : isToday
                            ? 'border-blue-400 bg-blue-50'
                            : isValid
                              ? 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'
                              : 'border-transparent bg-transparent cursor-default'
                      }`}
                    >
                      {isValid && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : isSelected ? 'text-dinamo-accent-dark' : 'text-dinamo-muted'}`}>
                              {dayNum}
                            </span>
                            {posts.length > 0 && (
                              <span className="text-[10px] text-dinamo-muted">{posts.length}</span>
                            )}
                          </div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {posts.slice(0, 4).map((post) => (
                              <div
                                key={post.id}
                                className={`w-2.5 h-2.5 rounded-full ${platformColors[post.platform] || 'bg-gray-400'} transition-transform hover:scale-125`}
                                title={`${post.platform} - ${post.type}`}
                              />
                            ))}
                            {posts.length > 4 && (
                              <span className="text-[10px] text-dinamo-muted">+{posts.length - 4}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 flex-wrap">
                <span className="text-xs text-dinamo-muted">Platforme:</span>
                {Object.entries(platformColors).slice(0, 4).map(([platform, color]) => (
                  <div key={platform} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-xs text-dinamo-muted capitalize">{platform}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day Detail Panel */}
            {selectedDay && (
              <div className="hidden lg:block card w-80 animate-slide-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title">{selectedDay}. {monthNames[currentMonth]}</h3>
                  <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-gray-100 rounded">
                    <X size={16} className="text-dinamo-muted" />
                  </button>
                </div>

                {selectedDayPosts.length === 0 ? (
                  <p className="text-sm text-dinamo-muted py-8 text-center">Nema objava za ovaj dan</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayPosts.map((post) => (
                      <div key={post.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <PlatformIcon platform={post.platform} size="sm" />
                          <span className="text-xs font-medium text-gray-700 capitalize">{post.type}</span>
                          {post.status && <StatusBadge status={post.status} />}
                        </div>
                        {post.title && <p className="text-sm text-gray-900 font-medium">{post.title}</p>}
                        {post.caption_hr && <p className="text-xs text-dinamo-muted mt-1 line-clamp-2">{post.caption_hr}</p>}
                        {post.metrics && (
                          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200">
                            <span className="text-xs text-dinamo-muted flex items-center gap-1"><Eye size={12} /> {post.metrics.impressions}</span>
                            <span className="text-xs text-dinamo-muted flex items-center gap-1"><Heart size={12} /> {post.metrics.engagement}</span>
                            <span className="text-xs text-dinamo-muted flex items-center gap-1"><Share2 size={12} /> {post.metrics.reach}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && viewMode === 'sixmonth' && (
          <div className="card">
            <h2 className="section-title mb-6">6-Mjesecni pregled plana</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }, (_, i) => {
                const m = (currentMonth + i) % 12
                const y = currentYear + Math.floor((currentMonth + i) / 12)
                const totalPosts = Object.values(fallbackCalendar).reduce((sum, posts) => sum + posts.length, 0)
                return (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-dinamo-accent/30 transition-colors cursor-pointer"
                    onClick={() => { setCurrentMonth(m); setCurrentYear(y); setViewMode('month') }}>
                    <p className="text-sm font-medium text-gray-900">{monthNames[m]}</p>
                    <p className="text-xs text-dinamo-muted">{y}</p>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-dinamo-muted">Objave</span>
                        <span className="text-gray-700 font-mono">{i === 0 ? totalPosts : '—'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-dinamo-muted">Status</span>
                        <StatusBadge status={i === 0 ? 'active' : i < 2 ? 'draft' : 'pending_review'} />
                      </div>
                    </div>
                    {i === 0 && <ArrowRight size={14} className="text-dinamo-accent mt-2" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && viewMode === 'week' && (
          <div className="card">
            <h2 className="section-title mb-4">Tjedni pregled</h2>
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day, idx) => {
                const dayNum = todayDay > 0 ? todayDay - today.getDay() + 1 + idx : idx + 1
                const posts = calendarData[dayNum] || []
                return (
                  <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-16 text-center">
                      <p className="text-xs text-dinamo-muted">{day}</p>
                      <p className="text-lg font-bold text-gray-900">{dayNum > 0 && dayNum <= daysInMonth ? dayNum : '—'}</p>
                    </div>
                    <div className="flex-1 flex gap-2 flex-wrap">
                      {posts.map((post) => (
                        <div key={post.id} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                          <PlatformIcon platform={post.platform} size="sm" />
                          <span className="text-xs text-gray-700 capitalize">{post.type}</span>
                        </div>
                      ))}
                      {posts.length === 0 && <span className="text-xs text-dinamo-muted italic">Nema objava</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Approval Queue */}
        {activeTab === 'approvals' && (
          <div className="card">
            <h2 className="section-title mb-4">Ceka odobrenje</h2>
            <div className="space-y-3">
              {queue.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">{item.pillar}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-dinamo-muted">
                      <span>{item.platform}</span>
                      <span>|</span>
                      <span>{item.author}</span>
                      <span>|</span>
                      <span>{item.submitted}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
                    >
                      <Check size={14} />
                      Odobri
                    </button>
                    <button
                      onClick={() => handleReject(item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs rounded-lg border border-red-300 transition-colors"
                    >
                      <X size={14} />
                      Odbij
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
