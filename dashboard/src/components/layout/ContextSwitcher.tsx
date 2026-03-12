import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, FolderKanban } from 'lucide-react'
import { useClient } from '../../contexts/ClientContext'
import { useProject } from '../../contexts/ProjectContext'

type Panel = 'closed' | 'client' | 'project'

export default function ContextSwitcher() {
  const { clients, currentClient, switchClient } = useClient()
  const { projects, currentProject, switchProject } = useProject()
  const [panel, setPanel] = useState<Panel>('closed')
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPanel('closed')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!currentClient) return null

  return (
    <div ref={ref} className="relative">
      {/* Trigger bar */}
      <div className="flex items-center bg-studio-surface-1 border border-studio-border rounded-xl overflow-hidden transition-all hover:border-brand-accent/30">
        {/* Client segment */}
        <button
          onClick={() => setPanel(panel === 'client' ? 'closed' : 'client')}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-studio-surface-2 transition-colors"
        >
          <div className="w-6 h-6 rounded-lg bg-brand-accent/15 flex items-center justify-center flex-shrink-0">
            {currentClient.client_logo_url ? (
              <img src={currentClient.client_logo_url} className="w-4 h-4 rounded" alt="" />
            ) : (
              <span className="text-[10px] font-bold text-brand-accent">
                {currentClient.client_name?.[0]?.toUpperCase() || 'K'}
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-studio-text-primary truncate max-w-[120px]">
            {currentClient.client_name}
          </span>
          <ChevronDown
            size={12}
            className={`text-studio-text-tertiary transition-transform ${panel === 'client' ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-studio-border" />

        {/* Project segment */}
        <button
          onClick={() => setPanel(panel === 'project' ? 'closed' : 'project')}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-studio-surface-2 transition-colors"
        >
          <FolderKanban size={13} className="text-studio-text-tertiary flex-shrink-0" />
          <span className="text-sm text-studio-text-secondary truncate max-w-[120px]">
            {currentProject?.project_name || 'Odaberi projekt'}
          </span>
          <ChevronDown
            size={12}
            className={`text-studio-text-tertiary transition-transform ${panel === 'project' ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Dropdown panel */}
      {panel !== 'closed' && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setPanel('closed')} />

          <div className="absolute top-full left-0 mt-2 w-80 bg-studio-surface-1 border border-studio-border rounded-2xl shadow-studio-dropdown z-50 overflow-hidden animate-fade-in">
            {/* Tab header */}
            <div className="flex border-b border-studio-border">
              <button
                onClick={() => setPanel('client')}
                className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  panel === 'client'
                    ? 'text-brand-accent border-b-2 border-brand-accent bg-brand-accent/5'
                    : 'text-studio-text-tertiary hover:text-studio-text-secondary'
                }`}
              >
                <Building2 size={12} className="inline mr-1.5 -mt-0.5" />
                Klijent
              </button>
              <button
                onClick={() => setPanel('project')}
                className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  panel === 'project'
                    ? 'text-brand-accent border-b-2 border-brand-accent bg-brand-accent/5'
                    : 'text-studio-text-tertiary hover:text-studio-text-secondary'
                }`}
              >
                <FolderKanban size={12} className="inline mr-1.5 -mt-0.5" />
                Projekt
              </button>
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto py-1">
              {panel === 'client' &&
                clients.map((c) => (
                  <button
                    key={c.client_id}
                    onClick={() => {
                      switchClient(c.client_id)
                      setPanel('closed')
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-studio-surface-2 transition-colors ${
                      c.client_id === currentClient.client_id
                        ? 'bg-brand-accent/5 border-l-2 border-brand-accent'
                        : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-studio-surface-3 flex items-center justify-center flex-shrink-0">
                      {c.client_logo_url ? (
                        <img src={c.client_logo_url} className="w-5 h-5 rounded" alt="" />
                      ) : (
                        <span className="text-xs font-bold text-brand-accent">
                          {c.client_name?.[0]?.toUpperCase() || 'K'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-studio-text-primary font-medium truncate">
                        {c.client_name}
                      </div>
                      <div className="text-[11px] text-studio-text-tertiary capitalize">{c.role}</div>
                    </div>
                    {c.client_id === currentClient.client_id && (
                      <div className="w-2 h-2 rounded-full bg-brand-accent flex-shrink-0" />
                    )}
                  </button>
                ))}

              {panel === 'project' &&
                (projects.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <FolderKanban className="w-6 h-6 text-studio-text-disabled mx-auto mb-2" />
                    <p className="text-sm text-studio-text-secondary">Nema projekata</p>
                  </div>
                ) : (
                  projects.map((p) => (
                    <button
                      key={p.project_id}
                      onClick={() => {
                        switchProject(p.project_id)
                        setPanel('closed')
                      }}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-studio-surface-2 transition-colors ${
                        p.project_id === currentProject?.project_id
                          ? 'bg-brand-accent/5 border-l-2 border-brand-accent'
                          : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-studio-surface-3 flex items-center justify-center flex-shrink-0">
                        <FolderKanban size={14} className="text-brand-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-studio-text-primary font-medium truncate">
                          {p.project_name}
                        </div>
                        <div className="text-[11px] text-studio-text-tertiary">{p.project_slug}</div>
                      </div>
                      {p.project_id === currentProject?.project_id && (
                        <div className="w-2 h-2 rounded-full bg-brand-accent flex-shrink-0" />
                      )}
                    </button>
                  ))
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
