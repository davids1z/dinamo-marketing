import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, FolderKanban, Sparkles } from 'lucide-react'
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

  // AI context is "active" when the client has a business description filled in
  const hasAiContext = currentClient.onboarding_completed

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      {/* Breadcrumb-style switcher */}
      <div className="flex items-center">
        {/* Client */}
        <button
          onClick={() => setPanel(panel === 'client' ? 'closed' : 'client')}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-studio-surface-2 transition-colors group"
        >
          <span className="text-sm font-semibold text-studio-text-primary truncate max-w-[140px]">
            {currentClient.client_name}
          </span>
          <ChevronDown
            size={12}
            className={`text-studio-text-tertiary group-hover:text-studio-text-secondary transition-transform ${panel === 'client' ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Breadcrumb separator */}
        <span className="text-studio-text-tertiary mx-0.5 text-sm">/</span>

        {/* Project */}
        <button
          onClick={() => setPanel(panel === 'project' ? 'closed' : 'project')}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-studio-surface-2 transition-colors group"
        >
          <FolderKanban size={13} className="text-studio-text-tertiary flex-shrink-0" />
          <span className="text-sm text-studio-text-secondary truncate max-w-[140px]">
            {currentProject?.project_name || 'Odaberi projekt'}
          </span>
          <ChevronDown
            size={12}
            className={`text-studio-text-tertiary group-hover:text-studio-text-secondary transition-transform ${panel === 'project' ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* AI Context Status */}
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium ${
          hasAiContext
            ? 'bg-brand-accent/10 text-brand-accent'
            : 'bg-amber-500/10 text-amber-400'
        }`}
        title={hasAiContext ? 'AI kontekst je aktivan' : 'AI kontekst nije postavljen — ispunite Profil klijenta'}
      >
        <Sparkles size={11} />
        <span className="hidden lg:inline">{hasAiContext ? 'AI aktivan' : 'AI neaktivan'}</span>
      </div>

      {/* Dropdown panel */}
      {panel !== 'closed' && (
        <>
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
              {panel === 'client' && (
                <>
                  <div className="px-4 py-2">
                    <span className="text-[10px] uppercase tracking-widest text-studio-text-tertiary font-semibold">
                      Dostupni klijenti
                    </span>
                  </div>
                  {clients.map((c) => (
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
                </>
              )}

              {panel === 'project' && (
                <>
                  <div className="px-4 py-2">
                    <span className="text-[10px] uppercase tracking-widest text-studio-text-tertiary font-semibold">
                      Projekti — {currentClient.client_name}
                    </span>
                  </div>
                  {projects.length === 0 ? (
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
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
