import { useReducer, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, Play, Pause, SkipForward, SkipBack,
  Send, Loader2, Image, Type, Upload, Layout, ChevronDown,
  Save, ZoomIn, ZoomOut, Maximize, X,
} from 'lucide-react'
import CanvasPreview from '../components/studio/CanvasPreview'
import SceneTimeline from '../components/studio/SceneTimeline'
import SceneEditor from '../components/studio/SceneEditor'
import MediaUploader from '../components/studio/MediaUploader'
import TemplateSelector from '../components/studio/TemplateSelector'
import PublishModal from '../components/studio/PublishModal'
import AiPanel from '../components/studio/AiPanel'
import { studioApi } from '../api/studio'
import type { Scene, MediaAsset, StudioProject, AspectRatio } from '../types/studio'
import type { StudioTemplate } from '../components/studio/templates'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LeftTab = 'templates' | 'media' | 'ai' | 'text' | null

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface StudioState {
  // Post metadata
  postTitle: string
  postPlatform: string

  // Project
  project: StudioProject | null
  scenes: Scene[]
  currentSceneIndex: number
  aspectRatio: AspectRatio

  // AI
  brief: string
  caption: string
  hashtags: string[]
  generating: boolean
  genTaskId: string | null

  // Media
  assets: MediaAsset[]

  // Playback
  isPlaying: boolean

  // Export / Publish
  exporting: boolean
  showPublishModal: boolean
  showExportMenu: boolean

  // UI
  loading: boolean
  activeTab: LeftTab
  zoomPercent: number
  toasts: Toast[]
}

type StudioAction =
  | { type: 'SET_POST_META'; title: string; platform: string }
  | { type: 'SET_PROJECT'; project: StudioProject }
  | { type: 'SET_SCENES'; scenes: Scene[] }
  | { type: 'UPDATE_SCENE'; index: number; scene: Scene }
  | { type: 'ADD_SCENE'; scene: Scene }
  | { type: 'DELETE_SCENE'; index: number }
  | { type: 'DUPLICATE_SCENE'; index: number }
  | { type: 'REORDER_SCENES'; fromIndex: number; toIndex: number }
  | { type: 'SET_CURRENT_SCENE'; index: number }
  | { type: 'SET_ASPECT_RATIO'; ratio: AspectRatio }
  | { type: 'SET_BRIEF'; brief: string }
  | { type: 'SET_CAPTION'; caption: string }
  | { type: 'SET_HASHTAGS'; hashtags: string[] }
  | { type: 'SET_GENERATING'; generating: boolean }
  | { type: 'SET_GEN_TASK_ID'; taskId: string | null }
  | { type: 'SET_ASSETS'; assets: MediaAsset[] }
  | { type: 'ADD_ASSET'; asset: MediaAsset }
  | { type: 'REMOVE_ASSET'; id: string }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SET_EXPORTING'; exporting: boolean }
  | { type: 'SET_SHOW_PUBLISH'; show: boolean }
  | { type: 'SET_SHOW_EXPORT_MENU'; show: boolean }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ACTIVE_TAB'; tab: LeftTab }
  | { type: 'SET_ZOOM'; percent: number }
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'REMOVE_TOAST'; id: string }
  | { type: 'NEXT_SCENE' }
  | { type: 'PREV_SCENE' }
  | { type: 'APPLY_TEMPLATE'; scenes: Scene[]; caption: string; hashtags: string[]; aspectRatio: AspectRatio }

const initialState: StudioState = {
  postTitle: '',
  postPlatform: '',
  project: null,
  scenes: [],
  currentSceneIndex: 0,
  aspectRatio: '9:16',
  brief: '',
  caption: '',
  hashtags: [],
  generating: false,
  genTaskId: null,
  assets: [],
  isPlaying: false,
  exporting: false,
  showPublishModal: false,
  showExportMenu: false,
  loading: true,
  activeTab: null,
  zoomPercent: 100,
  toasts: [],
}

function renumberScenes(scenes: Scene[]): Scene[] {
  return scenes.map((s, i) => ({ ...s, order: i + 1 }))
}

function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'SET_POST_META':
      return { ...state, postTitle: action.title, postPlatform: action.platform }
    case 'SET_PROJECT':
      return { ...state, project: action.project }
    case 'SET_SCENES':
      return { ...state, scenes: action.scenes }
    case 'UPDATE_SCENE':
      return {
        ...state,
        scenes: state.scenes.map((s, i) => (i === action.index ? action.scene : s)),
      }
    case 'ADD_SCENE':
      return {
        ...state,
        scenes: [...state.scenes, action.scene],
        currentSceneIndex: state.scenes.length,
      }
    case 'DELETE_SCENE': {
      if (state.scenes.length <= 1) return state
      const filtered = state.scenes.filter((_, i) => i !== action.index)
      const newIdx = action.index <= state.currentSceneIndex
        ? Math.max(0, state.currentSceneIndex - 1)
        : state.currentSceneIndex
      return {
        ...state,
        scenes: renumberScenes(filtered),
        currentSceneIndex: Math.min(newIdx, filtered.length - 1),
      }
    }
    case 'DUPLICATE_SCENE': {
      const idx = action.index
      const source = state.scenes[idx]
      if (!source) return state
      const dup: Scene = {
        ...source,
        id: `scene_${Date.now()}`,
        order: state.scenes.length + 1,
        text_layers: source.text_layers.map((tl) => ({
          ...tl,
          id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        })),
        overlay_layers: source.overlay_layers.map((ol) => ({
          ...ol,
          id: `overlay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        })),
      }
      const next = [...state.scenes]
      next.splice(idx + 1, 0, dup)
      return {
        ...state,
        scenes: renumberScenes(next),
        currentSceneIndex: idx + 1,
      }
    }
    case 'REORDER_SCENES': {
      const arr = [...state.scenes]
      const removed = arr.splice(action.fromIndex, 1)
      const moved = removed[0]
      if (!moved) return state
      arr.splice(action.toIndex, 0, moved)
      return {
        ...state,
        scenes: renumberScenes(arr),
        currentSceneIndex: action.toIndex,
      }
    }
    case 'SET_CURRENT_SCENE':
      return { ...state, currentSceneIndex: action.index }
    case 'NEXT_SCENE': {
      const atEnd = state.currentSceneIndex >= state.scenes.length - 1
      return {
        ...state,
        currentSceneIndex: atEnd ? 0 : state.currentSceneIndex + 1,
        isPlaying: atEnd ? false : state.isPlaying,
      }
    }
    case 'PREV_SCENE':
      return {
        ...state,
        currentSceneIndex: Math.max(0, state.currentSceneIndex - 1),
      }
    case 'SET_ASPECT_RATIO':
      return { ...state, aspectRatio: action.ratio }
    case 'SET_BRIEF':
      return { ...state, brief: action.brief }
    case 'SET_CAPTION':
      return { ...state, caption: action.caption }
    case 'SET_HASHTAGS':
      return { ...state, hashtags: action.hashtags }
    case 'SET_GENERATING':
      return { ...state, generating: action.generating }
    case 'SET_GEN_TASK_ID':
      return { ...state, genTaskId: action.taskId }
    case 'SET_ASSETS':
      return { ...state, assets: action.assets }
    case 'ADD_ASSET':
      return { ...state, assets: [action.asset, ...state.assets] }
    case 'REMOVE_ASSET':
      return { ...state, assets: state.assets.filter((a) => a.id !== action.id) }
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.playing }
    case 'SET_EXPORTING':
      return { ...state, exporting: action.exporting }
    case 'SET_SHOW_PUBLISH':
      return { ...state, showPublishModal: action.show }
    case 'SET_SHOW_EXPORT_MENU':
      return { ...state, showExportMenu: action.show }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: state.activeTab === action.tab ? null : action.tab }
    case 'SET_ZOOM':
      return { ...state, zoomPercent: Math.max(25, Math.min(200, action.percent)) }
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast] }
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    case 'APPLY_TEMPLATE':
      return {
        ...state,
        scenes: action.scenes,
        caption: action.caption,
        hashtags: action.hashtags,
        aspectRatio: action.aspectRatio,
        currentSceneIndex: 0,
      }
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createToastId(): string {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function statusBadge(status: StudioProject['status']) {
  const map: Record<StudioProject['status'], { label: string; cls: string }> = {
    draft: { label: 'Skica', cls: 'bg-studio-surface-3 text-studio-text-secondary' },
    generating: { label: 'Generiranje...', cls: 'bg-amber-900/40 text-amber-400 animate-studio-pulse' },
    generated: { label: 'Generirano', cls: 'bg-purple-900/40 text-purple-400' },
    rendering: { label: 'Renderiranje...', cls: 'bg-blue-900/40 text-blue-400 animate-studio-pulse' },
    rendered: { label: 'Renderirano', cls: 'bg-blue-900/40 text-blue-400' },
    published: { label: 'Objavljeno', cls: 'bg-emerald-900/40 text-emerald-400' },
  }
  return map[status] || map.draft
}

// ---------------------------------------------------------------------------
// Left Tab definitions
// ---------------------------------------------------------------------------

const LEFT_TABS: { id: Exclude<LeftTab, null>; icon: typeof Layout; label: string }[] = [
  { id: 'templates', icon: Layout, label: 'Predlosci' },
  { id: 'media', icon: Upload, label: 'Mediji' },
  { id: 'ai', icon: Sparkles, label: 'AI' },
  { id: 'text', icon: Type, label: 'Tekst' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContentStudio() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  // Post data passed via React Router state from ContentCalendar
  const routerPost = (location.state as { post?: Record<string, string | string[]> } | null)?.post
  const [state, dispatch] = useReducer(studioReducer, initialState)
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  const {
    postTitle, postPlatform, project, scenes, currentSceneIndex,
    aspectRatio, brief, caption, hashtags, generating, genTaskId,
    assets, isPlaying, exporting, showPublishModal, showExportMenu,
    loading, activeTab, zoomPercent, toasts,
  } = state

  // -----------------------------------------------------------------------
  // Toast helper
  // -----------------------------------------------------------------------
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = createToastId()
    dispatch({ type: 'ADD_TOAST', toast: { id, message, type } })
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', id }), 3500)
  }, [])

  // -----------------------------------------------------------------------
  // Load initial data
  // -----------------------------------------------------------------------
  const autoGenerateTriggeredRef = useRef(false)

  useEffect(() => {
    if (!postId) return

    const loadData = async () => {
      dispatch({ type: 'SET_LOADING', loading: true })
      try {
        // Load project (now includes post_meta)
        const projResp = await studioApi.getProject(postId)
        const proj = projResp.data
        dispatch({ type: 'SET_PROJECT', project: proj })
        dispatch({ type: 'SET_BRIEF', brief: proj.brief || '' })
        dispatch({ type: 'SET_CAPTION', caption: proj.generated_caption || '' })
        dispatch({ type: 'SET_HASHTAGS', hashtags: proj.generated_hashtags || [] })
        if (proj.scene_data && Array.isArray(proj.scene_data) && proj.scene_data.length > 0) {
          dispatch({ type: 'SET_SCENES', scenes: proj.scene_data })
        }

        // Use post metadata — prefer Router state (richer mock data) over
        // backend stub; fall back to backend post_meta for real DB posts.
        const meta = proj.post_meta
        if (routerPost) {
          // Router state has full mock post data from ContentCalendar
          dispatch({
            type: 'SET_POST_META',
            title: String(routerPost.title || ''),
            platform: String(routerPost.platform || ''),
          })
        } else if (meta && meta.title && meta.title !== 'Studio Project') {
          // Real ContentPost from the DB (not a stub)
          dispatch({
            type: 'SET_POST_META',
            title: meta.title || '',
            platform: meta.platform || '',
          })
        }

        // Load uploads
        const uploadsResp = await studioApi.listUploads(postId)
        dispatch({ type: 'SET_ASSETS', assets: uploadsResp.data || [] })

        // --- AUTO-BUILD BRIEF from Router state if backend has empty brief ---
        let effectiveBrief = (proj.brief || '').trim()
        if (!effectiveBrief && routerPost) {
          // Build brief from mock post data
          const parts: string[] = []
          if (routerPost.title) parts.push(String(routerPost.title))
          if (routerPost.visual_brief) parts.push(`Vizualni smjer: ${routerPost.visual_brief}`)
          if (routerPost.caption_hr) parts.push(`Ton poruke: ${routerPost.caption_hr}`)
          if (routerPost.platform) parts.push(`Platforma: ${String(routerPost.platform).charAt(0).toUpperCase() + String(routerPost.platform).slice(1)} (${routerPost.type || 'post'})`)
          if (routerPost.content_pillar) parts.push(`Kategorija: ${routerPost.content_pillar}`)
          effectiveBrief = parts.join('\n')

          if (effectiveBrief) {
            dispatch({ type: 'SET_BRIEF', brief: effectiveBrief })
            // Also set caption and hashtags from mock data
            if (routerPost.caption_hr) {
              dispatch({ type: 'SET_CAPTION', caption: String(routerPost.caption_hr) })
            }
            if (Array.isArray(routerPost.hashtags) && routerPost.hashtags.length > 0) {
              dispatch({ type: 'SET_HASHTAGS', hashtags: routerPost.hashtags as string[] })
            }
            // Save the brief to the backend project
            try {
              await studioApi.updateProject(postId, {
                brief: effectiveBrief,
                generated_caption: routerPost.caption_hr || '',
                generated_hashtags: routerPost.hashtags || [],
                generated_description: routerPost.visual_brief || '',
              })
            } catch {
              // Non-critical — brief is in local state
            }
          }
        }

        // --- AUTO-TRIGGER AI GENERATION ---
        // If we have a brief (auto-populated from post data) but no scenes yet,
        // automatically start AI generation so the user sees content immediately.
        const hasBrief = effectiveBrief.length > 0
        const hasScenes = proj.scene_data && Array.isArray(proj.scene_data) && proj.scene_data.length > 0
        const isNewProject = proj.status === 'draft' && !hasScenes

        if (hasBrief && isNewProject && !autoGenerateTriggeredRef.current) {
          autoGenerateTriggeredRef.current = true
          // Open AI panel and start generating
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'ai' })
          dispatch({ type: 'SET_GENERATING', generating: true })
          try {
            const genResp = await studioApi.generateScenes(postId, effectiveBrief)
            dispatch({ type: 'SET_GEN_TASK_ID', taskId: genResp.data.task_id })
            addToast('AI automatski generira sadržaj...', 'info')
          } catch {
            dispatch({ type: 'SET_GENERATING', generating: false })
            addToast('AI generiranje nije dostupno — koristite ručni unos', 'error')
          }
        }
      } catch (err) {
        console.error('Failed to load studio data:', err)
        addToast('Greska pri ucitavanju projekta', 'error')
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false })
      }
    }
    loadData()
  }, [postId, addToast])

  // -----------------------------------------------------------------------
  // AI Generation polling
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!genTaskId) return

    const poll = setInterval(async () => {
      try {
        const resp = await studioApi.getGenerationResult(genTaskId)
        const task = resp.data
        if (task.status === 'done' && task.scene_data) {
          dispatch({ type: 'SET_SCENES', scenes: task.scene_data.scenes || [] })
          dispatch({ type: 'SET_CAPTION', caption: task.scene_data.caption || '' })
          dispatch({ type: 'SET_HASHTAGS', hashtags: task.scene_data.hashtags || [] })
          dispatch({ type: 'SET_GENERATING', generating: false })
          dispatch({ type: 'SET_GEN_TASK_ID', taskId: null })
          addToast('AI generiranje zavrseno!', 'success')

          // Refresh project
          if (postId) {
            const projResp = await studioApi.getProject(postId)
            dispatch({ type: 'SET_PROJECT', project: projResp.data })
          }
        } else if (task.status === 'error') {
          console.error('Generation error:', task.error)
          dispatch({ type: 'SET_GENERATING', generating: false })
          dispatch({ type: 'SET_GEN_TASK_ID', taskId: null })
          addToast('AI generiranje neuspjesno', 'error')
        }
      } catch {
        dispatch({ type: 'SET_GENERATING', generating: false })
        dispatch({ type: 'SET_GEN_TASK_ID', taskId: null })
      }
    }, 2000)

    return () => clearInterval(poll)
  }, [genTaskId, postId, addToast])

  // -----------------------------------------------------------------------
  // Playback
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying || scenes.length === 0) return

    const currentScene = scenes[currentSceneIndex]
    const duration = (currentScene?.duration || 3) * 1000

    playTimerRef.current = setTimeout(() => {
      dispatch({ type: 'NEXT_SCENE' })
    }, duration)

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }
  }, [isPlaying, currentSceneIndex, scenes])

  // -----------------------------------------------------------------------
  // Keyboard shortcuts
  // -----------------------------------------------------------------------
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.code === 'Space') {
        e.preventDefault()
        dispatch({ type: 'SET_PLAYING', playing: !isPlaying })
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        dispatch({ type: 'PREV_SCENE' })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (currentSceneIndex < scenes.length - 1) {
          dispatch({ type: 'SET_CURRENT_SCENE', index: currentSceneIndex + 1 })
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        handleExportImage()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentSceneIndex, scenes.length])

  // -----------------------------------------------------------------------
  // Close export menu on outside click
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!showExportMenu) return
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        dispatch({ type: 'SET_SHOW_EXPORT_MENU', show: false })
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showExportMenu])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const handleGenerate = async () => {
    if (!postId || !brief.trim()) return
    dispatch({ type: 'SET_GENERATING', generating: true })
    try {
      const resp = await studioApi.generateScenes(postId, brief)
      dispatch({ type: 'SET_GEN_TASK_ID', taskId: resp.data.task_id })
      addToast('AI generiranje pokrenuto...', 'info')
    } catch {
      dispatch({ type: 'SET_GENERATING', generating: false })
      addToast('Greska pri pokretanju generiranja', 'error')
    }
  }

  const handleUpdateScene = useCallback((index: number, updatedScene: Scene) => {
    dispatch({ type: 'UPDATE_SCENE', index, scene: updatedScene })
  }, [])

  const handleDeleteScene = useCallback((index: number) => {
    if (scenes.length <= 1) return
    dispatch({ type: 'DELETE_SCENE', index })
  }, [scenes.length])

  const handleDuplicateScene = useCallback((index: number) => {
    dispatch({ type: 'DUPLICATE_SCENE', index })
  }, [])

  const handleReorderScenes = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_SCENES', fromIndex, toIndex })
  }, [])

  const handleAddScene = useCallback(() => {
    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      order: scenes.length + 1,
      duration: 3,
      background: { type: 'gradient', colors: ['#0A1A28', '#0057A8'], direction: 'to bottom' },
      text_layers: [
        {
          id: `text_${Date.now()}`,
          text: 'NOVI TEKST',
          position: { x: 50, y: 50 },
          font_size: 48,
          font_family: 'Tektur',
          font_weight: '700',
          color: '#FFFFFF',
          text_align: 'center',
          animation: 'fade_in',
          animation_delay: 0,
        },
      ],
      overlay_layers: [],
      transition: 'fade',
    }
    dispatch({ type: 'ADD_SCENE', scene: newScene })
  }, [scenes.length])

  const handleTemplateSelect = (template: StudioTemplate) => {
    dispatch({
      type: 'APPLY_TEMPLATE',
      scenes: template.scenes,
      caption: template.caption,
      hashtags: template.hashtags,
      aspectRatio: template.aspectRatio,
    })
    addToast(`Predlozak "${template.name}" primijenjen`, 'success')
  }

  const handleSave = async () => {
    if (!postId) return
    try {
      await studioApi.updateProject(postId, {
        brief,
        scene_data: scenes,
        generated_caption: caption,
        generated_hashtags: hashtags,
      })
      addToast('Projekt spremljen', 'success')
    } catch (err) {
      console.error('Save failed:', err)
      addToast('Spremanje neuspjesno', 'error')
    }
  }

  const handleExportImage = async () => {
    if (!postId || scenes.length === 0) return
    dispatch({ type: 'SET_EXPORTING', exporting: true })
    dispatch({ type: 'SET_SHOW_EXPORT_MENU', show: false })
    try {
      const { toPng } = await import('html-to-image')
      const node = document.getElementById('studio-canvas-export')
      if (!node) return

      const exportH = aspectRatio === '9:16' ? 1920 : aspectRatio === '1:1' ? 1080 : 608

      const dataUrl = await toPng(node, {
        width: 1080,
        height: exportH,
        pixelRatio: 1,
        skipFonts: true,
        filter: (domNode: Node) => {
          if (domNode instanceof HTMLImageElement) {
            return domNode.complete && domNode.naturalWidth > 0
          }
          return true
        },
        style: {
          transform: 'none',
          width: `${1080}px`,
          height: `${exportH}px`,
        },
      })

      const resp = await fetch(dataUrl)
      const blob = await resp.blob()
      await studioApi.exportImage(postId, blob)

      // Refresh project
      const projResp = await studioApi.getProject(postId)
      dispatch({ type: 'SET_PROJECT', project: projResp.data })
      addToast('Slika izvezena uspjesno', 'success')
    } catch (err) {
      console.error('Export failed:', err)
      addToast('Izvoz slike neuspjesan', 'error')
    } finally {
      dispatch({ type: 'SET_EXPORTING', exporting: false })
    }
  }

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0)
  const panelOpen = activeTab !== null

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-studio-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-dinamo-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-studio-text-secondary font-medium tracking-wide">
            Ucitavanje studija...
          </span>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const badge = project ? statusBadge(project.status) : statusBadge('draft')

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-studio-base text-studio-text-primary overflow-hidden studio-dark-forms" style={{ colorScheme: 'dark' }}>

      {/* ================================================================ */}
      {/* TOP BAR (48px)                                                   */}
      {/* ================================================================ */}
      <div className="h-12 flex-shrink-0 flex items-center px-3 gap-2 bg-studio-surface-0 border-b border-studio-border">
        {/* Back */}
        <button
          onClick={() => navigate('/content')}
          className="w-8 h-8 rounded-md flex items-center justify-center text-studio-text-secondary hover:bg-studio-surface-3 hover:text-studio-text-primary transition-colors"
          title="Natrag"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-studio-border" />

        {/* Post title */}
        <span className="font-headline text-sm font-bold tracking-wide truncate max-w-[240px]">
          {postTitle || 'Bez naslova'}
        </span>

        {/* Status badge */}
        <span className={`ml-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Aspect ratio pills */}
        <div className="flex gap-0.5 bg-studio-surface-1 rounded-md p-0.5 mr-2">
          {(['9:16', '1:1', '16:9'] as AspectRatio[]).map((ar) => (
            <button
              key={ar}
              onClick={() => dispatch({ type: 'SET_ASPECT_RATIO', ratio: ar })}
              className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                aspectRatio === ar
                  ? 'bg-dinamo-accent/15 text-dinamo-accent'
                  : 'text-studio-text-secondary hover:text-studio-text-primary'
              }`}
            >
              {ar}
            </button>
          ))}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 bg-studio-surface-2 text-studio-text-primary border border-studio-border rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-studio-surface-3 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Spremi
        </button>

        {/* Export dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => dispatch({ type: 'SET_SHOW_EXPORT_MENU', show: !showExportMenu })}
            disabled={scenes.length === 0 || exporting}
            className="flex items-center gap-1.5 bg-studio-surface-2 text-studio-text-primary border border-studio-border rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-studio-surface-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-studio-spin" />
            ) : (
              <Image className="w-3.5 h-3.5" />
            )}
            Export
            <ChevronDown className="w-3 h-3" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-studio-surface-1 border border-studio-border rounded-lg shadow-studio-dropdown py-1 z-50">
              <button
                onClick={handleExportImage}
                className="w-full text-left px-3 py-2 text-xs text-studio-text-primary hover:bg-studio-surface-3 transition-colors flex items-center gap-2"
              >
                <Image className="w-3.5 h-3.5 text-studio-text-secondary" />
                Izvezi PNG
              </button>
            </div>
          )}
        </div>

        {/* Publish */}
        <button
          onClick={() => dispatch({ type: 'SET_SHOW_PUBLISH', show: true })}
          disabled={!project?.output_url && scenes.length === 0}
          className="flex items-center gap-1.5 bg-dinamo-accent text-black font-semibold rounded-lg px-4 py-2 text-xs hover:bg-dinamo-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          Objavi
        </button>
      </div>

      {/* ================================================================ */}
      {/* MAIN BODY                                                        */}
      {/* ================================================================ */}
      <div className="flex-1 flex overflow-hidden">

        {/* -------------------------------------------------------------- */}
        {/* LEFT: Tab icons (56px) + Panel (260px, collapsible)             */}
        {/* -------------------------------------------------------------- */}
        <div className="flex flex-shrink-0">
          {/* Icon column */}
          <div className="w-14 flex-shrink-0 bg-studio-surface-0 border-r border-studio-border flex flex-col items-center pt-2 gap-1">
            {LEFT_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: tab.id })}
                  className={`w-10 h-10 rounded-md flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isActive
                      ? 'bg-dinamo-accent/10 text-dinamo-accent'
                      : 'text-studio-text-secondary hover:bg-studio-surface-3 hover:text-studio-text-primary'
                  }`}
                  title={tab.label}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[8px] font-medium leading-none">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Detail panel */}
          {panelOpen && (
            <div className="w-[260px] flex-shrink-0 bg-studio-surface-0 border-r border-studio-border overflow-y-auto">
              <div className="p-3">

                {/* --- Templates tab --- */}
                {activeTab === 'templates' && (
                  <div>
                    <h2 className="font-headline text-[10px] font-semibold uppercase tracking-[1.5px] text-studio-text-secondary mb-3">
                      Predlosci
                    </h2>
                    <TemplateSelector onSelect={handleTemplateSelect} />
                  </div>
                )}

                {/* --- Media tab --- */}
                {activeTab === 'media' && postId && (
                  <div>
                    <h2 className="font-headline text-[10px] font-semibold uppercase tracking-[1.5px] text-studio-text-secondary mb-3">
                      Mediji
                    </h2>
                    <MediaUploader
                      postId={postId}
                      assets={assets}
                      onUploadComplete={(asset) => dispatch({ type: 'ADD_ASSET', asset })}
                      onDelete={(id) => dispatch({ type: 'REMOVE_ASSET', id })}
                    />
                  </div>
                )}

                {/* --- AI tab --- */}
                {activeTab === 'ai' && (
                  <AiPanel
                    brief={brief}
                    onBriefChange={(v) => dispatch({ type: 'SET_BRIEF', brief: v })}
                    caption={caption}
                    onCaptionChange={(v) => dispatch({ type: 'SET_CAPTION', caption: v })}
                    hashtags={hashtags}
                    onHashtagsChange={(v) => dispatch({ type: 'SET_HASHTAGS', hashtags: v })}
                    generating={generating}
                    onGenerate={handleGenerate}
                    scenes={scenes}
                    aspectRatio={aspectRatio}
                  />
                )}

                {/* --- Text tab --- */}
                {activeTab === 'text' && (
                  <div className="space-y-3">
                    <h2 className="font-headline text-[10px] font-semibold uppercase tracking-[1.5px] text-studio-text-secondary">
                      Tekst slojevi
                    </h2>

                    <p className="text-[11px] text-studio-text-tertiary leading-relaxed">
                      Dodajte nove tekst slojeve ili uredite postojece u panelu za scene desno.
                    </p>

                    <button
                      onClick={() => {
                        if (scenes.length === 0) return
                        const scene = scenes[currentSceneIndex]
                        if (!scene) return
                        const newLayer = {
                          id: `text_${Date.now()}`,
                          text: 'Novi tekst',
                          position: { x: 50, y: 50 },
                          font_size: 32,
                          font_family: 'Inter' as const,
                          font_weight: '600',
                          color: '#FFFFFF',
                          text_align: 'center' as const,
                          animation: 'fade_in' as const,
                          animation_delay: 0,
                        }
                        const updated: Scene = {
                          ...scene,
                          text_layers: [...scene.text_layers, newLayer],
                        }
                        dispatch({ type: 'UPDATE_SCENE', index: currentSceneIndex, scene: updated })
                        addToast('Tekst sloj dodan', 'success')
                      }}
                      disabled={scenes.length === 0}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-studio-surface-2 border border-studio-border rounded-lg text-xs text-studio-text-primary hover:bg-studio-surface-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Type className="w-3.5 h-3.5" />
                      Dodaj tekst sloj
                    </button>

                    {/* List current scene's text layers */}
                    {scenes[currentSceneIndex]?.text_layers?.map((layer, i) => (
                      <div
                        key={layer.id}
                        className="bg-studio-surface-1 border border-studio-border rounded-lg p-2.5"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-studio-text-secondary font-medium">
                            Sloj {i + 1}
                          </span>
                          <span className="text-[9px] text-studio-text-tertiary font-mono">
                            {layer.font_family} {layer.font_size}px
                          </span>
                        </div>
                        <p className="text-xs text-studio-text-primary truncate">{layer.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------- */}
        {/* CENTER: Canvas area + Playback controls                        */}
        {/* -------------------------------------------------------------- */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Canvas area */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden relative"
            style={{
              backgroundColor: '#0D0D0D',
              backgroundImage: 'radial-gradient(circle, #1A1A1A 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
              <CanvasPreview
                scenes={scenes}
                currentSceneIndex={currentSceneIndex}
                aspectRatio={aspectRatio}
                isPlaying={isPlaying}
                onZoomChange={(z) => dispatch({ type: 'SET_ZOOM', percent: Math.round(z * 100) })}
                className="shadow-studio-canvas rounded-sm"
              />
          </div>

          {/* Playback + zoom controls bar */}
          <div className="h-10 flex-shrink-0 flex items-center justify-between px-4 bg-studio-surface-0 border-t border-studio-border">
            {/* Playback controls (left) */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => dispatch({ type: 'PREV_SCENE' })}
                disabled={currentSceneIndex === 0}
                className="w-8 h-8 rounded-md flex items-center justify-center text-studio-text-secondary hover:bg-studio-surface-3 hover:text-studio-text-primary disabled:opacity-30 transition-colors"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_PLAYING', playing: !isPlaying })}
                disabled={scenes.length === 0}
                className="w-8 h-8 rounded-md flex items-center justify-center bg-dinamo-accent/10 text-dinamo-accent hover:bg-dinamo-accent/20 disabled:opacity-30 transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  if (currentSceneIndex < scenes.length - 1) {
                    dispatch({ type: 'SET_CURRENT_SCENE', index: currentSceneIndex + 1 })
                  }
                }}
                disabled={currentSceneIndex >= scenes.length - 1}
                className="w-8 h-8 rounded-md flex items-center justify-center text-studio-text-secondary hover:bg-studio-surface-3 hover:text-studio-text-primary disabled:opacity-30 transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-studio-text-secondary ml-2 font-mono tabular-nums">
                {scenes.length > 0 ? `${currentSceneIndex + 1} / ${scenes.length}` : '0 / 0'}
              </span>
              {totalDuration > 0 && (
                <span className="text-[10px] text-studio-text-tertiary ml-2">
                  {totalDuration.toFixed(1)}s
                </span>
              )}
            </div>

            {/* Zoom controls (right) */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => dispatch({ type: 'SET_ZOOM', percent: 100 })}
                className="w-8 h-8 rounded-md flex items-center justify-center text-studio-text-secondary hover:bg-studio-surface-3 hover:text-studio-text-primary transition-colors"
                title="Fit"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_ZOOM', percent: zoomPercent - 10 })}
                className="w-8 h-8 rounded-md flex items-center justify-center text-studio-text-secondary hover:bg-studio-surface-3 hover:text-studio-text-primary transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-studio-text-secondary font-mono w-10 text-center tabular-nums">
                {zoomPercent}%
              </span>
              <button
                onClick={() => dispatch({ type: 'SET_ZOOM', percent: zoomPercent + 10 })}
                className="w-8 h-8 rounded-md flex items-center justify-center text-studio-text-secondary hover:bg-studio-surface-3 hover:text-studio-text-primary transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* RIGHT PANEL: Scene Editor (300px)                              */}
        {/* -------------------------------------------------------------- */}
        <div className="w-[300px] flex-shrink-0 bg-studio-surface-0 border-l border-studio-border overflow-y-auto">
          <SceneEditor
            scene={scenes[currentSceneIndex] || null}
            sceneIndex={currentSceneIndex}
            totalScenes={scenes.length}
            onUpdateScene={handleUpdateScene}
            onDeleteScene={handleDeleteScene}
          />
        </div>
      </div>

      {/* ================================================================ */}
      {/* TIMELINE (bottom, 120px)                                         */}
      {/* ================================================================ */}
      <div className="h-[120px] flex-shrink-0 bg-studio-surface-0 border-t border-studio-border">
        <SceneTimeline
          scenes={scenes}
          currentSceneIndex={currentSceneIndex}
          isPlaying={isPlaying}
          onSceneSelect={(i) => dispatch({ type: 'SET_CURRENT_SCENE', index: i })}
          onAddScene={handleAddScene}
          onDeleteScene={handleDeleteScene}
          onDuplicateScene={handleDuplicateScene}
          onReorderScenes={handleReorderScenes}
        />
      </div>

      {/* ================================================================ */}
      {/* PUBLISH MODAL                                                    */}
      {/* ================================================================ */}
      {showPublishModal && postId && (
        <PublishModal
          postId={postId}
          platform={postPlatform}
          caption={caption}
          hashtags={hashtags}
          outputUrl={project?.output_url || ''}
          onClose={() => dispatch({ type: 'SET_SHOW_PUBLISH', show: false })}
          onPublished={(result) => {
            if (result.success) {
              dispatch({ type: 'SET_PROJECT', project: { ...project!, status: 'published' } })
              addToast('Objava uspjesna!', 'success')
            }
          }}
        />
      )}

      {/* ================================================================ */}
      {/* TOAST NOTIFICATIONS                                              */}
      {/* ================================================================ */}
      {toasts.length > 0 && (
        <div className="fixed bottom-36 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg shadow-studio-dropdown text-xs font-medium animate-fade-in ${
                toast.type === 'success'
                  ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/50'
                  : toast.type === 'error'
                    ? 'bg-red-900/80 text-red-300 border border-red-700/50'
                    : 'bg-studio-surface-2 text-studio-text-primary border border-studio-border'
              }`}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => dispatch({ type: 'REMOVE_TOAST', id: toast.id })}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
