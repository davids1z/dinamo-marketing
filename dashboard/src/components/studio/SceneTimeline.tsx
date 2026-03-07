import { useRef, useEffect, useCallback } from 'react'
import { Plus, Copy, Trash2 } from 'lucide-react'
import type { Scene } from '../../types/studio'
import { buildBackgroundStyle } from '../../utils/studio'

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface SceneTimelineProps {
  scenes: Scene[]
  currentSceneIndex: number
  isPlaying: boolean
  onSceneSelect: (index: number) => void
  onAddScene: () => void
  onDeleteScene: (index: number) => void
  onDuplicateScene: (index: number) => void
  onReorderScenes: (fromIndex: number, toIndex: number) => void
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function SceneTimeline({
  scenes,
  currentSceneIndex,
  isPlaying,
  onSceneSelect,
  onAddScene,
  onDeleteScene,
  onDuplicateScene,
  onReorderScenes,
}: SceneTimelineProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const dragIdxRef = useRef<number | null>(null)
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0)

  /* ---- auto-scroll active scene into view ---- */
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const active = strip.children[currentSceneIndex] as HTMLElement | undefined
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
    }
  }, [currentSceneIndex])

  /* ---- drag & drop reorder ---- */
  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    dragIdxRef.current = idx
    e.dataTransfer.effectAllowed = 'move'
    // Make drag image slightly transparent
    const el = e.currentTarget as HTMLElement
    el.style.opacity = '0.5'
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    el.style.opacity = '1'
    dragIdxRef.current = null
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, toIdx: number) => {
    e.preventDefault()
    const fromIdx = dragIdxRef.current
    if (fromIdx !== null && fromIdx !== toIdx) {
      onReorderScenes(fromIdx, toIdx)
    }
    dragIdxRef.current = null
  }, [onReorderScenes])

  /* ---- progress segments for the bottom bar ---- */
  const progressSegments = scenes.map((scene, i) => {
    const pct = totalDuration > 0 ? (scene.duration / totalDuration) * 100 : 0
    let state: 'past' | 'current' | 'future'
    if (i < currentSceneIndex) state = 'past'
    else if (i === currentSceneIndex) state = 'current'
    else state = 'future'
    return { id: scene.id, pct, state }
  })

  return (
    <div className="scene-timeline-root">
      {/* ========== Controls bar (top row) ========== */}
      <div className="scene-timeline-controls">
        {/* Left: action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onAddScene}
            className="tl-icon-btn"
            title="Dodaj scenu"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDuplicateScene(currentSceneIndex)}
            disabled={scenes.length === 0}
            className="tl-icon-btn"
            title="Dupliciraj scenu"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteScene(currentSceneIndex)}
            disabled={scenes.length <= 1}
            className="tl-icon-btn tl-icon-btn-danger"
            title="Obriši scenu"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: scene counter */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-studio-text-secondary">
            {scenes.length > 0
              ? `${currentSceneIndex + 1} / ${scenes.length}`
              : '0 / 0'}
          </span>
        </div>

        {/* Right: total duration */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-studio-text-tertiary">
            {totalDuration.toFixed(1)}s ukupno
          </span>
        </div>
      </div>

      {/* ========== Thumbnail strip ========== */}
      <div className="scene-timeline-strip" ref={stripRef}>
        {scenes.map((scene, i) => (
          <button
            key={scene.id}
            onClick={() => onSceneSelect(i)}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, i)}
            className={`scene-timeline-thumb ${i === currentSceneIndex ? 'active' : ''}`}
            style={buildBackgroundStyle(scene.background)}
          >
            {/* Image background if type === 'image' */}
            {scene.background.type === 'image' && scene.background.src && (
              <img
                src={scene.background.src}
                alt=""
                className="absolute inset-0 w-full h-full object-cover rounded-lg"
              />
            )}

            {/* Scene number badge — top-left */}
            <span className="scene-timeline-number">{i + 1}</span>

            {/* Duration badge — bottom-right */}
            <span className="scene-timeline-duration">{scene.duration}s</span>
          </button>
        ))}

        {/* Add scene button at end of strip */}
        <button onClick={onAddScene} className="scene-timeline-add">
          <Plus className="w-4 h-4 text-studio-text-tertiary group-hover:text-dinamo-accent transition-colors" />
        </button>
      </div>

      {/* ========== Progress bar (bottom) ========== */}
      {scenes.length > 0 && (
        <div className="scene-timeline-progress">
          {progressSegments.map((seg, i) => (
            <div
              key={seg.id}
              className={`scene-timeline-progress-seg ${seg.state}${seg.state === 'current' && isPlaying ? ' playing' : ''}`}
              style={{ width: `${seg.pct}%` }}
              onClick={() => onSceneSelect(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { buildBackgroundStyle }
