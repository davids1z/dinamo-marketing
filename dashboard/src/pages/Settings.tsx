import React, { useState } from 'react';
import Header from '../components/layout/Header';
import StatusBadge from '../components/common/StatusBadge';
import { Settings as SettingsIcon, Plug, Palette, Bell, Shield, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';

interface ApiToggle {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  mode: 'mock' | 'live';
  icon: string;
}

const initialApis: ApiToggle[] = [
  { id: 'meta', name: 'Meta Graph API', description: 'Instagram i Facebook podaci', enabled: true, mode: 'mock', icon: '\ud83d\udcd8' },
  { id: 'tiktok', name: 'TikTok API', description: 'TikTok analitika i objavljivanje', enabled: true, mode: 'mock', icon: '\ud83c\udfb5' },
  { id: 'youtube', name: 'YouTube Data API', description: 'YouTube kanal i video podaci', enabled: true, mode: 'mock', icon: '\u25b6\ufe0f' },
  { id: 'ga4', name: 'Google Analytics 4', description: 'Promet web stranice i konverzije', enabled: true, mode: 'mock', icon: '\ud83d\udcca' },
  { id: 'sports', name: 'Sports Data API', description: 'Rezultati utakmica i statistika igra\u010da', enabled: true, mode: 'mock', icon: '\u26bd' },
  { id: 'claude', name: 'Claude AI', description: 'Generiranje sadr\u017eaja i analiza', enabled: true, mode: 'mock', icon: '\ud83e\udd16' },
  { id: 'buffer', name: 'Buffer / Objavljivanje', description: 'Zakazivanje objava na dru\u0161tvenim mre\u017eama', enabled: true, mode: 'mock', icon: '\ud83d\udcc5' },
  { id: 'imagegen', name: 'Generiranje slika', description: 'AI kreiranje slika za sadr\u017eaj', enabled: true, mode: 'mock', icon: '\ud83c\udfa8' },
  { id: 'trends', name: 'Google Trends', description: 'Podaci o trendovima pretra\u017eivanja i uvidi', enabled: true, mode: 'mock', icon: '\ud83d\udcc8' },
];

const brandColors = [
  { name: 'Dinamo plava', hex: '#0051A5', usage: 'Primarna boja brenda' },
  { name: 'Dinamo tamna', hex: '#002D5A', usage: 'Tamne pozadine' },
  { name: 'Bijela', hex: '#FFFFFF', usage: 'Tekst i naglasci' },
  { name: 'Zlatna', hex: '#C9A03F', usage: 'Premium naglasci' },
  { name: 'Siva 900', hex: '#111827', usage: 'Pozadina nadzorne plo\u010de' },
  { name: 'Siva 800', hex: '#1F2937', usage: 'Pozadina kartica' },
];

const notificationSettings = [
  { id: 'sentiment_alert', label: 'Upozorenja sentimenta', description: 'Obavijesti kad negativni sentiment prije\u0111e prag', enabled: true },
  { id: 'campaign_budget', label: 'Upozorenja bud\u017eeta kampanje', description: 'Upozori kad potro\u0161nja kampanje dosegne 80% bud\u017eeta', enabled: true },
  { id: 'weekly_report', label: 'Tjedni izvje\u0161taj spreman', description: 'Obavijest kad je tjedni izvje\u0161taj generiran', enabled: true },
  { id: 'mention_spike', label: 'Detekcija porasta spominjanja', description: 'Upozorenje na neuobi\u010dajen obujam spominjanja', enabled: false },
  { id: 'competitor_alert', label: 'Aktivnost konkurencije', description: 'Obavijesti o zna\u010dajnim promjenama konkurencije', enabled: false },
  { id: 'content_approval', label: 'Potrebno odobrenje sadr\u017eaja', description: 'Upozori kad sadr\u017eaj treba odobrenje', enabled: true },
];

export default function Settings() {
  const [apis, setApis] = useState(initialApis);
  const [notifications, setNotifications] = useState(notificationSettings);

  const toggleApi = (id: string) => {
    setApis(prev => prev.map(api => api.id === id ? { ...api, enabled: !api.enabled } : api));
  };

  const toggleNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header title="POSTAVKE" subtitle="Konfiguracija platforme i integracije" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* API Integrations */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Plug size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">API integracije</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600 ml-2">Sve mock na\u010din</span>
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
                      <p className="text-xs text-dinamo-muted mt-0.5">{api.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleApi(api.id)}
                    className="shrink-0 ml-2"
                  >
                    {api.enabled ? (
                      <ToggleRight size={28} className="text-blue-600" />
                    ) : (
                      <ToggleLeft size={28} className="text-dinamo-muted" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                    Mock
                  </span>
                  <span className="text-xs text-dinamo-muted">|</span>
                  <span className="text-xs text-dinamo-muted">API klju\u010d nije potreban</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brand Colors */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Palette size={20} className="text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Vizualni identitet</h2>
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
                  <p className="text-xs text-dinamo-muted font-mono">{color.hex}</p>
                  <p className="text-xs text-dinamo-muted mt-0.5">{color.usage}</p>
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
                <p className="text-xs text-dinamo-muted">Osnovan 1945. | Stadion Maksimir, Zagreb</p>
                <p className="text-xs text-dinamo-muted mt-0.5">Primarni font: Montserrat | Display font: Montserrat Bold</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Bell size={20} className="text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">Postavke obavijesti</h2>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{notif.label}</h3>
                  <p className="text-xs text-dinamo-muted mt-0.5">{notif.description}</p>
                </div>
                <button onClick={() => toggleNotification(notif.id)}>
                  {notif.enabled ? (
                    <ToggleRight size={28} className="text-blue-600" />
                  ) : (
                    <ToggleLeft size={28} className="text-dinamo-muted" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={20} className="text-dinamo-muted" />
            <h2 className="text-lg font-semibold text-gray-900">Informacije o sustavu</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-dinamo-muted">Verzija</p>
              <p className="text-gray-700 font-mono">1.0.0-beta</p>
            </div>
            <div>
              <p className="text-dinamo-muted">Okru\u017eenje</p>
              <p className="text-yellow-600 font-mono">Razvoj</p>
            </div>
            <div>
              <p className="text-dinamo-muted">Na\u010din podataka</p>
              <p className="text-green-600 font-mono">Mock podaci</p>
            </div>
            <div>
              <p className="text-dinamo-muted">Zadnje a\u017eurirano</p>
              <p className="text-gray-700 font-mono">Mar 5, 2026</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
