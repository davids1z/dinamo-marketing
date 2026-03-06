import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, Play, Pause, SkipForward, SkipBack,
  Send, Loader2, Image, Film,
} from 'lucide-react'
import Header from '../components/layout/Header'
import CanvasPreview from '../components/studio/CanvasPreview'
import SceneTimeline from '../components/studio/SceneTimeline'
import SceneEditor from '../components/studio/SceneEditor'
import MediaUploader from '../components/studio/MediaUploader'
import TemplateSelector from '../components/studio/TemplateSelector'
import PublishModal from '../components/studio/PublishModal'
import { studioApi } from '../api/studio'
import { contentApi } from '../api/content'
import type { Scene, MediaAsset, StudioProject, AspectRatio } from '../types/studio'
import type { StudioTemplate } from '../components/studio/templates'

export default function ContentStudio() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()

  // Post metadata
  const [postTitle, setPostTitle] = useState('')
  const [postPlatform, setPostPlatform] = useState('')

  // Studio state
  const [project, setProject] = useState<StudioProject | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16')
  const [brief, setBrief] = useState('')
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])

  // Media
  const [assets, setAssets] = useState<MediaAsset[]>([])

  // AI Generation
  const [generating, setGenerating] = useState(false)
  const [genTaskId, setGenTaskId] = useState<string | null>(null)

  // Playback
  const [isPlaying, setIsPlaying] = useState(false)
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Export / Publish
  const [exporting, setExporting] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)

  // Loading
  const [loading, setLoading] = useState(true)

  // ------------------------------------------------------------------
  // Load initial data
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!postId) return

    const loadData = async () => {
      setLoading(true)
      try {
        // Load post info
        try {
          const calResp = await contentApi.getCalendar(
            new Date().getMonth() + 1,
            new Date().getFullYear()
          )
          const posts = calResp.data?.posts || calResp.data || []
          const post = Array.isArray(posts)
            ? posts.find((p: Record<string, unknown>) => String(p.id) === postId)
            : null
          if (post) {
            setPostTitle(String(post.title || ''))
            setPostPlatform(String(post.platform || ''))
          }
        } catch {
          // Non-critical
        }

        // Load project
        const projResp = await studioApi.getProject(postId)
        const proj = projResp.data
        setProject(proj)
        setBrief(proj.brief || '')
        setCaption(proj.generated_caption || '')
        setHashtags(proj.generated_hashtags || [])
        if (proj.scene_data && Array.isArray(proj.scene_data) && proj.scene_data.length > 0) {
          setScenes(proj.scene_data)
        }

        // Load uploads
        const uploadsResp = await studioApi.listUploads(postId)
        setAssets(uploadsResp.data || [])
      } catch (err) {
        console.error('Failed to load studio data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [postId])

  // ------------------------------------------------------------------
  // AI Generation polling
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!genTaskId) return

    const poll = setInterval(async () => {
      try {
        const resp = await studioApi.getGenerationResult(genTaskId)
        const task = resp.data
        if (task.status === 'done' && task.scene_data) {
          setScenes(task.scene_data.scenes || [])
          setCaption(task.scene_data.caption || '')
          setHashtags(task.scene_data.hashtags || [])
          setGenerating(false)
          setGenTaskId(null)

          // Refresh project
          if (postId) {
            const projResp = await studioApi.getProject(postId)
            setProject(projResp.data)
          }
        } else if (task.status === 'error') {
          console.error('Generation error:', task.error)
          setGenerating(false)
          setGenTaskId(null)
        }
      } catch {
        setGenerating(false)
        setGenTaskId(null)
      }
    }, 2000)

    return () => clearInterval(poll)
  }, [genTaskId, postId])

  // ------------------------------------------------------------------
  // Playback
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying || scenes.length === 0) return

    const currentScene = scenes[currentSceneIndex]
    const duration = (currentScene?.duration || 3) * 1000

    playTimerRef.current = setTimeout(() => {
      if (currentSceneIndex < scenes.length - 1) {
        setCurrentSceneIndex((i) => i + 1)
      } else {
        setCurrentSceneIndex(0)
        setIsPlaying(false)
      }
    }, duration)

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }
  }, [isPlaying, currentSceneIndex, scenes])

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const handleGenerate = async () => {
    if (!postId || !brief.trim()) return
    setGenerating(true)
    try {
      const resp = await studioApi.generateScenes(postId, brief)
      setGenTaskId(resp.data.task_id)
    } catch {
      setGenerating(false)
    }
  }

  const handleSceneChange = useCallback((updatedScene: Scene) => {
    setScenes((prev) => prev.map((s, i) => (i === currentSceneIndex ? updatedScene : s)))
  }, [currentSceneIndex])

  const handleDeleteScene = useCallback(() => {
    if (scenes.length <= 1) return
    setScenes((prev) => {
      const next = prev.filter((_, i) => i !== currentSceneIndex)
      return next.map((s, i) => ({ ...s, order: i + 1 }))
    })
    setCurrentSceneIndex((i) => Math.max(0, i - 1))
  }, [currentSceneIndex, scenes.length])

  const handleAddScene = useCallback(() => {
    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      order: scenes.length + 1,
      duration: 3,
      background: { type: 'gradient', colors: ['#0A1A28', '#0057A8'], direction: 'to bottom' },
      text_layers: [
        {
          id: `text_${Date.now()}`, text: 'NOVI TEKST', position: { x: 50, y: 50 },
          font_size: 48, font_family: 'Tektur', font_weight: '700', color: '#FFFFFF',
          text_align: 'center', animation: 'fade_in', animation_delay: 0,
        },
      ],
      overlay_layers: [],
      transition: 'fade',
    }
    setScenes((prev) => [...prev, newScene])
    setCurrentSceneIndex(scenes.length)
  }, [scenes.length])

  const handleTemplateSelect = (template: StudioTemplate) => {
    setScenes(template.scenes)
    setCaption(template.caption)
    setHashtags(template.hashtags)
    setAspectRatio(template.aspectRatio)
    setCurrentSceneIndex(0)
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
    } catch (err) {
      console.error('Save failed:', err)
    }
  }

  const handleExportImage = async () => {
    if (!postId) return
    setExporting(true)
    try {
      // Use html-to-image to capture the canvas div
      const { toPng } = await import('html-to-image')
      const node = document.getElementById('studio-canvas-export')
      if (!node) return

      const exportH = aspectRatio === '9:16' ? 1920 : aspectRatio === '1:1' ? 1080 : 608

      // Remove broken images before export to avoid load failures
      const brokenImgs = node.querySelectorAll('img')
      const hidden: HTMLImageElement[] = []
      brokenImgs.forEach((img) => {
        if (!img.complete || img.naturalWidth === 0) {
          img.style.display = 'none'
          hidden.push(img)
        }
      })

      const dataUrl = await toPng(node, {
        width: 1080,
        height: exportH,
        pixelRatio: 1,
        skipFonts: true,
        style: {
          transform: 'none',
          width: `${1080}px`,
          height: `${exportH}px`,
        },
      })

      // Restore hidden images
      hidden.forEach((img) => { img.style.display = '' })

      // Convert data URL to blob
      const resp = await fetch(dataUrl)
      const blob = await resp.blob()

      // Upload to server
      await studioApi.exportImage(postId, blob)

      // Refresh project
      const projResp = await studioApi.getProject(postId)
      setProject(projResp.data)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0)

  if (loading) {
    return (
      <div className="animate-fade-in">
        <Header title="CONTENT STUDIO" subtitle="Učitavanje..." />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-dinamo-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="CONTENT STUDIO"
        subtitle={postTitle || 'Kreiranje sadržaja'}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/content')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Natrag
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Spremi
            </button>
          </div>
        }
      />

      <div className="page-wrapper">
        <div className="flex gap-4 h-[calc(100vh-8rem)]">
          {/* ============================================= */}
          {/* LEFT PANEL — Brief, Upload, Captions          */}
          {/* ============================================= */}
          <div className="w-80 flex-shrink-0 overflow-y-auto space-y-4 pr-1">
            {/* Post info */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-dinamo-accent/10 flex items-center justify-center">
                  <Film className="w-3.5 h-3.5 text-dinamo-accent-dark" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 truncate">{postTitle || 'Bez naslova'}</p>
                  <p className="text-[10px] text-gray-400 capitalize">{postPlatform || 'Platforma'}</p>
                </div>
              </div>

              {/* Aspect ratio selector */}
              <div className="flex gap-1.5 mb-3">
                {(['9:16', '1:1', '16:9'] as AspectRatio[]).map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setAspectRatio(ar)}
                    className={`flex-1 text-[10px] py-1 rounded-lg transition-colors font-medium ${
                      aspectRatio === ar
                        ? 'bg-dinamo-accent/15 text-dinamo-accent-dark'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {ar}
                  </button>
                ))}
              </div>

              {/* Status */}
              {project && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">Status:</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    project.status === 'published' ? 'bg-emerald-50 text-emerald-700' :
                    project.status === 'rendered' ? 'bg-blue-50 text-blue-700' :
                    project.status === 'generated' ? 'bg-violet-50 text-violet-700' :
                    project.status === 'generating' ? 'bg-amber-50 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {project.status === 'draft' ? 'Skica' :
                     project.status === 'generating' ? 'Generiranje...' :
                     project.status === 'generated' ? 'Generirano' :
                     project.status === 'rendering' ? 'Renderiranje...' :
                     project.status === 'rendered' ? 'Renderirano' :
                     project.status === 'published' ? 'Objavljeno' : project.status}
                  </span>
                </div>
              )}
            </div>

            {/* Media Upload */}
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Materijali</h3>
              {postId && (
                <MediaUploader
                  postId={postId}
                  assets={assets}
                  onUploadComplete={(asset) => setAssets((prev) => [asset, ...prev])}
                  onDelete={(id) => setAssets((prev) => prev.filter((a) => a.id !== id))}
                />
              )}
            </div>

            {/* Brief + Generate */}
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Brief za AI</h3>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={4}
                placeholder="Opiši što želiš kreirati... Npr: Matchday najava za utakmicu protiv Hajduka, fokus na atmosferi na Maksimiru, koristi klupske boje..."
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-dinamo-accent/50 focus:ring-2 focus:ring-dinamo-accent/10 resize-none mb-3"
              />
              <button
                onClick={handleGenerate}
                disabled={generating || !brief.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl text-xs font-semibold hover:from-violet-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generiranje s AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generiraj s AI
                  </>
                )}
              </button>
            </div>

            {/* Generated Caption */}
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Opis objave</h3>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="Opis objave..."
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-dinamo-accent/50 resize-none mb-2"
              />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Hashtagovi</h3>
              <input
                type="text"
                value={hashtags.join(' ')}
                onChange={(e) => setHashtags(e.target.value.split(/\s+/).filter(Boolean))}
                placeholder="#Dinamo #Modri ..."
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-dinamo-accent/50"
              />
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                onClick={handleExportImage}
                disabled={scenes.length === 0 || exporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Image className="w-4 h-4" />
                )}
                {exporting ? 'Izvoz...' : 'Izvezi sliku (PNG)'}
              </button>

              <button
                onClick={() => setShowPublishModal(true)}
                disabled={!project?.output_url && scenes.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-dinamo-accent text-gray-900 rounded-xl text-xs font-bold hover:bg-dinamo-accent-hover transition-colors disabled:opacity-50 shadow-sm"
              >
                <Send className="w-4 h-4" />
                Objavi
              </button>
            </div>
          </div>

          {/* ============================================= */}
          {/* CENTER — Canvas Preview + Timeline            */}
          {/* ============================================= */}
          <div className="flex-1 flex flex-col min-w-0 gap-3">
            {/* Canvas */}
            <div className="flex-1 bg-gray-900/5 rounded-2xl flex items-center justify-center p-4 overflow-hidden">
              <CanvasPreview
                scenes={scenes}
                currentSceneIndex={currentSceneIndex}
                aspectRatio={aspectRatio}
                isPlaying={isPlaying}
                className="shadow-2xl"
              />
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrentSceneIndex((i) => Math.max(0, i - 1))}
                disabled={currentSceneIndex === 0}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={scenes.length === 0}
                className="p-3 rounded-xl bg-dinamo-accent/10 hover:bg-dinamo-accent/20 text-dinamo-accent-dark transition-colors disabled:opacity-30"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setCurrentSceneIndex((i) => Math.min(scenes.length - 1, i + 1))}
                disabled={currentSceneIndex >= scenes.length - 1}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <div className="text-[10px] text-gray-400 ml-2">
                {currentSceneIndex + 1} / {scenes.length || 0}
              </div>
            </div>

            {/* Timeline */}
            <SceneTimeline
              scenes={scenes}
              currentIndex={currentSceneIndex}
              onSelect={setCurrentSceneIndex}
              onAdd={handleAddScene}
              totalDuration={totalDuration}
            />
          </div>

          {/* ============================================= */}
          {/* RIGHT PANEL — Scene Editor + Templates        */}
          {/* ============================================= */}
          <div className="w-72 flex-shrink-0 overflow-y-auto space-y-4 pl-1">
            {/* Scene Editor */}
            <div className="card">
              <SceneEditor
                scene={scenes[currentSceneIndex] || null}
                sceneIndex={currentSceneIndex}
                onChange={handleSceneChange}
                onDelete={handleDeleteScene}
              />
            </div>

            {/* Templates */}
            <div className="card p-4">
              <TemplateSelector onSelect={handleTemplateSelect} />
            </div>
          </div>
        </div>
      </div>

      {/* Publish modal */}
      {showPublishModal && postId && (
        <PublishModal
          postId={postId}
          platform={postPlatform}
          caption={caption}
          hashtags={hashtags}
          outputUrl={project?.output_url || ''}
          onClose={() => setShowPublishModal(false)}
          onPublished={(result) => {
            if (result.success) {
              setProject((prev) => prev ? { ...prev, status: 'published' } : prev)
            }
          }}
        />
      )}
    </div>
  )
}
