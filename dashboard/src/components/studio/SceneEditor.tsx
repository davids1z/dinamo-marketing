import { useState } from 'react'
import { Trash2, Plus, Type, Layers, Clock, Palette, ChevronDown, ChevronRight } from 'lucide-react'
import type { Scene, TextLayer, AnimationType, TransitionType } from '../../types/studio'
import { ANIMATION_OPTIONS, TRANSITION_OPTIONS, FONT_OPTIONS } from '../../types/studio'

interface SceneEditorProps {
  scene: Scene | null
  sceneIndex: number
  onChange: (scene: Scene) => void
  onDelete: () => void
}

export default function SceneEditor({ scene, sceneIndex, onChange, onDelete }: SceneEditorProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('background')

  if (!scene) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        <p>Odaberi scenu za uređivanje</p>
      </div>
    )
  }

  const toggle = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const updateBg = (updates: Record<string, unknown>) => {
    onChange({ ...scene, background: { ...scene.background, ...updates } })
  }

  const updateTextLayer = (index: number, updates: Partial<TextLayer>) => {
    const layers = [...scene.text_layers]
    layers[index] = { ...layers[index], ...updates } as TextLayer
    onChange({ ...scene, text_layers: layers })
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
    onChange({ ...scene, text_layers: [...scene.text_layers, newLayer] })
  }

  const removeTextLayer = (index: number) => {
    const layers = scene.text_layers.filter((_, i) => i !== index)
    onChange({ ...scene, text_layers: layers })
  }

  return (
    <div className="space-y-1">
      {/* Scene header */}
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-bold text-gray-700">Scena {sceneIndex + 1}</h3>
        <button
          onClick={onDelete}
          className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          title="Obriši scenu"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Duration */}
      <div className="px-3 py-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[11px] text-gray-500 w-16">Trajanje</span>
          <input
            type="number"
            min={0.5}
            max={30}
            step={0.5}
            value={scene.duration}
            onChange={(e) => onChange({ ...scene, duration: parseFloat(e.target.value) || 3 })}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-dinamo-accent/50"
          />
          <span className="text-[10px] text-gray-400">s</span>
        </div>
      </div>

      {/* Transition */}
      <div className="px-3 py-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[11px] text-gray-500 w-16">Tranzicija</span>
          <select
            value={scene.transition}
            onChange={(e) => onChange({ ...scene, transition: e.target.value as TransitionType })}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-dinamo-accent/50 bg-white"
          >
            {TRANSITION_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Background Section */}
      <Section
        title="Pozadina"
        icon={<Palette className="w-3.5 h-3.5" />}
        expanded={expandedSection === 'background'}
        onToggle={() => toggle('background')}
      >
        <div className="space-y-2 px-3 pb-2">
          <div className="flex gap-1.5">
            {(['gradient', 'color', 'image'] as const).map((t) => (
              <button
                key={t}
                onClick={() => updateBg({ type: t })}
                className={`flex-1 text-[10px] py-1 rounded-md transition-colors ${
                  scene.background.type === t
                    ? 'bg-dinamo-accent/15 text-dinamo-accent-dark font-medium'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t === 'gradient' ? 'Gradijent' : t === 'color' ? 'Boja' : 'Slika'}
              </button>
            ))}
          </div>

          {scene.background.type === 'color' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">Boja</span>
              <input
                type="color"
                value={scene.background.color || '#0A1A28'}
                onChange={(e) => updateBg({ color: e.target.value })}
                className="w-8 h-6 rounded cursor-pointer border border-gray-200"
              />
              <input
                type="text"
                value={scene.background.color || '#0A1A28'}
                onChange={(e) => updateBg({ color: e.target.value })}
                className="flex-1 text-[10px] border border-gray-200 rounded px-2 py-0.5"
              />
            </div>
          )}

          {scene.background.type === 'gradient' && (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                {(scene.background.colors || ['#0A1A28', '#0057A8']).map((c, i) => (
                  <div key={i} className="flex items-center gap-1 flex-1">
                    <input
                      type="color"
                      value={c}
                      onChange={(e) => {
                        const cols = [...(scene.background.colors || ['#0A1A28', '#0057A8'])]
                        cols[i] = e.target.value
                        updateBg({ colors: cols })
                      }}
                      className="w-6 h-5 rounded cursor-pointer border border-gray-200"
                    />
                    <input
                      type="text"
                      value={c}
                      onChange={(e) => {
                        const cols = [...(scene.background.colors || ['#0A1A28', '#0057A8'])]
                        cols[i] = e.target.value
                        updateBg({ colors: cols })
                      }}
                      className="flex-1 text-[9px] border border-gray-200 rounded px-1.5 py-0.5"
                    />
                  </div>
                ))}
              </div>
              <select
                value={scene.background.direction || 'to bottom'}
                onChange={(e) => updateBg({ direction: e.target.value })}
                className="w-full text-[10px] border border-gray-200 rounded px-2 py-1 bg-white"
              >
                <option value="to bottom">Odozgo prema dolje</option>
                <option value="to right">S lijeva na desno</option>
                <option value="to bottom right">Dijagonalno</option>
                <option value="to top">Odozdo prema gore</option>
              </select>
            </div>
          )}
        </div>
      </Section>

      {/* Text Layers Section */}
      <Section
        title={`Tekst (${scene.text_layers.length})`}
        icon={<Type className="w-3.5 h-3.5" />}
        expanded={expandedSection === 'text'}
        onToggle={() => toggle('text')}
      >
        <div className="space-y-3 px-3 pb-2">
          {scene.text_layers.map((tl, i) => (
            <TextLayerEditor
              key={tl.id}
              layer={tl}
              onChange={(updates) => updateTextLayer(i, updates)}
              onRemove={() => removeTextLayer(i)}
            />
          ))}
          {scene.text_layers.length < 3 && (
            <button
              onClick={addTextLayer}
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-dinamo-accent hover:text-dinamo-accent-dark transition-colors text-[10px]"
            >
              <Plus className="w-3 h-3" /> Dodaj tekst
            </button>
          )}
        </div>
      </Section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function Section({ title, icon, expanded, onToggle, children }: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-gray-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-400">{icon}</span>
        <span className="text-[11px] font-medium text-gray-600 flex-1 text-left">{title}</span>
        {expanded
          ? <ChevronDown className="w-3 h-3 text-gray-400" />
          : <ChevronRight className="w-3 h-3 text-gray-400" />
        }
      </button>
      {expanded && children}
    </div>
  )
}

function TextLayerEditor({ layer, onChange, onRemove }: {
  layer: TextLayer
  onChange: (updates: Partial<TextLayer>) => void
  onRemove: () => void
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 space-y-1.5 relative group">
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* Text content */}
      <textarea
        value={layer.text}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={2}
        className="w-full text-[11px] border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:border-dinamo-accent/50 resize-none"
        placeholder="Tekst..."
      />

      {/* Font row */}
      <div className="flex gap-1.5">
        <select
          value={layer.font_family}
          onChange={(e) => onChange({ font_family: e.target.value })}
          className="flex-1 text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <input
          type="number"
          value={layer.font_size}
          onChange={(e) => onChange({ font_size: parseInt(e.target.value) || 48 })}
          className="w-14 text-[10px] border border-gray-200 rounded px-1.5 py-0.5 text-center"
          min={8}
          max={200}
        />
        <input
          type="color"
          value={layer.color}
          onChange={(e) => onChange({ color: e.target.value })}
          className="w-6 h-5 rounded cursor-pointer border border-gray-200"
        />
      </div>

      {/* Position row */}
      <div className="flex gap-1.5 items-center">
        <span className="text-[9px] text-gray-400 w-4">X</span>
        <input
          type="range"
          min={0}
          max={100}
          value={layer.position.x}
          onChange={(e) => onChange({ position: { ...layer.position, x: parseInt(e.target.value) } })}
          className="flex-1 h-1 accent-dinamo-accent"
        />
        <span className="text-[9px] text-gray-400 w-4">Y</span>
        <input
          type="range"
          min={0}
          max={100}
          value={layer.position.y}
          onChange={(e) => onChange({ position: { ...layer.position, y: parseInt(e.target.value) } })}
          className="flex-1 h-1 accent-dinamo-accent"
        />
      </div>

      {/* Animation row */}
      <div className="flex gap-1.5">
        <select
          value={layer.animation}
          onChange={(e) => onChange({ animation: e.target.value as AnimationType })}
          className="flex-1 text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white"
        >
          {ANIMATION_OPTIONS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
        <input
          type="number"
          value={layer.animation_delay}
          onChange={(e) => onChange({ animation_delay: parseFloat(e.target.value) || 0 })}
          className="w-14 text-[10px] border border-gray-200 rounded px-1.5 py-0.5 text-center"
          min={0}
          max={10}
          step={0.1}
          title="Kašnjenje (s)"
        />
      </div>
    </div>
  )
}
