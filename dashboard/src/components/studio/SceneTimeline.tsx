import { Plus } from 'lucide-react'
import type { Scene } from '../../types/studio'

interface SceneTimelineProps {
  scenes: Scene[]
  currentIndex: number
  onSelect: (index: number) => void
  onAdd: () => void
  totalDuration: number
}

export default function SceneTimeline({
  scenes,
  currentIndex,
  onSelect,
  onAdd,
  totalDuration,
}: SceneTimelineProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vremenska crta</h3>
        <span className="text-[10px] text-gray-400">{totalDuration.toFixed(1)}s ukupno</span>
      </div>
      <div className="scene-timeline">
        {scenes.map((scene, i) => (
          <button
            key={scene.id}
            onClick={() => onSelect(i)}
            className={`scene-thumb ${i === currentIndex ? 'active' : ''}`}
            style={getThumbBg(scene)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-[10px] drop-shadow-md">
                {i + 1}
              </span>
            </div>
            <div className="duration-badge">{scene.duration}s</div>
          </button>
        ))}

        {/* Add scene button */}
        <button
          onClick={onAdd}
          className="scene-thumb border-2 border-dashed border-gray-300 hover:border-dinamo-accent bg-gray-50 flex items-center justify-center"
        >
          <Plus className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Progress bar */}
      {scenes.length > 0 && (
        <div className="flex gap-0.5 mt-2">
          {scenes.map((scene, i) => {
            const widthPct = totalDuration > 0 ? (scene.duration / totalDuration) * 100 : 0
            return (
              <div
                key={scene.id}
                className={`h-1 rounded-full transition-all cursor-pointer ${
                  i === currentIndex ? 'bg-dinamo-accent' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                style={{ width: `${widthPct}%` }}
                onClick={() => onSelect(i)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function getThumbBg(scene: Scene): React.CSSProperties {
  const bg = scene.background
  if (bg.type === 'gradient' && bg.colors) {
    return { background: `linear-gradient(${bg.direction || 'to bottom'}, ${bg.colors.join(', ')})` }
  }
  if (bg.type === 'color' && bg.color) {
    return { backgroundColor: bg.color }
  }
  return { backgroundColor: '#0A1A28' }
}
