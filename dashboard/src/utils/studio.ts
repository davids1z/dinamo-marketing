import type { Scene } from '../types/studio'

/**
 * Build a React CSSProperties object for a scene background.
 * Used by both CanvasPreview (full canvas) and SceneTimeline (mini thumbnails).
 */
export function buildBackgroundStyle(bg: Scene['background']): React.CSSProperties {
  if (bg.type === 'gradient' && bg.colors) {
    const dir = bg.direction || 'to bottom'
    return {
      background: `linear-gradient(${dir}, ${bg.colors.join(', ')})`,
    }
  }
  if (bg.type === 'color' && bg.color) {
    return { backgroundColor: bg.color }
  }
  // Image type — handled by an <img> element in the parent
  return { backgroundColor: '#0A1A28' }
}
