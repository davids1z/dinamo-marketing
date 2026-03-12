import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Thin accent-colored progress bar at the top of the viewport.
 * Shows during route transitions when the new page takes > 80ms to render.
 * Inspired by GitHub, Linear, and YouTube.
 */
export default function NavigationProgress() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const prevPath = useRef(location.pathname)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const rafRef = useRef<number>()

  useEffect(() => {
    if (location.pathname === prevPath.current) return
    prevPath.current = location.pathname

    // Start after a small delay — if the page loads instantly, never show
    timerRef.current = setTimeout(() => {
      setVisible(true)
      setProgress(0)

      // Animate to 90% over 1.5s
      let start: number | null = null
      const animate = (ts: number) => {
        if (!start) start = ts
        const elapsed = ts - start
        // Fast start, slow middle — cubic easing
        const t = Math.min(elapsed / 1500, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        setProgress(eased * 90)
        if (t < 1) {
          rafRef.current = requestAnimationFrame(animate)
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    }, 80)

    // Navigation complete — finish the bar
    return () => {
      clearTimeout(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      setProgress(100)
      setVisible(true)
      // Hide after completion animation
      setTimeout(() => { setVisible(false); setProgress(0) }, 200)
    }
  }, [location.pathname])

  if (!visible && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none"
      style={{ opacity: progress >= 100 ? 0 : 1, transition: 'opacity 200ms ease-out' }}
    >
      <div
        className="h-full bg-brand-accent shadow-[0_0_8px_rgba(184,255,0,0.4)]"
        style={{
          width: `${progress}%`,
          transition: progress >= 100 ? 'width 150ms ease-out' : 'none',
        }}
      />
    </div>
  )
}
