import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import { CardSkeleton } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { settingsApi } from '../api/settings'
import { useClient } from '../contexts/ClientContext'
import {
  Bell, ToggleLeft, ToggleRight, CheckCircle, AlertCircle,
  Loader2, CreditCard, Sparkles, Building2, Users, Settings as SettingsIcon,
} from 'lucide-react'

interface SettingsData {
  notifications: Array<{ id: string; label: string; description: string; enabled: boolean }>
}

const fallbackNotifications = [
  { id: 'sentiment_alert', label: 'Upozorenja sentimenta', description: 'Obavijesti kad negativni sentiment prijeđe prag', enabled: true },
  { id: 'campaign_budget', label: 'Upozorenja budžeta kampanje', description: 'Upozori kad potrošnja kampanje dosegne 80% budžeta', enabled: true },
  { id: 'weekly_report', label: 'Tjedni izvještaj spreman', description: 'Obavijest kad je tjedni izvještaj generiran', enabled: true },
  { id: 'mention_spike', label: 'Detekcija porasta spominjanja', description: 'Upozorenje na neuobičajen obujam spominjanja', enabled: false },
  { id: 'competitor_alert', label: 'Aktivnost konkurencije', description: 'Obavijesti o značajnim promjenama konkurencije', enabled: false },
  { id: 'content_approval', label: 'Potrebno odobrenje sadržaja', description: 'Upozori kad sadržaj treba odobrenje', enabled: true },
]

export default function Settings() {
  const { data: apiData, loading, refetch } = useApi<SettingsData>('/settings/api-status')
  const { toasts, addToast, removeToast } = useToast()
  const { currentClient } = useClient()

  const [localNotifications, setLocalNotifications] = useState<typeof fallbackNotifications | null>(null)
  const [togglingNotifs, setTogglingNotifs] = useState<Set<string>>(new Set())

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

  if (loading && !apiData) return (
    <>
      <Header title="POSTAVKE" subtitle="Postavke organizacije" />
      <div className="page-wrapper space-y-6">
        <CardSkeleton count={3} cols="grid grid-cols-1 gap-4" />
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
            className="card hover:border-brand-accent/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-brand-accent" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-studio-text-primary group-hover:text-brand-accent transition-colors">Profil klijenta</h3>
                <p className="text-xs text-studio-text-tertiary">Branding, AI kontekst, vizualni identitet</p>
              </div>
            </div>
          </Link>
          <Link
            to="/team"
            className="card hover:border-blue-500/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-studio-text-primary group-hover:text-blue-400 transition-colors">Tim</h3>
                <p className="text-xs text-studio-text-tertiary">Upravljanje članovima i ulogama</p>
              </div>
            </div>
          </Link>
          <div className="card opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-studio-text-primary">Integracije</h3>
                <p className="text-xs text-studio-text-tertiary">Povezivanje vanjskih servisa</p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-studio-surface-3 text-studio-text-tertiary">Uskoro</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Bell size={20} className="text-amber-400" />
            <h2 className="section-title">Postavke obavijesti</h2>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-center justify-between p-4 bg-studio-surface-0 rounded-lg"
              >
                <div>
                  <h3 className="text-sm font-medium text-studio-text-primary">{notif.label}</h3>
                  <p className="text-xs text-studio-text-secondary mt-0.5">{notif.description}</p>
                </div>
                <button
                  onClick={() => toggleNotification(notif.id)}
                  disabled={togglingNotifs.has(notif.id)}
                  className="disabled:opacity-50 disabled:cursor-wait"
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
            ))}
          </div>
        </div>

        {/* Plan & Billing */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard size={20} className="text-brand-accent" />
            <h2 className="section-title">Plan i naplata</h2>
          </div>
          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-accent/5 to-transparent border border-brand-accent/20 rounded-xl">
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
            <button
              disabled
              className="btn-secondary opacity-50 cursor-not-allowed flex items-center gap-2 text-sm"
            >
              Nadogradi plan
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-surface-3 text-studio-text-tertiary font-medium">Uskoro</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="p-4 bg-studio-surface-0 rounded-lg border border-studio-border text-center">
              <p className="text-2xl font-bold text-studio-text-primary font-headline">∞</p>
              <p className="text-xs text-studio-text-tertiary mt-1">Korisnici</p>
            </div>
            <div className="p-4 bg-studio-surface-0 rounded-lg border border-studio-border text-center">
              <p className="text-2xl font-bold text-studio-text-primary font-headline">∞</p>
              <p className="text-xs text-studio-text-tertiary mt-1">Projekti</p>
            </div>
            <div className="p-4 bg-studio-surface-0 rounded-lg border border-studio-border text-center">
              <p className="text-2xl font-bold text-studio-text-primary font-headline">∞</p>
              <p className="text-xs text-studio-text-tertiary mt-1">AI generiranja</p>
            </div>
          </div>
        </div>
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
