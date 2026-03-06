import { useRef, useState, useEffect, useCallback } from 'react'
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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)
  const scene = scenes[currentSceneIndex]
  const dims = ASPECT_DIMENSIONS[aspectRatio]

  // Calculate scale factor to fit the design-resolution canvas into the wrapper
  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const wW = wrapper.clientWidth
    const wH = wrapper.clientHeight
    if (wW === 0 || wH === 0) return
    const sx = wW / dims.width
    const sy = wH / dims.height
    setScale(Math.min(sx, sy))
  }, [dims])

  useEffect(() => {
    updateScale()
    const ro = new ResizeObserver(updateScale)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [updateScale])

  // Empty state
  if (!scene) {
    return (
      <div
        ref={wrapperRef}
        className={`w-full h-full flex items-center justify-center ${className}`}
      >
        <div
          className="studio-canvas rounded-2xl flex items-center justify-center"
          style={{
            width: dims.width,
            height: dims.height,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <div className="text-center text-white/40">
            <p className="text-[48px] font-medium">Nema scena</p>
            <p className="text-[28px] mt-4">Generiraj scene s AI ili dodaj ručno</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      className={`w-full h-full flex items-center justify-center ${className}`}
    >
      <div
        className={`studio-canvas rounded-2xl transition-${scene.transition}`}
        style={{
          width: dims.width,
          height: dims.height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
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
              fontSize: `${tl.font_size}px`,
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
                <span className="text-dinamo-accent font-bold text-[24px]">D</span>
              </div>
            )}
            {ol.type === 'shape' && (
              <div className="w-full h-full rounded-lg bg-white/10 backdrop-blur-sm" />
            )}
          </div>
        ))}

        {/* Scene indicator */}
        <div className="absolute bottom-[40px] left-[40px] flex items-center gap-[12px]">
          {scenes.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === currentSceneIndex
                  ? 'bg-dinamo-accent'
                  : 'bg-white/30'
              }`}
              style={{
                height: 8,
                width: i === currentSceneIndex ? 40 : 16,
              }}
            />
          ))}
        </div>

        {/* Duration badge */}
        <div
          className="absolute bg-black/50 backdrop-blur-sm text-white rounded-full"
          style={{
            top: 24,
            right: 24,
            fontSize: 20,
            padding: '4px 16px',
          }}
        >
          {scene.duration}s
        </div>
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
