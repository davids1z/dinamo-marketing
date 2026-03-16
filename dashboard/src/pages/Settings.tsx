import { useState, useCallback, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import { CardSkeleton } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { settingsApi, type AiQuotaResponse } from '../api/settings'
import { teamApi, type TeamMember } from '../api/team'
import { useClient } from '../contexts/ClientContext'
import { useAuth } from '../contexts/AuthContext'
import {
  Bell, ToggleLeft, ToggleRight, CheckCircle, AlertCircle,
  Loader2, CreditCard, Sparkles, Building2, Users, Settings as SettingsIcon,
  Shield, ShieldCheck, Globe, Download, FileDown,
  Plug, ChevronRight, Crown, Eye, UserCog, Lock,
  Smartphone, Monitor, KeyRound, AlertTriangle,
  Zap, Palette,
  Plus, Edit2, UserX, Check, X, Copy, Link2,
} from 'lucide-react'
import { clsx } from 'clsx'

// ─── Types ───────────────────────────────────────────────────────────────────

type SettingsTab = 'general' | 'team' | 'integrations'

interface SettingsData {
  notifications: Array<{ id: string; label: string; description: string; enabled: boolean }>
}

// ─── Role Hierarchy ──────────────────────────────────────────────────────────

const CLIENT_ROLES = ['admin', 'moderator', 'viewer'] as const
const ROLE_META: Record<string, { label: string; description: string; icon: typeof Crown; color: string; badge: string }> = {
  admin: {
    label: 'Admin',
    description: 'Potpun pristup svim postavkama, naplati i upravljanju timom',
    icon: Crown,
    color: 'text-blue-400',
    badge: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
  },
  moderator: {
    label: 'Moderator',
    description: 'Operativni pristup: kalendar, kampanje, analitika. Bez pristupa naplati.',
    icon: UserCog,
    color: 'text-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
  },
  viewer: {
    label: 'Viewer',
    description: 'Samo pregled izvještaja i analitike. Ne može generirati ni mijenjati sadržaj.',
    icon: Eye,
    color: 'text-slate-400',
    badge: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20',
  },
}

// ─── Notification Config ─────────────────────────────────────────────────────

const fallbackNotifications = [
  { id: 'sentiment_alert', label: 'Upozorenja sentimenta', description: 'Obavijesti kad negativni sentiment prijeđe prag', enabled: true },
  { id: 'campaign_budget', label: 'Upozorenja budžeta kampanje', description: 'Upozori kad potrošnja kampanje dosegne 80% budžeta', enabled: true },
  { id: 'weekly_report', label: 'Tjedni izvještaj spreman', description: 'Obavijest kad je tjedni izvještaj generiran', enabled: true },
  { id: 'mention_spike', label: 'Detekcija porasta spominjanja', description: 'Upozorenje na neuobičajen obujam spominjanja', enabled: false },
  { id: 'competitor_alert', label: 'Aktivnost konkurencije', description: 'Obavijesti o značajnim promjenama konkurencije', enabled: false },
  { id: 'content_approval', label: 'Potrebno odobrenje sadržaja', description: 'Upozori kad sadržaj treba odobrenje', enabled: true },
]

// ─── Integration Cards ───────────────────────────────────────────────────────

const INTEGRATIONS = [
  { id: 'facebook', name: 'Facebook Ads', icon: '📘', description: 'Upravljanje kampanjama, ciljanje publike, praćenje konverzija', color: 'from-blue-600/10 to-blue-600/5', status: 'available' as const, badge: 'sandbox' as const },
  { id: 'instagram', name: 'Instagram API', icon: '📸', description: 'Automatsko objavljivanje, analitika postova, praćenje hashtag-ova', color: 'from-pink-500/10 to-purple-500/5', status: 'available' as const, badge: 'sandbox' as const },
  { id: 'tiktok', name: 'TikTok API', icon: '🎵', description: 'Video analitika, praćenje trendova, kreatorske statistike', color: 'from-cyan-500/10 to-pink-500/5', status: 'coming_soon' as const, badge: null },
  { id: 'google_analytics', name: 'Google Analytics', icon: '📊', description: 'Web promet, konverzije, korisničko ponašanje, UTM praćenje', color: 'from-amber-500/10 to-orange-500/5', status: 'available' as const, badge: 'beta' as const },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', description: 'Company page analitika, B2B kampanje, employee advocacy', color: 'from-blue-700/10 to-blue-500/5', status: 'coming_soon' as const, badge: null },
  { id: 'mailchimp', name: 'Mailchimp', icon: '📧', description: 'Email kampanje, automatizacija, liste kontakata', color: 'from-yellow-500/10 to-yellow-600/5', status: 'coming_soon' as const, badge: null },
]

// ─── Billing Plans ───────────────────────────────────────────────────────────

const PLANS = [
  { id: 'free', name: 'Free Beta', price: '0', period: '/mj', users: 5, projects: 2, aiGens: 50, highlight: false },
  { id: 'starter', name: 'Starter', price: '49', period: '/mj', users: 10, projects: 5, aiGens: 200, highlight: false },
  { id: 'pro', name: 'Pro', price: '149', period: '/mj', users: 25, projects: 15, aiGens: 1000, highlight: true },
  { id: 'enterprise', name: 'Enterprise', price: 'Po dogovoru', period: '', users: -1, projects: -1, aiGens: -1, highlight: false },
]

const LANGUAGES = [
  { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
]

// ─── Team Section Sub-component ──────────────────────────────────────────────

function TeamSection() {
  const { user: currentUser } = useAuth()
  const { currentClient, isClientAdmin } = useClient()
  const clientId = currentClient?.client_id || ''

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [savingRole, setSavingRole] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Invite state
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('viewer')
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { addToast } = useToast()

  const fetchMembers = useCallback(async () => {
    if (!clientId) return
    try {
      const res = await teamApi.getMembers(clientId)
      setMembers(res.data as TeamMember[])
    } catch {
      /* ignore */
    } finally {
      setLoadingMembers(false)
    }
  }, [clientId])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await teamApi.inviteMember(clientId, inviteEmail.trim(), inviteRole)
      const data = res.data as { invite_url: string }
      setInviteLink(data.invite_url)
      addToast('Pozivnica generirana!', 'success')
    } catch {
      addToast('Greška pri slanju pozivnice', 'error')
    } finally {
      setInviting(false)
    }
  }

  const handleRoleSave = async (userId: string) => {
    setSavingRole(true)
    try {
      await teamApi.updateMemberRole(clientId, userId, editRole)
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: editRole as TeamMember['role'] } : m))
      addToast('Uloga ažurirana', 'success')
      setEditingUserId(null)
    } catch {
      addToast('Greška pri promjeni uloge', 'error')
    } finally {
      setSavingRole(false)
    }
  }

  const handleRemove = async (userId: string) => {
    setRemovingId(userId)
    try {
      await teamApi.removeMember(clientId, userId)
      setMembers(prev => prev.filter(m => m.user_id !== userId))
      addToast('Član uklonjen', 'success')
    } catch {
      addToast('Greška pri uklanjanju člana', 'error')
    } finally {
      setRemovingId(null)
    }
  }

  const copyLink = () => {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loadingMembers) {
    return <CardSkeleton count={3} cols="grid grid-cols-1 gap-3" />
  }

  const roleMeta = ROLE_META

  return (
    <div className="space-y-6">
      {/* Role Explainer */}
      <div className="card border-dashed border-studio-border/60">
        <h3 className="font-headline text-xs tracking-wider text-studio-text-secondary font-bold mb-4 flex items-center gap-2">
          <Shield size={14} className="text-brand-accent" /> HIJERARHIJA ULOGA
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CLIENT_ROLES.map(role => {
            const meta = roleMeta[role]
            const defaultMeta = { label: role, description: '', icon: Eye, color: 'text-slate-400', badge: 'bg-slate-500/10 text-slate-400' }
            const m = meta ?? defaultMeta
            const RIcon = m.icon
            return (
              <div key={role} className="p-3.5 rounded-xl bg-studio-surface-0 border border-studio-border">
                <div className="flex items-center gap-2 mb-2">
                  <RIcon size={16} className={m.color} />
                  <span className="text-sm font-bold text-studio-text-primary">{m.label}</span>
                </div>
                <p className="text-[11px] text-studio-text-tertiary leading-relaxed">{m.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Members Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-headline text-xs tracking-wider text-studio-text-secondary font-bold flex items-center gap-2">
            <Users size={14} className="text-blue-400" /> ČLANOVI TIMA
            <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-studio-surface-3 text-studio-text-tertiary">
              {members.length}
            </span>
          </h3>
          {isClientAdmin && (
            <button
              onClick={() => { setShowInvite(true); setInviteLink(null); setInviteEmail(''); setCopied(false) }}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Plus size={14} /> Pozovi člana
            </button>
          )}
        </div>

        <div className="space-y-2">
          {members.map(m => {
            const meta = roleMeta[m.role]
            const defaultBadge = 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20'
            const isSelf = m.user_id === currentUser?.id
            const isEditing = editingUserId === m.user_id

            return (
              <div key={m.user_id} className="flex items-center justify-between p-3.5 bg-studio-surface-0 rounded-xl border border-studio-border hover:border-studio-border-hover transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-brand-accent/10 flex items-center justify-center text-sm font-bold text-brand-accent flex-shrink-0">
                    {(m.full_name || m.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-studio-text-primary truncate">
                      {m.full_name || m.email}
                      {isSelf && <span className="text-[10px] text-studio-text-tertiary ml-1.5">(ti)</span>}
                    </p>
                    <p className="text-[11px] text-studio-text-tertiary truncate">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value)}
                        className="text-xs bg-studio-surface-1 border border-studio-border rounded-lg px-2 py-1.5 text-studio-text-primary"
                      >
                        {CLIENT_ROLES.map(r => (
                          <option key={r} value={r}>{roleMeta[r]?.label ?? r}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRoleSave(m.user_id)}
                        disabled={savingRole}
                        className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                      >
                        {savingRole ? <Loader2 size={13} className="animate-spin text-emerald-400" /> : <Check size={13} className="text-emerald-400" />}
                      </button>
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="w-7 h-7 rounded-lg bg-studio-surface-3 flex items-center justify-center hover:bg-red-500/10 transition-colors"
                      >
                        <X size={13} className="text-studio-text-tertiary" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', meta?.badge ?? defaultBadge)}>
                        {meta?.label ?? m.role}
                      </span>
                      {isClientAdmin && !isSelf && (
                        <>
                          <button
                            onClick={() => { setEditingUserId(m.user_id); setEditRole(m.role) }}
                            className="w-7 h-7 rounded-lg bg-studio-surface-3 flex items-center justify-center hover:bg-brand-accent/10 transition-colors"
                            title="Promijeni ulogu"
                          >
                            <Edit2 size={12} className="text-studio-text-tertiary" />
                          </button>
                          <button
                            onClick={() => handleRemove(m.user_id)}
                            disabled={removingId === m.user_id}
                            className="w-7 h-7 rounded-lg bg-studio-surface-3 flex items-center justify-center hover:bg-red-500/10 transition-colors"
                            title="Ukloni člana"
                          >
                            {removingId === m.user_id ? <Loader2 size={12} className="animate-spin text-red-400" /> : <UserX size={12} className="text-studio-text-tertiary" />}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="bg-studio-surface-1 border border-studio-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-studio-text-primary mb-4">Pozovi novog člana</h3>

            {!inviteLink ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-studio-text-secondary font-medium mb-1.5 block">Email adresa</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="kolega@agencija.hr"
                    className="w-full px-3 py-2.5 bg-studio-surface-0 border border-studio-border rounded-xl text-sm text-studio-text-primary placeholder:text-studio-text-tertiary focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-studio-text-secondary font-medium mb-1.5 block">Uloga</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CLIENT_ROLES.map(r => {
                      const meta = ROLE_META[r]
                      const defaultM = { label: r, icon: Eye, color: 'text-slate-400' }
                      const rm = meta ?? defaultM
                      const RmIcon = rm.icon
                      return (
                        <button
                          key={r}
                          onClick={() => setInviteRole(r)}
                          className={clsx(
                            'p-2.5 rounded-xl border text-center transition-all',
                            inviteRole === r
                              ? 'border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent/20'
                              : 'border-studio-border hover:border-studio-border-hover'
                          )}
                        >
                          <RmIcon size={16} className={clsx('mx-auto mb-1', rm.color)} />
                          <span className="text-xs font-semibold text-studio-text-primary">{rm.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowInvite(false)} className="btn-secondary flex-1 text-sm">Odustani</button>
                  <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
                    {inviting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    Generiraj link
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-studio-text-secondary">Link za pozivnicu (vrijedi 72 sata):</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 px-3 py-2.5 bg-studio-surface-0 border border-studio-border rounded-xl text-xs text-studio-text-primary truncate"
                  />
                  <button onClick={copyLink} className="btn-primary text-xs flex items-center gap-1.5 flex-shrink-0">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Kopirano!' : 'Kopiraj'}
                  </button>
                </div>
                <button onClick={() => setShowInvite(false)} className="btn-secondary w-full text-sm">Zatvori</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Settings Page ──────────────────────────────────────────────────────

export default function Settings() {
  const { data: apiData, loading, refetch } = useApi<SettingsData>('/settings/api-status')
  const { data: aiQuota } = useApi<AiQuotaResponse>('/settings/ai-quota')
  const { toasts, addToast, removeToast } = useToast()
  const { currentClient, isClientAdmin, isViewer } = useClient()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [localNotifications, setLocalNotifications] = useState<typeof fallbackNotifications | null>(null)
  const [togglingNotifs, setTogglingNotifs] = useState<Set<string>>(new Set())
  const [selectedLang, setSelectedLang] = useState('hr')
  const [sentimentThreshold, setSentimentThreshold] = useState(30)

  const isSuperadmin = user?.is_superadmin ?? false

  const notifications = localNotifications || apiData?.notifications || fallbackNotifications

  const toggleNotification = useCallback(async (id: string) => {
    const current = notifications.find(n => n.id === id)
    if (!current) return

    const newEnabled = !current.enabled

    setTogglingNotifs(prev => new Set(prev).add(id))

    const updated = notifications.map(n =>
      n.id === id ? { ...n, enabled: newEnabled } : n
    )
    setLocalNotifications(updated)

    try {
      const response = await settingsApi.toggleNotification(id, newEnabled)
      const msg = response.data.message || `${current.label} ${newEnabled ? 'uključeno' : 'isključeno'}`
      addToast(msg, 'success')
      refetch()
    } catch (err) {
      setLocalNotifications(notifications.map(n =>
        n.id === id ? { ...n, enabled: current.enabled } : n
      ))
      const errorMsg = err instanceof Error ? err.message : 'Nepoznata greška'
      addToast(`Greška pri promjeni obavijesti: ${errorMsg}`, 'error')
    } finally {
      setTogglingNotifs(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [notifications, addToast, refetch])

  const TABS: Array<{ id: SettingsTab; label: string; icon: typeof SettingsIcon; requireAdmin?: boolean }> = [
    { id: 'general', label: 'Postavke', icon: SettingsIcon },
    { id: 'team', label: 'Tim', icon: Users, requireAdmin: true },
    { id: 'integrations', label: 'Integracije', icon: Plug },
  ]

  const visibleTabs = useMemo(() =>
    TABS.filter(t => !t.requireAdmin || isClientAdmin || isSuperadmin),
    [isClientAdmin, isSuperadmin]
  )

  if (loading && !apiData) return (
    <>
      <Header title="POSTAVKE" subtitle="Postavke organizacije" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={4} cols="grid grid-cols-1 gap-4" />
      </div>
    </>
  )

  return (
    <div>
      <Header title="POSTAVKE" subtitle={currentClient?.client_name || 'Postavke organizacije'} />

      <div className="page-wrapper space-y-6">
        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/brand-profile"
            className="card hover:border-brand-accent/30 transition-all group hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center group-hover:bg-brand-accent/15 transition-colors">
                <Building2 className="w-5 h-5 text-brand-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-studio-text-primary group-hover:text-brand-accent transition-colors">Profil klijenta</h3>
                <p className="text-xs text-studio-text-tertiary">Branding, AI kontekst, vizualni identitet</p>
              </div>
              <ChevronRight size={16} className="text-studio-text-tertiary group-hover:text-brand-accent transition-colors" />
            </div>
          </Link>
          <button
            onClick={() => setActiveTab('team')}
            className={clsx(
              'card transition-all group hover:-translate-y-0.5 text-left',
              activeTab === 'team' ? 'border-blue-500/30 bg-blue-500/5' : 'hover:border-blue-500/30'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/15 transition-colors">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-studio-text-primary group-hover:text-blue-400 transition-colors">Tim</h3>
                <p className="text-xs text-studio-text-tertiary">Upravljanje članovima i ulogama</p>
              </div>
              <ChevronRight size={16} className="text-studio-text-tertiary group-hover:text-blue-400 transition-colors" />
            </div>
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={clsx(
              'card transition-all group hover:-translate-y-0.5 text-left',
              activeTab === 'integrations' ? 'border-purple-500/30 bg-purple-500/5' : 'hover:border-purple-500/30'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/15 transition-colors">
                <Plug className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-studio-text-primary group-hover:text-purple-400 transition-colors">Integracije</h3>
                <p className="text-xs text-studio-text-tertiary">Povezivanje vanjskih servisa i API-ja</p>
              </div>
              <ChevronRight size={16} className="text-studio-text-tertiary group-hover:text-purple-400 transition-colors" />
            </div>
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 bg-studio-surface-0 rounded-xl border border-studio-border">
          {visibleTabs.map(tab => {
            const TIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex-1 justify-center',
                  activeTab === tab.id
                    ? 'bg-brand-accent/10 text-brand-accent shadow-sm'
                    : 'text-studio-text-tertiary hover:text-studio-text-secondary hover:bg-studio-surface-1'
                )}
              >
                <TIcon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ═══════════════════ GENERAL TAB ═══════════════════ */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Notification Settings */}
            <div className="card">
              <div className="flex items-center gap-2 mb-6">
                <Bell size={20} className="text-amber-400" />
                <h2 className="section-title">Postavke obavijesti</h2>
                {isViewer && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20 ml-auto">
                    Samo za čitanje
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {notifications.map((notif) => {
                  const isSentiment = notif.id === 'sentiment_alert'
                  return (
                    <div
                      key={notif.id}
                      className="p-4 bg-studio-surface-0 rounded-xl border border-studio-border"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-studio-text-primary">{notif.label}</h3>
                          <p className="text-xs text-studio-text-tertiary mt-0.5">{notif.description}</p>
                        </div>
                        <button
                          onClick={() => !isViewer && toggleNotification(notif.id)}
                          disabled={togglingNotifs.has(notif.id) || isViewer}
                          className="disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-3"
                        >
                          {togglingNotifs.has(notif.id) ? (
                            <Loader2 size={28} className="animate-spin text-studio-text-tertiary" />
                          ) : notif.enabled ? (
                            <ToggleRight size={28} className="text-blue-400" />
                          ) : (
                            <ToggleLeft size={28} className="text-studio-text-secondary" />
                          )}
                        </button>
                      </div>
                      {/* Sentiment Threshold */}
                      {isSentiment && notif.enabled && (
                        <div className="mt-3 pt-3 border-t border-studio-border">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[11px] text-studio-text-secondary font-medium">
                              Prag upozorenja: negativni sentiment ispod
                            </label>
                            <span className="text-xs font-bold text-red-400">{sentimentThreshold}%</span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={80}
                            step={5}
                            value={sentimentThreshold}
                            onChange={e => setSentimentThreshold(Number(e.target.value))}
                            disabled={isViewer}
                            className="w-full h-1.5 bg-studio-surface-3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-400 [&::-webkit-slider-thumb]:shadow-md disabled:opacity-50"
                          />
                          <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-studio-text-tertiary">10%</span>
                            <span className="text-[10px] text-studio-text-tertiary">80%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Security Section */}
            <div className="card">
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck size={20} className="text-emerald-400" />
                <h2 className="section-title">Sigurnost</h2>
              </div>

              <div className="space-y-3">
                {/* 2FA */}
                <div className="flex items-center justify-between p-4 bg-studio-surface-0 rounded-xl border border-studio-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Smartphone size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-studio-text-primary">Dvofaktorska autentifikacija (2FA)</h3>
                      <p className="text-xs text-studio-text-tertiary mt-0.5">Dodatni sloj zaštite za vaš račun</p>
                    </div>
                  </div>
                  <button className="btn-secondary text-xs flex items-center gap-1.5" disabled>
                    <KeyRound size={13} />
                    Postavi 2FA
                    <span className="text-[9px] px-1 py-0.5 rounded bg-studio-surface-3 text-studio-text-tertiary">Uskoro</span>
                  </button>
                </div>

                {/* Active Sessions */}
                <div className="flex items-center justify-between p-4 bg-studio-surface-0 rounded-xl border border-studio-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Monitor size={16} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-studio-text-primary">Aktivne sesije</h3>
                      <p className="text-xs text-studio-text-tertiary mt-0.5">
                        Trenutno prijavljeni na <span className="text-brand-accent font-semibold">1 uređaj</span>
                      </p>
                    </div>
                  </div>
                  <button className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors" disabled>
                    Odjavi sve ostale
                  </button>
                </div>

                {/* Password */}
                <div className="flex items-center justify-between p-4 bg-studio-surface-0 rounded-xl border border-studio-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Lock size={16} className="text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-studio-text-primary">Lozinka</h3>
                      <p className="text-xs text-studio-text-tertiary mt-0.5">Zadnja promjena: nikad</p>
                    </div>
                  </div>
                  <button className="btn-secondary text-xs" disabled>Promijeni lozinku</button>
                </div>
              </div>
            </div>

            {/* Language */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <Globe size={20} className="text-blue-400" />
                <h2 className="section-title">Jezik sučelja</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLang(lang.code)}
                    className={clsx(
                      'p-3.5 rounded-xl border text-center transition-all',
                      selectedLang === lang.code
                        ? 'border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent/20'
                        : 'border-studio-border hover:border-studio-border-hover bg-studio-surface-0'
                    )}
                  >
                    <span className="text-2xl block mb-1">{lang.flag}</span>
                    <span className="text-xs font-semibold text-studio-text-primary">{lang.label}</span>
                  </button>
                ))}
              </div>
              {selectedLang !== 'hr' && (
                <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    Prijevod na {LANGUAGES.find(l => l.code === selectedLang)?.label} je u pripremi. Trenutno je dostupan samo hrvatski.
                  </p>
                </div>
              )}
            </div>

            {/* Data Export */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <Download size={20} className="text-purple-400" />
                <h2 className="section-title">Izvoz podataka</h2>
              </div>
              <p className="text-xs text-studio-text-tertiary mb-4 leading-relaxed">
                Preuzmite sve podatke svog tima u strukturiranom formatu. GDPR kompatibilno.
              </p>
              <div className="flex gap-3">
                <button className="btn-secondary text-xs flex items-center gap-1.5" disabled>
                  <FileDown size={14} /> Preuzmi JSON
                  <span className="text-[9px] px-1 py-0.5 rounded bg-studio-surface-3 text-studio-text-tertiary">Uskoro</span>
                </button>
                <button className="btn-secondary text-xs flex items-center gap-1.5" disabled>
                  <FileDown size={14} /> Preuzmi CSV
                  <span className="text-[9px] px-1 py-0.5 rounded bg-studio-surface-3 text-studio-text-tertiary">Uskoro</span>
                </button>
              </div>
            </div>

            {/* Plan & Billing (Admin only) */}
            {(isClientAdmin || isSuperadmin) && (
              <div className="card">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard size={20} className="text-brand-accent" />
                  <h2 className="section-title">Plan i naplata</h2>
                </div>

                {/* Current Plan */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-accent/5 to-transparent border border-brand-accent/20 rounded-xl mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-accent/15 flex items-center justify-center">
                      <Sparkles size={20} className="text-brand-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-studio-text-primary">Free Beta</h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent ring-1 ring-brand-accent/20">
                          Aktivan
                        </span>
                      </div>
                      <p className="text-sm text-studio-text-secondary mt-0.5">
                        Svi moduli uključeni tijekom beta perioda.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs flex items-center gap-1.5" disabled>
                      <FileDown size={13} /> Fakture
                    </button>
                    <button
                      disabled
                      className="btn-primary text-xs flex items-center gap-1.5 opacity-50 cursor-not-allowed"
                    >
                      Nadogradi plan
                      <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 font-medium">Uskoro</span>
                    </button>
                  </div>
                </div>

                {/* Quotas with real numbers */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="p-4 bg-studio-surface-0 rounded-xl border border-studio-border text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users size={14} className="text-blue-400" />
                    </div>
                    <p className="text-lg font-bold text-studio-text-primary font-headline">3 / 5</p>
                    <p className="text-[11px] text-studio-text-tertiary mt-0.5">Korisnici</p>
                    <div className="w-full bg-studio-surface-3 rounded-full h-1 mt-2">
                      <div className="bg-blue-400 h-1 rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                  <div className="p-4 bg-studio-surface-0 rounded-xl border border-studio-border text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Palette size={14} className="text-purple-400" />
                    </div>
                    <p className="text-lg font-bold text-studio-text-primary font-headline">1 / 2</p>
                    <p className="text-[11px] text-studio-text-tertiary mt-0.5">Projekti</p>
                    <div className="w-full bg-studio-surface-3 rounded-full h-1 mt-2">
                      <div className="bg-purple-400 h-1 rounded-full" style={{ width: '50%' }} />
                    </div>
                  </div>
                  <div className="p-4 bg-studio-surface-0 rounded-xl border border-studio-border text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Zap size={14} className={
                        aiQuota
                          ? aiQuota.percent >= 80 ? 'text-red-400'
                          : aiQuota.percent >= 50 ? 'text-amber-400'
                          : 'text-brand-accent'
                          : 'text-brand-accent'
                      } />
                    </div>
                    <p className="text-lg font-bold text-studio-text-primary font-headline">
                      {aiQuota ? `${aiQuota.used} / ${aiQuota.total}` : '— / —'}
                    </p>
                    <p className="text-[11px] text-studio-text-tertiary mt-0.5">AI generiranja</p>
                    <div className="w-full bg-studio-surface-3 rounded-full h-1 mt-2">
                      <div
                        className={clsx('h-1 rounded-full transition-all', aiQuota
                          ? aiQuota.percent >= 80 ? 'bg-red-400'
                          : aiQuota.percent >= 50 ? 'bg-amber-400'
                          : 'bg-brand-accent'
                          : 'bg-brand-accent'
                        )}
                        style={{ width: `${aiQuota ? aiQuota.percent : 0}%` }}
                      />
                    </div>
                    {aiQuota && (
                      <p className="text-[10px] text-studio-text-tertiary mt-1.5 leading-tight">
                        Resetira se {aiQuota.reset_date}
                      </p>
                    )}
                  </div>
                </div>

                {/* Plan Comparison */}
                <h4 className="text-xs font-bold text-studio-text-secondary uppercase tracking-wider mb-3">Usporedi planove</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PLANS.map(plan => (
                    <div
                      key={plan.id}
                      className={clsx(
                        'p-4 rounded-xl border text-center transition-all',
                        plan.highlight
                          ? 'border-brand-accent/40 bg-brand-accent/5 ring-1 ring-brand-accent/10'
                          : plan.id === 'free'
                            ? 'border-brand-accent/20 bg-brand-accent/5'
                            : 'border-studio-border bg-studio-surface-0'
                      )}
                    >
                      {plan.highlight && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-accent/15 text-brand-accent mb-2 inline-block">
                          Preporučeno
                        </span>
                      )}
                      {plan.id === 'free' && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 mb-2 inline-block">
                          Trenutni
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-studio-text-primary">{plan.name}</h4>
                      <p className="text-lg font-bold text-brand-accent mt-1">
                        {typeof plan.price === 'string' && plan.price.match(/^\d/) ? `€${plan.price}` : plan.price}
                        <span className="text-[10px] text-studio-text-tertiary font-normal">{plan.period}</span>
                      </p>
                      <div className="mt-3 space-y-1 text-[10px] text-studio-text-tertiary">
                        <p>{plan.users === -1 ? 'Neograničeno' : plan.users} korisnika</p>
                        <p>{plan.projects === -1 ? 'Neograničeno' : plan.projects} projekata</p>
                        <p>{plan.aiGens === -1 ? 'Neograničeno' : plan.aiGens} AI gen.</p>
                      </div>
                      {plan.id !== 'free' && (
                        <button className="btn-secondary text-[10px] mt-3 w-full" disabled>
                          {plan.id === 'enterprise' ? 'Kontaktiraj nas' : 'Nadogradi'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ TEAM TAB ═══════════════════ */}
        {activeTab === 'team' && (
          <TeamSection />
        )}

        {/* ═══════════════════ INTEGRATIONS TAB ═══════════════════ */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div className="card border-dashed border-studio-border/60">
              <div className="flex items-center gap-2 mb-1">
                <Plug size={16} className="text-purple-400" />
                <h3 className="text-sm font-bold text-studio-text-primary">Povežite vaše platforme</h3>
              </div>
              <p className="text-xs text-studio-text-tertiary leading-relaxed">
                Spojite svoje marketing kanale za automatsko prikupljanje podataka, analitiku u realnom vremenu i AI-pokretane uvide.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {INTEGRATIONS.map(integration => (
                <div
                  key={integration.id}
                  className={clsx(
                    'card overflow-hidden transition-all hover:-translate-y-0.5',
                    integration.status === 'coming_soon' ? 'opacity-60' : 'hover:border-purple-500/30'
                  )}
                >
                  <div className={clsx('absolute inset-0 bg-gradient-to-br pointer-events-none', integration.color)} />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{integration.icon}</span>
                      {integration.status === 'coming_soon' ? (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-studio-surface-3 text-studio-text-tertiary">
                          Uskoro
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                          Aktivno
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-studio-text-primary">{integration.name}</h3>
                      {integration.badge === 'beta' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                          Beta
                        </span>
                      )}
                      {integration.badge === 'sandbox' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                          Sandbox
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-studio-text-tertiary leading-relaxed mb-4">{integration.description}</p>
                    <button
                      disabled={integration.status === 'coming_soon' || !isClientAdmin}
                      onClick={() => {
                        if (integration.status === 'available' && isClientAdmin) {
                          addToast('Integracija u pripremi — dostupno uskoro.', 'info')
                        }
                      }}
                      className={clsx(
                        'w-full text-xs font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5',
                        integration.status === 'coming_soon' || !isClientAdmin
                          ? 'bg-studio-surface-3 text-studio-text-tertiary cursor-not-allowed'
                          : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 ring-1 ring-purple-500/20'
                      )}
                    >
                      <Plug size={13} />
                      {integration.status === 'coming_soon' ? 'Uskoro' : 'Poveži'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* API Keys Section (Admin Only) */}
            {(isClientAdmin || isSuperadmin) && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <KeyRound size={16} className="text-amber-400" />
                  <h3 className="font-headline text-xs tracking-wider text-studio-text-secondary font-bold">API KLJUČEVI</h3>
                </div>
                <p className="text-xs text-studio-text-tertiary mb-4 leading-relaxed">
                  Upravljajte API pristupnim ključevima za programatički pristup vašim podacima.
                </p>
                <div className="p-3.5 bg-studio-surface-0 border border-studio-border rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <KeyRound size={14} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-studio-text-primary">Production API Key</p>
                      <p className="text-[10px] text-studio-text-tertiary font-mono">sk-••••••••••••••••</p>
                    </div>
                  </div>
                  <button className="btn-secondary text-[10px]" disabled>Generiraj ključ</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-sm text-sm font-medium transform transition-all duration-300 ${
                toast.type === 'success'
                  ? 'bg-emerald-600 text-white'
                  : toast.type === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-brand-blue text-white'
              }`}
            >
              {toast.type === 'success' && <CheckCircle size={16} />}
              {toast.type === 'error' && <AlertCircle size={16} />}
              {toast.type === 'info' && <Loader2 size={16} className="animate-spin" />}
              <span>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
