/* ------------------------------------------------------------------ */
/* Content Studio TypeScript interfaces                                */
/* ------------------------------------------------------------------ */

export interface TextLayer {
  id: string
  text: string
  position: { x: number; y: number }
  font_size: number
  font_family: string
  font_weight: string
  color: string
  text_align: 'left' | 'center' | 'right'
  animation: AnimationType
  animation_delay: number
}

export interface OverlayLayer {
  id: string
  type: 'logo' | 'badge' | 'shape' | 'image'
  src?: string
  position: { x: number; y: number }
  size: number
  animation: AnimationType
  animation_delay: number
  opacity?: number
}

export interface SceneBackground {
  type: 'gradient' | 'color' | 'image'
  color?: string
  colors?: string[]
  direction?: string
  src?: string
  overlay_opacity?: number
  overlay_color?: string
}

export interface Scene {
  id: string
  order: number
  duration: number
  background: SceneBackground
  text_layers: TextLayer[]
  overlay_layers: OverlayLayer[]
  transition: TransitionType
}

export type AnimationType =
  | 'none'
  | 'fade_in'
  | 'slide_up'
  | 'slide_down'
  | 'slide_left'
  | 'slide_right'
  | 'scale_up'
  | 'scale_down'
  | 'typewriter'
  | 'bounce'
  | 'pulse'
  | 'blur_in'
  // New professional animations
  | 'flip_x'
  | 'flip_y'
  | 'rotate_in'
  | 'elastic'
  | 'swing'
  | 'glitch'
  | 'shake_in'
  | 'drop_in'
  | 'zoom_rotate'
  | 'letter_spread'

export type TransitionType =
  | 'none'
  | 'fade'
  | 'slide_left'
  | 'slide_up'
  | 'zoom_in'
  | 'zoom_out'
  // New professional transitions
  | 'slide_right'
  | 'slide_down'
  | 'dissolve'
  | 'blur_through'
  | 'scale_fade'

export interface SceneData {
  scenes: Scene[]
  caption: string
  hashtags: string[]
  description: string
  total_duration: number
  aspect_ratio: '9:16' | '1:1' | '16:9'
}

export interface MediaAsset {
  id: string
  filename: string
  original_filename: string
  mime_type: string
  file_size: number
  url: string
  asset_type: 'image' | 'video' | 'audio'
  created_at: string
}

export interface StudioProject {
  id: string
  post_id: string
  brief: string
  scene_data: Scene[] | null
  generated_caption: string
  generated_hashtags: string[] | null
  generated_description: string
  output_url: string
  output_type: string
  status: 'draft' | 'generating' | 'generated' | 'rendering' | 'rendered' | 'published'
  created_at: string
  updated_at: string
  post_meta?: { title?: string; platform?: string } | null
}

export interface GenerationTask {
  task_id: string
  status: 'running' | 'done' | 'error' | 'not_found'
  scene_data?: SceneData
  error?: string
  post_id?: string
}

export interface PublishResult {
  success: boolean
  post_id: string
  platform: string
  platform_post_id: string
  platform_post_url: string
  error: string
  status: string
}

export type AspectRatio = '9:16' | '1:1' | '16:9'

export const ASPECT_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
}

export type AnimationCategory = 'basic' | 'slide' | 'scale' | 'special' | 'dynamic'

export interface AnimationOption {
  value: AnimationType
  label: string
  category: AnimationCategory
  icon: string // emoji for visual preview
}

export const ANIMATION_OPTIONS: AnimationOption[] = [
  // Basic
  { value: 'none', label: 'Bez animacije', category: 'basic', icon: '⏸' },
  { value: 'fade_in', label: 'Pojavljivanje', category: 'basic', icon: '🌅' },
  { value: 'blur_in', label: 'Izoštravanje', category: 'basic', icon: '🔍' },
  // Slide
  { value: 'slide_up', label: 'Klizanje gore', category: 'slide', icon: '⬆' },
  { value: 'slide_down', label: 'Klizanje dolje', category: 'slide', icon: '⬇' },
  { value: 'slide_left', label: 'Klizanje lijevo', category: 'slide', icon: '⬅' },
  { value: 'slide_right', label: 'Klizanje desno', category: 'slide', icon: '➡' },
  { value: 'drop_in', label: 'Pad odozgo', category: 'slide', icon: '💧' },
  // Scale
  { value: 'scale_up', label: 'Povećanje', category: 'scale', icon: '🔎' },
  { value: 'scale_down', label: 'Smanjivanje', category: 'scale', icon: '🔬' },
  { value: 'zoom_rotate', label: 'Zoom rotacija', category: 'scale', icon: '🌀' },
  // Dynamic
  { value: 'bounce', label: 'Odskakanje', category: 'dynamic', icon: '🏀' },
  { value: 'pulse', label: 'Pulsiranje', category: 'dynamic', icon: '💓' },
  { value: 'elastic', label: 'Elastično', category: 'dynamic', icon: '🪀' },
  { value: 'swing', label: 'Njihanje', category: 'dynamic', icon: '🎪' },
  { value: 'shake_in', label: 'Tresenje', category: 'dynamic', icon: '📳' },
  // Special
  { value: 'typewriter', label: 'Pisaći stroj', category: 'special', icon: '⌨' },
  { value: 'flip_x', label: 'Okret X', category: 'special', icon: '🔄' },
  { value: 'flip_y', label: 'Okret Y', category: 'special', icon: '🔃' },
  { value: 'rotate_in', label: 'Rotacija ulaz', category: 'special', icon: '♻' },
  { value: 'glitch', label: 'Glitch', category: 'special', icon: '⚡' },
  { value: 'letter_spread', label: 'Raširenje', category: 'special', icon: '📐' },
]

export const ANIMATION_CATEGORIES: { value: AnimationCategory; label: string }[] = [
  { value: 'basic', label: 'Osnovno' },
  { value: 'slide', label: 'Klizanje' },
  { value: 'scale', label: 'Skaliranje' },
  { value: 'dynamic', label: 'Dinamično' },
  { value: 'special', label: 'Specijalno' },
]

export const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: 'none', label: 'Bez tranzicije' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide_left', label: 'Klizanje lijevo' },
  { value: 'slide_right', label: 'Klizanje desno' },
  { value: 'slide_up', label: 'Klizanje gore' },
  { value: 'slide_down', label: 'Klizanje dolje' },
  { value: 'zoom_in', label: 'Zoom in' },
  { value: 'zoom_out', label: 'Zoom out' },
  { value: 'dissolve', label: 'Dissolve' },
  { value: 'blur_through', label: 'Blur prolaz' },
  { value: 'scale_fade', label: 'Scale fade' },
]

export const FONT_OPTIONS = [
  'Tektur',
  'Inter',
  'Montserrat',
  'JetBrains Mono',
] as const
