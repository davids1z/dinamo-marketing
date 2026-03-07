import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/layout/Header'
import { PageLoader } from '../components/common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { useApiMutation } from '../hooks/useApiMutation'
import { settingsApi } from '../api/settings'
import { Plug, Palette, Bell, Shield, ToggleLeft, ToggleRight } from 'lucide-react'
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
    { id: 'meta', name: 'Meta Graph API', description: 'Instagram i Facebook podaci', enabled: true, mode: 'mock', icon: '\ud83d\udcd8' },
    { id: 'tiktok', name: 'TikTok API', description: 'TikTok analitika i objavljivanje', enabled: true, mode: 'mock', icon: '\ud83c\udfb5' },
    { id: 'youtube', name: 'YouTube Data API', description: 'YouTube kanal i video podaci', enabled: true, mode: 'mock', icon: '\u25b6\ufe0f' },
    { id: 'ga4', name: 'Google Analytics 4', description: 'Promet web stranice i konverzije', enabled: true, mode: 'mock', icon: '\ud83d\udcca' },
    { id: 'sports', name: 'Sports Data API', description: 'Rezultati utakmica i statistika igra\u010da', enabled: true, mode: 'mock', icon: '\u26bd' },
    { id: 'claude', name: 'Claude AI', description: 'Generiranje sadr\u017eaja i analiza', enabled: true, mode: 'mock', icon: '\ud83e\udd16' },
    { id: 'buffer', name: 'Buffer / Objavljivanje', description: 'Zakazivanje objava na dru\u0161tvenim mre\u017eama', enabled: true, mode: 'mock', icon: '\ud83d\udcc5' },
    { id: 'imagegen', name: 'Generiranje slika', description: 'AI kreiranje slika za sadr\u017eaj', enabled: true, mode: 'mock', icon: '\ud83c\udfa8' },
    { id: 'trends', name: 'Google Trends', description: 'Podaci o trendovima pretra\u017eivanja i uvidi', enabled: true, mode: 'mock', icon: '\ud83d\udcc8' },
  ],
  brandColors: [
    { name: 'Dinamo plava', hex: '#0051A5', usage: 'Primarna boja brenda' },
    { name: 'Dinamo tamna', hex: '#002D5A', usage: 'Tamne pozadine' },
    { name: 'Bijela', hex: '#FFFFFF', usage: 'Tekst i naglasci' },
    { name: 'Zlatna', hex: '#C9A03F', usage: 'Premium naglasci' },
    { name: 'Siva 900', hex: '#111827', usage: 'Pozadina nadzorne plo\u010de' },
    { name: 'Siva 800', hex: '#1F2937', usage: 'Pozadina kartica' },
  ],
  notifications: [
    { id: 'sentiment_alert', label: 'Upozorenja sentimenta', description: 'Obavijesti kad negativni sentiment prije\u0111e prag', enabled: true },
    { id: 'campaign_budget', label: 'Upozorenja bud\u017eeta kampanje', description: 'Upozori kad potro\u0161nja kampanje dosegne 80% bud\u017eeta', enabled: true },
    { id: 'weekly_report', label: 'Tjedni izvje\u0161taj spreman', description: 'Obavijest kad je tjedni izvje\u0161taj generiran', enabled: true },
    { id: 'mention_spike', label: 'Detekcija porasta spominjanja', description: 'Upozorenje na neuobi\u010dajen obujam spominjanja', enabled: false },
    { id: 'competitor_alert', label: 'Aktivnost konkurencije', description: 'Obavijesti o zna\u010dajnim promjenama konkurencije', enabled: false },
    { id: 'content_approval', label: 'Potrebno odobrenje sadr\u017eaja', description: 'Upozori kad sadr\u017eaj treba odobrenje', enabled: true },
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
  const { data: apiData, loading, error, refetch } = useApi<SettingsData>('/settings/api-status')
  const data = apiData || fallbackData

  const [localApis, setLocalApis] = useState<ApiService[] | null>(null)
  const [localNotifications, setLocalNotifications] = useState<typeof fallbackData.notifications | null>(null)

  const { mutate: toggleApiMutation } = useApiMutation('/settings/api-toggle', 'put')

  const apis = localApis || data.apis || fallbackData.apis
  const brandColors = data.brandColors || fallbackData.brandColors
  const notifications = localNotifications || data.notifications || fallbackData.notifications
  const system = data.system || fallbackData.system

  if (loading && !apiData) return <><Header title="POSTAVKE" subtitle="Konfiguracija platforme i integracije" /><PageLoader /></>

  const mockCount = apis.filter(a => a.mode === 'mock').length
  const allMock = mockCount === apis.length

  const toggleApi = async (id: string) => {
    const current = apis.find(a => a.id === id)
    if (!current) return

    const newMode = current.mode === 'mock' ? 'live' : 'mock'
    const useMock = newMode === 'mock'

    // Optimistic update
    const updated = apis.map(api =>
      api.id === id ? { ...api, mode: newMode as 'mock' | 'live' } : api
    )
    setLocalApis(updated)

    try {
      await settingsApi.toggleApi(id, useMock)
    } catch {
      // Revert on failure
      setLocalApis(apis.map(api =>
        api.id === id ? { ...api, mode: current.mode } : api
      ))
    }
  }

  const toggleEnabled = (id: string) => {
    const updated = apis.map(api =>
      api.id === id ? { ...api, enabled: !api.enabled } : api
    )
    setLocalApis(updated)
  }

  const toggleNotification = (id: string) => {
    const updated = notifications.map(n =>
      n.id === id ? { ...n, enabled: !n.enabled } : n
    )
    setLocalNotifications(updated)
  }

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
            <Plug size={20} className="text-blue-600" />
            <h2 className="section-title">API integracije</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 ml-2">
              {allMock ? 'Sve mock na\u010din' : `${mockCount}/${apis.length} mock`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apis.map((api) => (
              <div
                key={api.id}
                className={`rounded-lg border p-4 transition-colors ${
                  api.enabled ? 'bg-gray-50 border-gray-200' : 'bg-gray-50 border-gray-200 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{api.icon}</span>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{api.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{api.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleEnabled(api.id)}
                    className="shrink-0 ml-2"
                  >
                    {api.enabled ? (
                      <ToggleRight size={28} className="text-blue-600" />
                    ) : (
                      <ToggleLeft size={28} className="text-gray-500" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => toggleApi(api.id)}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                      api.mode === 'mock'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {api.mode === 'mock' ? 'Mock' : 'Live'}
                  </button>
                  <span className="text-xs text-gray-500">|</span>
                  <span className="text-xs text-gray-500">
                    {api.mode === 'mock' ? 'API klju\u010d nije potreban' : 'Povezano s API-jem'}
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
                  className="w-full h-16 rounded-lg border border-gray-200"
                  style={{ backgroundColor: color.hex }}
                />
                <div>
                  <p className="text-sm text-gray-900 font-medium">{color.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{color.hex}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{color.usage}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#0051A5] flex items-center justify-center">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <div>
                <p className="text-gray-900 font-semibold">GNK Dinamo Zagreb</p>
                <p className="text-xs text-gray-500">Osnovan 1945. | Stadion Maksimir, Zagreb</p>
                <p className="text-xs text-gray-500 mt-0.5">Primarni font: Montserrat | Display font: Montserrat Bold</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Bell size={20} className="text-yellow-600" />
            <h2 className="section-title">Postavke obavijesti</h2>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{notif.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.description}</p>
                </div>
                <button onClick={() => toggleNotification(notif.id)}>
                  {notif.enabled ? (
                    <ToggleRight size={28} className="text-blue-600" />
                  ) : (
                    <ToggleLeft size={28} className="text-gray-500" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={20} className="text-gray-500" />
            <h2 className="section-title">Informacije o sustavu</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Verzija</p>
              <p className="text-gray-700 font-mono">{system.version}</p>
            </div>
            <div>
              <p className="text-gray-500">Okru\u017eenje</p>
              <p className="text-yellow-600 font-mono">{system.environment}</p>
            </div>
            <div>
              <p className="text-gray-500">Na\u010din podataka</p>
              <p className="text-green-600 font-mono">{system.dataMode}</p>
            </div>
            <div>
              <p className="text-gray-500">Zadnje a\u017eurirano</p>
              <p className="text-gray-700 font-mono">{system.lastUpdated}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
