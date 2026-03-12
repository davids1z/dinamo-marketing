import { useState, useEffect, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Shield, Plus, Edit2, UserX, Check, X, Users,
  Building2, FolderKanban, Activity,
  ChevronDown, ChevronRight, Trash2, Globe, Palette,
} from 'lucide-react'
import { clsx } from 'clsx'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import SystemHealth from '../components/settings/SystemHealth'
import QuotaDisplay from '../components/settings/QuotaDisplay'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserRecord {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  is_superadmin?: boolean
  last_login: string | null
  created_at: string
}

interface UserMembership {
  id: string
  client_id: string
  client_name: string
  client_slug: string
  role: string
}

interface UserDetail extends UserRecord {
  memberships: UserMembership[]
}

interface PlatformStats {
  total_users: number
  active_users: number
  total_clients: number
  total_projects: number
  active_today: number
}

interface ClientRecord {
  id: string
  name: string
  slug: string
  is_active: boolean
  onboarding_completed: boolean
  member_count: number
  project_count: number
  created_at: string
}

interface ClientMember {
  membership_id: string
  user_id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
}

interface ClientProject {
  id: string
  name: string
  slug: string
}

interface ClientDetail extends ClientRecord {
  business_description: string
  tone_of_voice: string
  target_audience: string
  logo_url: string
  website_url: string
  members: ClientMember[]
  projects: ClientProject[]
}

type ViewKey = 'dashboard' | 'users' | 'clients'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLES = ['superadmin', 'admin', 'moderator', 'viewer'] as const
const MEMBER_ROLES = ['admin', 'moderator', 'viewer'] as const
const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  moderator: 'Moderator',
  viewer: 'Viewer',
}
const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-purple-500/10 text-purple-400',
  admin: 'bg-red-500/10 text-red-400',
  moderator: 'bg-blue-500/10 text-blue-400',
  viewer: 'bg-white/5 text-studio-text-tertiary',
}

const NAV_ITEMS: { path: string; label: string; icon: typeof Shield }[] = [
  { path: '/admin', label: 'Nadzorna ploča', icon: Activity },
  { path: '/admin/users', label: 'Korisnici', icon: Users },
  { path: '/admin/clients', label: 'Klijenti', icon: Building2 },
]

// ---------------------------------------------------------------------------
// Dashboard View
// ---------------------------------------------------------------------------

function DashboardView() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = stats ? [
    { label: 'Ukupno korisnika', value: stats.total_users, sub: `${stats.active_users} aktivnih`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Klijenti', value: stats.total_clients, sub: 'registriranih organizacija', icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Projekti', value: stats.total_projects, sub: 'ukupno projekata', icon: FolderKanban, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Aktivni danas', value: stats.active_today, sub: 'korisnika zadnjih 24h', icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ] : []

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      {loading || !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card">
              <div className="skeleton h-3 w-20 mb-3" />
              <div className="skeleton h-8 w-16 mb-2" />
              <div className="skeleton h-3 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(c => {
            const Icon = c.icon
            return (
              <div key={c.label} className="card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-studio-text-tertiary uppercase tracking-wider">{c.label}</span>
                  <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
                    <Icon size={16} className={c.color} />
                  </div>
                </div>
                <div className="stat-number">{c.value}</div>
                <p className="text-xs text-studio-text-tertiary mt-1">{c.sub}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* System Health + Quotas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealth />
        <QuotaDisplay />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users View
// ---------------------------------------------------------------------------

function UsersView() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: '', is_active: true })
  const [createForm, setCreateForm] = useState({ email: '', password: '', full_name: '', role: 'viewer' })
  const [error, setError] = useState('')

  // Drill-down
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null)
  const [membershipRole, setMembershipRole] = useState('')
  const [confirmRemoveMembership, setConfirmRemoveMembership] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/admin/users')
      setUsers(res.data.users)
      setTotal(res.data.total)
    } catch {
      setError('Greška pri dohvaćanju korisnika')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const fetchUserDetail = useCallback(async (userId: string) => {
    setDetailLoading(true)
    try {
      const res = await api.get(`/admin/users/${userId}/detail`)
      setUserDetail(res.data)
    } catch {
      setError('Greška pri dohvaćanju detalja korisnika')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const toggleExpand = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null)
      setUserDetail(null)
    } else {
      setExpandedUserId(userId)
      fetchUserDetail(userId)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/admin/users', createForm)
      setShowCreate(false)
      setCreateForm({ email: '', password: '', full_name: '', role: 'viewer' })
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Greška pri kreiranju korisnika')
    }
  }

  const handleEdit = async (id: string) => {
    setError('')
    try {
      await api.put(`/admin/users/${id}`, editForm)
      setEditingId(null)
      fetchUsers()
      if (expandedUserId === id) fetchUserDetail(id)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Greška pri ažuriranju')
    }
  }

  const handleDeactivate = async (id: string) => {
    setError('')
    try {
      await api.delete(`/admin/users/${id}`)
      fetchUsers()
      if (expandedUserId === id) fetchUserDetail(id)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Greška pri deaktivaciji')
    }
  }

  const startEdit = (u: UserRecord) => {
    setEditingId(u.id)
    setEditForm({ full_name: u.full_name, role: u.role, is_active: u.is_active })
  }

  const handleMembershipRoleChange = async (membershipId: string) => {
    setError('')
    try {
      await api.put(`/admin/memberships/${membershipId}/role`, { role: membershipRole })
      setEditingMembershipId(null)
      if (expandedUserId) fetchUserDetail(expandedUserId)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Greška pri promjeni role')
    }
  }

  const handleRemoveMembership = async (membershipId: string) => {
    setError('')
    try {
      await api.delete(`/admin/memberships/${membershipId}`)
      setConfirmRemoveMembership(null)
      if (expandedUserId) fetchUserDetail(expandedUserId)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Greška pri uklanjanju članstva')
    }
  }

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider">
          {total} korisnika ukupno
        </span>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novi korisnik</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="card border-brand-accent/30">
          <h3 className="font-headline text-sm tracking-wider text-studio-text-primary mb-4">NOVI KORISNIK</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="email" placeholder="Email adresa" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="px-3 py-2 border bg-studio-surface-1 border-studio-border text-studio-text-primary rounded-lg text-sm focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none" />
            <input type="password" placeholder="Lozinka" required minLength={6} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="px-3 py-2 border bg-studio-surface-1 border-studio-border text-studio-text-primary rounded-lg text-sm focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none" />
            <input type="text" placeholder="Ime i prezime" required value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} className="px-3 py-2 border bg-studio-surface-1 border-studio-border text-studio-text-primary rounded-lg text-sm focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none" />
            <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="px-3 py-2 border bg-studio-surface-1 border-studio-border text-studio-text-primary rounded-lg text-sm focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Odustani</button>
              <button type="submit" className="btn-primary text-sm">Kreiraj</button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-studio-text-tertiary border-b border-studio-border">
                <th className="pb-3 font-medium w-8"></th>
                <th className="pb-3 font-medium">Korisnik</th>
                <th className="pb-3 font-medium hidden sm:table-cell">Email</th>
                <th className="pb-3 font-medium">Uloga</th>
                <th className="pb-3 font-medium hidden md:table-cell">Status</th>
                <th className="pb-3 font-medium hidden lg:table-cell">Zadnja prijava</th>
                <th className="pb-3 font-medium text-right">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-studio-border">
              {users.map((u) => (
                <>
                  <tr
                    key={u.id}
                    className={clsx('hover:bg-studio-surface-1 cursor-pointer transition-colors', expandedUserId === u.id && 'bg-studio-surface-1')}
                    onClick={() => toggleExpand(u.id)}
                  >
                    <td className="py-3 pl-1">
                      {expandedUserId === u.id
                        ? <ChevronDown className="w-4 h-4 text-studio-text-tertiary" />
                        : <ChevronRight className="w-4 h-4 text-studio-text-tertiary" />
                      }
                    </td>
                    <td className="py-3">
                      {editingId === u.id ? (
                        <input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} onClick={e => e.stopPropagation()} className="px-2 py-1 bg-studio-surface-1 border border-studio-border text-studio-text-primary rounded text-sm w-full max-w-[180px]" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-brand-blue">{u.full_name?.[0] || '?'}</span>
                          </div>
                          <span className={clsx('font-medium text-studio-text-primary', !u.is_active && 'text-studio-text-disabled line-through')}>{u.full_name}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-studio-text-tertiary hidden sm:table-cell">{u.email}</td>
                    <td className="py-3">
                      {editingId === u.id ? (
                        <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} onClick={e => e.stopPropagation()} className="px-2 py-1 bg-studio-surface-1 border border-studio-border text-studio-text-primary rounded text-xs">
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      ) : (
                        <span className={clsx('badge', ROLE_COLORS[u.role] || ROLE_COLORS.viewer)}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 hidden md:table-cell">
                      {editingId === u.id ? (
                        <label className="flex items-center gap-2 text-xs" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} className="rounded border-studio-border" />
                          Aktivan
                        </label>
                      ) : (
                        <span className={clsx('text-xs font-medium', u.is_active ? 'text-emerald-400' : 'text-studio-text-disabled')}>
                          {u.is_active ? 'Aktivan' : 'Neaktivan'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-studio-text-tertiary text-xs hidden lg:table-cell">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString('hr-HR') : 'Nikad'}
                    </td>
                    <td className="py-3 text-right" onClick={e => e.stopPropagation()}>
                      {editingId === u.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => handleEdit(u.id)} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10" title="Spremi"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-studio-text-tertiary hover:bg-white/5" title="Odustani"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => startEdit(u)} className="p-1.5 rounded-lg text-studio-text-tertiary hover:bg-white/5 hover:text-studio-text-secondary" title="Uredi"><Edit2 className="w-3.5 h-3.5" /></button>
                          {u.id !== currentUser?.id && u.is_active && (
                            <button onClick={() => handleDeactivate(u.id)} className="p-1.5 rounded-lg text-studio-text-tertiary hover:bg-red-500/10 hover:text-red-400" title="Deaktiviraj"><UserX className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Expanded drill-down */}
                  {expandedUserId === u.id && (
                    <tr key={`${u.id}-detail`}>
                      <td colSpan={7} className="p-0">
                        <div className="bg-studio-surface-0 border-t border-b border-studio-border px-6 py-4">
                          {detailLoading ? (
                            <div className="space-y-2">
                              {[1, 2].map(i => <div key={i} className="skeleton h-10 w-full rounded" />)}
                            </div>
                          ) : userDetail ? (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider">
                                  Članstva ({userDetail.memberships.length} klijenata)
                                </h4>
                                {userDetail.is_superadmin && (
                                  <span className={clsx('badge', ROLE_COLORS.superadmin)}>Superadmin</span>
                                )}
                              </div>
                              {userDetail.memberships.length === 0 ? (
                                <p className="text-sm text-studio-text-tertiary">Korisnik nije član nijednog klijenta</p>
                              ) : (
                                <div className="space-y-2">
                                  {userDetail.memberships.map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-3 bg-studio-surface-1 rounded-lg">
                                      <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                                          <span className="text-xs font-bold text-brand-accent">{m.client_name?.[0]?.toUpperCase() || 'K'}</span>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-studio-text-primary">{m.client_name}</span>
                                          <span className="text-xs text-studio-text-tertiary ml-2">{m.client_slug}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {editingMembershipId === m.id ? (
                                          <>
                                            <select
                                              value={membershipRole}
                                              onChange={(e) => setMembershipRole(e.target.value)}
                                              className="px-2 py-1 bg-studio-surface-0 border border-studio-border text-studio-text-primary rounded text-xs"
                                            >
                                              {MEMBER_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                            </select>
                                            <button onClick={() => handleMembershipRoleChange(m.id)} className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10" title="Spremi"><Check className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => setEditingMembershipId(null)} className="p-1 rounded text-studio-text-tertiary hover:bg-white/5" title="Odustani"><X className="w-3.5 h-3.5" /></button>
                                          </>
                                        ) : (
                                          <>
                                            <span className={clsx('badge', ROLE_COLORS[m.role] || ROLE_COLORS.viewer)}>
                                              {ROLE_LABELS[m.role] || m.role}
                                            </span>
                                            {u.id !== currentUser?.id && (
                                              <>
                                                <button
                                                  onClick={() => { setEditingMembershipId(m.id); setMembershipRole(m.role) }}
                                                  className="p-1 rounded text-studio-text-tertiary hover:bg-white/5 hover:text-studio-text-secondary"
                                                  title="Promijeni ulogu"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                </button>
                                                {confirmRemoveMembership === m.id ? (
                                                  <div className="flex items-center gap-1 ml-1">
                                                    <span className="text-xs text-red-400">Ukloni?</span>
                                                    <button onClick={() => handleRemoveMembership(m.id)} className="p-1 rounded text-red-400 hover:bg-red-500/10" title="Potvrdi"><Check className="w-3 h-3" /></button>
                                                    <button onClick={() => setConfirmRemoveMembership(null)} className="p-1 rounded text-studio-text-tertiary hover:bg-white/5" title="Odustani"><X className="w-3 h-3" /></button>
                                                  </div>
                                                ) : (
                                                  <button
                                                    onClick={() => setConfirmRemoveMembership(m.id)}
                                                    className="p-1 rounded text-studio-text-tertiary hover:bg-red-500/10 hover:text-red-400"
                                                    title="Ukloni iz klijenta"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-studio-text-tertiary">
                    <Users className="w-8 h-8 mx-auto mb-2 text-studio-text-disabled" />
                    Nema korisnika
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Clients View
// ---------------------------------------------------------------------------

function ClientsView() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Drill-down
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    api.get('/admin/clients')
      .then(res => { setClients(res.data.clients); setTotal(res.data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fetchClientDetail = useCallback(async (clientId: string) => {
    setDetailLoading(true)
    try {
      const res = await api.get(`/admin/clients/${clientId}/detail`)
      setClientDetail(res.data)
    } catch {
      // silently fail
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const toggleExpand = (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null)
      setClientDetail(null)
    } else {
      setExpandedClientId(clientId)
      fetchClientDetail(clientId)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider">
          {total} klijenata ukupno
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-studio-text-tertiary border-b border-studio-border">
            <th className="pb-3 font-medium w-8"></th>
            <th className="pb-3 font-medium">Klijent</th>
            <th className="pb-3 font-medium hidden sm:table-cell">Slug</th>
            <th className="pb-3 font-medium">Članovi</th>
            <th className="pb-3 font-medium hidden md:table-cell">Projekti</th>
            <th className="pb-3 font-medium hidden lg:table-cell">Onboarding</th>
            <th className="pb-3 font-medium hidden lg:table-cell">Kreiran</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-studio-border">
          {clients.map(c => (
            <>
              <tr
                key={c.id}
                className={clsx('hover:bg-studio-surface-1 cursor-pointer transition-colors', expandedClientId === c.id && 'bg-studio-surface-1')}
                onClick={() => toggleExpand(c.id)}
              >
                <td className="py-3 pl-1">
                  {expandedClientId === c.id
                    ? <ChevronDown className="w-4 h-4 text-studio-text-tertiary" />
                    : <ChevronRight className="w-4 h-4 text-studio-text-tertiary" />
                  }
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-brand-accent">{c.name?.[0]?.toUpperCase() || 'K'}</span>
                    </div>
                    <span className={clsx('font-medium text-studio-text-primary', !c.is_active && 'text-studio-text-disabled line-through')}>
                      {c.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-studio-text-tertiary text-xs hidden sm:table-cell">{c.slug}</td>
                <td className="py-3">
                  <span className="text-sm text-studio-text-primary">{c.member_count}</span>
                </td>
                <td className="py-3 hidden md:table-cell">
                  <span className="text-sm text-studio-text-primary">{c.project_count}</span>
                </td>
                <td className="py-3 hidden lg:table-cell">
                  <span className={clsx(
                    'text-xs font-medium',
                    c.onboarding_completed ? 'text-emerald-400' : 'text-amber-400'
                  )}>
                    {c.onboarding_completed ? 'Da' : 'Ne'}
                  </span>
                </td>
                <td className="py-3 text-studio-text-tertiary text-xs hidden lg:table-cell">
                  {new Date(c.created_at).toLocaleDateString('hr-HR')}
                </td>
              </tr>

              {/* Expanded drill-down */}
              {expandedClientId === c.id && (
                <tr key={`${c.id}-detail`}>
                  <td colSpan={7} className="p-0">
                    <div className="bg-studio-surface-0 border-t border-b border-studio-border px-6 py-4">
                      {detailLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => <div key={i} className="skeleton h-10 w-full rounded" />)}
                        </div>
                      ) : clientDetail ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Members */}
                          <div>
                            <h4 className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <Users size={14} />
                              Članovi tima ({clientDetail.members.length})
                            </h4>
                            {clientDetail.members.length === 0 ? (
                              <p className="text-xs text-studio-text-tertiary">Nema članova</p>
                            ) : (
                              <div className="space-y-1.5">
                                {clientDetail.members.map(m => (
                                  <div key={m.user_id} className="flex items-center justify-between p-2 bg-studio-surface-1 rounded-lg">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                                        <span className="text-[10px] font-bold text-brand-blue">{m.full_name?.[0] || '?'}</span>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium text-studio-text-primary truncate">{m.full_name}</p>
                                        <p className="text-[10px] text-studio-text-tertiary truncate">{m.email}</p>
                                      </div>
                                    </div>
                                    <span className={clsx('badge text-[10px]', ROLE_COLORS[m.role] || ROLE_COLORS.viewer)}>
                                      {ROLE_LABELS[m.role] || m.role}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Projects */}
                          <div>
                            <h4 className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <FolderKanban size={14} />
                              Projekti ({clientDetail.projects.length})
                            </h4>
                            {clientDetail.projects.length === 0 ? (
                              <p className="text-xs text-studio-text-tertiary">Nema projekata</p>
                            ) : (
                              <div className="space-y-1.5">
                                {clientDetail.projects.map(p => (
                                  <div key={p.id} className="p-2 bg-studio-surface-1 rounded-lg">
                                    <p className="text-xs font-medium text-studio-text-primary">{p.name}</p>
                                    <p className="text-[10px] text-studio-text-tertiary">{p.slug}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* AI Context */}
                          <div>
                            <h4 className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <Palette size={14} />
                              AI Kontekst
                            </h4>
                            <div className="space-y-3">
                              {clientDetail.business_description && (
                                <div>
                                  <p className="text-[10px] font-medium text-studio-text-tertiary uppercase tracking-wider mb-0.5">Opis poslovanja</p>
                                  <p className="text-xs text-studio-text-secondary line-clamp-3">{clientDetail.business_description}</p>
                                </div>
                              )}
                              {clientDetail.tone_of_voice && (
                                <div>
                                  <p className="text-[10px] font-medium text-studio-text-tertiary uppercase tracking-wider mb-0.5">Ton komunikacije</p>
                                  <p className="text-xs text-studio-text-secondary line-clamp-2">{clientDetail.tone_of_voice}</p>
                                </div>
                              )}
                              {clientDetail.target_audience && (
                                <div>
                                  <p className="text-[10px] font-medium text-studio-text-tertiary uppercase tracking-wider mb-0.5">Ciljna publika</p>
                                  <p className="text-xs text-studio-text-secondary line-clamp-2">{clientDetail.target_audience}</p>
                                </div>
                              )}
                              {clientDetail.website_url && (
                                <div className="flex items-center gap-1.5">
                                  <Globe size={12} className="text-studio-text-tertiary" />
                                  <a href={clientDetail.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue hover:underline truncate">{clientDetail.website_url}</a>
                                </div>
                              )}
                              {!clientDetail.business_description && !clientDetail.tone_of_voice && !clientDetail.target_audience && (
                                <p className="text-xs text-studio-text-tertiary">AI kontekst nije konfiguriran</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
          {clients.length === 0 && (
            <tr>
              <td colSpan={7} className="py-12 text-center text-studio-text-tertiary">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-studio-text-disabled" />
                Nema klijenata
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Admin Page
// ---------------------------------------------------------------------------

export default function Admin() {
  const { user: currentUser } = useAuth()
  const location = useLocation()

  const view: ViewKey =
    location.pathname === '/admin/users' ? 'users' :
    location.pathname === '/admin/clients' ? 'clients' :
    'dashboard'

  if (!currentUser?.is_superadmin) {
    return (
      <div className="page-wrapper">
        <div className="card flex flex-col items-center justify-center py-16">
          <Shield className="w-12 h-12 text-studio-text-disabled mb-4" />
          <p className="text-studio-text-tertiary text-lg">Nemate pristup ovoj stranici</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrapper space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="section-title">Superadmin Panel</h1>
          <p className="text-sm text-studio-text-tertiary">Upravljanje platformom</p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 bg-studio-surface-0 border border-studio-border rounded-xl p-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = item.path === '/admin' ? view === 'dashboard' : location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
                isActive
                  ? 'bg-brand-accent/10 text-brand-accent shadow-sm'
                  : 'text-studio-text-tertiary hover:text-studio-text-secondary hover:bg-studio-surface-2'
              )}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          )
        })}
      </div>

      {/* View content */}
      <div className="animate-fade-in">
        {view === 'dashboard' && <DashboardView />}
        {view === 'users' && <UsersView />}
        {view === 'clients' && <ClientsView />}
      </div>
    </div>
  )
}
