import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/layout/Header'
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { settingsApi } from '../api/settings'
import { Plug, Palette, Bell, Shield, ToggleLeft, ToggleRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import SystemHealth from '../components/settings/SystemHealth'
import QuotaDisplay from '../components/settings/QuotaDisplay'

interface ApiService {
  id: string
  name: string
  description: string
  enabled: boolean
  mode: 'mock' | 'live'
  icon: string
}

interface SettingsData {
  apis: ApiService[]
  brandColors: Array<{ name: string; hex: string; usage: string }>
  notifications: Array<{ id: string; label: string; description: string; enabled: boolean }>
  system: {
    version: string
    environment: string
    dataMode: string
    lastUpdated: string
  }
}

// Fallback mock data for when API is not available
const fallbackData: SettingsData = {
  apis: [
    { id: 'meta', name: 'Meta Graph API', description: 'Instagram i Facebook podaci', enabled: true, mode: 'mock', icon: '📘' },
    { id: 'tiktok', name: 'TikTok API', description: 'TikTok analitika i objavljivanje', enabled: true, mode: 'mock', icon: '🎵' },
    { id: 'youtube', name: 'YouTube Data API', description: 'YouTube kanal i video podaci', enabled: true, mode: 'mock', icon: '▶️' },
    { id: 'ga4', name: 'Google Analytics 4', description: 'Promet web stranice i konverzije', enabled: true, mode: 'mock', icon: '📊' },
    { id: 'market_data', name: 'Market Data API', description: 'Tržišni podaci i analitika industrije', enabled: true, mode: 'mock', icon: '📊' },
    { id: 'claude', name: 'Claude AI', description: 'Generiranje sadržaja i analiza', enabled: true, mode: 'mock', icon: '🤖' },
    { id: 'buffer', name: 'Buffer / Objavljivanje', description: 'Zakazivanje objava na društvenim mrežama', enabled: true, mode: 'mock', icon: '📅' },
    { id: 'image_gen', name: 'Generiranje slika', description: 'AI kreiranje slika za sadržaj', enabled: true, mode: 'mock', icon: '🎨' },
    { id: 'trends', name: 'Google Trends', description: 'Podaci o trendovima pretraživanja i uvidi', enabled: true, mode: 'mock', icon: '📈' },
  ],
  brandColors: [
    { name: 'Primarna plava', hex: '#0057A8', usage: 'Primarna boja brenda' },
    { name: 'Sidebar tamna', hex: '#0A1A28', usage: 'Navigacija sidebar' },
    { name: 'Bijela', hex: '#FFFFFF', usage: 'Pozadina kartica' },
    { name: 'Accent zelena', hex: '#B8FF00', usage: 'Naglasci i CTA' },
    { name: 'Siva pozadina', hex: '#F9FAFB', usage: 'Pozadina stranice' },
    { name: 'Tekst tamni', hex: '#111827', usage: 'Naslovi i tekst' },
  ],
  notifications: [
    { id: 'sentiment_alert', label: 'Upozorenja sentimenta', description: 'Obavijesti kad negativni sentiment prijeđe prag', enabled: true },
    { id: 'campaign_budget', label: 'Upozorenja budžeta kampanje', description: 'Upozori kad potrošnja kampanje dosegne 80% budžeta', enabled: true },
    { id: 'weekly_report', label: 'Tjedni izvještaj spreman', description: 'Obavijest kad je tjedni izvještaj generiran', enabled: true },
    { id: 'mention_spike', label: 'Detekcija porasta spominjanja', description: 'Upozorenje na neuobičajen obujam spominjanja', enabled: false },
    { id: 'competitor_alert', label: 'Aktivnost konkurencije', description: 'Obavijesti o značajnim promjenama konkurencije', enabled: false },
    { id: 'content_approval', label: 'Potrebno odobrenje sadržaja', description: 'Upozori kad sadržaj treba odobrenje', enabled: true },
  ],
  system: {
    version: '1.0.0-beta',
    environment: 'Razvoj',
    dataMode: 'Mock podaci',
    lastUpdated: 'Mar 5, 2026',
  },
}

export default function Settings() {
  const { isAdmin } = useAuth()
  const { data: apiData, loading, refetch } = useApi<SettingsData>('/settings/api-status')
  const data = apiData || fallbackData
  const { toasts, addToast, removeToast } = useToast()

  const [localApis, setLocalApis] = useState<ApiService[] | null>(null)
  const [localNotifications, setLocalNotifications] = useState<typeof fallbackData.notifications | null>(null)
  const [togglingApis, setTogglingApis] = useState<Set<string>>(new Set())
  const [togglingNotifs, setTogglingNotifs] = useState<Set<string>>(new Set())

  const apis = localApis || data.apis || fallbackData.apis
  const brandColors = data.brandColors || fallbackData.brandColors
  const notifications = localNotifications || data.notifications || fallbackData.notifications
  const system = data.system || fallbackData.system

  const toggleApi = useCallback(async (id: string) => {
    const current = apis.find(a => a.id === id)
    if (!current) return

    const newMode = current.mode === 'mock' ? 'live' : 'mock'
    const useMock = newMode === 'mock'

    // Mark as toggling
    setTogglingApis(prev => new Set(prev).add(id))

    // Optimistic update
    const updated = apis.map(api =>
      api.id === id ? { ...api, mode: newMode as 'mock' | 'live' } : api
    )
    setLocalApis(updated)

    try {
      const response = await settingsApi.toggleApi(id, useMock)
      const msg = response.data.message || `${current.name} prebačen na ${newMode}`
      addToast(msg, 'success')
      // Refetch to get server-confirmed state
      refetch()
    } catch (err) {
      // Revert on failure
      setLocalApis(apis.map(api =>
        api.id === id ? { ...api, mode: current.mode } : api
      ))
      const errorMsg = err instanceof Error ? err.message : 'Nepoznata greška'
      addToast(`Greška pri prebacivanju ${current.name}: ${errorMsg}`, 'error')
    } finally {
      setTogglingApis(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [apis, addToast, refetch])

  const toggleEnabled = useCallback((id: string) => {
    const updated = apis.map(api =>
      api.id === id ? { ...api, enabled: !api.enabled } : api
    )
    setLocalApis(updated)
  }, [apis])

  const toggleNotification = useCallback(async (id: string) => {
    const current = notifications.find(n => n.id === id)
    if (!current) return

    const newEnabled = !current.enabled

    // Mark as toggling
    setTogglingNotifs(prev => new Set(prev).add(id))

    // Optimistic update
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
      // Revert on failure
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
      <Header title="POSTAVKE" subtitle="Konfiguracija platforme i integracije" />
      <div className="page-wrapper space-y-6">
        <div className="content-grid"><ChartSkeleton height={150} /><ChartSkeleton height={150} /></div>
        <CardSkeleton count={9} cols="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" />
      </div>
    </>
  )

  const mockCount = apis.filter(a => a.mode === 'mock').length
  const allMock = mockCount === apis.length

  return (
    <div className="animate-fade-in">
      <Header title="POSTAVKE" subtitle="Konfiguracija platforme i integracije" />

      <div className="page-wrapper space-y-6">

        {/* System Health + API Quotas (admin only) */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemHealth />
            <QuotaDisplay />
          </div>
        )}

        {/* API Integrations */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Plug size={20} className="text-blue-400" />
            <h2 className="section-title">API integracije</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ml-2">
              {allMock ? 'Sve mock način' : `${mockCount}/${apis.length} mock`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apis.map((api) => (
              <div
                key={api.id}
                className={`rounded-lg border p-4 transition-colors ${
                  api.enabled ? 'bg-studio-surface-0 border-studio-border' : 'bg-studio-surface-0 border-studio-border opacity-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{api.icon}</span>
                    <div>
                      <h3 className="text-sm font-medium text-studio-text-primary">{api.name}</h3>
                      <p className="text-xs text-studio-text-secondary mt-0.5">{api.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleEnabled(api.id)}
                    className="shrink-0 ml-2"
                  >
                    {api.enabled ? (
                      <ToggleRight size={28} className="text-blue-400" />
                    ) : (
                      <ToggleLeft size={28} className="text-studio-text-secondary" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => toggleApi(api.id)}
                    disabled={togglingApis.has(api.id)}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                      api.mode === 'mock'
                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                    }`}
                  >
                    {togglingApis.has(api.id) ? (
                      <span className="flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />
                        Spremanje...
                      </span>
                    ) : (
                      api.mode === 'mock' ? 'Mock' : 'Live'
                    )}
                  </button>
                  <span className="text-xs text-studio-text-secondary">|</span>
                  <span className="text-xs text-studio-text-secondary">
                    {api.mode === 'mock' ? 'API ključ nije potreban' : 'Povezano s API-jem'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brand Colors */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Palette size={20} className="text-purple-600" />
            <h2 className="section-title">Vizualni identitet</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {brandColors.map((color) => (
              <div key={color.name} className="space-y-2">
                <div
                  className="w-full h-16 rounded-lg border border-studio-border"
                  style={{ backgroundColor: color.hex }}
                />
                <div>
                  <p className="text-sm text-studio-text-primary font-medium">{color.name}</p>
                  <p className="text-xs text-studio-text-secondary font-mono">{color.hex}</p>
                  <p className="text-xs text-studio-text-secondary mt-0.5">{color.usage}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-studio-surface-0 rounded-lg border border-studio-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#0051A5] flex items-center justify-center">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <div>
                <p className="text-studio-text-primary font-semibold">Studio Marketing</p>
                <p className="text-xs text-studio-text-secondary">Marketing platforma | Zagreb, Hrvatska</p>
                <p className="text-xs text-studio-text-secondary mt-0.5">Primarni font: Tektur | Body font: Inter</p>
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
