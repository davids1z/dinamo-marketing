import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Shield, Plus, Edit2, UserX, Check, X, Users,
  Building2, FolderKanban, Activity,
  ChevronDown, ChevronRight, Trash2, Globe, Palette,
  LogIn, FileText, Crown, Zap,
  Plug, ToggleLeft, ToggleRight, Loader2, Settings,
} from 'lucide-react'
import { clsx } from 'clsx'
import api from '../api/client'
import { isAxiosError } from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { settingsApi } from '../api/settings'
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
  client_count: number
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
  primary_admin_name: string | null
  plan: string
  ai_credits_used: number
  ai_credits_total: number
  plan_expires_at: string | null
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

interface AuditEntry {
  id: string
  user_email: string
  action: string
  entity_type: string
  entity_id: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- open-ended audit log payload, shape varies per action
  details: Record<string, any> | null
  created_at: string
}

type ViewKey = 'dashboard' | 'users' | 'clients' | 'audit' | 'settings'

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

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
}
const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-500/10 text-slate-400',
  pro: 'bg-blue-500/10 text-blue-400',
  enterprise: 'bg-purple-500/10 text-purple-400',
}

const ACTION_LABELS: Record<string, string> = {
  'user.login': 'Prijava',
  'user.create': 'Kreiranje korisnika',
  'user.update': 'Ažuriranje korisnika',
  'user.deactivate': 'Deaktivacija korisnika',
  'user.impersonate': 'Impersonacija',
  'membership.role_change': 'Promjena uloge',
  'membership.remove': 'Uklanjanje članstva',
  'client.update': 'Ažuriranje klijenta',
  'client.subscription_change': 'Promjena pretplate',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(isoDate: string | null): string {
  if (!isoDate) return 'Nikad'
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Upravo'
  if (minutes < 60) return `prije ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `prije ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `prije ${days}d`
  const months = Math.floor(days / 30)
  return `prije ${months} mj.`
}

// ---------------------------------------------------------------------------
// Dashboard View
// ---------------------------------------------------------------------------

function DashboardView() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats').then(res => setStats(res.data)),
      api.get('/admin/audit-log?limit=5').then(res => setRecentAudit(res.data.entries)),
    ])
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Activity className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="section-title">Pregled sustava</h1>
          <p className="text-sm text-studio-text-tertiary">Statistika i zdravlje platforme</p>
        </div>
      </div>

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

      {/* Recent Activity */}
      {recentAudit.length > 0 && (
        <div className="card">
          <h3 className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Activity size={14} />
            Posljednje aktivnosti
          </h3>
          <div className="space-y-2">
            {recentAudit.map(e => (
              <div key={e.id} className="flex items-center justify-between p-2 bg-studio-surface-1 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-brand-blue">{e.user_email?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-studio-text-primary truncate">
                      {e.user_email} — {ACTION_LABELS[e.action] || e.action}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-studio-text-tertiary flex-shrink-0 ml-2">{relativeTime(e.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users View
// ---------------------------------------------------------------------------

function UsersView() {
  const { user: currentUser, impersonate } = useAuth()
  const navigate = useNavigate()
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
    } catch (err: unknown) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined
      setError(detail || 'Greška pri kreiranju korisnika')
    }
  }

  const handleEdit = async (id: string) => {
    setError('')
    try {
      await api.put(`/admin/users/${id}`, editForm)
      setEditingId(null)
      fetchUsers()
      if (expandedUserId === id) fetchUserDetail(id)
    } catch (err: unknown) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined
      setError(detail || 'Greška pri ažuriranju')
    }
  }

  const handleDeactivate = async (id: string) => {
    setError('')
    try {
      await api.delete(`/admin/users/${id}`)
      fetchUsers()
      if (expandedUserId === id) fetchUserDetail(id)
    } catch (err: unknown) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined
      setError(detail || 'Greška pri deaktivaciji')
    }
  }

  const startEdit = (u: UserRecord) => {
    setEditingId(u.id)
    setEditForm({ full_name: u.full_name, role: u.role, is_active: u.is_active })
  }

  const handleImpersonate = async (userId: string) => {
    setError('')
    try {
      const res = await api.post(`/admin/impersonate/${userId}`)
      const { access_token, user: userData } = res.data
      impersonate(access_token, userData)
      navigate('/')
    } catch (err: unknown) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined
      setError(detail || 'Greška pri impersonaciji')
    }
  }

  const handleMembershipRoleChange = async (membershipId: string) => {
    setError('')
    try {
      await api.put(`/admin/memberships/${membershipId}/role`, { role: membershipRole })
      setEditingMembershipId(null)
      if (expandedUserId) fetchUserDetail(expandedUserId)
    } catch (err: unknown) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined
      setError(detail || 'Greška pri promjeni role')
    }
  }

  const handleRemoveMembership = async (membershipId: string) => {
    setError('')
    try {
      await api.delete(`/admin/memberships/${membershipId}`)
      setConfirmRemoveMembership(null)
      if (expandedUserId) fetchUserDetail(expandedUserId)
    } catch (err: unknown) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined
      setError(detail || 'Greška pri uklanjanju članstva')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="section-title">Korisnici</h1>
            <p className="text-sm text-studio-text-tertiary">{total} korisnika ukupno</p>
          </div>
        </div>
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
                <th className="pb-3 font-medium hidden md:table-cell">Klijenti</th>
                <th className="pb-3 font-medium hidden lg:table-cell">Zadnja aktivnost</th>
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
                    <td className="py-3 hidden md:table-cell">
                      <span className="text-sm text-studio-text-primary">{u.client_count}</span>
                    </td>
                    <td className="py-3 text-studio-text-tertiary text-xs hidden lg:table-cell">
                      {relativeTime(u.last_login)}
                    </td>
                    <td className="py-3 text-right" onClick={e => e.stopPropagation()}>
                      {editingId === u.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => handleEdit(u.id)} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10" title="Spremi"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-studio-text-tertiary hover:bg-white/5" title="Odustani"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          {u.id !== currentUser?.id && u.is_active && !u.is_superadmin && (
                            <button onClick={() => handleImpersonate(u.id)} className="p-1.5 rounded-lg text-studio-text-tertiary hover:bg-amber-500/10 hover:text-amber-400" title="Prijavi se kao ovaj korisnik">
                              <LogIn className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                      <td colSpan={8} className="p-0">
                        <div className="bg-studio-surface-0 border-t border-b border-studio-border px-6 py-4">
                          {detailLoading ? (
                            <div className="space-y-2">
                              {[1, 2].map(i => <div key={i} className="skeleton h-10 w-full rounded" />)}
                            </div>
                          ) : userDetail ? (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider">
                                  {userDetail.is_superadmin ? 'Uloga u sustavu' : `Članstva (${userDetail.memberships.length} klijenata)`}
                                </h4>
                                {userDetail.is_superadmin && (
                                  <span className={clsx('badge', ROLE_COLORS.superadmin)}>Superadmin</span>
                                )}
                              </div>
                              {userDetail.is_superadmin ? (
                                <div className="flex items-center gap-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                    <Crown className="w-4 h-4 text-purple-400" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-studio-text-primary">Superadmin — pristup svim klijentima</p>
                                    <p className="text-xs text-studio-text-tertiary mt-0.5">Globalna uloga. Nije vezan za pojedinačne klijente kroz članstvo.</p>
                                  </div>
                                </div>
                              ) : userDetail.memberships.length === 0 ? (
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
                  <td colSpan={8} className="py-12 text-center text-studio-text-tertiary">
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
  const [error, setError] = useState('')

  // Drill-down
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Subscription editing
  const [editingSub, setEditingSub] = useState(false)
  const [subForm, setSubForm] = useState({ plan: 'free', ai_credits_total: 1000, ai_credits_used: 0, plan_expires_at: '' })

  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get('/admin/clients')
      setClients(res.data.clients)
      setTotal(res.data.total)
    } catch {
      setError('Greška pri dohvaćanju klijenata')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  const fetchClientDetail = useCallback(async (clientId: string) => {
    setDetailLoading(true)
    try {
      const res = await api.get(`/admin/clients/${clientId}/detail`)
      setClientDetail(res.data)
    } catch {
      setError('Greška pri dohvaćanju detalja klijenta')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const toggleExpand = (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null)
      setClientDetail(null)
      setEditingSub(false)
    } else {
      setExpandedClientId(clientId)
      setEditingSub(false)
      fetchClientDetail(clientId)
    }
  }

  const startEditSub = (c: ClientDetail) => {
    setEditingSub(true)
    setSubForm({
      plan: c.plan,
      ai_credits_total: c.ai_credits_total,
      ai_credits_used: c.ai_credits_used,
      plan_expires_at: c.plan_expires_at ? c.plan_expires_at.split('T')[0] ?? '' : '',
    })
  }

  const handleSaveSub = async () => {
    if (!expandedClientId) return
    setError('')
    try {
      await api.put(`/admin/clients/${expandedClientId}/subscription`, {
        plan: subForm.plan,
        ai_credits_total: subForm.ai_credits_total,
        ai_credits_used: subForm.ai_credits_used,
        plan_expires_at: subForm.plan_expires_at || null,
      })
      setEditingSub(false)
      fetchClientDetail(expandedClientId)
      fetchClients()
    } catch (err: unknown) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined
      setError(detail || 'Greška pri ažuriranju pretplate')
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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="section-title">Klijenti</h1>
          <p className="text-sm text-studio-text-tertiary">{total} registriranih organizacija</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-studio-text-tertiary border-b border-studio-border">
              <th className="pb-3 font-medium w-8"></th>
              <th className="pb-3 font-medium">Klijent</th>
              <th className="pb-3 font-medium hidden sm:table-cell">Vlasnik</th>
              <th className="pb-3 font-medium">Plan</th>
              <th className="pb-3 font-medium hidden md:table-cell">AI Krediti</th>
              <th className="pb-3 font-medium hidden md:table-cell">Članovi</th>
              <th className="pb-3 font-medium hidden lg:table-cell">Istječe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-studio-border">
            {clients.map(c => {
              const creditsPercent = c.ai_credits_total > 0 ? Math.round((c.ai_credits_used / c.ai_credits_total) * 100) : 0
              return (
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
                        <div className="min-w-0">
                          <span className={clsx('font-medium text-studio-text-primary block truncate', !c.is_active && 'text-studio-text-disabled line-through')}>
                            {c.name}
                          </span>
                          <span className="text-[10px] text-studio-text-tertiary">{c.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 hidden sm:table-cell">
                      {c.primary_admin_name ? (
                        <div className="flex items-center gap-1.5">
                          <Crown size={12} className="text-amber-400 flex-shrink-0" />
                          <span className="text-xs text-studio-text-secondary truncate">{c.primary_admin_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-studio-text-disabled">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={clsx('badge', PLAN_COLORS[c.plan] || PLAN_COLORS.free)}>
                        {PLAN_LABELS[c.plan] || c.plan}
                      </span>
                    </td>
                    <td className="py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-studio-border rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full', creditsPercent > 80 ? 'bg-red-400' : creditsPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400')}
                            style={{ width: `${Math.min(creditsPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-studio-text-tertiary whitespace-nowrap">{c.ai_credits_used}/{c.ai_credits_total}</span>
                      </div>
                    </td>
                    <td className="py-3 hidden md:table-cell">
                      <span className="text-sm text-studio-text-primary">{c.member_count}</span>
                    </td>
                    <td className="py-3 text-studio-text-tertiary text-xs hidden lg:table-cell">
                      {c.plan_expires_at ? new Date(c.plan_expires_at).toLocaleDateString('hr-HR') : '∞'}
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
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                              {/* Subscription management */}
                              <div>
                                <h4 className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                  <Zap size={14} />
                                  Pretplata
                                </h4>
                                {editingSub ? (
                                  <div className="space-y-2">
                                    <select value={subForm.plan} onChange={e => setSubForm({ ...subForm, plan: e.target.value })} className="w-full px-2 py-1.5 bg-studio-surface-1 border border-studio-border text-studio-text-primary rounded text-xs">
                                      <option value="free">Free</option>
                                      <option value="pro">Pro</option>
                                      <option value="enterprise">Enterprise</option>
                                    </select>
                                    <div>
                                      <label className="text-[10px] text-studio-text-tertiary">AI Krediti (ukupno)</label>
                                      <input type="number" value={subForm.ai_credits_total} onChange={e => setSubForm({ ...subForm, ai_credits_total: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 bg-studio-surface-1 border border-studio-border text-studio-text-primary rounded text-xs" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-studio-text-tertiary">AI Krediti (potrošeno)</label>
                                      <input type="number" value={subForm.ai_credits_used} onChange={e => setSubForm({ ...subForm, ai_credits_used: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 bg-studio-surface-1 border border-studio-border text-studio-text-primary rounded text-xs" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-studio-text-tertiary">Datum isteka</label>
                                      <input type="date" value={subForm.plan_expires_at} onChange={e => setSubForm({ ...subForm, plan_expires_at: e.target.value })} className="w-full px-2 py-1 bg-studio-surface-1 border border-studio-border text-studio-text-primary rounded text-xs" />
                                    </div>
                                    <div className="flex gap-1">
                                      <button onClick={handleSaveSub} className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10" title="Spremi"><Check className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => setEditingSub(false)} className="p-1 rounded text-studio-text-tertiary hover:bg-white/5" title="Odustani"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="p-2 bg-studio-surface-1 rounded-lg">
                                      <p className="text-[10px] text-studio-text-tertiary uppercase">Plan</p>
                                      <span className={clsx('badge mt-1', PLAN_COLORS[clientDetail.plan] || PLAN_COLORS.free)}>
                                        {PLAN_LABELS[clientDetail.plan] || clientDetail.plan}
                                      </span>
                                    </div>
                                    <div className="p-2 bg-studio-surface-1 rounded-lg">
                                      <p className="text-[10px] text-studio-text-tertiary uppercase">AI Krediti</p>
                                      <p className="text-xs font-medium text-studio-text-primary mt-0.5">{clientDetail.ai_credits_used} / {clientDetail.ai_credits_total}</p>
                                    </div>
                                    <div className="p-2 bg-studio-surface-1 rounded-lg">
                                      <p className="text-[10px] text-studio-text-tertiary uppercase">Istječe</p>
                                      <p className="text-xs font-medium text-studio-text-primary mt-0.5">
                                        {clientDetail.plan_expires_at ? new Date(clientDetail.plan_expires_at).toLocaleDateString('hr-HR') : 'Bez isteka'}
                                      </p>
                                    </div>
                                    <button onClick={() => startEditSub(clientDetail)} className="text-xs text-brand-blue hover:underline flex items-center gap-1">
                                      <Edit2 size={10} /> Uredi pretplatu
                                    </button>
                                  </div>
                                )}
                              </div>

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

                              {/* Actions */}
                              <div className="lg:col-span-4 pt-3 border-t border-studio-border flex justify-end">
                                <button
                                  onClick={() => {
                                    localStorage.setItem('current_client_id', expandedClientId!)
                                    if (clientDetail.projects?.[0]) {
                                      localStorage.setItem('current_project_id', clientDetail.projects[0].id)
                                    }
                                    window.location.href = '/'
                                  }}
                                  className="btn-primary flex items-center gap-2 text-sm"
                                >
                                  <LogIn className="w-4 h-4" />
                                  Pregledaj klijenta
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
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
    </div>
  )
}

// ---------------------------------------------------------------------------
// Audit Log View
// ---------------------------------------------------------------------------

function AuditLogView() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState('')
  const pageSize = 30

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ skip: String(page * pageSize), limit: String(pageSize) })
      if (actionFilter) params.set('action', actionFilter)
      const res = await api.get(`/admin/audit-log?${params}`)
      setEntries(res.data.entries)
      setTotal(res.data.total)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const totalPages = Math.ceil(total / pageSize)
  const actionTypes = [
    '', 'user.login', 'user.create', 'user.update', 'user.deactivate',
    'user.impersonate', 'membership.role_change', 'membership.remove',
    'client.subscription_change',
  ]

  function formatDetails(entry: AuditEntry): string {
    if (!entry.details) return ''
    const d = entry.details
    if (entry.action === 'membership.role_change') {
      return `${d.old_role} → ${d.new_role}`
    }
    if (entry.action === 'user.impersonate') {
      return d.target_email || d.target_name || ''
    }
    if (entry.action === 'user.create') {
      return `${d.email} (${d.role})`
    }
    if (entry.action === 'user.deactivate') {
      return d.email || d.full_name || ''
    }
    if (entry.action === 'client.subscription_change') {
      const parts: string[] = []
      if (d.plan) parts.push(`plan: ${d.plan.old}→${d.plan.new}`)
      if (d.ai_credits_total) parts.push(`krediti: ${d.ai_credits_total.new}`)
      return parts.join(', ')
    }
    return ''
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="section-title">Audit Log</h1>
            <p className="text-sm text-studio-text-tertiary">{total} zapisa ukupno</p>
          </div>
        </div>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(0) }}
          className="px-3 py-1.5 bg-studio-surface-1 border border-studio-border text-studio-text-primary rounded-lg text-xs"
        >
          <option value="">Sve akcije</option>
          {actionTypes.filter(Boolean).map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-studio-text-tertiary border-b border-studio-border">
                <th className="pb-3 font-medium">Vrijeme</th>
                <th className="pb-3 font-medium">Korisnik</th>
                <th className="pb-3 font-medium">Akcija</th>
                <th className="pb-3 font-medium hidden md:table-cell">Detalji</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-studio-border">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-studio-surface-1 transition-colors">
                  <td className="py-3 text-xs text-studio-text-tertiary whitespace-nowrap">
                    {relativeTime(e.created_at)}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-brand-blue">{e.user_email?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                      <span className="text-xs text-studio-text-secondary truncate">{e.user_email}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="badge bg-white/5 text-studio-text-secondary text-[10px]">
                      {ACTION_LABELS[e.action] || e.action}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-studio-text-tertiary hidden md:table-cell truncate max-w-[200px]">
                    {formatDetails(e)}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-studio-text-tertiary">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-studio-text-disabled" />
                    Nema zapisa
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs rounded-lg bg-studio-surface-1 border border-studio-border text-studio-text-secondary hover:bg-studio-surface-2 disabled:opacity-40"
          >
            Prethodna
          </button>
          <span className="text-xs text-studio-text-tertiary">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-xs rounded-lg bg-studio-surface-1 border border-studio-border text-studio-text-secondary hover:bg-studio-surface-2 disabled:opacity-40"
          >
            Sljedeća
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// System Settings View
// ---------------------------------------------------------------------------

interface ApiServiceRecord {
  id: string
  name: string
  description: string
  enabled: boolean
  mode: 'mock' | 'live'
  icon: string
}

interface SettingsPayload {
  apis: ApiServiceRecord[]
  system: { version: string; environment: string; dataMode: string; lastUpdated: string }
}

const fallbackApis: ApiServiceRecord[] = [
  { id: 'meta', name: 'Meta Graph API', description: 'Instagram i Facebook podaci', enabled: true, mode: 'mock', icon: '📘' },
  { id: 'tiktok', name: 'TikTok API', description: 'TikTok analitika i objavljivanje', enabled: true, mode: 'mock', icon: '🎵' },
  { id: 'youtube', name: 'YouTube Data API', description: 'YouTube kanal i video podaci', enabled: true, mode: 'mock', icon: '▶️' },
  { id: 'ga4', name: 'Google Analytics 4', description: 'Promet web stranice i konverzije', enabled: true, mode: 'mock', icon: '📊' },
  { id: 'market_data', name: 'Market Data API', description: 'Tržišni podaci i analitika industrije', enabled: true, mode: 'mock', icon: '📊' },
  { id: 'claude', name: 'Claude AI', description: 'Generiranje sadržaja i analiza', enabled: true, mode: 'mock', icon: '🤖' },
  { id: 'buffer', name: 'Buffer / Objavljivanje', description: 'Zakazivanje objava na društvenim mrežama', enabled: true, mode: 'mock', icon: '📅' },
  { id: 'image_gen', name: 'Generiranje slika', description: 'AI kreiranje slika za sadržaj', enabled: true, mode: 'mock', icon: '🎨' },
  { id: 'trends', name: 'Google Trends', description: 'Podaci o trendovima pretraživanja i uvidi', enabled: true, mode: 'mock', icon: '📈' },
]

const fallbackSystem = { version: '1.0.0-beta', environment: 'Razvoj', dataMode: 'Mock podaci', lastUpdated: 'Mar 5, 2026' }

function SystemSettingsView() {
  const { data: apiData, loading, refetch } = useApi<SettingsPayload>('/settings/api-status')
  const { toasts, addToast, removeToast } = useToast()

  const [localApis, setLocalApis] = useState<ApiServiceRecord[] | null>(null)
  const [togglingApis, setTogglingApis] = useState<Set<string>>(new Set())

  const apis = localApis || apiData?.apis || fallbackApis
  const system = apiData?.system || fallbackSystem

  const toggleApiMode = useCallback(async (id: string) => {
    const current = apis.find(a => a.id === id)
    if (!current) return

    const newMode = current.mode === 'mock' ? 'live' : 'mock'
    const useMock = newMode === 'mock'

    setTogglingApis(prev => new Set(prev).add(id))
    const updated = apis.map(a => a.id === id ? { ...a, mode: newMode as 'mock' | 'live' } : a)
    setLocalApis(updated)

    try {
      const response = await settingsApi.toggleApi(id, useMock)
      const msg = response.data.message || `${current.name} prebačen na ${newMode}`
      addToast(msg, 'success')
      refetch()
    } catch (err) {
      setLocalApis(apis.map(a => a.id === id ? { ...a, mode: current.mode } : a))
      const errorMsg = err instanceof Error ? err.message : 'Nepoznata greška'
      addToast(`Greška pri prebacivanju ${current.name}: ${errorMsg}`, 'error')
    } finally {
      setTogglingApis(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }, [apis, addToast, refetch])

  const toggleEnabled = useCallback((id: string) => {
    const updated = apis.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a)
    setLocalApis(updated)
  }, [apis])

  const mockCount = apis.filter(a => a.mode === 'mock').length
  const allMock = mockCount === apis.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="section-title">Postavke sustava</h1>
          <p className="text-sm text-studio-text-tertiary">Globalna konfiguracija i API integracije</p>
        </div>
      </div>

      {/* System Health + Quotas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealth />
        <QuotaDisplay />
      </div>

      {/* API Integrations */}
      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <Plug size={20} className="text-blue-400" />
          <h2 className="section-title">API integracije</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ml-2">
            {allMock ? 'Sve mock način' : `${mockCount}/${apis.length} mock`}
          </span>
        </div>

        {loading && !apiData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card"><div className="skeleton h-20 w-full rounded" /></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apis.map((svc) => (
              <div
                key={svc.id}
                className={clsx(
                  'rounded-lg border p-4 transition-colors',
                  svc.enabled ? 'bg-studio-surface-0 border-studio-border' : 'bg-studio-surface-0 border-studio-border opacity-50'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{svc.icon}</span>
                    <div>
                      <h3 className="text-sm font-medium text-studio-text-primary">{svc.name}</h3>
                      <p className="text-xs text-studio-text-secondary mt-0.5">{svc.description}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleEnabled(svc.id)} className="shrink-0 ml-2">
                    {svc.enabled
                      ? <ToggleRight size={28} className="text-blue-400" />
                      : <ToggleLeft size={28} className="text-studio-text-secondary" />
                    }
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => toggleApiMode(svc.id)}
                    disabled={togglingApis.has(svc.id)}
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait',
                      svc.mode === 'mock'
                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                    )}
                  >
                    {togglingApis.has(svc.id) ? (
                      <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Spremanje...</span>
                    ) : (
                      svc.mode === 'mock' ? 'Mock' : 'Live'
                    )}
                  </button>
                  <span className="text-xs text-studio-text-secondary">|</span>
                  <span className="text-xs text-studio-text-secondary">
                    {svc.mode === 'mock' ? 'API ključ nije potreban' : 'Povezano s API-jem'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Info */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-studio-text-secondary" />
          <h2 className="section-title">Informacije o sustavu</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-studio-text-secondary">Verzija</p>
            <p className="text-studio-text-primary font-mono">{system.version}</p>
          </div>
          <div>
            <p className="text-studio-text-secondary">Okruženje</p>
            <p className="text-amber-400 font-mono">{system.environment}</p>
          </div>
          <div>
            <p className="text-studio-text-secondary">Način podataka</p>
            <p className="text-emerald-400 font-mono">{system.dataMode}</p>
          </div>
          <div>
            <p className="text-studio-text-secondary">Zadnje ažurirano</p>
            <p className="text-studio-text-primary font-mono">{system.lastUpdated}</p>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={clsx(
                'flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-sm text-sm font-medium',
                toast.type === 'success' ? 'bg-emerald-600 text-white'
                  : toast.type === 'error' ? 'bg-red-600 text-white'
                  : 'bg-brand-blue text-white'
              )}
            >
              <span>{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">x</button>
            </div>
          ))}
        </div>
      )}
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
    location.pathname === '/admin/audit' ? 'audit' :
    location.pathname === '/admin/settings' ? 'settings' :
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
      <div>
        {view === 'dashboard' && <DashboardView />}
        {view === 'users' && <UsersView />}
        {view === 'clients' && <ClientsView />}
        {view === 'audit' && <AuditLogView />}
        {view === 'settings' && <SystemSettingsView />}
      </div>
    </div>
  )
}
