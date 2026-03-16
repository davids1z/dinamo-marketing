import { useRef, useState, useEffect, useCallback } from 'react'
import type { Scene, AspectRatio, TransitionType } from '../../types/studio'
import { ASPECT_DIMENSIONS } from '../../types/studio'
import { buildBackgroundStyle } from '../../utils/studio'
import '../../styles/studio-animations.css'

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface CanvasPreviewProps {
  scenes: Scene[]
  currentSceneIndex: number
  aspectRatio: AspectRatio
  isPlaying: boolean
  zoom?: number // 0.25 – 3.0, undefined = auto-fit
  onZoomChange?: (zoom: number) => void
  className?: string
}

/* ------------------------------------------------------------------ */
/* Transition CSS class resolver                                       */
/* ------------------------------------------------------------------ */

const TRANSITION_ENTER_CLASS: Record<TransitionType, string> = {
  none: '',
  fade: 'transition-fade',
  slide_left: 'transition-slide_left',
  slide_up: 'transition-slide_up',
  zoom_in: 'transition-zoom_in',
  zoom_out: 'transition-zoom_out',
  slide_right: 'transition-slide_right',
  slide_down: 'transition-slide_down',
  dissolve: 'transition-dissolve',
  blur_through: 'transition-blur_through',
  scale_fade: 'transition-scale_fade',
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function CanvasPreview({
  scenes,
  currentSceneIndex,
  aspectRatio,
  isPlaying,
  zoom,
  onZoomChange,
  className = '',
}: CanvasPreviewProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [autoScale, setAutoScale] = useState(0.25)
  const prevSceneIndexRef = useRef(currentSceneIndex)
  const [transitionKey, setTransitionKey] = useState(0)

  const scene = scenes[currentSceneIndex]
  const dims = ASPECT_DIMENSIONS[aspectRatio]

  // ------- scale computation (auto-fit or manual zoom) -------

  const computeAutoScale = useCallback(() => {
    const outer = outerRef.current
    if (!outer) return
    const oW = outer.clientWidth
    const oH = outer.clientHeight
    if (oW === 0 || oH === 0) return

    // Leave some padding around the canvas (24px each side)
    const padX = 48
    const padY = 48
    const sx = (oW - padX) / dims.width
    const sy = (oH - padY) / dims.height
    const fitted = Math.max(0.05, Math.min(sx, sy))
    setAutoScale(fitted)

    // If no manual zoom, report the fitted value
    if (zoom === undefined && onZoomChange) {
      onZoomChange(fitted)
    }
  }, [dims.width, dims.height, zoom, onZoomChange])

  useEffect(() => {
    computeAutoScale()
    const ro = new ResizeObserver(computeAutoScale)
    if (outerRef.current) ro.observe(outerRef.current)
    return () => ro.disconnect()
  }, [computeAutoScale])

  // The effective scale: use manual zoom if provided, otherwise auto
  const effectiveScale = zoom !== undefined ? zoom : autoScale

  // ------- scene transition tracking -------

  useEffect(() => {
    if (currentSceneIndex !== prevSceneIndexRef.current) {
      prevSceneIndexRef.current = currentSceneIndex
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTransitionKey((k) => k + 1)
    }
  }, [currentSceneIndex])

  // Scaled visual size
  const visW = dims.width * effectiveScale
  const visH = dims.height * effectiveScale

  // Transition class for the current scene
  const transitionClass = scene
    ? TRANSITION_ENTER_CLASS[scene.transition] || ''
    : ''

  /* ================================================================ */
  /* Empty state                                                       */
  /* ================================================================ */

  if (!scene) {
    return (
      <div
        ref={outerRef}
        className={`absolute inset-0 flex items-center justify-center bg-[#0d0d0d] ${className}`}
      >
        <div
          style={{ width: visW, height: visH, position: 'relative', flexShrink: 0 }}
          className="rounded-lg overflow-hidden shadow-2xl"
        >
          <div
            id="studio-canvas-export"
            className="studio-canvas"
            style={{
              width: dims.width,
              height: dims.height,
              transform: `scale(${effectiveScale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            <div className="w-full h-full flex flex-col items-center justify-center gap-6">
              {/* Film icon */}
              <svg
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white/20"
              >
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                <line x1="7" y1="2" x2="7" y2="22" />
                <line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="2" y1="7" x2="7" y2="7" />
                <line x1="2" y1="17" x2="7" y2="17" />
                <line x1="17" y1="7" x2="22" y2="7" />
                <line x1="17" y1="17" x2="22" y2="17" />
              </svg>
              <div className="text-center">
                <p
                  className="font-medium text-white/30"
                  style={{ fontSize: 48 }}
                >
                  Nema scena
                </p>
                <p
                  className="text-white/20 mt-3"
                  style={{ fontSize: 26 }}
                >
                  Generiraj scene s AI ili odaberi predlo&#382;ak
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /* Active scene render                                               */
  /* ================================================================ */

  return (
    <div
      ref={outerRef}
      className={`absolute inset-0 flex items-center justify-center bg-[#0d0d0d] ${className}`}
    >
      {/* Sized wrapper: the visual footprint of the scaled canvas */}
      <div
        style={{
          width: visW,
          height: visH,
          position: 'relative',
          flexShrink: 0,
        }}
        className="rounded-lg overflow-hidden"
      >
        {/* Canvas shadow and border */}
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          }}
        />

        {/* Full-resolution canvas, CSS-scaled to fit */}
        <div
          key={`scene-${currentSceneIndex}-${transitionKey}`}
          id="studio-canvas-export"
          className={`studio-canvas ${transitionClass}`}
          style={{
            width: dims.width,
            height: dims.height,
            transform: `scale(${effectiveScale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {/* ---- Background layer ---- */}
          <div className="scene-layer" style={buildBackgroundStyle(scene.background)}>
            {scene.background.type === 'image' && scene.background.src && (
              <>
                <img
                  src={scene.background.src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {scene.background.overlay_opacity != null && scene.background.overlay_opacity > 0 && (
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

          {/* ---- Text layers ---- */}
          {scene.text_layers.map((tl) => (
            <div
              key={`${scene.id}-tl-${tl.id}-${isPlaying}`}
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

          {/* ---- Overlay layers ---- */}
          {scene.overlay_layers.map((ol) => (
            <div
              key={`${scene.id}-ol-${ol.id}-${isPlaying}`}
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
                <img
                  src={ol.src}
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
              {ol.type === 'badge' && (
                <div className="w-full h-full rounded-full bg-brand-accent/20 border-2 border-brand-accent flex items-center justify-center">
                  <span className="text-brand-accent font-bold text-[24px]">
                    D
                  </span>
                </div>
              )}
              {ol.type === 'shape' && (
                <div className="w-full h-full rounded-lg bg-white/10 backdrop-blur-sm" />
              )}
              {ol.type === 'image' && ol.src && (
                <img
                  src={ol.src}
                  alt=""
                  className="w-full h-full object-cover rounded-lg"
                />
              )}
            </div>
          ))}

          {/* ---- Scene indicator dots (bottom-left, percentage-based) ---- */}
          {scenes.length > 1 && (
            <div
              className="absolute flex items-center"
              style={{
                bottom: '2.5%',
                left: '3%',
                gap: '0.6%',
              }}
            >
              {scenes.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentSceneIndex
                      ? 'bg-brand-accent'
                      : 'bg-white/20'
                  }`}
                  style={{
                    height: 8,
                    width: i === currentSceneIndex ? 40 : 16,
                  }}
                />
              ))}
            </div>
          )}

          {/* ---- Duration badge (top-right, relative units) ---- */}
          <div
            className="absolute flex items-center justify-center bg-black/60 backdrop-blur-md text-white/90 rounded-full"
            style={{
              top: '1.8%',
              right: '2.2%',
              fontSize: 14,
              padding: '4px 14px',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.02em',
            }}
          >
            {scene.duration}s
          </div>
        </div>
      </div>
    </div>
  )
}
