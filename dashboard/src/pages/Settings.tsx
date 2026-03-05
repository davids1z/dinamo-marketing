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
  { id: 'meta', name: 'Meta Graph API', description: 'Instagram & Facebook data', enabled: true, mode: 'mock', icon: '📘' },
  { id: 'tiktok', name: 'TikTok API', description: 'TikTok analytics & publishing', enabled: true, mode: 'mock', icon: '🎵' },
  { id: 'youtube', name: 'YouTube Data API', description: 'YouTube channel & video data', enabled: true, mode: 'mock', icon: '▶️' },
  { id: 'ga4', name: 'Google Analytics 4', description: 'Website traffic & conversions', enabled: true, mode: 'mock', icon: '📊' },
  { id: 'sports', name: 'Sports Data API', description: 'Match results & player stats', enabled: true, mode: 'mock', icon: '⚽' },
  { id: 'claude', name: 'Claude AI', description: 'Content generation & analysis', enabled: true, mode: 'mock', icon: '🤖' },
  { id: 'buffer', name: 'Buffer / Publishing', description: 'Social media scheduling', enabled: true, mode: 'mock', icon: '📅' },
  { id: 'imagegen', name: 'Image Generation', description: 'AI image creation for content', enabled: true, mode: 'mock', icon: '🎨' },
  { id: 'trends', name: 'Google Trends', description: 'Search trend data & insights', enabled: true, mode: 'mock', icon: '📈' },
];

const brandColors = [
  { name: 'Dinamo Blue', hex: '#0051A5', usage: 'Primary brand color' },
  { name: 'Dinamo Dark', hex: '#002D5A', usage: 'Dark backgrounds' },
  { name: 'White', hex: '#FFFFFF', usage: 'Text and accents' },
  { name: 'Gold', hex: '#C9A03F', usage: 'Premium highlights' },
  { name: 'Gray 900', hex: '#111827', usage: 'Dashboard background' },
  { name: 'Gray 800', hex: '#1F2937', usage: 'Card backgrounds' },
];

const notificationSettings = [
  { id: 'sentiment_alert', label: 'Sentiment Alerts', description: 'Notify when negative sentiment exceeds threshold', enabled: true },
  { id: 'campaign_budget', label: 'Campaign Budget Alerts', description: 'Alert when campaign spend reaches 80% of budget', enabled: true },
  { id: 'weekly_report', label: 'Weekly Report Ready', description: 'Notification when weekly report is generated', enabled: true },
  { id: 'mention_spike', label: 'Mention Spike Detection', description: 'Alert on unusual mention volume', enabled: false },
  { id: 'competitor_alert', label: 'Competitor Activity', description: 'Notify on significant competitor changes', enabled: false },
  { id: 'content_approval', label: 'Content Approval Required', description: 'Alert when content needs approval', enabled: true },
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
    <div className="min-h-screen bg-gray-950 text-white">
      <Header title="SETTINGS" subtitle="Platform Configuration & Integrations" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* API Integrations */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Plug size={20} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">API Integrations</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400 ml-2">All Mock Mode</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apis.map((api) => (
              <div
                key={api.id}
                className={`rounded-lg border p-4 transition-colors ${
                  api.enabled ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-900/50 border-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{api.icon}</span>
                    <div>
                      <h3 className="text-sm font-medium text-white">{api.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{api.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleApi(api.id)}
                    className="shrink-0 ml-2"
                  >
                    {api.enabled ? (
                      <ToggleRight size={28} className="text-blue-400" />
                    ) : (
                      <ToggleLeft size={28} className="text-gray-600" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">
                    Mock
                  </span>
                  <span className="text-xs text-gray-600">|</span>
                  <span className="text-xs text-gray-500">No API key required</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brand Colors */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Palette size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Brand Identity</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {brandColors.map((color) => (
              <div key={color.name} className="space-y-2">
                <div
                  className="w-full h-16 rounded-lg border border-gray-700"
                  style={{ backgroundColor: color.hex }}
                />
                <div>
                  <p className="text-sm text-white font-medium">{color.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{color.hex}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{color.usage}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#0051A5] flex items-center justify-center">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <div>
                <p className="text-white font-semibold">GNK Dinamo Zagreb</p>
                <p className="text-xs text-gray-400">Founded 1945 | Maksimir Stadium, Zagreb</p>
                <p className="text-xs text-gray-500 mt-0.5">Primary Font: Inter | Display Font: Inter Bold</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Bell size={20} className="text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Notification Settings</h2>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
              >
                <div>
                  <h3 className="text-sm font-medium text-white">{notif.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.description}</p>
                </div>
                <button onClick={() => toggleNotification(notif.id)}>
                  {notif.enabled ? (
                    <ToggleRight size={28} className="text-blue-400" />
                  ) : (
                    <ToggleLeft size={28} className="text-gray-600" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={20} className="text-gray-400" />
            <h2 className="text-lg font-semibold text-white">System Information</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Version</p>
              <p className="text-gray-200 font-mono">1.0.0-beta</p>
            </div>
            <div>
              <p className="text-gray-500">Environment</p>
              <p className="text-yellow-400 font-mono">Development</p>
            </div>
            <div>
              <p className="text-gray-500">Data Mode</p>
              <p className="text-green-400 font-mono">Mock Data</p>
            </div>
            <div>
              <p className="text-gray-500">Last Updated</p>
              <p className="text-gray-200 font-mono">Mar 5, 2026</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
