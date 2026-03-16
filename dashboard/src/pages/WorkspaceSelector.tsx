import { useNavigate } from 'react-router-dom'
import { FolderKanban, Sparkles, Plus } from 'lucide-react'
import { useClient, type ClientMembership } from '../contexts/ClientContext'
import { useAuth } from '../contexts/AuthContext'

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-red-50 text-red-600',
  admin: 'bg-sky-50 text-sky-600',
  moderator: 'bg-amber-50 text-amber-600',
  viewer: 'bg-slate-100 text-slate-500',
}

export default function WorkspaceSelector() {
  const { clients } = useClient()
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSelect = (client: ClientMembership) => {
    localStorage.setItem('current_client_id', client.client_id)
    if (client.projects?.[0]) {
      localStorage.setItem('current_project_id', client.projects[0].project_id)
    }
    // Don't use switchClient here (it reloads). Navigate instead.
    window.location.assign('/')
  }

  const handleCreateNew = () => {
    navigate('/onboarding')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #8ec5ed 0%, #a4d2f1 15%, #b5d9f4 30%, #c2e0f6 50%, #cde6f8 70%, #d4eafa 85%, #daedfb 100%)' }}
    >
      {/* Arc circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[35%] pointer-events-none z-0">
        <div className="w-[900px] h-[900px] rounded-full border border-white/30" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[30%] pointer-events-none z-0">
        <div className="w-[700px] h-[700px] rounded-full border border-white/25" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[25%] pointer-events-none z-0">
        <div className="w-[500px] h-[500px] rounded-full border border-white/20" />
      </div>

      {/* Cloud layer */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[1]">
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-white" />
        <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-white via-white/80 to-transparent" />
        <div className="absolute -bottom-16 left-[-8%] w-[500px] h-[220px] bg-white rounded-[50%]" style={{ filter: 'blur(1px)' }} />
        <div className="absolute -bottom-20 left-[10%] w-[450px] h-[200px] bg-white rounded-[50%]" style={{ filter: 'blur(2px)' }} />
        <div className="absolute -bottom-14 left-[30%] w-[400px] h-[190px] bg-white rounded-[50%]" style={{ filter: 'blur(1px)' }} />
        <div className="absolute -bottom-24 left-[45%] w-[480px] h-[210px] bg-white rounded-[50%]" style={{ filter: 'blur(2px)' }} />
        <div className="absolute -bottom-16 left-[65%] w-[420px] h-[200px] bg-white rounded-[50%]" style={{ filter: 'blur(1px)' }} />
        <div className="absolute -bottom-20 right-[-8%] w-[400px] h-[190px] bg-white rounded-[50%]" style={{ filter: 'blur(2px)' }} />
      </div>

      {/* Logo top-left */}
      <div className="absolute top-6 left-8 flex items-center gap-2.5 z-20">
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
          <span className="font-headline text-xs text-white font-bold">S1Z</span>
        </div>
        <span className="font-headline text-base tracking-wider text-slate-700 font-bold">ShiftOneZero</span>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-3xl">
        {/* Greeting */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-[-0.01em] mb-2"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Dobrodošli{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-slate-500 text-sm sm:text-base">
            Odaberite radni prostor za nastavak
          </p>
        </div>

        {/* Client cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {clients.map((client) => (
            <button
              key={client.client_id}
              onClick={() => handleSelect(client)}
              className="group text-left rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              style={{
                background: 'rgba(255,255,255,0.65)',
                backdropFilter: 'blur(20px) saturate(1.3)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.5)',
              }}
            >
              {/* Logo + Name */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-100 transition-colors">
                  {client.client_logo_url ? (
                    <img src={client.client_logo_url} className="w-6 h-6 rounded" alt="" />
                  ) : (
                    <span className="text-base font-bold text-sky-600">
                      {client.client_name?.[0]?.toUpperCase() || 'K'}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-800 truncate group-hover:text-sky-700 transition-colors">
                    {client.client_name}
                  </h3>
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${ROLE_COLORS[client.role] || ROLE_COLORS.viewer}`}>
                    {client.role}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <FolderKanban size={12} />
                  <span>{client.projects?.length || 0} {client.projects?.length === 1 ? 'projekt' : 'projekata'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles size={12} className={client.onboarding_completed ? 'text-emerald-500' : 'text-amber-400'} />
                  <span className={client.onboarding_completed ? 'text-emerald-600' : 'text-amber-500'}>
                    {client.onboarding_completed ? 'AI aktivan' : 'Postavljanje'}
                  </span>
                </div>
              </div>
            </button>
          ))}

          {/* Create new org card */}
          <button
            onClick={handleCreateNew}
            className="rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex flex-col items-center justify-center gap-2 min-h-[120px]"
            style={{
              background: 'rgba(255,255,255,0.35)',
              border: '2px dashed rgba(148,163,184,0.4)',
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100/60 flex items-center justify-center">
              <Plus size={20} className="text-slate-400" />
            </div>
            <span className="text-sm font-medium text-slate-400">Nova organizacija</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
        <span className="text-[12px] text-slate-400/70 font-medium tracking-wide">ShiftOneZero</span>
      </div>
    </div>
  )
}
