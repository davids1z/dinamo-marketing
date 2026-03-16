import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, FolderKanban, Sparkles, Search, ArrowRight, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClient } from '../../contexts/ClientContext'
import { useProject } from '../../contexts/ProjectContext'
import { useAuth } from '../../contexts/AuthContext'
import { useChannelStatus } from '../../hooks/useChannelStatus'
import SyncStatusBadge from '../common/SyncStatusBadge'

type Panel = 'closed' | 'client' | 'project'

export default function ContextSwitcher() {
  const { clients, currentClient, switchClient, recentClientIds } = useClient()
  const { projects, currentProject, switchProject } = useProject()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [panel, setPanel] = useState<Panel>('closed')
  const [clientSearch, setClientSearch] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isSuperadmin = user?.is_superadmin ?? false

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPanel('closed')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto-focus search input when panel opens; reset search when closed
  useEffect(() => {
    if (panel !== 'closed') {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    } else {
      // Defer setState to avoid calling it synchronously within an effect
      const resetTimer = setTimeout(() => {
        setClientSearch('')
        setProjectSearch('')
      }, 0)
      return () => clearTimeout(resetTimer)
    }
  }, [panel])

  const { hasConnectedChannels } = useChannelStatus()

  if (!currentClient) return null

  // AI context is "active" when the client has completed onboarding
  const hasAiContext = currentClient.onboarding_completed

  // --- Client filtering ---
  const filteredClients = clientSearch
    ? clients.filter(c => c.client_name.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients

  // Recent clients (max 3, only ones that exist in current clients list)
  const recentClients = recentClientIds
    .map(id => clients.find(c => c.client_id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .slice(0, 3)

  // --- Project filtering ---
  const filteredProjects = projectSearch
    ? projects.filter(p => p.project_name.toLowerCase().includes(projectSearch.toLowerCase()))
    : projects

  // --- Client item renderer ---
  const renderClientItem = (c: typeof clients[0]) => (
    <button
      key={c.client_id}
      onClick={() => {
        switchClient(c.client_id)
        setPanel('closed')
      }}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-studio-surface-2 transition-colors ${
        c.client_id === currentClient.client_id
          ? 'bg-sky-50 border-l-2 border-sky-500'
          : ''
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-studio-surface-3 flex items-center justify-center flex-shrink-0">
        {c.client_logo_url ? (
          <img src={c.client_logo_url} className="w-5 h-5 rounded" alt="" />
        ) : (
          <span className="text-xs font-bold text-sky-600">
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
        <div className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />
      )}
    </button>
  )

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
          <FolderKanban size={13} className={`flex-shrink-0 ${projects.length === 0 ? 'text-amber-500' : 'text-studio-text-tertiary'}`} />
          <span className={`text-sm truncate max-w-[140px] ${projects.length === 0 ? 'text-amber-600 font-medium' : 'text-studio-text-secondary'}`}>
            {currentProject?.project_name || (projects.length === 0 ? 'Nema projekta' : 'Odaberi projekt')}
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
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-amber-50 text-amber-600'
        }`}
        title={hasAiContext ? 'AI kontekst je aktivan' : 'AI kontekst nije postavljen — ispunite Profil klijenta'}
      >
        <Sparkles size={11} />
        <span className="hidden lg:inline">{hasAiContext ? 'AI aktivan' : 'AI neaktivan'}</span>
      </div>

      {/* Sync Status */}
      <SyncStatusBadge
        hasConnectedChannels={hasConnectedChannels}
        hasData={hasAiContext}
      />

      {/* Dropdown panel */}
      {panel !== 'closed' && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPanel('closed')} />

          <div className="absolute top-full left-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-studio-surface-1 border border-studio-border rounded-2xl shadow-studio-dropdown z-50 overflow-hidden animate-fade-in">
            {/* Tab header */}
            <div className="flex border-b border-studio-border">
              <button
                onClick={() => setPanel('client')}
                className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  panel === 'client'
                    ? 'text-sky-600 border-b-2 border-sky-500 bg-sky-50'
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
                    ? 'text-sky-600 border-b-2 border-sky-500 bg-sky-50'
                    : 'text-studio-text-tertiary hover:text-studio-text-secondary'
                }`}
              >
                <FolderKanban size={12} className="inline mr-1.5 -mt-0.5" />
                Projekt
              </button>
            </div>

            {/* Search input */}
            <div className="px-3 py-2 border-b border-studio-border">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-studio-text-tertiary" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={panel === 'client' ? clientSearch : projectSearch}
                  onChange={(e) => panel === 'client' ? setClientSearch(e.target.value) : setProjectSearch(e.target.value)}
                  placeholder={panel === 'client' ? 'Pretraži klijente...' : 'Pretraži projekte...'}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-studio-surface-0 border border-studio-border focus:outline-none focus:border-sky-300 focus:ring-1 focus:ring-sky-300/30 text-studio-text-primary placeholder-studio-text-tertiary"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-[60vh] sm:max-h-72 overflow-y-auto">
              {panel === 'client' && (
                <>
                  {/* Recent section (only when not searching and has 4+ clients) */}
                  {!clientSearch && recentClients.length > 0 && clients.length > 3 && (
                    <>
                      <div className="px-4 py-2">
                        <span className="text-[10px] uppercase tracking-widest text-studio-text-tertiary font-semibold">
                          Nedavni
                        </span>
                      </div>
                      {recentClients.map(renderClientItem)}
                      <div className="mx-4 my-1 h-px bg-studio-border" />
                    </>
                  )}

                  {/* All clients section */}
                  <div className="px-4 py-2">
                    <span className="text-[10px] uppercase tracking-widest text-studio-text-tertiary font-semibold">
                      {clientSearch ? `Rezultati (${filteredClients.length})` : 'Svi klijenti'}
                    </span>
                  </div>
                  {filteredClients.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-studio-text-tertiary">Nema rezultata</p>
                    </div>
                  ) : (
                    filteredClients.map(renderClientItem)
                  )}
                </>
              )}

              {panel === 'project' && (
                <>
                  <div className="px-4 py-2">
                    <span className="text-[10px] uppercase tracking-widest text-studio-text-tertiary font-semibold">
                      {projectSearch ? `Rezultati (${filteredProjects.length})` : `Projekti — ${currentClient.client_name}`}
                    </span>
                  </div>
                  {filteredProjects.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <FolderKanban className="w-6 h-6 text-studio-text-disabled mx-auto mb-2" />
                      <p className="text-sm text-studio-text-secondary mb-3">
                        {projectSearch ? 'Nema rezultata' : 'Nema projekata'}
                      </p>
                      {!projectSearch && (
                        <button
                          onClick={() => {
                            setPanel('closed')
                            navigate('/onboarding')
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-accent text-white text-xs font-bold hover:bg-brand-accent-hover transition-all"
                        >
                          <Plus size={14} />
                          Kreiraj prvi projekt
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredProjects.map((p) => (
                      <button
                        key={p.project_id}
                        onClick={() => {
                          switchProject(p.project_id)
                          setPanel('closed')
                        }}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-studio-surface-2 transition-colors ${
                          p.project_id === currentProject?.project_id
                            ? 'bg-sky-50 border-l-2 border-sky-500'
                            : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-studio-surface-3 flex items-center justify-center flex-shrink-0">
                          <FolderKanban size={14} className="text-sky-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-studio-text-primary font-medium truncate">
                            {p.project_name}
                          </div>
                          <div className="text-[11px] text-studio-text-tertiary">{p.project_slug}</div>
                        </div>
                        {p.project_id === currentProject?.project_id && (
                          <div className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </>
              )}
            </div>

            {/* Footer links */}
            {panel === 'project' && projects.length > 0 && (
              <div className="border-t border-studio-border">
                <button
                  onClick={() => {
                    setPanel('closed')
                    navigate('/onboarding')
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm text-sky-600 hover:bg-sky-50 transition-colors font-medium"
                >
                  <span className="flex items-center gap-1.5">
                    <Plus size={14} />
                    Novi projekt
                  </span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
            {panel === 'client' && (
              <div className="border-t border-studio-border">
                <button
                  onClick={() => {
                    setPanel('closed')
                    navigate(isSuperadmin ? '/admin/clients' : '/overview')
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm text-sky-600 hover:bg-sky-50 transition-colors font-medium"
                >
                  <span>{isSuperadmin ? 'Upravljaj klijentima' : 'Pregled svih klijenata'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
