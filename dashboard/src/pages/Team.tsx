import { useState, useEffect, useCallback } from 'react'
import {
  UsersRound, Plus, Edit2, UserX, Check, X, Copy, Link2,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import { useClient } from '../contexts/ClientContext'
import { teamApi, type TeamMember } from '../api/team'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLIENT_ROLES = ['admin', 'moderator', 'viewer'] as const
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  moderator: 'Moderator',
  viewer: 'Viewer',
}
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  moderator: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  viewer: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
}

// ---------------------------------------------------------------------------
// Main Team Page
// ---------------------------------------------------------------------------

export default function Team() {
  const { user: currentUser } = useAuth()
  const { currentClient } = useClient()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviting, setInviting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Inline role editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')

  // Remove confirmation
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchMembers = useCallback(async () => {
    if (!currentClient) return
    try {
      const res = await teamApi.getMembers(currentClient.client_id)
      setMembers(res.data)
    } catch {
      setError('Greška pri dohvaćanju članova')
    } finally {
      setLoading(false)
    }
  }, [currentClient])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  // ---------------------------------------------------------------------------
  // Invite
  // ---------------------------------------------------------------------------

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentClient) return
    setInviting(true)
    try {
      const res = await teamApi.inviteMember(currentClient.client_id, '', inviteRole)
      setInviteUrl(res.data.invite_url)
      showToast('Pozivni link generiran')
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Greška pri pozivanju', 'error')
    } finally {
      setInviting(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = inviteUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const closeInviteModal = () => {
    setShowInvite(false)
    setInviteUrl('')
    setInviteRole('viewer')
    setCopied(false)
  }

  // ---------------------------------------------------------------------------
  // Role editing
  // ---------------------------------------------------------------------------

  const startEdit = (m: TeamMember) => {
    setEditingId(m.user_id)
    setEditRole(m.role)
  }

  const handleSaveRole = async (userId: string) => {
    if (!currentClient) return
    try {
      await teamApi.updateMemberRole(currentClient.client_id, userId, editRole)
      setEditingId(null)
      fetchMembers()
      showToast('Uloga ažurirana')
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Greška pri ažuriranju uloge', 'error')
    }
  }

  // ---------------------------------------------------------------------------
  // Remove member
  // ---------------------------------------------------------------------------

  const handleRemove = async () => {
    if (!currentClient || !removingMember) return
    setRemoving(true)
    try {
      await teamApi.removeMember(currentClient.client_id, removingMember.user_id)
      setRemovingMember(null)
      fetchMembers()
      showToast('Član uklonjen')
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Greška pri uklanjanju člana', 'error')
    } finally {
      setRemoving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="page-wrapper space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <UsersRound className="w-5 h-5 text-sky-500" />
          </div>
          <div>
            <h1 className="section-title">Tim</h1>
            <p className="text-sm text-studio-text-tertiary">
              Članovi klijenta {currentClient?.client_name}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Pozovi člana</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Member count */}
      {!loading && (
        <div className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider">
          {members.length} {members.length === 1 ? 'član' : 'članova'}
        </div>
      )}

      {/* Members table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-studio-text-tertiary border-b border-studio-border">
                <th className="pb-3 font-medium">Korisnik</th>
                <th className="pb-3 font-medium hidden sm:table-cell">Email</th>
                <th className="pb-3 font-medium">Uloga</th>
                <th className="pb-3 font-medium hidden md:table-cell">Status</th>
                <th className="pb-3 font-medium text-right">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-studio-border">
              {members.map((m) => {
                const isSelf = m.user_id === currentUser?.id
                const isEditing = editingId === m.user_id

                return (
                  <tr key={m.user_id} className="hover:bg-studio-surface-2/50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-sky-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-sky-600">
                            {m.full_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className={clsx(
                            'font-medium text-studio-text-primary block truncate',
                            !m.is_active && 'text-studio-text-disabled line-through'
                          )}>
                            {m.full_name}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] text-studio-text-tertiary">(vi)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-studio-text-tertiary hidden sm:table-cell">
                      {m.email}
                    </td>
                    <td className="py-3">
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="px-2 py-1 bg-studio-surface-1 border border-studio-border text-studio-text-primary rounded-lg text-xs focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300 outline-none"
                        >
                          {CLIENT_ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={clsx('badge', ROLE_COLORS[m.role] || ROLE_COLORS.viewer)}>
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 hidden md:table-cell">
                      <span className={clsx(
                        'text-xs font-medium',
                        m.is_active ? 'text-emerald-600' : 'text-studio-text-disabled'
                      )}>
                        {m.is_active ? 'Aktivan' : 'Neaktivan'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleSaveRole(m.user_id)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            title="Spremi"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg text-studio-text-tertiary hover:bg-studio-surface-2"
                            title="Odustani"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          {!isSelf && (
                            <>
                              <button
                                onClick={() => startEdit(m)}
                                className="p-1.5 rounded-lg text-studio-text-tertiary hover:bg-studio-surface-2 hover:text-studio-text-secondary"
                                title="Promijeni ulogu"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setRemovingMember(m)}
                                className="p-1.5 rounded-lg text-studio-text-tertiary hover:bg-red-50 hover:text-red-500"
                                title="Ukloni"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-studio-text-tertiary">
                    <UsersRound className="w-8 h-8 mx-auto mb-2 text-studio-text-disabled" />
                    Nema članova
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Invite Modal                                                         */}
      {/* ------------------------------------------------------------------- */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-sky-500" />
                <h3 className="text-base font-semibold text-studio-text-primary" style={{ fontFamily: 'Inter, system-ui, sans-serif', textTransform: 'none' as const }}>
                  Pozovi novog člana
                </h3>
              </div>
              <button onClick={closeInviteModal} className="p-1 rounded-lg text-studio-text-tertiary hover:bg-studio-surface-2">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!inviteUrl ? (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-studio-text-secondary mb-1.5">Uloga</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2.5 bg-studio-surface-2 border border-studio-border text-studio-text-primary rounded-xl text-sm focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300 outline-none"
                  >
                    {CLIENT_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-studio-text-tertiary mt-1.5">
                    Odaberite ulogu koju će novi član imati u ovoj organizaciji.
                  </p>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={closeInviteModal} className="btn-ghost text-sm">
                    Odustani
                  </button>
                  <button type="submit" disabled={inviting} className="btn-primary text-sm">
                    {inviting ? 'Generiranje...' : 'Generiraj pozivni link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-medium mb-2">
                    Pozivni link (vrijedi 72h):
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteUrl}
                      className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs text-studio-text-primary truncate"
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      onClick={copyToClipboard}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                        copied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      )}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Kopirano!' : 'Kopiraj'}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-studio-text-tertiary">
                  Pošaljite ovaj link osobi koju želite pozvati. Uloga: <strong>{ROLE_LABELS[inviteRole]}</strong>
                </p>
                <div className="flex justify-end pt-1">
                  <button onClick={closeInviteModal} className="btn-primary text-sm">
                    Zatvori
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Remove Confirmation Modal                                            */}
      {/* ------------------------------------------------------------------- */}
      {removingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card w-full max-w-sm mx-4 text-center shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <UserX className="w-5 h-5 text-red-500" />
            </div>
            <h3
              className="text-base font-semibold text-studio-text-primary mb-1"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', textTransform: 'none' as const }}
            >
              Ukloni člana?
            </h3>
            <p className="text-sm text-studio-text-tertiary mb-5">
              Jeste li sigurni da želite ukloniti <strong>{removingMember.full_name}</strong> iz tima?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setRemovingMember(null)}
                className="btn-ghost text-sm"
              >
                Odustani
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {removing ? 'Uklanjam...' : 'Ukloni'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Toast                                                                */}
      {/* ------------------------------------------------------------------- */}
      {toast && (
        <div className={clsx(
          'fixed bottom-4 right-4 z-[100] px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium text-white transform transition-all duration-300 animate-fade-in',
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        )}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
