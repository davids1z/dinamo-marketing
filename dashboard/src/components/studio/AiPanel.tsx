import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles, Loader2, Copy, Check, RefreshCw, ChevronRight,
  Zap, Trophy, Users, Megaphone, Star, Target, Flame, Heart,
  X, Hash, Clock, Layers, Wand2, MessageSquare
} from 'lucide-react'
import type { Scene, AspectRatio } from '../../types/studio'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface AiPanelProps {
  brief: string
  onBriefChange: (brief: string) => void
  caption: string
  onCaptionChange: (caption: string) => void
  hashtags: string[]
  onHashtagsChange: (hashtags: string[]) => void
  generating: boolean
  onGenerate: () => void
  scenes: Scene[]
  aspectRatio: AspectRatio
}

type ContentStyle = 'energetic' | 'dramatic' | 'minimal' | 'celebratory' | 'professional'

interface BriefPreset {
  id: string
  icon: typeof Zap
  label: string
  brief: string
  style: ContentStyle
}

interface GenStep {
  id: string
  label: string
  icon: typeof Sparkles
  duration: number // estimated seconds for this step
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const BRIEF_PRESETS: BriefPreset[] = [
  {
    id: 'matchday',
    icon: Zap,
    label: 'Matchday',
    brief: 'Matchday najava za sljedecu utakmicu. Fokus na atmosferi na Maksimiru, koristi klupske boje, dinamicnu tipografiju i navijacku energiju.',
    style: 'energetic',
  },
  {
    id: 'victory',
    icon: Trophy,
    label: 'Pobjeda',
    brief: 'Slavlje pobjede! Prikazi rezultat, strijelce i emocije navijaca. Koristi zlatne akcente i slavljenicku atmosferu.',
    style: 'celebratory',
  },
  {
    id: 'player',
    icon: Users,
    label: 'Igrač',
    brief: 'Player spotlight — statistike, postignuca i motivacijski citat. Profesionalni izgled s fokus na igracevom liku.',
    style: 'professional',
  },
  {
    id: 'transfer',
    icon: Megaphone,
    label: 'Transfer',
    brief: 'Najava novog pojacanja! Dramaticno otkrivanje s klupskim grbom, imenom igraca i brojem dresa.',
    style: 'dramatic',
  },
  {
    id: 'training',
    icon: Target,
    label: 'Trening',
    brief: 'Zakulisje s treninga. Casual, autentican sadrzaj koji prikazuje pripremu i timski duh.',
    style: 'minimal',
  },
  {
    id: 'fan',
    icon: Heart,
    label: 'Navijači',
    brief: 'Zahvala navijacima za podrsku. Emotivan sadrzaj s fotomaterijalom publike i porukama zahvale.',
    style: 'celebratory',
  },
]

const STYLE_OPTIONS: { id: ContentStyle; label: string; icon: typeof Flame; desc: string }[] = [
  { id: 'energetic', label: 'Energično', icon: Zap, desc: 'Dinamično, brzo, navijačko' },
  { id: 'dramatic', label: 'Dramatično', icon: Flame, desc: 'Epsko, filmsko, impresivno' },
  { id: 'minimal', label: 'Minimalno', icon: Target, desc: 'Čisto, moderno, elegantno' },
  { id: 'celebratory', label: 'Slavljeničko', icon: Star, desc: 'Veselo, pobjedničko, zlatno' },
  { id: 'professional', label: 'Profesionalno', icon: Users, desc: 'Ozbiljno, korporativno' },
]

const GEN_STEPS: GenStep[] = [
  { id: 'analyze', label: 'Analiziranje briefa...', icon: MessageSquare, duration: 3 },
  { id: 'scenes', label: 'Generiranje scena...', icon: Layers, duration: 8 },
  { id: 'text', label: 'Kreiranje tekstova...', icon: Wand2, duration: 5 },
  { id: 'finalize', label: 'Završavanje projekta...', icon: Check, duration: 3 },
]

const CAPTION_LIMITS: Record<string, number> = {
  instagram: 2200,
  facebook: 63206,
  tiktok: 2200,
  youtube: 5000,
  twitter: 280,
  default: 2200,
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AiPanel({
  brief,
  onBriefChange,
  caption,
  onCaptionChange,
  hashtags,
  onHashtagsChange,
  generating,
  onGenerate,
  scenes,
}: AiPanelProps) {
  const [selectedStyle, setSelectedStyle] = useState<ContentStyle>('energetic')
  const [showStylePicker, setShowStylePicker] = useState(false)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [copiedHashtags, setCopiedHashtags] = useState(false)
  const [newHashtag, setNewHashtag] = useState('')
  const [genStepIndex, setGenStepIndex] = useState(0)
  const [genElapsed, setGenElapsed] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [prevScenesLen, setPrevScenesLen] = useState(scenes.length)
  const hashInputRef = useRef<HTMLInputElement>(null)

  // ---- Generation step simulation ----
  useEffect(() => {
    if (!generating) {
      // Reset when done
      if (genStepIndex > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGenStepIndex(0)
        setGenElapsed(0)
      }
      return
    }

    // Elapsed timer
    const elapsed = setInterval(() => {
      setGenElapsed((e) => e + 1)
    }, 1000)

    // Step progression based on elapsed time
    const stepTimer = setInterval(() => {
      setGenStepIndex((prev) => {
        const totalSteps = GEN_STEPS.length
        // Don't go past the last step (it will stay there until generation completes)
        if (prev >= totalSteps - 1) return prev
        // Progress through steps based on cumulative durations
        let cumulativeDuration = 0
        for (let i = 0; i <= prev; i++) {
          cumulativeDuration += GEN_STEPS[i]!.duration
        }
        return genElapsed >= cumulativeDuration ? prev + 1 : prev
      })
    }, 1000)

    return () => {
      clearInterval(elapsed)
      clearInterval(stepTimer)
    }
  }, [generating, genElapsed, genStepIndex])

  // ---- Detect generation completion ----
  useEffect(() => {
    if (!generating && scenes.length > 0 && scenes.length !== prevScenesLen && prevScenesLen === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 5000)
      return () => clearTimeout(timer)
    }
    setPrevScenesLen(scenes.length)
  }, [generating, scenes.length, prevScenesLen])

  // ---- Clipboard helpers ----
  const copyCaption = useCallback(() => {
    navigator.clipboard.writeText(caption)
    setCopiedCaption(true)
    setTimeout(() => setCopiedCaption(false), 2000)
  }, [caption])

  const copyHashtags = useCallback(() => {
    navigator.clipboard.writeText(hashtags.join(' '))
    setCopiedHashtags(true)
    setTimeout(() => setCopiedHashtags(false), 2000)
  }, [hashtags])

  // ---- Hashtag management ----
  const addHashtag = useCallback(() => {
    const tag = newHashtag.trim().replace(/^#/, '')
    if (!tag) return
    if (!hashtags.includes(`#${tag}`)) {
      onHashtagsChange([...hashtags, `#${tag}`])
    }
    setNewHashtag('')
    hashInputRef.current?.focus()
  }, [newHashtag, hashtags, onHashtagsChange])

  const removeHashtag = useCallback((index: number) => {
    onHashtagsChange(hashtags.filter((_, i) => i !== index))
  }, [hashtags, onHashtagsChange])

  // ---- Apply preset ----
  const applyPreset = useCallback((preset: BriefPreset) => {
    onBriefChange(preset.brief)
    setSelectedStyle(preset.style)
  }, [onBriefChange])

  const totalDuration = scenes.reduce((s, sc) => s + sc.duration, 0)
  const captionLimit = CAPTION_LIMITS.default ?? 2200
  const captionPercent = Math.min(100, (caption.length / captionLimit) * 100)
  const hasContent = scenes.length > 0 || caption.length > 0

  /* ================================================================ */
  /* Render                                                            */
  /* ================================================================ */

  return (
    <div className="space-y-4 ai-panel-root">

      {/* ---- Header ---- */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-studio-ai-start to-studio-ai-end flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <h2 className="font-headline text-[11px] font-semibold uppercase tracking-[1.5px] text-studio-text-primary">
          AI Kreator
        </h2>
      </div>

      {/* ---- Quick Presets ---- */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-studio-text-secondary block mb-2">
          Brzi predlošci
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {BRIEF_PRESETS.map((preset) => {
            const Icon = preset.icon
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                disabled={generating}
                className="group flex flex-col items-center gap-1 py-2 px-1.5 rounded-lg bg-studio-surface-1 border border-studio-border hover:border-brand-accent/40 hover:bg-studio-surface-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon className="w-3.5 h-3.5 text-studio-text-secondary group-hover:text-brand-accent transition-colors" />
                <span className="text-[9px] font-medium text-studio-text-secondary group-hover:text-studio-text-primary transition-colors leading-tight text-center">
                  {preset.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ---- Style Selector ---- */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-studio-text-secondary block mb-2">
          Stil sadržaja
        </label>
        <button
          onClick={() => setShowStylePicker(!showStylePicker)}
          disabled={generating}
          className="w-full flex items-center justify-between px-3 py-2 bg-studio-surface-1 border border-studio-border rounded-lg text-xs hover:border-studio-border-hover transition-colors disabled:opacity-40"
        >
          <div className="flex items-center gap-2">
            {(() => {
              const style = STYLE_OPTIONS.find((s) => s.id === selectedStyle)
              if (!style) return null
              const SIcon = style.icon
              return (
                <>
                  <SIcon className="w-3.5 h-3.5 text-brand-accent" />
                  <span className="text-studio-text-primary font-medium">{style.label}</span>
                </>
              )
            })()}
          </div>
          <ChevronRight className={`w-3.5 h-3.5 text-studio-text-tertiary transition-transform ${showStylePicker ? 'rotate-90' : ''}`} />
        </button>

        {showStylePicker && (
          <div className="mt-1.5 space-y-1 ai-panel-slide-in">
            {STYLE_OPTIONS.map((style) => {
              const SIcon = style.icon
              const isSelected = selectedStyle === style.id
              return (
                <button
                  key={style.id}
                  onClick={() => {
                    setSelectedStyle(style.id)
                    setShowStylePicker(false)
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 ${
                    isSelected
                      ? 'bg-brand-accent/10 border border-brand-accent/30'
                      : 'bg-studio-surface-1 border border-transparent hover:bg-studio-surface-2'
                  }`}
                >
                  <SIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-brand-accent' : 'text-studio-text-secondary'}`} />
                  <div className="min-w-0">
                    <div className={`text-[11px] font-medium ${isSelected ? 'text-brand-accent' : 'text-studio-text-primary'}`}>
                      {style.label}
                    </div>
                    <div className="text-[9px] text-studio-text-tertiary">{style.desc}</div>
                  </div>
                  {isSelected && <Check className="w-3 h-3 text-brand-accent ml-auto flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ---- Brief ---- */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-studio-text-secondary">
            Brief
          </label>
          <span className="text-[9px] text-studio-text-tertiary tabular-nums">
            {brief.length} znakova
          </span>
        </div>
        <textarea
          value={brief}
          onChange={(e) => onBriefChange(e.target.value)}
          disabled={generating}
          rows={4}
          placeholder="Opiši što želiš kreirati... Npr: Matchday najava za utakmicu protiv Hajduka, fokus na atmosferi na Maksimiru..."
          className="w-full text-xs bg-studio-surface-1 border border-studio-border rounded-lg px-3 py-2.5 text-studio-text-primary placeholder:text-studio-text-tertiary focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/20 resize-none transition-colors disabled:opacity-60"
        />
      </div>

      {/* ---- Generate Button ---- */}
      <button
        onClick={onGenerate}
        disabled={generating || !brief.trim()}
        className="ai-generate-btn w-full relative overflow-hidden flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <div className="ai-generate-btn-bg absolute inset-0" />
        <div className="relative flex items-center gap-2 z-10">
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generiranje...</span>
            </>
          ) : hasContent ? (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>Regeneriraj s AI</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generiraj s AI</span>
            </>
          )}
        </div>
        {!generating && !hasContent && (
          <div className="ai-shimmer absolute inset-0 z-[5]" />
        )}
      </button>

      {/* ---- Generation Progress ---- */}
      {generating && (
        <div className="ai-gen-progress bg-studio-surface-1 rounded-xl p-3.5 border border-studio-ai-start/20 space-y-3">
          {/* Elapsed time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-studio-ai-purple ai-gen-dot" />
              <span className="text-[10px] font-semibold text-studio-ai-purple uppercase tracking-wider">
                AI generira
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-studio-text-tertiary tabular-nums">
              <Clock className="w-3 h-3" />
              {genElapsed}s
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-1.5">
            {GEN_STEPS.map((step, i) => {
              const StepIcon = step.icon
              const isActive = i === genStepIndex
              const isCompleted = i < genStepIndex

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-studio-ai-start/10 border border-studio-ai-start/20'
                      : isCompleted
                        ? 'opacity-60'
                        : 'opacity-30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500/20'
                      : isActive
                        ? 'bg-studio-ai-start/20'
                        : 'bg-studio-surface-3'
                  }`}>
                    {isCompleted ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="w-3 h-3 text-studio-ai-purple animate-spin" />
                    ) : (
                      <StepIcon className="w-3 h-3 text-studio-text-tertiary" />
                    )}
                  </div>
                  <span className={`text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'text-studio-ai-purple'
                      : isCompleted
                        ? 'text-emerald-400'
                        : 'text-studio-text-tertiary'
                  }`}>
                    {isCompleted ? step.label.replace('...', ' ✓') : step.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Overall progress bar */}
          <div className="h-1 bg-studio-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-studio-ai-start to-studio-ai-end rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(95, ((genStepIndex + 0.5) / GEN_STEPS.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ---- Success Card ---- */}
      {showSuccess && !generating && (
        <div className="ai-success-card bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-[11px] font-bold text-emerald-400">
              AI generiranje završeno!
            </span>
          </div>
          <div className="flex gap-3 text-[10px] text-emerald-300/70">
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {scenes.length} {scenes.length === 1 ? 'scena' : 'scena'}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {totalDuration.toFixed(1)}s
            </div>
            {caption && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Caption
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Caption + Hashtags (after generation or when data exists) ---- */}
      {(caption || scenes.length > 0) && !generating && (
        <div className="space-y-4 ai-panel-slide-in">

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-studio-border" />
            <span className="text-[9px] font-semibold uppercase tracking-widest text-studio-text-tertiary">
              Sadržaj objave
            </span>
            <div className="h-px flex-1 bg-studio-border" />
          </div>

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-studio-text-secondary">
                Opis objave
              </label>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] tabular-nums ${captionPercent > 90 ? 'text-red-400' : captionPercent > 70 ? 'text-amber-400' : 'text-studio-text-tertiary'}`}>
                  {caption.length}/{captionLimit}
                </span>
                <button
                  onClick={copyCaption}
                  className="w-5 h-5 rounded flex items-center justify-center text-studio-text-tertiary hover:text-studio-text-primary hover:bg-studio-surface-3 transition-colors"
                  title="Kopiraj opis"
                >
                  {copiedCaption ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <textarea
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              rows={4}
              placeholder="Opis objave..."
              className="w-full text-xs bg-studio-surface-1 border border-studio-border rounded-lg px-3 py-2.5 text-studio-text-primary placeholder:text-studio-text-tertiary focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/20 resize-none transition-colors"
            />
            {/* Character progress bar */}
            <div className="mt-1 h-0.5 bg-studio-surface-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  captionPercent > 90 ? 'bg-red-500' : captionPercent > 70 ? 'bg-amber-500' : 'bg-brand-accent'
                }`}
                style={{ width: `${captionPercent}%` }}
              />
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-studio-text-secondary">
                Hashtagovi
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-studio-text-tertiary tabular-nums">
                  {hashtags.length}
                </span>
                <button
                  onClick={copyHashtags}
                  className="w-5 h-5 rounded flex items-center justify-center text-studio-text-tertiary hover:text-studio-text-primary hover:bg-studio-surface-3 transition-colors"
                  title="Kopiraj hashtagove"
                >
                  {copiedHashtags ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Hashtag chips */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {hashtags.map((tag, i) => (
                  <span
                    key={`${tag}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-studio-surface-1 border border-studio-border rounded-md text-[10px] font-medium text-studio-text-primary hover:border-studio-border-hover transition-colors group"
                  >
                    <Hash className="w-2.5 h-2.5 text-brand-accent" />
                    {tag.replace(/^#/, '')}
                    <button
                      onClick={() => removeHashtag(i)}
                      className="w-3 h-3 rounded-sm flex items-center justify-center text-studio-text-tertiary opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add hashtag input */}
            <div className="flex gap-1.5">
              <input
                ref={hashInputRef}
                type="text"
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addHashtag()
                  }
                }}
                placeholder="Dodaj hashtag..."
                className="flex-1 text-[11px] bg-studio-surface-1 border border-studio-border rounded-lg px-2.5 py-1.5 text-studio-text-primary placeholder:text-studio-text-tertiary focus:outline-none focus:border-brand-accent/50 transition-colors"
              />
              <button
                onClick={addHashtag}
                disabled={!newHashtag.trim()}
                className="px-2.5 py-1.5 bg-studio-surface-2 border border-studio-border rounded-lg text-[10px] font-medium text-studio-text-secondary hover:text-studio-text-primary hover:bg-studio-surface-3 transition-colors disabled:opacity-30"
              >
                <Hash className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
