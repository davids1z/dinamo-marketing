import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import PlatformIcon from '../components/common/PlatformIcon'
import EmptyState from '../components/common/EmptyState'
import { contentApi } from '../api/content'
import { useProjectStatus } from '../hooks/useProjectStatus'
import { useProfileCompleteness } from '../hooks/useProfileCompleteness'
import {
  Calendar, ChevronLeft, ChevronRight, Check, X, Clock, Sparkles,
  Eye, Heart, MessageCircle, Share2, Bookmark, TrendingUp, TrendingDown,
  LayoutGrid, List, CalendarDays, Loader2, BarChart3, Target, Zap,
  Film, Filter, Send, Instagram, Facebook, Youtube, Music2, FolderKanban,
  AlertTriangle, Lightbulb, RefreshCw, PieChart,
} from 'lucide-react'
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useClient } from '../contexts/ClientContext'

const DAYS_OF_WEEK = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']

/* ─────────── types ─────────── */

interface PostMetrics {
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  engagement_rate: number
  reach: number
  impressions: number
  prev_week_avg_views: number
  prev_week_avg_engagement: number
}

interface Post {
  id: string
  platform: string
  type: string
  title: string
  description: string
  caption_hr: string
  scheduled_time: string
  content_pillar: string
  hashtags: string[]
  visual_brief: string
  visual_url?: string
  status: 'published' | 'scheduled' | 'draft' | 'missed' | 'approved' | 'failed'
  metrics?: PostMetrics
  platform_post_url?: string
  publish_error?: string
}

interface QueueItem {
  id: string
  title: string
  platform: string
  author: string
  submitted: string
  pillar: string
}

type PlatformFilter = 'all' | 'instagram' | 'facebook' | 'tiktok' | 'youtube'
type StatusFilter = 'all' | 'draft' | 'scheduled' | 'published'
type TypeFilter = 'all' | 'reel' | 'story' | 'post' | 'video'

/* ─────────── constants ─────────── */

const PLATFORM_FILTER_OPTIONS: { value: PlatformFilter; label: string; icon?: React.ElementType }[] = [
  { value: 'all', label: 'Sve' },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'tiktok', label: 'TikTok', icon: Music2 },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
]

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Sve' },
  { value: 'draft', label: 'Nacrt' },
  { value: 'scheduled', label: 'Zakazano' },
  { value: 'published', label: 'Objavljeno' },
]

const TYPE_FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Sve' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Story' },
  { value: 'post', label: 'Post' },
  { value: 'video', label: 'Video' },
]

const statusDotColors: Record<string, string> = {
  published: 'bg-green-500',
  scheduled: 'bg-blue-500',
  draft: 'bg-amber-500',
  approved: 'bg-emerald-500',
  missed: 'bg-red-500',
  failed: 'bg-red-500',
}

const platformColors: Record<string, string> = {
  instagram: 'bg-pink-500',
  facebook: 'bg-blue-500',
  tiktok: 'bg-purple-500',
  youtube: 'bg-red-500',
  twitter: 'bg-sky-500',
  web: 'bg-studio-surface-00',
}

const pillarLabels: Record<string, string> = {
  match_day: 'Kampanja', player_spotlight: 'Proizvodi', behind_scenes: 'Iza kulisa',
  academy: 'Edukacija', fan_engagement: 'Zajednica', diaspora: 'Međunarodno',
  european_nights: 'Premium', lifestyle: 'Lifestyle', education: 'Edukacija',
  entertainment: 'Zabava', sales: 'Prodaja', community: 'Zajednica', brand_awareness: 'Svijest o brendu',
}

const pillarColors: Record<string, string> = {
  match_day: 'bg-red-500/10 text-red-400', player_spotlight: 'bg-blue-500/10 text-blue-400',
  behind_scenes: 'bg-amber-500/10 text-amber-400', academy: 'bg-green-500/10 text-green-400',
  fan_engagement: 'bg-purple-500/10 text-purple-400', diaspora: 'bg-cyan-500/10 text-cyan-400',
  european_nights: 'bg-indigo-500/10 text-indigo-400', lifestyle: 'bg-pink-500/10 text-pink-400',
  education: 'bg-green-500/10 text-green-400', entertainment: 'bg-purple-500/10 text-purple-400',
  sales: 'bg-amber-500/10 text-amber-400', community: 'bg-cyan-500/10 text-cyan-400',
  brand_awareness: 'bg-indigo-500/10 text-indigo-400',
}

const pillarBarColors: Record<string, string> = {
  match_day: '#ef4444', player_spotlight: '#3b82f6', behind_scenes: '#f59e0b',
  academy: '#22c55e', fan_engagement: '#a855f7', diaspora: '#06b6d4',
  european_nights: '#6366f1', lifestyle: '#ec4899', education: '#22c55e',
  entertainment: '#a855f7', sales: '#f59e0b', community: '#06b6d4', brand_awareness: '#6366f1',
}

const typeColors: Record<string, string> = {
  reel: 'text-pink-400', story: 'text-amber-400', post: 'text-blue-400',
  video: 'text-red-400', carousel: 'text-purple-400',
}

/* ─────────── helpers ─────────── */

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

function pctChange(current: number, previous: number): { pct: string; up: boolean } {
  if (previous === 0) return { pct: '+100%', up: true }
  const change = ((current - previous) / previous) * 100
  return { pct: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`, up: change >= 0 }
}

/* ─────────── DnD helpers ─────────── */

function DraggablePostDot({ post, isPast }: { post: Post; isPast: boolean }) {
  const isDraggable = !isPast && (post.status === 'draft' || post.status === 'scheduled')
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id, data: { post }, disabled: !isDraggable,
  })

  return (
    <div
      ref={setNodeRef}
      {...(isDraggable ? { ...listeners, ...attributes } : {})}
      className={`flex items-center gap-1.5 ${isPast ? 'opacity-40' : ''} ${isDragging ? 'opacity-30' : ''} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      title={`${post.platform} - ${post.type} - ${post.title}${isDraggable ? ' (povuci za premjestiti)' : ''}`}
    >
      <div className={`w-1.5 h-3.5 rounded-full flex-shrink-0 ${platformColors[post.platform] || 'bg-gray-400'}`} />
      <span className={`text-[10px] truncate leading-tight ${typeColors[post.type] || 'text-studio-text-secondary'}`}>
        {post.title || post.type}
      </span>
    </div>
  )
}

function DroppableDay({ dayNum, children }: { dayNum: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dayNum}`, data: { dayNum } })
  return (
    <div ref={setNodeRef} className={isOver ? 'ring-2 ring-brand-accent ring-inset rounded-lg' : ''}>
      {children}
    </div>
  )
}

/* ─────────── Content Pillar Stats ─────────── */

function PillarStats({ posts }: { posts: Post[] }) {
  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of posts) {
      const pillar = p.content_pillar || 'other'
      counts[pillar] = (counts[pillar] || 0) + 1
    }
    const total = posts.length || 1
    return Object.entries(counts)
      .map(([pillar, count]) => ({ pillar, label: pillarLabels[pillar] || pillar, count, pct: Math.round((count / total) * 100), color: pillarBarColors[pillar] || '#64748b' }))
      .sort((a, b) => b.count - a.count)
  }, [posts])

  if (stats.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <PieChart size={16} className="text-brand-accent" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-studio-text-secondary">Stupovi sadržaja ovog mjeseca</h3>
      </div>
      <div className="w-full h-3 rounded-full bg-studio-surface-3 overflow-hidden flex">
        {stats.map((s) => (
          <div key={s.pillar} className="h-full transition-all first:rounded-l-full last:rounded-r-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} title={`${s.label}: ${s.pct}%`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {stats.map((s) => (
          <div key={s.pillar} className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-studio-text-secondary">{s.label}</span>
            <span className="text-studio-text-tertiary font-mono">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────── AI Strategy Insight ─────────── */

function StrategyInsight({ posts, brandName, isGenerating }: { posts: Post[]; brandName: string; isGenerating: boolean }) {
  const insight = useMemo(() => {
    if (isGenerating) {
      return { icon: Zap, color: '#f59e0b', title: 'AI generira plan',
        text: `Gemini AI analizira profil "${brandName}" i kreira sadržajnu strategiju prilagođenu vašem brendu, publici i tonu komunikacije...` }
    }
    if (posts.length === 0) {
      return { icon: Sparkles, color: '#0ea5e9', title: 'Spreman za generiranje',
        text: `Kliknite "AI Generiraj plan" za kreiranje kompletnog mjesečnog plana za ${brandName}. AI koristi vaš brand profil, ton komunikacije i ciljnu publiku.` }
    }
    const pillarCounts: Record<string, number> = {}
    const platformCounts: Record<string, number> = {}
    const typeCounts: Record<string, number> = {}
    for (const p of posts) {
      pillarCounts[p.content_pillar] = (pillarCounts[p.content_pillar] || 0) + 1
      platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1
      typeCounts[p.type] = (typeCounts[p.type] || 0) + 1
    }
    const topPillar = Object.entries(pillarCounts).sort((a, b) => b[1] - a[1])[0]
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
    const platformCount = Object.keys(platformCounts).length
    return { icon: Sparkles, color: '#22c55e', title: 'Plan generiran',
      text: `${posts.length} objava za ${brandName} na ${platformCount} ${platformCount === 1 ? 'platformi' : platformCount < 5 ? 'platforme' : 'platforma'}. Najčešći stup: ${pillarLabels[topPillar?.[0] || ''] || topPillar?.[0] || '—'} (${topPillar?.[1] || 0}x). Format: ${topType?.[0] || '—'} (${topType?.[1] || 0}x).` }
  }, [posts, brandName, isGenerating])

  const InsightIcon = insight.icon
  return (
    <div className="rounded-xl border border-white/5 p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${insight.color}08, ${insight.color}03)` }}>
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: insight.color }} />
      <div className="relative flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${insight.color}20` }}>
          <InsightIcon size={18} style={{ color: insight.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: insight.color }}>AI Insight</span>
            <span className="text-studio-text-tertiary">&middot;</span>
            <span className="text-xs text-studio-text-tertiary">{insight.title}</span>
          </div>
          <p className="text-sm text-studio-text-secondary leading-relaxed">{insight.text}</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Page ─────────── */

type ViewMode = 'month' | 'week' | 'sixmonth'
type TabMode = 'calendar' | 'approvals'

export default function ContentCalendar() {
  const navigate = useNavigate()
  const { canModerate, currentClient } = useClient()
  const { hasProjects } = useProjectStatus()
  const { isReady: profileReady, percent: profilePercent, checks: profileChecks } = useProfileCompleteness()
  const brandName = currentClient?.client_name || 'Vaš brend'
  const [activeTab, setActiveTab] = useState<TabMode>('calendar')
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generatingVisual, setGeneratingVisual] = useState(false)
  const [generatedData, setGeneratedData] = useState<Record<number, Post[]> | null>(null)
  const [draggedPost, setDraggedPost] = useState<Post | null>(null)
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [generatingWeek, setGeneratingWeek] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [focusedDay, setFocusedDay] = useState<number | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const post = event.active.data.current?.post as Post | undefined
    if (post) setDraggedPost(post)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggedPost(null)
    const { active, over } = event
    if (!over) return
    const post = active.data.current?.post as Post | undefined
    const targetDay = over.data.current?.dayNum as number | undefined
    if (!post || !targetDay) return
    const data = generatedData || {}
    let sourceDay: number | null = null
    for (const [day, posts] of Object.entries(data)) {
      if (posts.some((p) => p.id === post.id)) { sourceDay = Number(day); break }
    }
    if (sourceDay === null || sourceDay === targetDay) return
    const updated = { ...data }
    updated[sourceDay] = (updated[sourceDay] ?? []).filter((p) => p.id !== post.id)
    if (updated[sourceDay]!.length === 0) delete updated[sourceDay]
    updated[targetDay] = [...(updated[targetDay] || []), post]
    setGeneratedData(updated)
    contentApi.reschedulePost?.(post.id, { day: targetDay, month: currentMonth + 1, year: currentYear }).catch(() => {})
  }, [generatedData, currentMonth, currentYear])

  useEffect(() => {
    if (selectedPost?.status === 'published' && !selectedPost.metrics && !selectedPost.id.startsWith('ai-')) {
      import('../api/analytics').then(({ analyticsApi }) => {
        analyticsApi.getPostMetrics(selectedPost.id).then(res => {
          const m = res.data
          if (m) setSelectedPost(prev => prev ? { ...prev, metrics: { views: m.impressions || 0, likes: m.likes || 0, comments: m.comments || 0, shares: m.shares || 0, saves: m.saves || 0, engagement_rate: m.engagement_rate || 0, reach: m.reach || 0, impressions: m.impressions || 0, prev_week_avg_views: 0, prev_week_avg_engagement: 0 } } : null)
        }).catch(() => {})
      })
    }
  }, [selectedPost?.id])

  useEffect(() => {
    if (selectedPost) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [selectedPost])

  const queue: QueueItem[] = []
  const rawCalendarData = generatedData || {}

  const calendarData = useMemo(() => {
    if (platformFilter === 'all' && statusFilter === 'all' && typeFilter === 'all') return rawCalendarData
    const filtered: Record<number, Post[]> = {}
    for (const [day, posts] of Object.entries(rawCalendarData)) {
      const dayPosts = posts.filter((p) => {
        if (platformFilter !== 'all' && p.platform !== platformFilter) return false
        if (statusFilter !== 'all' && p.status !== statusFilter) return false
        if (typeFilter !== 'all' && p.type !== typeFilter) return false
        return true
      })
      if (dayPosts.length > 0) filtered[Number(day)] = dayPosts
    }
    return filtered
  }, [rawCalendarData, platformFilter, statusFilter, typeFilter])

  const allPosts = useMemo(() => Object.values(rawCalendarData).flat(), [rawCalendarData])

  const monthNames = ['Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj', 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac']
  const dayNames = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota']

  const firstDay = new Date(currentYear, currentMonth, 1)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  let firstDayOffset = firstDay.getDay() - 1
  if (firstDayOffset < 0) firstDayOffset = 6
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7
  const today = new Date()
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear
  const todayDay = isCurrentMonth ? today.getDate() : -1

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) } else setCurrentMonth(m => m - 1); setSelectedDay(null); setGeneratedData(null) }
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) } else setCurrentMonth(m => m + 1); setSelectedDay(null); setGeneratedData(null) }

  const _groupPosts = (posts: Record<string, unknown>[]): Record<number, Post[]> => {
    const grouped: Record<number, Post[]> = {}
    for (const p of posts) {
      const day = (p.day as number) || 1
      if (!grouped[day]) grouped[day] = []
      grouped[day].push({ id: `ai-${day}-${grouped[day].length}`, platform: String(p.platform || 'instagram'), type: String(p.type || 'post'), title: String(p.title || ''), description: String(p.description || ''), caption_hr: String(p.caption_hr || ''), scheduled_time: String(p.scheduled_time || '12:00'), content_pillar: String(p.content_pillar || 'lifestyle'), hashtags: (p.hashtags as string[]) || [], visual_brief: String(p.visual_brief || ''), visual_url: p.visual_url ? String(p.visual_url) : undefined, status: 'draft' as const })
    }
    return grouped
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const startRes = await contentApi.generateAIPlan({ month: currentMonth + 1, year: currentYear })
      const taskId = startRes.data?.task_id
      if (!taskId) { const posts = startRes.data?.posts; if (Array.isArray(posts) && posts.length > 0) setGeneratedData(_groupPosts(posts)); setGenerating(false); return }
      for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 3000)); try { const pollRes = await contentApi.getAIPlanResult(taskId); const status = pollRes.data?.status; if (status === 'done') { const posts = pollRes.data?.posts; if (Array.isArray(posts) && posts.length > 0) setGeneratedData(_groupPosts(posts)); return } else if (status === 'error') return } catch { /* keep polling */ } }
    } catch { /* keep existing */ } finally { setGenerating(false) }
  }

  const handleGenerateWeek = async () => {
    setGeneratingWeek(true)
    try {
      const weekStart = todayDay > 0 ? todayDay : 1
      const weekEnd = Math.min(weekStart + 6, daysInMonth)
      const startRes = await contentApi.generateAIPlan({ month: currentMonth + 1, year: currentYear })
      const taskId = startRes.data?.task_id
      if (!taskId) { const posts = startRes.data?.posts; if (Array.isArray(posts) && posts.length > 0) { const wk = posts.filter((p: Record<string, unknown>) => { const d = (p.day as number) || 1; return d >= weekStart && d <= weekEnd }); if (wk.length > 0) { const grouped = _groupPosts(wk); const merged = { ...(generatedData || {}) }; for (const [day, dayPosts] of Object.entries(grouped)) merged[Number(day)] = dayPosts; setGeneratedData(merged) } }; setGeneratingWeek(false); return }
      for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 3000)); try { const pollRes = await contentApi.getAIPlanResult(taskId); const status = pollRes.data?.status; if (status === 'done') { const posts = pollRes.data?.posts; if (Array.isArray(posts) && posts.length > 0) { const wk = posts.filter((p: Record<string, unknown>) => { const d = (p.day as number) || 1; return d >= weekStart && d <= weekEnd }); if (wk.length > 0) { const grouped = _groupPosts(wk); const merged = { ...(generatedData || {}) }; for (const [day, dayPosts] of Object.entries(grouped)) merged[Number(day)] = dayPosts; setGeneratedData(merged) } }; return } else if (status === 'error') return } catch { /* keep polling */ } }
    } catch { /* keep existing */ } finally { setGeneratingWeek(false) }
  }

  const handleApprove = async (id: string) => { try { await contentApi.approvePost(id) } catch { /* fallback */ } }
  const handleReject = async (id: string) => { try { await contentApi.rejectPost(id, 'Odbijeno') } catch { /* fallback */ } }

  const handlePublishFromModal = async () => {
    if (!selectedPost) return
    setPublishing(true)
    try {
      const res = await contentApi.publishPost(selectedPost.id)
      const data = res.data
      if (data.success) setSelectedPost({ ...selectedPost, status: 'published', platform_post_url: data.platform_post_url, publish_error: undefined })
      else setSelectedPost({ ...selectedPost, publish_error: data.error || 'Objavljivanje nije uspjelo' })
    } catch { setSelectedPost({ ...selectedPost, publish_error: 'Mrežna greška pri objavljivanju' }) } finally { setPublishing(false) }
  }

  useEffect(() => {
    if (activeTab !== 'calendar' || viewMode !== 'month' || selectedPost) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); setFocusedDay(prev => { const n = (prev || 0) + 1; return n > daysInMonth ? 1 : n }); break
        case 'ArrowLeft': e.preventDefault(); setFocusedDay(prev => { const n = (prev || 2) - 1; return n < 1 ? daysInMonth : n }); break
        case 'ArrowDown': e.preventDefault(); setFocusedDay(prev => { const n = (prev || 0) + 7; return n > daysInMonth ? ((n - 1) % daysInMonth) + 1 : n }); break
        case 'ArrowUp': e.preventDefault(); setFocusedDay(prev => { const n = (prev || 8) - 7; return n < 1 ? daysInMonth + n : n }); break
        case 'Enter': e.preventDefault(); if (focusedDay) { setSelectedDay(focusedDay); const posts = calendarData[focusedDay]; if (posts && posts.length === 1 && posts[0]) setSelectedPost(posts[0]) }; break
        case 'Escape': e.preventDefault(); if (selectedDay) setSelectedDay(null); else setFocusedDay(null); break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, viewMode, selectedPost, focusedDay, daysInMonth, calendarData, selectedDay])

  const selectedDayPosts = selectedDay ? (calendarData[selectedDay] || []) : []
  const totalPosts = Object.values(calendarData).reduce((sum, posts) => sum + posts.length, 0)
  const daysWithContent = Object.keys(calendarData).length
  const hasAnyPosts = Object.values(calendarData).some(posts => posts && posts.length > 0)

  /* ── Guards ── */
  if (!hasProjects) {
    return (<div><Header title="KALENDAR SADRŽAJA" subtitle={`${monthNames[currentMonth]} ${currentYear} — Od strategije do objave`} /><div className="page-wrapper"><EmptyState icon={FolderKanban} variant="hero" title="Kreirajte prvi projekt" description="Projekti organiziraju kampanje, sadržaj i izvještaje." action={<button onClick={() => navigate('/onboarding')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover transition-all shadow-md shadow-brand-accent/20"><FolderKanban size={16} />Kreiraj projekt</button>} /></div></div>)
  }

  if (!hasAnyPosts && !generating) {
    return (
      <div>
        <Header title="KALENDAR SADRŽAJA" subtitle={`${monthNames[currentMonth]} ${currentYear} — Od strategije do objave`} />
        <div className="page-wrapper space-y-6">
          <StrategyInsight posts={[]} brandName={brandName} isGenerating={false} />
          {!profileReady && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-studio-text-primary mb-1">
                  Profil brenda nije potpun ({profilePercent}%)
                </h3>
                <p className="text-xs text-studio-text-secondary mb-3">
                  AI treba više konteksta za generiranje kvalitetnog sadržaja. Popunite profil:
                </p>
                <div className="flex flex-wrap gap-2">
                  {profileChecks.filter(c => !c.done).map(c => (
                    <span key={c.id} className="text-xs px-2 py-1 bg-studio-surface-1 rounded-lg text-studio-text-tertiary flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                      {c.label}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/brand-profile')}
                  className="mt-3 text-xs font-medium text-brand-accent hover:underline"
                >
                  Dovršite profil →
                </button>
              </div>
            </div>
          )}
          <div className="card border-2 border-dashed border-brand-accent/20 bg-gradient-to-br from-brand-accent/5 to-transparent">
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-brand-accent/10 flex items-center justify-center">
                <Sparkles size={36} className="text-brand-accent" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-headline tracking-wider text-studio-text-primary">Generiraj AI strategiju za {monthNames[currentMonth]}</h2>
                <p className="text-sm text-studio-text-secondary max-w-md">AI će analizirati vaš brand profil, ton komunikacije i ciljnu publiku, pa kreirati kompletni mjesečni plan s objavama za sve kanale.</p>
              </div>
              <button onClick={handleGenerate} disabled={generating || !profileReady} title={!profileReady ? `Profil je ${profilePercent}% popunjen — dovršite profil za AI generiranje` : undefined} className="flex items-center gap-2 px-6 py-3 bg-brand-accent text-brand-dark rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-brand-accent/20 disabled:opacity-50">
                {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {generating ? 'Generiranje...' : 'AI Generiraj plan'}
              </button>
              <div className="flex items-center gap-4 text-xs text-studio-text-tertiary">
                <span className="flex items-center gap-1"><Clock size={12} />~30 sekundi</span>
                <span className="flex items-center gap-1"><Target size={12} />2 objave/dan</span>
                <span className="flex items-center gap-1"><Calendar size={12} />{daysInMonth} dana</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-brand-accent/5 border border-brand-accent/10">
            <Lightbulb size={16} className="text-brand-accent flex-shrink-0 mt-0.5" />
            <p className="text-xs text-studio-text-secondary"><span className="font-semibold text-brand-accent">Savjet:</span> Što detaljniji brand profil, to bolji AI sadržaj. Dodajte opis poslovanja, ciljnu publiku i hashtagove u <button onClick={() => navigate('/brand-profile')} className="text-brand-accent underline hover:no-underline">Profil klijenta</button>.</p>
          </div>
        </div>
      </div>
    )
  }

  /* ── Main Calendar View ── */
  return (
    <div>
      <Header title="KALENDAR SADRŽAJA" subtitle={`${monthNames[currentMonth]} ${currentYear} — Od strategije do objave`} />
      <div className="page-wrapper space-y-5">
        <StrategyInsight posts={allPosts} brandName={brandName} isGenerating={generating || generatingWeek} />
        {allPosts.length > 0 && <PillarStats posts={allPosts} />}

        {/* Profile incomplete warning banner */}
        {!profileReady && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-studio-text-primary mb-1">
                Profil brenda nije potpun ({profilePercent}%)
              </h3>
              <p className="text-xs text-studio-text-secondary mb-3">
                AI treba više konteksta za generiranje kvalitetnog sadržaja. Popunite profil:
              </p>
              <div className="flex flex-wrap gap-2">
                {profileChecks.filter(c => !c.done).map(c => (
                  <span key={c.id} className="text-xs px-2 py-1 bg-studio-surface-1 rounded-lg text-studio-text-tertiary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    {c.label}
                  </span>
                ))}
              </div>
              <button
                onClick={() => navigate('/brand-profile')}
                className="mt-3 text-xs font-medium text-brand-accent hover:underline"
              >
                Dovršite profil →
              </button>
            </div>
          </div>
        )}

        {/* Tabs + Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 border-b border-studio-border pb-1">
            <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-studio-text-tertiary hover:text-studio-text-primary'}`}><Calendar size={16} className="inline mr-2" />Kalendar</button>
            <button onClick={() => setActiveTab('approvals')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'approvals' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-studio-text-tertiary hover:text-studio-text-primary'}`}><Clock size={16} className="inline mr-2" />Red za odobrenje<span className="ml-2 text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full">{queue.length}</span></button>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'calendar' && (<>
              <div className="hidden sm:flex items-center gap-2 text-xs text-studio-text-tertiary"><BarChart3 size={14} /><span>{totalPosts} objava</span><span>&middot;</span><span>{daysWithContent}/{daysInMonth} dana</span></div>
              <div className="flex items-center gap-1 bg-studio-surface-2 rounded-lg p-1">
                {([['month', LayoutGrid, 'Mjesec'], ['week', List, 'Tjedan'], ['sixmonth', CalendarDays, '6 mjeseci']] as const).map(([mode, Icon, label]) => (
                  <button key={mode} onClick={() => setViewMode(mode)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === mode ? 'bg-studio-surface-1 shadow-sm text-studio-text-primary' : 'text-studio-text-tertiary hover:text-studio-text-primary'}`}><Icon size={14} /><span className="hidden sm:inline">{label}</span></button>
                ))}
              </div>
            </>)}
            <button onClick={handleGenerateWeek} disabled={generatingWeek || generating || !profileReady} title={!profileReady ? 'Dovršite profil brenda' : undefined} className="flex items-center gap-2 text-xs px-3 py-2 bg-studio-surface-2 border border-studio-border text-studio-text-secondary rounded-lg hover:bg-studio-surface-3 font-medium transition-colors disabled:opacity-50">
              {generatingWeek ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}<span className="hidden sm:inline">{generatingWeek ? 'Generiranje...' : 'Generiraj tjedan'}</span>
            </button>
            <button onClick={handleGenerate} disabled={generating || !profileReady} title={!profileReady ? 'Dovršite profil brenda' : undefined} className="flex items-center gap-2 text-xs px-3 py-2 bg-brand-accent text-brand-dark rounded-lg hover:brightness-110 font-bold transition-all disabled:opacity-50">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}<span className="hidden sm:inline">{generating ? 'Generiranje...' : 'AI Generiraj plan'}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {activeTab === 'calendar' && (
          <div className="card !py-3 !px-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-studio-text-tertiary mr-1"><Filter size={14} /><span className="font-semibold uppercase tracking-wider text-[10px]">Filteri:</span></div>
              {PLATFORM_FILTER_OPTIONS.map(({ value, label, icon: Icon }) => (<button key={value} onClick={() => setPlatformFilter(value)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${platformFilter === value ? 'bg-brand-accent/20 text-brand-accent' : 'bg-studio-surface-2 text-studio-text-secondary hover:bg-studio-surface-3'}`}>{Icon && <Icon size={11} />}{label}</button>))}
              <div className="w-px h-4 bg-studio-border mx-1" />
              {STATUS_FILTER_OPTIONS.map(({ value, label }) => (<button key={value} onClick={() => setStatusFilter(value)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${statusFilter === value ? 'bg-brand-accent/20 text-brand-accent' : 'bg-studio-surface-2 text-studio-text-secondary hover:bg-studio-surface-3'}`}>{label}</button>))}
              <div className="w-px h-4 bg-studio-border mx-1" />
              {TYPE_FILTER_OPTIONS.map(({ value, label }) => (<button key={value} onClick={() => setTypeFilter(value)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${typeFilter === value ? 'bg-brand-accent/20 text-brand-accent' : 'bg-studio-surface-2 text-studio-text-secondary hover:bg-studio-surface-3'}`}>{label}</button>))}
              {(platformFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all') && (<button onClick={() => { setPlatformFilter('all'); setStatusFilter('all'); setTypeFilter('all') }} className="ml-auto text-xs text-red-400 hover:text-red-500 font-medium flex items-center gap-1"><X size={12} />Očisti</button>)}
            </div>
          </div>
        )}

        {/* Generating overlay */}
        {(generating || generatingWeek) && (
          <div className="card flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center mx-auto"><Loader2 size={32} className="animate-spin text-brand-accent" /></div>
              <p className="text-lg font-headline tracking-wider text-studio-text-primary">{generatingWeek ? 'Generiranje tjednog plana...' : 'Gemini AI generira plan...'}</p>
              <p className="text-sm text-studio-text-secondary max-w-md">{generatingWeek ? 'Kreira sadržaj prilagođen vašem brendu za ovaj tjedan' : `Analizira "${brandName}" profil i kreira kvalitetne ideje za ${monthNames[currentMonth]}`}</p>
              <div className="flex items-center justify-center gap-1 pt-2">{[0, 1, 2].map(i => (<div key={i} className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" style={{ animationDelay: `${i * 300}ms` }} />))}</div>
            </div>
          </div>
        )}

        {/* MONTH VIEW */}
        {activeTab === 'calendar' && viewMode === 'month' && !generating && !generatingWeek && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-6">
            <div className="hidden xl:block" style={{ width: '220px', minWidth: '220px' }}>
              <div className="card !p-3 sticky top-4">
                <div className="flex items-center justify-between mb-2">
                  <button onClick={prevMonth} className="p-1 text-studio-text-tertiary hover:text-studio-text-primary rounded transition-colors"><ChevronLeft size={14} /></button>
                  <span className="text-xs font-bold text-studio-text-primary">{monthNames[currentMonth]} {currentYear}</span>
                  <button onClick={nextMonth} className="p-1 text-studio-text-tertiary hover:text-studio-text-primary rounded transition-colors"><ChevronRight size={14} /></button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 mb-1">{DAYS_OF_WEEK.map((d) => (<div key={d} className="text-center text-[9px] text-studio-text-tertiary font-medium py-0.5">{d.charAt(0)}</div>))}</div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: totalCells }, (_, i) => {
                    const dn = i - firstDayOffset + 1; const valid = dn >= 1 && dn <= daysInMonth; const hasPosts = valid && (calendarData[dn]?.length || 0) > 0; const isTd = dn === todayDay; const isSel = dn === selectedDay; const isFoc = dn === focusedDay
                    return (<button key={i} disabled={!valid} onClick={() => valid && setSelectedDay(isSel ? null : dn)} className={`w-full aspect-square flex items-center justify-center text-[10px] rounded transition-colors relative ${!valid ? 'text-transparent cursor-default' : isSel ? 'bg-brand-accent text-white font-bold' : isFoc ? 'bg-brand-accent/10 text-brand-accent font-bold ring-1 ring-brand-accent/40' : isTd ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-studio-text-secondary hover:bg-studio-surface-2'}`}>{valid ? dn : ''}{hasPosts && !isSel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-accent" />}</button>)
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-studio-border-subtle">
                  <p className="text-[10px] text-studio-text-tertiary font-medium mb-1.5 uppercase tracking-wider">Brzi pristup</p>
                  <div className="grid grid-cols-3 gap-1">{Array.from({ length: 12 }, (_, i) => (<button key={i} onClick={() => { setCurrentMonth(i); setSelectedDay(null); setGeneratedData(null) }} className={`text-[10px] py-1 rounded transition-colors ${currentMonth === i ? 'bg-brand-accent text-white font-bold' : 'text-studio-text-secondary hover:bg-studio-surface-2'}`}>{monthNames[i]!.slice(0, 3)}</button>))}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-studio-border-subtle">
                  <p className="text-[10px] text-studio-text-tertiary font-medium mb-1 uppercase tracking-wider">Prečice</p>
                  <div className="space-y-0.5 text-[10px] text-studio-text-tertiary">
                    <p><kbd className="px-1 py-0.5 bg-studio-surface-2 rounded text-studio-text-secondary font-mono">&#8592;&#8593;&#8594;&#8595;</kbd> Navigacija</p>
                    <p><kbd className="px-1 py-0.5 bg-studio-surface-2 rounded text-studio-text-secondary font-mono">Enter</kbd> Otvori dan</p>
                    <p><kbd className="px-1 py-0.5 bg-studio-surface-2 rounded text-studio-text-secondary font-mono">Esc</kbd> Zatvori</p>
                  </div>
                </div>
              </div>
            </div>

            <div ref={calendarRef} className="card min-w-0 flex-1">
              <div className="flex items-center justify-between mb-4 px-1">
                <button onClick={prevMonth} className="p-2 text-studio-text-tertiary hover:text-studio-text-primary hover:bg-studio-surface-2 rounded-lg transition-colors"><ChevronLeft size={18} /></button>
                <h2 className="text-lg font-headline tracking-wider text-studio-text-primary">{monthNames[currentMonth]!.toUpperCase()} {currentYear}</h2>
                <button onClick={nextMonth} className="p-2 text-studio-text-tertiary hover:text-studio-text-primary hover:bg-studio-surface-2 rounded-lg transition-colors"><ChevronRight size={18} /></button>
              </div>
              <div className="grid grid-cols-7 border-b border-studio-border">{DAYS_OF_WEEK.map((day) => (<div key={day} className="text-center text-[11px] text-studio-text-tertiary font-semibold uppercase tracking-wider py-2.5">{day}</div>))}</div>
              <div className="grid grid-cols-7 border-l border-studio-border">
                {Array.from({ length: totalCells }, (_, i) => {
                  const dayNum = i - firstDayOffset + 1; const isValid = dayNum >= 1 && dayNum <= daysInMonth; const isToday = dayNum === todayDay; const isSelected = dayNum === selectedDay; const isFocused = dayNum === focusedDay; const isPast = isValid && isCurrentMonth && dayNum < todayDay; const posts = isValid ? (calendarData[dayNum] || []) : []
                  const cell = (<div key={i} onClick={() => { if (isValid) { setSelectedDay(isSelected ? null : dayNum); setFocusedDay(dayNum) } }} className={`h-[130px] p-2.5 border-r border-b border-studio-border overflow-hidden transition-colors ${!isValid ? 'bg-studio-surface-0/30 pointer-events-none' : isSelected ? 'bg-brand-accent/5 ring-2 ring-inset ring-brand-accent cursor-pointer' : isFocused ? 'bg-brand-accent/5 ring-1 ring-inset ring-brand-accent/30 cursor-pointer' : isToday ? 'bg-blue-500/5 cursor-pointer' : isPast ? 'bg-studio-surface-0/50 cursor-pointer' : 'bg-studio-surface-1 hover:bg-studio-surface-2 cursor-pointer'}`}>
                    {isValid && (<div className="flex flex-col h-full"><div className="flex items-center justify-between mb-2"><span className={`text-xs leading-none ${isToday ? 'bg-brand-accent text-white w-6 h-6 rounded-full flex items-center justify-center font-bold' : isSelected ? 'text-brand-accent font-bold' : isPast ? 'text-studio-text-disabled' : 'text-studio-text-secondary font-medium'}`}>{dayNum}</span>{posts.length > 0 && (<span className={`text-[10px] font-semibold tabular-nums ${posts.length >= 3 ? 'text-brand-accent' : 'text-studio-text-tertiary'}`}>{posts.length}</span>)}</div>{posts.length > 0 && (<div className="flex flex-col gap-1 flex-1 min-h-0">{posts.slice(0, 4).map((post) => (<DraggablePostDot key={post.id} post={post} isPast={!!isPast} />))}{posts.length > 4 && (<span className="text-[9px] text-studio-text-tertiary font-medium">+{posts.length - 4}</span>)}</div>)}</div>)}
                  </div>)
                  return isValid ? (<DroppableDay key={i} dayNum={dayNum}>{cell}</DroppableDay>) : cell
                })}
              </div>
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-studio-border-subtle flex-wrap">
                <span className="text-[10px] text-studio-text-tertiary font-semibold uppercase tracking-wider">Platforme:</span>
                {Object.entries(platformColors).slice(0, 4).map(([platform, color]) => (<div key={platform} className="flex items-center gap-1.5"><div className={`w-1.5 h-3 rounded-full ${color}`} /><span className="text-[11px] text-studio-text-secondary capitalize">{platform}</span></div>))}
                <div className="w-px h-4 bg-studio-border" />
                <span className="text-[10px] text-studio-text-tertiary font-semibold uppercase tracking-wider">Status:</span>
                {[['published', 'Objavljeno', 'bg-green-500'], ['scheduled', 'Zakazano', 'bg-blue-500'], ['draft', 'Nacrt', 'bg-amber-500']].map(([status, label, color]) => (<div key={status} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${color}`} /><span className="text-[11px] text-studio-text-secondary">{label}</span></div>))}
              </div>
            </div>

            {selectedDay && (
              <div className="hidden lg:block card animate-slide-in max-h-[calc(100vh-200px)] overflow-y-auto" style={{ width: '384px', minWidth: '384px', maxWidth: '384px' }}>
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-studio-surface-1 pb-2 border-b border-studio-border z-10"><div><h3 className="text-lg font-headline tracking-wider text-studio-text-primary">{selectedDay}. {monthNames[currentMonth]}</h3><p className="text-xs text-studio-text-secondary">{dayNames[new Date(currentYear, currentMonth, selectedDay).getDay()]}</p></div><button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-studio-surface-2 rounded"><X size={16} className="text-studio-text-secondary" /></button></div>
                {selectedDayPosts.length === 0 ? (<p className="text-sm text-studio-text-secondary py-8 text-center">Nema objava za ovaj dan</p>) : (
                  <div className="space-y-3">{selectedDayPosts.map((post) => {
                    const isPastPost = post.status === 'published' || post.status === 'missed'
                    return (<div key={post.id} onClick={() => setSelectedPost(post)} className="p-3 bg-studio-surface-0 rounded-lg hover:bg-studio-surface-2 transition-colors cursor-pointer border border-transparent hover:border-brand-accent/20">
                      <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><PlatformIcon platform={post.platform} size="sm" /><span className={`text-xs font-medium capitalize ${typeColors[post.type] || 'text-studio-text-secondary'}`}>{post.type}</span></div><div className="flex items-center gap-2"><span className="text-xs text-studio-text-secondary">{post.scheduled_time}</span>{post.status === 'published' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">Objavljeno</span>}{post.status === 'scheduled' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">Zakazano</span>}{post.status === 'draft' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-yellow-400 font-medium">Nacrt</span>}{post.status === 'approved' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Odobreno</span>}{post.status === 'missed' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">Propušteno</span>}</div></div>
                      <p className="text-sm text-studio-text-primary font-medium">{post.title}</p>
                      <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${pillarColors[post.content_pillar] || 'bg-studio-surface-0 text-studio-text-secondary'}`}>{pillarLabels[post.content_pillar] || post.content_pillar}</span>
                      {isPastPost && post.metrics && (<div className="flex items-center gap-3 mt-2 pt-2 border-t border-studio-border"><span className="text-xs text-studio-text-secondary flex items-center gap-1"><Eye size={11} /> {formatNumber(post.metrics.views)}</span><span className="text-xs text-studio-text-secondary flex items-center gap-1"><Heart size={11} /> {formatNumber(post.metrics.likes)}</span><span className="text-xs text-studio-text-secondary flex items-center gap-1"><MessageCircle size={11} /> {formatNumber(post.metrics.comments)}</span><span className={`text-xs font-bold ${post.metrics.engagement_rate > 5 ? 'text-green-400' : 'text-studio-text-secondary'}`}>{post.metrics.engagement_rate}%</span></div>)}
                      {!isPastPost && post.description && (<p className="text-xs text-studio-text-secondary mt-1 line-clamp-2">{post.description}</p>)}
                      {!isPastPost && post.hashtags && post.hashtags.length > 0 && (<div className="flex gap-1 mt-1 flex-wrap">{post.hashtags.slice(0, 3).map((tag) => (<span key={tag} className="text-[10px] text-blue-400">{tag}</span>))}{post.hashtags.length > 3 && <span className="text-[10px] text-studio-text-secondary">+{post.hashtags.length - 3}</span>}</div>)}
                    </div>)
                  })}</div>
                )}
              </div>
            )}
          </div>
          <DragOverlay>{draggedPost && (<div className="flex items-center gap-2 px-3 py-1.5 bg-studio-surface-1 rounded-lg border-2 border-brand-accent shadow-lg text-xs"><div className={`w-3 h-3 rounded-full ${platformColors[draggedPost.platform] || 'bg-gray-400'}`} /><span className="font-medium text-studio-text-primary truncate max-w-[150px]">{draggedPost.title}</span></div>)}</DragOverlay>
          </DndContext>
        )}

        {/* 6-MONTH STRATEGY */}
        {activeTab === 'calendar' && viewMode === 'sixmonth' && !generating && !generatingWeek && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-6"><div><h2 className="section-title">6-Mjesečna strategija</h2><p className="text-xs text-studio-text-secondary mt-1">Planiranje sadržaja za {monthNames[currentMonth]} {currentYear} — {monthNames[(currentMonth + 5) % 12]} {currentYear + Math.floor((currentMonth + 5) / 12)}</p></div>
                <button onClick={async () => { try { setGenerating(true); const res = await contentApi.generateStrategy({ start_month: currentMonth + 1, start_year: currentYear }); const taskId = res.data.task_id; const poll = setInterval(async () => { try { const taskRes = await contentApi.getStrategyTask(taskId); if (taskRes.data.status === 'done' || taskRes.data.status === 'error') { clearInterval(poll); setGenerating(false); if (taskRes.data.status === 'done') window.location.reload() } } catch { clearInterval(poll); setGenerating(false) } }, 5000) } catch { setGenerating(false) } }} disabled={generating || !profileReady} title={!profileReady ? `Profil je ${profilePercent}% popunjen — dovršite profil za AI generiranje` : undefined} className="flex items-center gap-2 text-sm px-4 py-2 bg-brand-accent text-brand-dark rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50">
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{generating ? 'Generiranje strategije...' : 'Generiraj 6-mjesečnu strategiju'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }, (_, i) => {
                  const m = (currentMonth + i) % 12; const y = currentYear + Math.floor((currentMonth + i) / 12)
                  const monthThemes: Record<number, string> = { 0: 'Novi počeci', 1: 'Proljetni start', 2: 'Q1 kampanje', 3: 'Proljetna promocija', 4: 'Ljetna najava', 5: 'Mid-year review', 6: 'Ljetna kampanja', 7: 'Back to business', 8: 'Jesenska strategija', 9: 'Q4 priprema', 10: 'Black Friday', 11: 'Božićni sadržaj' }
                  const isCurrentMonthCard = i === 0
                  return (<div key={i} className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${isCurrentMonthCard ? 'border-brand-accent bg-brand-accent/5 shadow-sm' : 'border-studio-border bg-studio-surface-0 hover:border-brand-accent/30 hover:bg-studio-surface-1'}`} onClick={() => { setCurrentMonth(m); setCurrentYear(y); setViewMode('month') }}>
                    <div className="flex items-center justify-between mb-2"><p className="text-sm font-bold text-studio-text-primary">{monthNames[m]}</p>{isCurrentMonthCard && (<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-accent text-white font-medium">Trenutni</span>)}</div>
                    <p className="text-xs text-studio-text-secondary mb-3">{y}</p><p className="text-[10px] text-studio-text-tertiary mb-3 italic">{monthThemes[m] || ''}</p>
                    <div className="space-y-2"><div className="flex justify-between text-xs"><span className="text-studio-text-secondary">Objave</span><span className="text-studio-text-primary font-mono font-bold">{isCurrentMonthCard ? totalPosts : '—'}</span></div>{isCurrentMonthCard && totalPosts > 0 && (<><div className="flex justify-between text-xs"><span className="text-studio-text-secondary">Dani</span><span className="text-studio-text-primary font-mono">{daysWithContent}/{daysInMonth}</span></div><div className="w-full bg-studio-surface-3 rounded-full h-1.5 mt-1"><div className="bg-brand-accent h-1.5 rounded-full transition-all" style={{ width: `${Math.min((daysWithContent / daysInMonth) * 100, 100)}%` }} /></div></>)}</div>
                  </div>)
                })}
              </div>
            </div>
            <div className="card">
              <h3 className="text-sm font-bold text-studio-text-primary mb-3">Distribucija po platformi (trenutni mjesec)</h3>
              <div className="grid grid-cols-4 gap-3">
                {(['instagram', 'facebook', 'tiktok', 'youtube'] as const).map(platform => {
                  const count = Object.values(calendarData).flat().filter(p => p.platform === platform).length; const pct = totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0
                  return (<div key={platform} className="bg-studio-surface-0 rounded-lg p-3 text-center"><p className="text-lg font-bold text-studio-text-primary">{count}</p><p className="text-xs text-studio-text-secondary capitalize">{platform}</p><div className="w-full bg-studio-surface-3 rounded-full h-1 mt-2"><div className={`h-1 rounded-full ${platformColors[platform] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} /></div><p className="text-[10px] text-studio-text-tertiary mt-1">{pct}%</p></div>)
                })}
              </div>
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {activeTab === 'calendar' && viewMode === 'week' && !generating && !generatingWeek && (
          <div className="card"><h2 className="section-title mb-4">Tjedni pregled</h2><div className="space-y-3">
            {DAYS_OF_WEEK.map((day, idx) => {
              const dayNum = todayDay > 0 ? todayDay - today.getDay() + 1 + idx : idx + 1; const posts = calendarData[dayNum] || []; const isPast = isCurrentMonth && dayNum < todayDay
              return (<div key={day} className="flex items-center gap-4 p-3 bg-studio-surface-0 rounded-lg"><div className="w-16 text-center"><p className="text-xs text-studio-text-secondary">{day}</p><p className={`text-lg font-bold ${dayNum === todayDay ? 'text-brand-accent' : 'text-studio-text-primary'}`}>{dayNum > 0 && dayNum <= daysInMonth ? dayNum : '—'}</p></div>
                <div className="flex-1 flex gap-2 flex-wrap">{posts.map((post) => (<div key={post.id} onClick={() => setSelectedPost(post)} className="flex items-center gap-2 px-3 py-1.5 bg-studio-surface-1 rounded-lg border border-studio-border hover:border-brand-accent/20 cursor-pointer transition-colors"><div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotColors[post.status] || 'bg-gray-400'}`} /><PlatformIcon platform={post.platform} size="sm" /><span className="text-xs text-studio-text-primary font-medium">{post.title || post.type}</span><span className={`text-[10px] capitalize ${typeColors[post.type] || 'text-studio-text-tertiary'}`}>{post.type}</span>{isPast && post.metrics && <span className="text-[10px] text-green-400 font-bold">{post.metrics.engagement_rate}%</span>}</div>))}{posts.length === 0 && <span className="text-xs text-studio-text-tertiary italic">Nema objava</span>}</div>
              </div>)
            })}
          </div></div>
        )}

        {/* APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="card"><h2 className="section-title mb-4">Čeka odobrenje</h2>
            {queue.length === 0 ? (<div className="py-12 text-center"><Check size={32} className="text-green-400 mx-auto mb-3" /><p className="text-sm text-studio-text-secondary">Nema objava za odobrenje</p></div>) : (
              <div className="space-y-3">{queue.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-studio-surface-0 rounded-lg hover:bg-studio-surface-2 transition-colors"><div className="flex-1 min-w-0"><div className="flex items-center gap-3 flex-wrap"><h3 className="text-sm font-medium text-studio-text-primary">{item.title}</h3><span className="text-xs px-2 py-0.5 rounded-full bg-studio-surface-1 text-studio-text-secondary">{item.pillar}</span></div><div className="flex items-center gap-2 mt-1 text-xs text-studio-text-secondary"><span>{item.platform}</span><span>|</span><span>{item.author}</span><span>|</span><span>{item.submitted}</span></div></div>
                  {canModerate && (<div className="flex items-center gap-2"><button onClick={() => handleApprove(item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"><Check size={14} />Odobri</button><button onClick={() => handleReject(item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg border border-red-500/20 transition-colors"><X size={14} />Odbij</button></div>)}
                </div>
              ))}</div>
            )}
          </div>
        )}
      </div>

      {/* POST DETAIL MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
          <div className="bg-studio-surface-1 rounded-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in border border-studio-border" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className={`h-1 ${platformColors[selectedPost.platform] || 'bg-gray-400'}`} />
            <div className="px-6 py-4 flex items-start justify-between border-b border-studio-border">
              <div className="flex items-start gap-4 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedPost.status === 'published' ? 'bg-green-500/10' : selectedPost.status === 'approved' ? 'bg-emerald-500/10' : selectedPost.status === 'scheduled' ? 'bg-blue-500/10' : selectedPost.status === 'draft' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}><PlatformIcon platform={selectedPost.platform} size="md" /></div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-studio-text-primary leading-tight">{selectedPost.title}</h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-[11px] font-medium capitalize bg-studio-surface-0 px-2 py-0.5 rounded ${typeColors[selectedPost.type] || 'text-studio-text-secondary'}`}>{selectedPost.type}</span>
                    <span className="text-[11px] text-studio-text-secondary">{selectedPost.scheduled_time}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pillarColors[selectedPost.content_pillar] || 'bg-studio-surface-0 text-studio-text-secondary'}`}>{pillarLabels[selectedPost.content_pillar] || selectedPost.content_pillar}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${selectedPost.status === 'published' ? 'bg-green-500/10 text-green-400' : selectedPost.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : selectedPost.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400' : selectedPost.status === 'draft' ? 'bg-amber-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>{selectedPost.status === 'published' ? 'Objavljeno' : selectedPost.status === 'approved' ? 'Odobreno' : selectedPost.status === 'scheduled' ? 'Zakazano' : selectedPost.status === 'draft' ? 'Nacrt' : selectedPost.status === 'failed' ? 'Neuspjelo' : 'Propušteno'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedPost(null)} className="p-1.5 hover:bg-studio-surface-2 rounded-lg transition-colors flex-shrink-0 ml-2"><X size={18} className="text-studio-text-secondary" /></button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              <div className="px-6 py-5 space-y-5">
                {selectedPost.metrics && (<div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">{[{ label: 'Pregledi', value: selectedPost.metrics.views, icon: Eye }, { label: 'Doseg', value: selectedPost.metrics.reach, icon: Target }, { label: 'Lajkovi', value: selectedPost.metrics.likes, icon: Heart }, { label: 'Angažman', value: selectedPost.metrics.engagement_rate, icon: TrendingUp, suffix: '%' }].map(({ label, value, icon: Icon, suffix }) => (<div key={label} className="bg-studio-surface-0 rounded-xl p-3 text-center"><Icon size={14} className="text-studio-text-secondary mx-auto mb-1" /><p className="text-base font-bold text-studio-text-primary font-stats">{suffix ? value + suffix : formatNumber(value)}</p><p className="text-[10px] text-studio-text-secondary mt-0.5">{label}</p></div>))}</div>
                  <div className="grid grid-cols-4 gap-2">{[{ label: 'Komentari', value: selectedPost.metrics.comments, icon: MessageCircle }, { label: 'Dijeljenja', value: selectedPost.metrics.shares, icon: Share2 }, { label: 'Spremljeno', value: selectedPost.metrics.saves, icon: Bookmark }, { label: 'Prikazivanja', value: selectedPost.metrics.impressions, icon: Zap }].map(({ label, value, icon: Icon }) => (<div key={label} className="bg-studio-surface-0 rounded-xl p-3 text-center"><Icon size={14} className="text-studio-text-secondary mx-auto mb-1" /><p className="text-base font-bold text-studio-text-primary font-stats">{formatNumber(value)}</p><p className="text-[10px] text-studio-text-secondary mt-0.5">{label}</p></div>))}</div>
                  <div className="flex gap-3">{(() => { const vc = pctChange(selectedPost.metrics!.views, selectedPost.metrics!.prev_week_avg_views); const ec = pctChange(selectedPost.metrics!.engagement_rate, selectedPost.metrics!.prev_week_avg_engagement); return [{ label: 'Pregledi vs prošli tjedan', pct: vc.pct, up: vc.up }, { label: 'Angažman vs prošli tjedan', pct: ec.pct, up: ec.up }].map(({ label, pct, up }) => (<div key={label} className={`flex-1 rounded-xl p-3 ${up ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}><div className="flex items-center gap-1.5">{up ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-red-400" />}<span className={`text-sm font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>{pct}</span></div><p className="text-[10px] text-studio-text-secondary mt-1">{label}</p></div>)) })()}</div>
                </div>)}
                {selectedPost.description && (<div><p className="text-[11px] font-semibold text-studio-text-secondary uppercase tracking-wider mb-2">Opis</p><p className="text-sm text-studio-text-primary leading-relaxed">{selectedPost.description}</p></div>)}
                {selectedPost.caption_hr && (<div><p className="text-[11px] font-semibold text-studio-text-secondary uppercase tracking-wider mb-2">{selectedPost.metrics ? 'Caption' : 'Predloženi caption'}</p><div className="bg-studio-surface-0 rounded-xl p-4 border border-studio-border"><p className="text-sm text-studio-text-primary leading-relaxed whitespace-pre-line">{selectedPost.caption_hr}</p></div></div>)}
                <div><p className="text-[11px] font-semibold text-studio-text-secondary uppercase tracking-wider mb-2">Vizual</p>
                  {selectedPost.visual_url ? (<div className="space-y-2"><div className="rounded-xl overflow-hidden border border-studio-border"><img src={selectedPost.visual_url.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:8001'}${selectedPost.visual_url}` : selectedPost.visual_url} alt={selectedPost.title} className="w-full h-auto object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /></div><button onClick={async () => { try { setGeneratingVisual(true); const res = await contentApi.generateVisual(selectedPost.id); setSelectedPost({ ...selectedPost, visual_url: res.data.visual_url }) } catch { /* ignore */ } finally { setGeneratingVisual(false) } }} disabled={generatingVisual} className="text-xs text-brand-accent hover:text-brand-accent/80 flex items-center gap-1"><RefreshCw size={12} />{generatingVisual ? 'Generiranje...' : 'Regeneriraj vizual'}</button></div>)
                  : (<div className="space-y-2">{selectedPost.visual_brief && (<div className="bg-studio-surface-0 rounded-xl p-4 border border-studio-border"><p className="text-[11px] font-semibold text-studio-text-secondary uppercase tracking-wider mb-1">Vizualni smjer</p><p className="text-sm text-studio-text-secondary leading-relaxed">{selectedPost.visual_brief}</p></div>)}<button onClick={async () => { try { setGeneratingVisual(true); const res = await contentApi.generateVisual(selectedPost.id); setSelectedPost({ ...selectedPost, visual_url: res.data.visual_url }) } catch { /* ignore */ } finally { setGeneratingVisual(false) } }} disabled={generatingVisual} className="w-full py-2.5 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent font-medium rounded-xl transition-colors text-sm flex items-center justify-center gap-2 border border-brand-accent/20">{generatingVisual ? (<><Loader2 size={14} className="animate-spin" /> Generiranje vizuala...</>) : (<><Sparkles size={14} /> Generiraj vizual</>)}</button></div>)}
                </div>
                {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (<div><p className="text-[11px] font-semibold text-studio-text-secondary uppercase tracking-wider mb-2">Hashtags</p><div className="flex flex-wrap gap-1.5">{selectedPost.hashtags.map((tag) => (<span key={tag} className="text-[12px] px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg font-medium">{tag}</span>))}</div></div>)}
                {selectedPost.platform_post_url && selectedPost.status === 'published' && (<div><p className="text-[11px] font-semibold text-studio-text-secondary uppercase tracking-wider mb-2">Objavljeno na</p><a href={selectedPost.platform_post_url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-accent hover:text-brand-accent/80 underline break-all">{selectedPost.platform_post_url}</a></div>)}
                {selectedPost.publish_error && (selectedPost.status === 'failed' || selectedPost.status === 'approved') && (<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"><p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-1">Greška pri objavljivanju</p><p className="text-sm text-red-400">{selectedPost.publish_error}</p></div>)}
                <div className="pt-2 space-y-2">
                  {canModerate && selectedPost.status !== 'published' && (<button onClick={handlePublishFromModal} disabled={publishing} className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm">{publishing ? (<><Loader2 size={16} className="animate-spin" /> Objavljivanje...</>) : (<><Send size={16} /> Odobri i objavi</>)}</button>)}
                  <button onClick={() => navigate(`/studio/${selectedPost.id}`, { state: { post: selectedPost } })} className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-sm"><Film size={16} />Otvori Content Studio</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
