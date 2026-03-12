import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AnimationType, AnimationCategory } from '../../types/studio'
import { ANIMATION_OPTIONS, ANIMATION_CATEGORIES } from '../../types/studio'
import '../../styles/studio-animations.css'

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface AnimationPickerProps {
  value: AnimationType
  onChange: (value: AnimationType) => void
  className?: string
}

/* ------------------------------------------------------------------ */
/* Main AnimationPicker                                                */
/* ------------------------------------------------------------------ */

export default function AnimationPicker({
  value,
  onChange,
  className = '',
}: AnimationPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<AnimationCategory | 'all'>('all')
  const [previewAnim, setPreviewAnim] = useState<AnimationType | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setPreviewAnim(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const selected = ANIMATION_OPTIONS.find((a) => a.value === value)

  const filteredOptions =
    activeCategory === 'all'
      ? ANIMATION_OPTIONS
      : ANIMATION_OPTIONS.filter((a) => a.category === activeCategory)

  return (
    <div ref={containerRef} className={`relative flex-1 ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setPreviewAnim(null) }}
        className="w-full flex items-center gap-1.5 bg-studio-surface-1 border border-studio-border rounded-md px-2 py-1 text-xs text-studio-text-primary hover:border-studio-border-hover transition-colors cursor-pointer"
      >
        <span className="text-[11px] leading-none">{selected?.icon || '⏸'}</span>
        <span className="flex-1 text-left truncate">{selected?.label || 'Bez animacije'}</span>
        <ChevronDown className={`w-3 h-3 text-studio-text-disabled transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-studio-surface-1 border border-studio-border rounded-lg shadow-2xl overflow-hidden"
          style={{ width: 'max(100%, 220px)' }}
        >
          {/* Category tabs */}
          <div className="flex items-center gap-0.5 px-1.5 py-1.5 border-b border-studio-border-subtle overflow-x-auto">
            <button
              onClick={() => setActiveCategory('all')}
              className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                activeCategory === 'all'
                  ? 'bg-brand-accent/15 text-brand-accent'
                  : 'text-studio-text-tertiary hover:text-studio-text-secondary'
              }`}
            >
              Sve
            </button>
            {ANIMATION_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                  activeCategory === cat.value
                    ? 'bg-brand-accent/15 text-brand-accent'
                    : 'text-studio-text-tertiary hover:text-studio-text-secondary'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Options grid */}
          <div className="max-h-[200px] overflow-y-auto studio-scrollbar p-1.5">
            <div className="grid grid-cols-2 gap-0.5">
              {filteredOptions.map((anim) => (
                <button
                  key={anim.value}
                  onClick={() => {
                    onChange(anim.value)
                    setIsOpen(false)
                    setPreviewAnim(null)
                  }}
                  onMouseEnter={() => setPreviewAnim(anim.value)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors ${
                    value === anim.value
                      ? 'bg-brand-accent/15 text-brand-accent'
                      : 'text-studio-text-secondary hover:bg-studio-surface-2 hover:text-studio-text-primary'
                  }`}
                >
                  <span className="text-[11px] leading-none shrink-0">{anim.icon}</span>
                  <span className="text-[10px] truncate">{anim.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live preview pane at the bottom */}
          {previewAnim && previewAnim !== 'none' && (
            <div className="border-t border-studio-border-subtle px-2 py-2">
              <div className="relative bg-[#0A1A28] rounded-lg h-[50px] flex items-center justify-center overflow-hidden">
                <div
                  key={`inline-preview-${previewAnim}`}
                  className={`anim-${previewAnim} text-white font-headline font-bold text-sm`}
                >
                  S1Z
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* TransitionPicker — simpler variant for scene transitions            */
/* ------------------------------------------------------------------ */

interface TransitionPickerProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}

export function TransitionPicker({
  value,
  onChange,
  options,
  className = '',
}: TransitionPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [previewTransition, setPreviewTransition] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={containerRef} className={`relative flex-1 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-1.5 bg-studio-surface-1 border border-studio-border rounded-md px-2 py-1 text-xs text-studio-text-primary hover:border-studio-border-hover transition-colors cursor-pointer"
      >
        <span className="flex-1 text-left truncate">{selected?.label || 'Bez tranzicije'}</span>
        <ChevronDown className={`w-3 h-3 text-studio-text-disabled transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-studio-surface-1 border border-studio-border rounded-lg shadow-2xl overflow-hidden"
          style={{ width: 'max(100%, 200px)' }}
        >
          <div className="max-h-[240px] overflow-y-auto studio-scrollbar p-1.5">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                onMouseEnter={() => setPreviewTransition(opt.value)}
                className={`w-full flex items-center px-2 py-1.5 rounded-md text-left transition-colors ${
                  value === opt.value
                    ? 'bg-brand-accent/15 text-brand-accent'
                    : 'text-studio-text-secondary hover:bg-studio-surface-2 hover:text-studio-text-primary'
                }`}
              >
                <span className="text-[10px]">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Transition preview */}
          {previewTransition && previewTransition !== 'none' && (
            <div className="border-t border-studio-border-subtle px-2 py-2">
              <div className="relative bg-[#0A1A28] rounded-lg h-[50px] flex items-center justify-center overflow-hidden">
                <div
                  key={`trans-preview-${previewTransition}`}
                  className={`transition-${previewTransition} text-white font-headline font-bold text-sm`}
                >
                  Scena →
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
