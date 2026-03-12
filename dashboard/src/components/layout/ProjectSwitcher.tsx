import { useState, useRef, useEffect } from 'react'
import { ChevronDown, FolderKanban } from 'lucide-react'
import { useProject } from '../../contexts/ProjectContext'

export default function ProjectSwitcher() {
  const { projects, currentProject, switchProject } = useProject()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!currentProject) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary/50 hover:bg-brand-primary/70 transition-colors text-sm"
      >
        <FolderKanban size={16} className="text-brand-accent" />
        <span className="text-white/90 font-medium truncate max-w-[140px]">{currentProject.project_name}</span>
        <ChevronDown size={14} className={`text-white/60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a2332] border border-white/10 rounded-lg shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
          {projects.map((p) => (
            <button
              key={p.project_id}
              onClick={() => { switchProject(p.project_id); setOpen(false) }}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors ${
                p.project_id === currentProject.project_id ? 'bg-brand-accent/10 border-l-2 border-brand-accent' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-md bg-brand-primary/80 flex items-center justify-center text-brand-accent font-bold text-xs">
                <FolderKanban size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/90 font-medium truncate">{p.project_name}</div>
                <div className="text-xs text-white/40">{p.project_slug}</div>
              </div>
              {p.project_id === currentProject.project_id && (
                <div className="w-2 h-2 rounded-full bg-brand-accent" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
