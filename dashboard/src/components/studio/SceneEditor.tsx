import { useState, useCallback } from 'react'
import {
  Trash2, Plus, ChevronDown, ArrowUp, ArrowDown,
  AlignLeft, AlignCenter, AlignRight, Clock, Palette, Type, Layers, Upload,
} from 'lucide-react'
import type {
  Scene, TextLayer, OverlayLayer, AnimationType, TransitionType, SceneBackground,
} from '../../types/studio'
import { TRANSITION_OPTIONS, FONT_OPTIONS } from '../../types/studio'
import AnimationPicker, { TransitionPicker } from './AnimationPicker'

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface SceneEditorProps {
  scene: Scene | null
  sceneIndex: number
  totalScenes: number
  onUpdateScene: (index: number, updated: Scene) => void
  onDeleteScene: (index: number) => void
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const WEIGHT_OPTIONS = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
]

const DIRECTION_OPTIONS = [
  { value: 'to bottom', label: 'Prema dolje' },
  { value: 'to top', label: 'Prema gore' },
  { value: 'to right', label: 'Prema desno' },
  { value: 'to left', label: 'Prema lijevo' },
  { value: 'to bottom right', label: 'Dijagonalno (DR)' },
  { value: 'to bottom left', label: 'Dijagonalno (DL)' },
  { value: 'to top right', label: 'Dijagonalno (GR)' },
  { value: 'to top left', label: 'Dijagonalno (GL)' },
]

const OVERLAY_TYPE_OPTIONS: { value: OverlayLayer['type']; label: string }[] = [
  { value: 'logo', label: 'Logo' },
  { value: 'badge', label: 'Značka' },
  { value: 'shape', label: 'Oblik' },
  { value: 'image', label: 'Slika' },
]

const DEFAULT_SECTIONS = new Set(['duration', 'background', 'text'])

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function SceneEditor({
  scene,
  sceneIndex,
  totalScenes,
  onUpdateScene,
  onDeleteScene,
}: SceneEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(DEFAULT_SECTIONS),
  )

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  /* ---- Null state ---- */
  if (!scene) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-studio-surface-2 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-5 h-5 text-studio-text-disabled" />
          </div>
          <p className="text-xs text-studio-text-tertiary leading-relaxed">
            Odaberi scenu za uređivanje
          </p>
        </div>
      </div>
    )
  }

  /* ---- Update helpers (immutable) ---- */
  const update = (patch: Partial<Scene>) => {
    onUpdateScene(sceneIndex, { ...scene, ...patch })
  }

  const updateBg = (patch: Partial<SceneBackground>) => {
    update({ background: { ...scene.background, ...patch } })
  }

  const updateTextLayer = (idx: number, patch: Partial<TextLayer>) => {
    const layers = scene.text_layers.map((l, i) =>
      i === idx ? { ...l, ...patch } as TextLayer : l,
    )
    update({ text_layers: layers })
  }

  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: `text_${Date.now()}`,
      text: 'Novi tekst',
      position: { x: 50, y: 50 },
      font_size: 48,
      font_family: 'Tektur',
      font_weight: '700',
      color: '#FFFFFF',
      text_align: 'center',
      animation: 'fade_in',
      animation_delay: 0,
    }
    update({ text_layers: [...scene.text_layers, newLayer] })
  }

  const removeTextLayer = (idx: number) => {
    update({ text_layers: scene.text_layers.filter((_, i) => i !== idx) })
  }

  const moveTextLayer = (idx: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= scene.text_layers.length) return
    const layers = [...scene.text_layers]
    const tmp = layers[idx]!
    layers[idx] = layers[target]!
    layers[target] = tmp
    update({ text_layers: layers })
  }

  const updateOverlay = (idx: number, patch: Partial<OverlayLayer>) => {
    const layers = scene.overlay_layers.map((l, i) =>
      i === idx ? { ...l, ...patch } as OverlayLayer : l,
    )
    update({ overlay_layers: layers })
  }

  const addOverlay = () => {
    const newOverlay: OverlayLayer = {
      id: `overlay_${Date.now()}`,
      type: 'logo',
      position: { x: 50, y: 50 },
      size: 80,
      animation: 'fade_in',
      animation_delay: 0,
      opacity: 1,
    }
    update({ overlay_layers: [...scene.overlay_layers, newOverlay] })
  }

  const removeOverlay = (idx: number) => {
    update({ overlay_layers: scene.overlay_layers.filter((_, i) => i !== idx) })
  }

  /* ================================================================ */
  /* Render                                                            */
  /* ================================================================ */
  return (
    <div className="h-full overflow-y-auto studio-scrollbar">
      {/* ── Scene Header (always visible) ─────────────────────── */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-studio-border-subtle">
        <span className="font-headline text-[11px] font-semibold uppercase tracking-[1.5px] text-studio-text-primary">
          Scena {sceneIndex + 1}{' '}
          <span className="text-studio-text-tertiary font-body">/ {totalScenes}</span>
        </span>
        <button
          onClick={() => onDeleteScene(sceneIndex)}
          disabled={totalScenes <= 1}
          className="p-1.5 rounded-md text-studio-text-tertiary hover:text-studio-error hover:bg-studio-error/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Obriši scenu"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Duration & Transition ─────────────────────────────── */}
      <CollapsibleSection
        id="duration"
        icon={<Clock className="w-3.5 h-3.5" />}
        title="TRAJANJE I TRANZICIJA"
        expanded={expandedSections.has('duration')}
        onToggle={() => toggleSection('duration')}
      >
        {/* Duration slider + number */}
        <FieldRow label="Trajanje">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={scene.duration}
              onChange={(e) => update({ duration: parseFloat(e.target.value) })}
              className="flex-1 h-1 accent-[#B8FF00] bg-studio-surface-3 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#B8FF00]
                [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(184,255,0,0.4)]"
            />
            <NumberInput
              value={scene.duration}
              min={0.5}
              max={10}
              step={0.5}
              onChange={(v) => update({ duration: v })}
              suffix="s"
            />
          </div>
        </FieldRow>

        {/* Transition select — visual picker with preview */}
        <FieldRow label="Tranzicija">
          <TransitionPicker
            value={scene.transition}
            onChange={(v) => update({ transition: v as TransitionType })}
            options={TRANSITION_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
          />
        </FieldRow>
      </CollapsibleSection>

      {/* ── Background ────────────────────────────────────────── */}
      <CollapsibleSection
        id="background"
        icon={<Palette className="w-3.5 h-3.5" />}
        title="POZADINA"
        expanded={expandedSections.has('background')}
        onToggle={() => toggleSection('background')}
      >
        {/* Segment tabs */}
        <div className="bg-studio-surface-1 rounded-lg p-0.5 flex mb-2.5">
          {(['gradient', 'color', 'image'] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateBg({ type: t })}
              className={`flex-1 px-3 py-1 rounded-md text-[10px] font-medium transition-colors ${
                scene.background.type === t
                  ? 'bg-studio-surface-3 text-studio-text-primary'
                  : 'text-studio-text-tertiary hover:text-studio-text-secondary'
              }`}
            >
              {t === 'gradient' ? 'Gradijent' : t === 'color' ? 'Boja' : 'Slika'}
            </button>
          ))}
        </div>

        {/* Gradient controls */}
        {scene.background.type === 'gradient' && (() => {
          const colors = scene.background.colors ?? ['#0A1A28', '#0057A8']
          const c1 = colors[0] ?? '#0A1A28'
          const c2 = colors[1] ?? '#0057A8'
          return (
          <div className="space-y-2.5">
            <ColorFieldRow
              label="Boja 1"
              value={c1}
              onChange={(v) => {
                updateBg({ colors: [v, c2] })
              }}
            />
            <ColorFieldRow
              label="Boja 2"
              value={c2}
              onChange={(v) => {
                updateBg({ colors: [c1, v] })
              }}
            />
            <FieldRow label="Smjer">
              <StudioSelect
                value={scene.background.direction || 'to bottom'}
                onChange={(v) => updateBg({ direction: v })}
                options={DIRECTION_OPTIONS}
              />
            </FieldRow>
          </div>
          )
        })()}

        {/* Solid color controls */}
        {scene.background.type === 'color' && (
          <ColorFieldRow
            label="Boja"
            value={scene.background.color || '#0A1A28'}
            onChange={(v) => updateBg({ color: v })}
          />
        )}

        {/* Image controls */}
        {scene.background.type === 'image' && (
          <div className="space-y-2.5">
            {/* Upload placeholder */}
            <div className="border border-dashed border-studio-border rounded-lg p-4 text-center cursor-pointer hover:border-studio-border-hover transition-colors">
              <Upload className="w-5 h-5 text-studio-text-disabled mx-auto mb-1.5" />
              <p className="text-[10px] text-studio-text-tertiary">
                {scene.background.src ? scene.background.src.split('/').pop() : 'Odaberi ili povuci sliku'}
              </p>
            </div>
            <FieldRow label="Prekrivanje">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={scene.background.overlay_opacity ?? 0.5}
                  onChange={(e) => updateBg({ overlay_opacity: parseFloat(e.target.value) })}
                  className="flex-1 h-1 accent-[#B8FF00] bg-studio-surface-3 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#B8FF00]
                    [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(184,255,0,0.4)]"
                />
                <NumberInput
                  value={scene.background.overlay_opacity ?? 0.5}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => updateBg({ overlay_opacity: v })}
                />
              </div>
            </FieldRow>
            <ColorFieldRow
              label="Boja prekr."
              value={scene.background.overlay_color || '#000000'}
              onChange={(v) => updateBg({ overlay_color: v })}
            />
          </div>
        )}
      </CollapsibleSection>

      {/* ── Text Layers ───────────────────────────────────────── */}
      <CollapsibleSection
        id="text"
        icon={<Type className="w-3.5 h-3.5" />}
        title={`TEKST (${scene.text_layers.length})`}
        expanded={expandedSections.has('text')}
        onToggle={() => toggleSection('text')}
        action={
          <button
            onClick={(e) => { e.stopPropagation(); addTextLayer() }}
            className="p-1 rounded-md text-studio-text-tertiary hover:text-dinamo-accent hover:bg-dinamo-accent/10 transition-colors"
            title="Dodaj tekst"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="space-y-2">
          {scene.text_layers.map((layer, i) => (
            <TextLayerCard
              key={layer.id}
              layer={layer}
              index={i}
              total={scene.text_layers.length}
              onUpdate={(patch) => updateTextLayer(i, patch)}
              onRemove={() => removeTextLayer(i)}
              onMove={(dir) => moveTextLayer(i, dir)}
            />
          ))}
          {scene.text_layers.length === 0 && (
            <button
              onClick={addTextLayer}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-studio-border text-studio-text-tertiary hover:border-dinamo-accent hover:text-dinamo-accent transition-colors text-[10px]"
            >
              <Plus className="w-3 h-3" /> Dodaj tekst
            </button>
          )}
        </div>
      </CollapsibleSection>

      {/* ── Overlay Layers ────────────────────────────────────── */}
      <CollapsibleSection
        id="overlays"
        icon={<Layers className="w-3.5 h-3.5" />}
        title={`SLOJEVI (${scene.overlay_layers.length})`}
        expanded={expandedSections.has('overlays')}
        onToggle={() => toggleSection('overlays')}
        action={
          <button
            onClick={(e) => { e.stopPropagation(); addOverlay() }}
            className="p-1 rounded-md text-studio-text-tertiary hover:text-dinamo-accent hover:bg-dinamo-accent/10 transition-colors"
            title="Dodaj sloj"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="space-y-2">
          {scene.overlay_layers.map((overlay, i) => (
            <OverlayCard
              key={overlay.id}
              overlay={overlay}
              onUpdate={(patch) => updateOverlay(i, patch)}
              onRemove={() => removeOverlay(i)}
            />
          ))}
          {scene.overlay_layers.length === 0 && (
            <button
              onClick={addOverlay}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-studio-border text-studio-text-tertiary hover:border-dinamo-accent hover:text-dinamo-accent transition-colors text-[10px]"
            >
              <Plus className="w-3 h-3" /> Dodaj sloj
            </button>
          )}
        </div>
      </CollapsibleSection>

      {/* Bottom spacer */}
      <div className="h-4" />
    </div>
  )
}

/* ================================================================== */
/* CollapsibleSection                                                   */
/* ================================================================== */

function CollapsibleSection({
  id: _id,
  icon,
  title,
  expanded,
  onToggle,
  action,
  children,
}: {
  id: string
  icon: React.ReactNode
  title: string
  expanded: boolean
  onToggle: () => void
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-studio-border-subtle">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        className="w-full flex items-center gap-2 py-2.5 px-3 hover:bg-studio-surface-2 rounded transition-colors group cursor-pointer select-none"
      >
        <span className="text-studio-text-tertiary group-hover:text-studio-text-secondary transition-colors">
          {icon}
        </span>
        <span className="font-headline text-[10px] font-semibold uppercase tracking-[1.5px] text-studio-text-secondary flex-1 text-left">
          {title}
        </span>
        {action && <span className="mr-1" onClick={(e) => e.stopPropagation()}>{action}</span>}
        <ChevronDown
          className={`w-3 h-3 text-studio-text-tertiary transition-transform duration-200 ${
            expanded ? '' : '-rotate-90'
          }`}
        />
      </div>

      {/* Content with smooth transition */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 space-y-2.5">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* TextLayerCard                                                        */
/* ================================================================== */

function TextLayerCard({
  layer,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  layer: TextLayer
  index: number
  total: number
  onUpdate: (patch: Partial<TextLayer>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  return (
    <div className="bg-studio-surface-1 rounded-lg border border-studio-border-subtle p-3 space-y-2">
      {/* Card header */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-studio-text-primary truncate flex-1">
          Layer {index + 1}: &ldquo;{layer.text.slice(0, 20)}{layer.text.length > 20 ? '...' : ''}&rdquo;
        </span>
        <button
          onClick={() => onMove('up')}
          disabled={index === 0}
          className="p-0.5 rounded text-studio-text-disabled hover:text-studio-text-secondary transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Pomakni gore"
        >
          <ArrowUp className="w-3 h-3" />
        </button>
        <button
          onClick={() => onMove('down')}
          disabled={index === total - 1}
          className="p-0.5 rounded text-studio-text-disabled hover:text-studio-text-secondary transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Pomakni dolje"
        >
          <ArrowDown className="w-3 h-3" />
        </button>
        <button
          onClick={onRemove}
          className="p-0.5 rounded text-studio-text-disabled hover:text-studio-error transition-colors"
          title="Obriši"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Text content */}
      <textarea
        value={layer.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        rows={2}
        className="w-full bg-studio-surface-1 border border-studio-border rounded-md px-2 py-1.5 text-xs text-studio-text-primary placeholder:text-studio-text-disabled resize-none focus:outline-none focus:border-dinamo-accent focus:ring-1 focus:ring-dinamo-accent/20 transition-colors"
        placeholder="Tekst..."
      />

      {/* Font family */}
      <FieldRow label="Font">
        <StudioSelect
          value={layer.font_family}
          onChange={(v) => onUpdate({ font_family: v })}
          options={FONT_OPTIONS.map((f) => ({ value: f, label: f }))}
        />
      </FieldRow>

      {/* Font weight */}
      <FieldRow label="Težina">
        <StudioSelect
          value={layer.font_weight}
          onChange={(v) => onUpdate({ font_weight: v })}
          options={WEIGHT_OPTIONS}
        />
      </FieldRow>

      {/* Font size */}
      <FieldRow label="Veličina">
        <div className="flex items-center gap-1.5">
          <NumberInput
            value={layer.font_size}
            min={8}
            max={200}
            step={1}
            onChange={(v) => onUpdate({ font_size: v })}
          />
          <span className="text-[10px] text-studio-text-disabled">px</span>
        </div>
      </FieldRow>

      {/* Color */}
      <ColorFieldRow
        label="Boja"
        value={layer.color}
        onChange={(v) => onUpdate({ color: v })}
      />

      {/* Alignment */}
      <FieldRow label="Poravnanje">
        <div className="flex gap-0.5 bg-studio-surface-1 rounded-md border border-studio-border p-0.5">
          {([
            { value: 'left', icon: AlignLeft },
            { value: 'center', icon: AlignCenter },
            { value: 'right', icon: AlignRight },
          ] as const).map(({ value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onUpdate({ text_align: value })}
              className={`p-1 rounded transition-colors ${
                layer.text_align === value
                  ? 'bg-studio-surface-3 text-studio-text-primary'
                  : 'text-studio-text-disabled hover:text-studio-text-secondary'
              }`}
              title={value === 'left' ? 'Lijevo' : value === 'center' ? 'Sredina' : 'Desno'}
            >
              <Icon className="w-3 h-3" />
            </button>
          ))}
        </div>
      </FieldRow>

      {/* Position */}
      <FieldRow label="Pozicija">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-studio-text-disabled">X</span>
          <NumberInput
            value={layer.position.x}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onUpdate({ position: { ...layer.position, x: v } })}
            suffix="%"
          />
          <span className="text-[9px] text-studio-text-disabled">Y</span>
          <NumberInput
            value={layer.position.y}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onUpdate({ position: { ...layer.position, y: v } })}
            suffix="%"
          />
        </div>
      </FieldRow>

      {/* Animation — visual picker with categories & preview */}
      <FieldRow label="Animacija">
        <AnimationPicker
          value={layer.animation}
          onChange={(v) => onUpdate({ animation: v as AnimationType })}
        />
      </FieldRow>

      {/* Animation delay */}
      <FieldRow label="Kašnjenje">
        <NumberInput
          value={layer.animation_delay}
          min={0}
          max={10}
          step={0.1}
          onChange={(v) => onUpdate({ animation_delay: v })}
          suffix="s"
        />
      </FieldRow>
    </div>
  )
}

/* ================================================================== */
/* OverlayCard                                                          */
/* ================================================================== */

function OverlayCard({
  overlay,
  onUpdate,
  onRemove,
}: {
  overlay: OverlayLayer
  onUpdate: (patch: Partial<OverlayLayer>) => void
  onRemove: () => void
}) {
  return (
    <div className="bg-studio-surface-1 rounded-lg border border-studio-border-subtle p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-studio-text-primary truncate flex-1 capitalize">
          {overlay.type}{overlay.src ? `: ${overlay.src.split('/').pop()}` : ''}
        </span>
        <button
          onClick={onRemove}
          className="p-0.5 rounded text-studio-text-disabled hover:text-studio-error transition-colors"
          title="Obriši"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Type */}
      <FieldRow label="Vrsta">
        <StudioSelect
          value={overlay.type}
          onChange={(v) => onUpdate({ type: v as OverlayLayer['type'] })}
          options={OVERLAY_TYPE_OPTIONS}
        />
      </FieldRow>

      {/* Position */}
      <FieldRow label="Pozicija">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-studio-text-disabled">X</span>
          <NumberInput
            value={overlay.position.x}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onUpdate({ position: { ...overlay.position, x: v } })}
            suffix="%"
          />
          <span className="text-[9px] text-studio-text-disabled">Y</span>
          <NumberInput
            value={overlay.position.y}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onUpdate({ position: { ...overlay.position, y: v } })}
            suffix="%"
          />
        </div>
      </FieldRow>

      {/* Size */}
      <FieldRow label="Veličina">
        <NumberInput
          value={overlay.size}
          min={8}
          max={500}
          step={1}
          onChange={(v) => onUpdate({ size: v })}
          suffix="px"
        />
      </FieldRow>

      {/* Opacity */}
      <FieldRow label="Prozirnost">
        <div className="flex items-center gap-2 flex-1">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={overlay.opacity ?? 1}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="flex-1 h-1 accent-[#B8FF00] bg-studio-surface-3 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#B8FF00]
              [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(184,255,0,0.4)]"
          />
          <NumberInput
            value={overlay.opacity ?? 1}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => onUpdate({ opacity: v })}
          />
        </div>
      </FieldRow>

      {/* Animation */}
      <FieldRow label="Animacija">
        <AnimationPicker
          value={overlay.animation}
          onChange={(v) => onUpdate({ animation: v as AnimationType })}
        />
      </FieldRow>

      {/* Animation delay */}
      <FieldRow label="Kašnjenje">
        <NumberInput
          value={overlay.animation_delay}
          min={0}
          max={10}
          step={0.1}
          onChange={(v) => onUpdate({ animation_delay: v })}
          suffix="s"
        />
      </FieldRow>
    </div>
  )
}

/* ================================================================== */
/* Primitive UI components                                              */
/* ================================================================== */

/** Label + content row */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-studio-text-tertiary w-[68px] shrink-0 truncate">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

/** Color swatch + hex input row */
function ColorFieldRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-1.5">
        <div className="relative w-6 h-6 shrink-0">
          <div
            className="w-6 h-6 rounded border border-studio-border cursor-pointer"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-studio-surface-1 border border-studio-border rounded-md px-2 py-1 text-[10px] font-mono text-studio-text-primary placeholder:text-studio-text-disabled focus:outline-none focus:border-dinamo-accent focus:ring-1 focus:ring-dinamo-accent/20 transition-colors uppercase"
        />
      </div>
    </FieldRow>
  )
}

/** Compact number input */
function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <div className="relative inline-flex items-center">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
        }}
        className={`w-14 bg-studio-surface-1 border border-studio-border rounded-md py-1 text-xs font-mono text-center text-studio-text-primary focus:outline-none focus:border-dinamo-accent focus:ring-1 focus:ring-dinamo-accent/20 transition-colors appearance-none
          [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
          ${suffix ? 'pr-4 pl-1.5' : 'px-1.5'}`}
      />
      {suffix && (
        <span className="absolute right-1.5 text-[9px] text-studio-text-disabled pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  )
}

/** Styled select dropdown */
function StudioSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-studio-surface-1 border border-studio-border rounded-md px-2 py-1 text-xs text-studio-text-primary appearance-none cursor-pointer focus:outline-none focus:border-dinamo-accent focus:ring-1 focus:ring-dinamo-accent/20 transition-colors pr-6"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-studio-text-disabled pointer-events-none" />
    </div>
  )
}
