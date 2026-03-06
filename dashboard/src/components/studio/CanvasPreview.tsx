import { useRef, useMemo } from 'react'
import type { Scene, AspectRatio } from '../../types/studio'
import { ASPECT_DIMENSIONS } from '../../types/studio'
import '../../styles/studio-animations.css'

interface CanvasPreviewProps {
  scenes: Scene[]
  currentSceneIndex: number
  aspectRatio: AspectRatio
  isPlaying: boolean
  className?: string
}

export default function CanvasPreview({
  scenes,
  currentSceneIndex,
  aspectRatio,
  isPlaying,
  className = '',
}: CanvasPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scene = scenes[currentSceneIndex]

  const dims = ASPECT_DIMENSIONS[aspectRatio]

  // Calculate scaled preview size to fit container
  const previewStyle = useMemo(() => {
    return {
      aspectRatio: `${dims.width} / ${dims.height}`,
      maxHeight: '100%',
      maxWidth: '100%',
    }
  }, [dims])

  if (!scene) {
    return (
      <div className={`studio-canvas rounded-2xl flex items-center justify-center ${className}`} style={previewStyle}>
        <div className="text-center text-white/40">
          <p className="text-lg font-medium">Nema scena</p>
          <p className="text-sm mt-1">Generiraj scene s AI ili dodaj ručno</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`studio-canvas rounded-2xl transition-${scene.transition} ${className}`}
      style={previewStyle}
      id="studio-canvas-export"
    >
      {/* Background layer */}
      <div className="scene-layer" style={buildBackgroundStyle(scene.background)}>
        {scene.background.type === 'image' && scene.background.src && (
          <>
            <img
              src={scene.background.src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            {scene.background.overlay_opacity && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: scene.background.overlay_color || '#0A1A28',
                  opacity: scene.background.overlay_opacity,
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Text layers */}
      {scene.text_layers.map((tl) => (
        <div
          key={`${scene.id}-${tl.id}-${isPlaying}`}
          className={`text-layer anim-${tl.animation}`}
          style={{
            left: `${tl.position.x}%`,
            top: `${tl.position.y}%`,
            fontSize: `clamp(12px, ${tl.font_size / 20}vw, ${tl.font_size}px)`,
            fontFamily: tl.font_family,
            fontWeight: tl.font_weight,
            color: tl.color,
            textAlign: tl.text_align,
            animationDelay: `${tl.animation_delay}s`,
            lineHeight: 1.2,
            maxWidth: '80%',
          }}
        >
          {tl.text}
        </div>
      ))}

      {/* Overlay layers */}
      {scene.overlay_layers.map((ol) => (
        <div
          key={`${scene.id}-${ol.id}-${isPlaying}`}
          className={`overlay-layer anim-${ol.animation}`}
          style={{
            left: `${ol.position.x}%`,
            top: `${ol.position.y}%`,
            width: `${ol.size}px`,
            height: `${ol.size}px`,
            animationDelay: `${ol.animation_delay}s`,
            opacity: ol.opacity ?? 1,
          }}
        >
          {ol.type === 'logo' && ol.src && (
            <img src={ol.src} alt="" className="w-full h-full object-contain" />
          )}
          {ol.type === 'badge' && (
            <div className="w-full h-full rounded-full bg-dinamo-accent/20 border-2 border-dinamo-accent flex items-center justify-center">
              <span className="text-dinamo-accent font-bold text-xs">D</span>
            </div>
          )}
          {ol.type === 'shape' && (
            <div className="w-full h-full rounded-lg bg-white/10 backdrop-blur-sm" />
          )}
        </div>
      ))}

      {/* Scene indicator */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
        {scenes.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all ${
              i === currentSceneIndex ? 'bg-dinamo-accent w-6' : 'bg-white/30 w-2'
            }`}
          />
        ))}
      </div>

      {/* Duration badge */}
      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
        {scene.duration}s
      </div>
    </div>
  )
}

function buildBackgroundStyle(bg: Scene['background']): React.CSSProperties {
  if (bg.type === 'gradient' && bg.colors) {
    const dir = bg.direction || 'to bottom'
    return {
      background: `linear-gradient(${dir}, ${bg.colors.join(', ')})`,
    }
  }
  if (bg.type === 'color' && bg.color) {
    return { backgroundColor: bg.color }
  }
  // Image type — handled by img element
  return { backgroundColor: '#0A1A28' }
}
