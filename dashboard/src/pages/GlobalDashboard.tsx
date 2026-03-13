import { Building2, FolderKanban, Sparkles, ArrowRight } from 'lucide-react'
import { useClient, type ClientMembership } from '../contexts/ClientContext'
import Header from '../components/layout/Header'

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-red-50 text-red-600 border-red-100',
  admin: 'bg-sky-50 text-sky-600 border-sky-100',
  moderator: 'bg-amber-50 text-amber-600 border-amber-100',
  viewer: 'bg-slate-50 text-slate-500 border-slate-100',
}

export default function GlobalDashboard() {
  const { clients, switchClient } = useClient()

  const handleEnter = (client: ClientMembership) => {
    switchClient(client.client_id)
  }

  return (
    <>
      <Header title="Pregled klijenata" subtitle="Svi vaši radni prostori na jednom mjestu" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center gap-2 text-sm text-studio-text-secondary">
            <Building2 size={16} className="text-sky-500" />
            <span className="font-semibold">{clients.length}</span>
            <span>{clients.length === 1 ? 'klijent' : 'klijenata'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-studio-text-secondary">
            <FolderKanban size={16} className="text-sky-500" />
            <span className="font-semibold">{clients.reduce((sum, c) => sum + (c.projects?.length || 0), 0)}</span>
            <span>projekata ukupno</span>
          </div>
        </div>

        {/* Client cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div
              key={client.client_id}
              className="bg-white rounded-2xl border border-studio-border p-5 hover:shadow-md transition-shadow group"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                  {client.client_logo_url ? (
                    <img src={client.client_logo_url} className="w-7 h-7 rounded" alt="" />
                  ) : (
                    <span className="text-lg font-bold text-sky-600">
                      {client.client_name?.[0]?.toUpperCase() || 'K'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-studio-text-primary truncate">
                    {client.client_name}
                  </h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${ROLE_COLORS[client.role] || ROLE_COLORS.viewer}`}>
                    {client.role}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5 text-xs text-studio-text-tertiary">
                  <FolderKanban size={13} />
                  <span>{client.projects?.length || 0} projekata</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Sparkles size={13} className={client.onboarding_completed ? 'text-emerald-500' : 'text-amber-400'} />
                  <span className={client.onboarding_completed ? 'text-emerald-600' : 'text-amber-500'}>
                    {client.onboarding_completed ? 'AI aktivan' : 'Postavljanje'}
                  </span>
                </div>
              </div>

              {/* Projects list preview */}
              {client.projects && client.projects.length > 0 && (
                <div className="mb-4 space-y-1">
                  {client.projects.slice(0, 3).map(p => (
                    <div key={p.project_id} className="flex items-center gap-2 text-xs text-studio-text-secondary">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-300 flex-shrink-0" />
                      <span className="truncate">{p.project_name}</span>
                    </div>
                  ))}
                  {client.projects.length > 3 && (
                    <div className="text-xs text-studio-text-tertiary pl-3.5">
                      +{client.projects.length - 3} više
                    </div>
                  )}
                </div>
              )}

              {/* Enter button */}
              <button
                onClick={() => handleEnter(client)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors group-hover:bg-sky-100"
              >
                <span>Uđi</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
