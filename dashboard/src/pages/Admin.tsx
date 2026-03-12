import { useState, useEffect, useCallback } from 'react'
import { Shield, Plus, Edit2, UserX, Check, X, Users } from 'lucide-react'
import { clsx } from 'clsx'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'

interface UserRecord {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  last_login: string | null
  created_at: string
}

const ROLES = ['superadmin', 'admin', 'moderator', 'viewer'] as const
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

export default function Admin() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: '', is_active: true })
  const [createForm, setCreateForm] = useState({ email: '', password: '', full_name: '', role: 'viewer' })
  const [error, setError] = useState('')

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
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Greška pri ažuriranju')
    }
  }

  const handleDeactivate = async (id: string) => {
    setError('')
    try {
      await api.delete(`/admin/users/${id}`)
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Greška pri deaktivaciji')
    }
  }

  const startEdit = (u: UserRecord) => {
    setEditingId(u.id)
    setEditForm({ full_name: u.full_name, role: u.role, is_active: u.is_active })
  }

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="section-title">Administracija</h1>
            <p className="text-sm text-studio-text-tertiary">{total} korisnika</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
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

      {/* Create Modal */}
      {showCreate && (
        <div className="card border-brand-accent/30">
          <h3 className="font-headline text-sm tracking-wider text-studio-text-primary mb-4">NOVI KORISNIK</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Email adresa"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="px-3 py-2 border bg-studio-surface-1 border-studio-border text-studio-text-primary rounded-lg text-sm focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none"
            />
            <input
              type="password"
              placeholder="Lozinka"
              required
              minLength={6}
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className="px-3 py-2 border bg-studio-surface-1 border-studio-border text-studio-text-primary rounded-lg text-sm focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none"
            />
            <input
              type="text"
              placeholder="Ime i prezime"
              required
              value={createForm.full_name}
              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              className="px-3 py-2 border bg-studio-surface-1 border-studio-border text-studio-text-primary rounded-lg text-sm focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none"
            />
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              className="px-3 py-2 border bg-studio-surface-1 border-studio-border text-studio-text-primary rounded-lg text-sm focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none"
            >
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Odustani</button>
              <button type="submit" className="btn-primary text-sm">Kreiraj</button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-studio-text-tertiary border-b border-studio-border">
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
                <tr key={u.id} className="hover:bg-studio-surface-1">
                  <td className="py-3">
                    {editingId === u.id ? (
                      <input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="px-2 py-1 bg-studio-surface-1 border border-studio-border text-studio-text-primary rounded text-sm w-full max-w-[180px]"
                      />
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
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className="px-2 py-1 bg-studio-surface-1 border border-studio-border text-studio-text-primary rounded text-xs"
                      >
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
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={editForm.is_active}
                          onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                          className="rounded border-studio-border"
                        />
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
                  <td className="py-3 text-right">
                    {editingId === u.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => handleEdit(u.id)} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10" title="Spremi">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-studio-text-tertiary hover:bg-white/5" title="Odustani">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => startEdit(u)} className="p-1.5 rounded-lg text-studio-text-tertiary hover:bg-white/5 hover:text-studio-text-secondary" title="Uredi">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser?.id && u.is_active && (
                          <button onClick={() => handleDeactivate(u.id)} className="p-1.5 rounded-lg text-studio-text-tertiary hover:bg-red-500/10 hover:text-red-400" title="Deaktiviraj">
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-studio-text-tertiary">
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
