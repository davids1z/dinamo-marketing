import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2, Palette, Globe, Sparkles, Save, Loader2, AlertTriangle,
  CheckCircle2, ShieldAlert, Link2, X, Plus, ChevronDown, ChevronUp,
  Upload, RotateCcw,
} from 'lucide-react'
import Header from '../components/layout/Header'
import { useClient } from '../contexts/ClientContext'
import { useAuth } from '../contexts/AuthContext'
import { useSidebar } from '../components/layout/Layout'
import api from '../api/client'
import PlatformIcon from '../components/common/PlatformIcon'
import { detectPlatformFromUrl, CONTENT_PILLARS } from '../utils/constants'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface BrandData {
  id: string
  name: string
  slug: string
  business_description: string
  product_info: string
  tone_of_voice: string
  target_audience: string
  brand_colors: Record<string, string> | null
  brand_fonts: Record<string, string> | null
  logo_url: string
  website_url: string
  languages: string[] | null
  content_pillars: string[] | null
  social_handles: Record<string, string> | null
  hashtags: string[] | null
  ai_system_prompt_override: string
}

type BrandTab = 'biznis' | 'identitet' | 'mreze' | 'ai'

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const BRAND_TABS: Array<{ id: BrandTab; label: string; icon: typeof Building2 }> = [
  { id: 'biznis', label: 'Biznis info', icon: Building2 },
  { id: 'identitet', label: 'Vizualni identitet', icon: Palette },
  { id: 'mreze', label: 'Društvene mreže', icon: Globe },
  { id: 'ai', label: 'AI Postavke', icon: Sparkles },
]

const TONES = [
  { value: 'professional', label: 'Profesionalan', emoji: '🎯', description: 'Stručan, pouzdan, autoritativan' },
  { value: 'friendly', label: 'Prijateljski', emoji: '👋', description: 'Topao, pristupačan, konverzacijski' },
  { value: 'bold', label: 'Hrabar i direktan', emoji: '🔥', description: 'Provokativan, snažan, bez uljepšavanja' },
  { value: 'creative', label: 'Kreativan', emoji: '🎨', description: 'Inovativan, vizualan, neočekivan' },
  { value: 'formal', label: 'Formalan', emoji: '📋', description: 'Službeni ton, strukturiran, ozbiljan' },
  { value: 'casual', label: 'Opušten', emoji: '☕', description: 'Neformalan, lagan, svakodnevni jezik' },
  { value: 'inspirational', label: 'Inspirativan', emoji: '✨', description: 'Motivacijski, vizionarski, pozitivan' },
  { value: 'humorous', label: 'Humorističan', emoji: '😄', description: 'Duhovit, zabavan, satiričan' },
]

const LANGUAGES = [
  { code: 'hr', label: 'Hrvatski' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'sl', label: 'Slovenščina' },
]

const TONE_LABELS: Record<string, string> = Object.fromEntries(TONES.map(t => [t.value, t.label]))

const COLOR_LABELS: Record<string, string> = {
  primary: 'Primarna boja',
  accent: 'Naglasna boja (grafovi, gumbi)',
  blue: 'Sekundarna boja',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function isValidUrl(str: string): boolean {
  if (!str.trim()) return false
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function resolveLogoUrl(logoUrl: string): string {
  if (!logoUrl) return ''
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) return logoUrl
  // Relative path like /media/logos/... — prefix with API URL in dev
  const apiBase = import.meta.env.VITE_API_URL || ''
  return `${apiBase}${logoUrl}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function BrandProfile() {
  const { currentClient, isClientAdmin, clientRole, refreshClient } = useClient()
  const { user } = useAuth()
  const { collapsed } = useSidebar()
  const [searchParams, setSearchParams] = useSearchParams()

  const isSuperadminVisitor = user?.is_superadmin && clientRole === 'superadmin'
  const canEdit = isClientAdmin && !isSuperadminVisitor
  const canSeeAiTab = isClientAdmin || user?.is_superadmin
  const isSuperadmin = user?.is_superadmin === true

  const [data, setData] = useState<BrandData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Dirty state tracking
  const initialDataRef = useRef<BrandData | null>(null)
  const isDirty = useMemo(() => {
    if (!data || !initialDataRef.current) return false
    return JSON.stringify(data) !== JSON.stringify(initialDataRef.current)
  }, [data])

  // Tab state from URL
  const activeTab: BrandTab = (searchParams.get('tab') as BrandTab) || 'biznis'
  const setActiveTab = (tab: BrandTab) => setSearchParams({ tab }, { replace: true })

  // Social handles local state
  const [socialInput, setSocialInput] = useState('')
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null)
  const [socialError, setSocialError] = useState('')

  // Hashtags local state
  const [hashtagInput, setHashtagInput] = useState('#')

  // Content pillars custom input
  const [showCustomPillar, setShowCustomPillar] = useState(false)
  const [customPillarInput, setCustomPillarInput] = useState('')

  // AI settings collapsible
  const [aiExpanded, setAiExpanded] = useState(false)

  // Logo upload
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const clientId = currentClient?.client_id

  // Sidebar width for sticky bar offset
  const sidebarLeft = collapsed ? 72 : 256

  useEffect(() => {
    if (!clientId) { setLoading(false); return }
    setLoading(true)
    setError(false)
    api.get(`/clients/${clientId}`)
      .then(res => {
        setData(res.data)
        initialDataRef.current = structuredClone(res.data)
        setError(false)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [clientId])

  const handleSave = async () => {
    if (!data || !currentClient) return
    setSaving(true)
    try {
      await api.put(`/clients/${currentClient.client_id}`, {
        name: data.name,
        business_description: data.business_description,
        product_info: data.product_info,
        tone_of_voice: data.tone_of_voice,
        target_audience: data.target_audience,
        brand_colors: data.brand_colors,
        brand_fonts: data.brand_fonts,
        logo_url: data.logo_url,
        website_url: data.website_url,
        languages: data.languages,
        content_pillars: data.content_pillars,
        social_handles: data.social_handles,
        hashtags: data.hashtags,
        ai_system_prompt_override: data.ai_system_prompt_override,
      })
      // Refresh client context so Dashboard / other pages see fresh data
      await refreshClient()
      // Update baseline so isDirty clears
      initialDataRef.current = structuredClone(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save brand profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    if (initialDataRef.current) {
      setData(structuredClone(initialDataRef.current))
    }
  }

  const update = (field: keyof BrandData, value: unknown) => {
    if (!data) return
    setData({ ...data, [field]: value })
  }

  /* Logo upload handlers */
  const uploadLogo = async (file: File) => {
    if (!currentClient) return
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post(`/clients/${currentClient.client_id}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      update('logo_url', res.data.logo_url)
      // Update baseline for this field so logo isn't "dirty"
      if (initialDataRef.current) {
        initialDataRef.current.logo_url = res.data.logo_url
      }
      await refreshClient()
    } catch (err) {
      console.error('Logo upload failed:', err)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) uploadLogo(file)
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadLogo(file)
    // Reset input so same file can be re-selected
    if (e.target) e.target.value = ''
  }

  /* Loading / error states */
  if (!currentClient || loading) {
    return (
      <>
        <Header title="PROFIL KLIJENTA" subtitle="Postavke klijenta i AI kontekst" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header title="PROFIL KLIJENTA" subtitle="Postavke klijenta i AI kontekst" />
        <div className="p-8 text-center">
          <p className="text-studio-text-secondary mb-3">Nije moguće učitati podatke klijenta.</p>
          <button
            onClick={() => {
              setError(false); setLoading(true)
              api.get(`/clients/${clientId}`).then(res => { setData(res.data); initialDataRef.current = structuredClone(res.data); setError(false) }).catch(() => setError(true)).finally(() => setLoading(false))
            }}
            className="text-sm text-brand-accent hover:underline font-medium"
          >
            Pokušaj ponovo
          </button>
        </div>
      </>
    )
  }

  const inputCls = "w-full bg-studio-surface-1 border border-studio-border rounded-xl px-4 py-2.5 text-sm text-studio-text-primary placeholder-studio-text-tertiary focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 transition-all"
  const labelCls = "block text-sm font-medium text-studio-text-secondary mb-1.5"
  const cardCls = "bg-studio-surface-0 border border-studio-border rounded-2xl p-6"

  /* Helpers for social handles */
  const socialEntries = Object.entries(data.social_handles || {}).filter(([, v]) => v && v.trim())

  const addSocialLink = (platform: string, url: string) => {
    if (!isValidUrl(url)) {
      setSocialError('Unesite puni URL profila (https://...)')
      return
    }
    setSocialError('')
    update('social_handles', { ...(data.social_handles || {}), [platform]: url })
    setSocialInput('')
    setDetectedPlatform(null)
  }

  const removeSocialLink = (platform: string) => {
    const h = { ...(data.social_handles || {}) }
    delete h[platform]
    update('social_handles', h)
  }

  /* Helpers for pillars */
  const pillars: string[] = (data.content_pillars as string[] | null) || []

  /* Logo URL for display */
  const logoFullUrl = resolveLogoUrl(data.logo_url)

  return (
    <>
      <Header
        title="PROFIL KLIJENTA"
        subtitle={data.name}
      />

      <div className={`p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl ${isDirty && canEdit ? 'pb-28' : ''}`}>
        {/* Superadmin read-only banner */}
        {isSuperadminVisitor && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-studio-text-primary">Pregled klijenta (samo čitanje)</p>
              <p className="text-xs text-studio-text-tertiary">Superadmin pristup — promjene može raditi samo admin ovog klijenta.</p>
            </div>
          </div>
        )}

        {/* AI Context Status Banner */}
        {!data.business_description && !data.product_info ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-studio-text-primary mb-1">AI kontekst nije postavljen</h3>
              <p className="text-xs text-studio-text-secondary">
                Opišite svoj posao i proizvode kako bi AI mogao generirati kampanje, sadržaj i analize prilagođene vašem brendu.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-accent/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-brand-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-studio-text-primary font-medium">AI kontekst aktivan</p>
              <p className="text-xs text-studio-text-tertiary">AI koristi ove podatke za generiranje sadržaja i analiza.</p>
            </div>
            <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" />
          </div>
        )}

        {/* ---- Tab navigation ---- */}
        <div className="flex gap-1 bg-studio-surface-1 border border-studio-border rounded-xl p-1 overflow-x-auto">
          {BRAND_TABS.map(tab => {
            if (tab.id === 'ai' && !canSeeAiTab) return null
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-accent text-white shadow-sm'
                    : 'text-studio-text-secondary hover:text-studio-text-primary hover:bg-studio-surface-2'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ================================================================ */}
        {/*  TAB: Biznis info                                                */}
        {/* ================================================================ */}
        {activeTab === 'biznis' && (
          <div className="space-y-6">
            <div className={cardCls}>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Ime klijenta</label>
                  <input className={inputCls} value={data.name} onChange={e => update('name', e.target.value)} disabled={!canEdit} />
                </div>
                <div>
                  <label className={labelCls}>Opis poslovanja</label>
                  <textarea
                    className={`${inputCls} min-h-[120px] resize-none`}
                    value={data.business_description}
                    onChange={e => update('business_description', e.target.value)}
                    disabled={!canEdit}
                    placeholder="Opišite čime se vaša firma bavi, koja je misija i vizija..."
                  />
                </div>
                <div>
                  <label className={labelCls}>Proizvodi / Usluge</label>
                  <textarea
                    className={`${inputCls} min-h-[80px] resize-none`}
                    value={data.product_info}
                    onChange={e => update('product_info', e.target.value)}
                    disabled={!canEdit}
                    placeholder="Koji su vaši glavni proizvodi ili usluge?"
                  />
                </div>
                <div>
                  <label className={labelCls}>Ciljna publika</label>
                  <textarea
                    className={`${inputCls} min-h-[80px] resize-none`}
                    value={data.target_audience}
                    onChange={e => update('target_audience', e.target.value)}
                    disabled={!canEdit}
                    placeholder="Tko su vaši idealni kupci?"
                  />
                </div>
                <div>
                  <label className={labelCls}>Ton komunikacije</label>
                  <p className="text-xs text-studio-text-tertiary mb-3">Odabrani ton utječe na stil svih AI generiranih sadržaja.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TONES.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => canEdit && update('tone_of_voice', t.value)}
                        disabled={!canEdit}
                        className={`p-4 rounded-xl text-left transition-all border-2 disabled:cursor-not-allowed ${
                          data.tone_of_voice === t.value
                            ? 'border-brand-accent bg-brand-accent/5 ring-2 ring-brand-accent/20'
                            : 'border-transparent bg-studio-surface-1 hover:border-brand-accent/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{t.emoji}</span>
                          <span className="text-sm font-bold text-studio-text-primary">{t.label}</span>
                          {data.tone_of_voice === t.value && <CheckCircle2 size={14} className="text-brand-accent ml-auto" />}
                        </div>
                        <p className="text-xs text-studio-text-tertiary">{t.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Web stranica</label>
                  <input className={inputCls} value={data.website_url} onChange={e => update('website_url', e.target.value)} disabled={!canEdit} placeholder="https://..." />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/*  TAB: Vizualni identitet                                        */}
        {/* ================================================================ */}
        {activeTab === 'identitet' && (
          <div className="space-y-6">
            {/* Logo Upload */}
            <div className={cardCls}>
              <h3 className="text-sm font-bold text-studio-text-primary mb-4">Logo</h3>
              {canEdit && (
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-brand-accent bg-brand-accent/5'
                      : 'border-studio-border hover:border-brand-accent/30'
                  }`}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleLogoDrop}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingLogo ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
                      <p className="text-sm text-studio-text-secondary">Uploading...</p>
                    </div>
                  ) : logoFullUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <img src={logoFullUrl} alt="Logo" className="h-20 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <p className="text-xs text-studio-text-tertiary">Kliknite ili povucite novu datoteku za zamjenu</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-studio-text-tertiary" />
                      <p className="text-sm text-studio-text-secondary">Povucite logo ovdje ili kliknite za upload</p>
                      <p className="text-xs text-studio-text-tertiary">PNG, JPG, SVG ili WebP (max 2MB)</p>
                    </div>
                  )}
                </div>
              )}
              {!canEdit && logoFullUrl && (
                <div className="flex items-center justify-center p-6 bg-studio-surface-1 rounded-xl">
                  <img src={logoFullUrl} alt="Logo" className="h-20 object-contain" />
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleLogoFileChange}
              />
              {/* Fallback URL input */}
              <div className="mt-3">
                <label className={labelCls}>Ili unesite URL loga</label>
                <input className={inputCls} value={data.logo_url} onChange={e => update('logo_url', e.target.value)} disabled={!canEdit} placeholder="https://example.com/logo.png" />
              </div>
            </div>

            {/* Brand Colors */}
            <div className={cardCls}>
              <h3 className="text-sm font-bold text-studio-text-primary mb-1">Boje branda</h3>
              <p className="text-xs text-studio-text-tertiary mb-4">Naglasna boja se koristi za grafove, gumbe i UI elemente na cijeloj platformi.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(data.brand_colors || {}).map(([key, val]) => (
                  <div key={key}>
                    <label className={labelCls}>{COLOR_LABELS[key] || key}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={val}
                        onChange={e => update('brand_colors', { ...data.brand_colors, [key]: e.target.value })}
                        disabled={!canEdit}
                        className="w-10 h-10 rounded-lg border border-studio-border cursor-pointer bg-transparent"
                      />
                      <input className={inputCls} value={val} onChange={e => update('brand_colors', { ...data.brand_colors, [key]: e.target.value })} disabled={!canEdit} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className={cardCls}>
              <h3 className="text-sm font-bold text-studio-text-primary mb-2">Jezici sadržaja</h3>
              <p className="text-xs text-studio-text-tertiary mb-3">Odaberite jezike na kojima generirate sadržaj.</p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => {
                  const isSelected = (data.languages || []).includes(lang.code)
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        if (!canEdit) return
                        const langs = isSelected
                          ? (data.languages || []).filter(l => l !== lang.code)
                          : [...(data.languages || []), lang.code]
                        update('languages', langs)
                      }}
                      disabled={!canEdit}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-brand-accent text-white'
                          : 'bg-studio-surface-1 text-studio-text-secondary hover:bg-studio-surface-2'
                      }`}
                    >
                      {lang.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/*  TAB: Društvene mreže                                           */}
        {/* ================================================================ */}
        {activeTab === 'mreze' && (
          <div className="space-y-6">
            {/* Social Handles */}
            <div className={cardCls}>
              <h3 className="text-sm font-bold text-studio-text-primary mb-1">Društvene mreže</h3>
              <p className="text-xs text-studio-text-tertiary mb-4">Zalijepite linkove svojih profila — automatski prepoznajemo platformu. Čim spremite, AI započinje analizu.</p>

              <div className="space-y-3">
                {/* Existing links */}
                {socialEntries.map(([platform, url]) => {
                  const urlValid = isValidUrl(url)
                  return (
                    <div key={platform} className={`flex items-center gap-3 bg-studio-surface-1 border rounded-xl px-4 py-3 group ${urlValid ? 'border-studio-border' : 'border-red-300'}`}>
                      <PlatformIcon platform={platform} size="md" />
                      <span className="text-sm text-studio-text-primary flex-1 truncate">{url}</span>
                      {urlValid && <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />}
                      {!urlValid && <span title="Neispravan URL format"><AlertTriangle size={14} className="text-red-400 flex-shrink-0" /></span>}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => removeSocialLink(platform)}
                          className="text-studio-text-tertiary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}

                {/* Add new link */}
                {canEdit && (
                  <div>
                    <div className="relative">
                      <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-studio-text-tertiary" />
                      <input
                        type="url"
                        value={socialInput}
                        onChange={e => {
                          setSocialInput(e.target.value)
                          setDetectedPlatform(detectPlatformFromUrl(e.target.value))
                          if (socialError) setSocialError('')
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && socialInput.trim()) {
                            e.preventDefault()
                            addSocialLink(detectedPlatform || 'web', socialInput.trim())
                          }
                        }}
                        className={`w-full pl-10 pr-36 py-3 border rounded-xl focus:outline-none focus:ring-2 text-sm text-studio-text-primary bg-studio-surface-1 ${
                          socialError
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-200/30'
                            : 'border-studio-border focus:border-brand-accent/50 focus:ring-brand-accent/10'
                        }`}
                        placeholder="https://instagram.com/vaš_brand"
                      />
                      {detectedPlatform && socialInput.trim() && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <PlatformIcon platform={detectedPlatform} size="sm" showLabel />
                          <button
                            type="button"
                            onClick={() => addSocialLink(detectedPlatform, socialInput.trim())}
                            className="px-3 py-1 bg-brand-accent text-white rounded-lg text-xs font-bold hover:bg-brand-accent-hover transition-colors"
                          >
                            Dodaj
                          </button>
                        </div>
                      )}
                    </div>
                    {socialError && (
                      <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        {socialError}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-studio-text-tertiary">Instagram, Facebook, X/Twitter, LinkedIn, TikTok, YouTube — automatski prepoznajemo platformu.</p>
              </div>
            </div>

            {/* Hashtags */}
            <div className={cardCls}>
              <h3 className="text-sm font-bold text-studio-text-primary mb-1">Hashtagovi</h3>
              <p className="text-xs text-studio-text-tertiary mb-3">Brand hashtagovi koje AI koristi za generiranje sadržaja.</p>

              <div
                className="flex flex-wrap gap-2 p-3 border border-studio-border rounded-xl bg-studio-surface-1 min-h-[48px] focus-within:border-brand-accent/50 focus-within:ring-2 focus-within:ring-brand-accent/10 transition-all cursor-text"
                onClick={() => document.getElementById('bp-hashtag-input')?.focus()}
              >
                {(data.hashtags || []).map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-full text-sm font-medium"
                  >
                    #{tag.replace(/^#/, '')}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          update('hashtags', (data.hashtags || []).filter((_, idx) => idx !== i))
                        }}
                        className="hover:text-red-500 transition-colors ml-0.5"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
                {canEdit && (
                  <input
                    id="bp-hashtag-input"
                    type="text"
                    value={hashtagInput}
                    onChange={e => {
                      const v = e.target.value
                      setHashtagInput(v.startsWith('#') ? v : '#' + v)
                    }}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ',') && hashtagInput.trim().length > 1) {
                        e.preventDefault()
                        const tag = hashtagInput.trim().replace(/^#/, '')
                        if (tag && !(data.hashtags || []).includes(tag)) {
                          update('hashtags', [...(data.hashtags || []), tag])
                        }
                        setHashtagInput('#')
                      }
                      if (e.key === 'Backspace' && hashtagInput === '#') {
                        e.preventDefault()
                      }
                    }}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-studio-text-primary placeholder:text-studio-text-tertiary py-1"
                    placeholder={(data.hashtags || []).length === 0 ? 'hashtag + Enter' : 'Dodaj još...'}
                  />
                )}
              </div>
            </div>

            {/* Content Pillars */}
            <div className={cardCls}>
              <h3 className="text-sm font-bold text-studio-text-primary mb-1">Stupovi sadržaja</h3>
              <p className="text-xs text-studio-text-tertiary mb-3">Odaberite teme o kojima AI smije generirati sadržaj za vaš brand.</p>

              <div className="flex flex-wrap gap-2">
                {CONTENT_PILLARS.map(pillar => {
                  const isSelected = pillars.includes(pillar.name)
                  return (
                    <button
                      key={pillar.id}
                      type="button"
                      onClick={() => {
                        if (!canEdit) return
                        const updated = isSelected
                          ? pillars.filter(p => p !== pillar.name)
                          : [...pillars, pillar.name]
                        update('content_pillars', updated)
                      }}
                      disabled={!canEdit}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-brand-accent text-white border-brand-accent shadow-sm'
                          : 'bg-studio-surface-1 text-studio-text-secondary border-studio-border hover:border-brand-accent/30 hover:bg-brand-accent/5'
                      }`}
                    >
                      {pillar.name}
                    </button>
                  )
                })}

                {/* Custom pillars */}
                {pillars
                  .filter(p => !CONTENT_PILLARS.some(cp => cp.name === p))
                  .map(customPillar => (
                    <span
                      key={customPillar}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-brand-accent text-white rounded-full text-sm font-medium border border-brand-accent shadow-sm"
                    >
                      {customPillar}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => update('content_pillars', pillars.filter(p => p !== customPillar))}
                          className="hover:text-red-200 transition-colors ml-0.5"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))}

                {/* Add custom pillar */}
                {canEdit && (
                  showCustomPillar ? (
                    <input
                      type="text"
                      value={customPillarInput}
                      onChange={e => setCustomPillarInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && customPillarInput.trim()) {
                          e.preventDefault()
                          if (!pillars.includes(customPillarInput.trim())) {
                            update('content_pillars', [...pillars, customPillarInput.trim()])
                          }
                          setCustomPillarInput('')
                          setShowCustomPillar(false)
                        }
                        if (e.key === 'Escape') {
                          setShowCustomPillar(false)
                          setCustomPillarInput('')
                        }
                      }}
                      onBlur={() => {
                        if (customPillarInput.trim() && !pillars.includes(customPillarInput.trim())) {
                          update('content_pillars', [...pillars, customPillarInput.trim()])
                        }
                        setCustomPillarInput('')
                        setShowCustomPillar(false)
                      }}
                      autoFocus
                      className="px-4 py-2 rounded-full text-sm border border-brand-accent/50 bg-studio-surface-1 focus:outline-none focus:ring-2 focus:ring-brand-accent/10 w-40"
                      placeholder="Naziv stupca..."
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCustomPillar(true)}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border border-dashed border-studio-border text-studio-text-tertiary hover:border-brand-accent/30 hover:text-brand-accent transition-all"
                    >
                      <Plus size={14} />
                      Prilagođen
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/*  TAB: AI Postavke (admin only)                                  */}
        {/* ================================================================ */}
        {activeTab === 'ai' && canSeeAiTab && (
          <div className="space-y-6">
            {/* AI Context Preview — visible to all admins */}
            <div className={cardCls}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-brand-accent" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-studio-text-primary">AI kontekst vašeg brenda</h3>
                  <p className="text-xs text-studio-text-tertiary">Ovo su podaci koje AI koristi za generiranje sadržaja</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-studio-surface-1 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-studio-text-tertiary uppercase tracking-wider mb-1">Brand</p>
                    <p className="text-sm font-medium text-studio-text-primary">{data.name || '—'}</p>
                  </div>
                  <div className="bg-studio-surface-1 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-studio-text-tertiary uppercase tracking-wider mb-1">Ton komunikacije</p>
                    <p className="text-sm font-medium text-studio-text-primary">
                      {data.tone_of_voice ? (TONE_LABELS[data.tone_of_voice] || data.tone_of_voice) : '—'}
                    </p>
                  </div>
                </div>
                <div className="bg-studio-surface-1 rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-studio-text-tertiary uppercase tracking-wider mb-1">Ciljna publika</p>
                  <p className="text-sm text-studio-text-primary leading-relaxed">
                    {data.target_audience
                      ? (data.target_audience.length > 150 ? data.target_audience.slice(0, 150) + '...' : data.target_audience)
                      : '—'}
                  </p>
                </div>
                {pillars.length > 0 && (
                  <div className="bg-studio-surface-1 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-studio-text-tertiary uppercase tracking-wider mb-2">Stupovi sadržaja</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pillars.map(p => (
                        <span key={p} className="px-2.5 py-1 bg-brand-accent/10 text-brand-accent rounded-full text-xs font-medium">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-studio-text-tertiary">
                  AI automatski koristi ove podatke za sve generirane kampanje i objave. Promijenite ih u tabovima iznad.
                </p>
              </div>
            </div>

            {/* System Prompt Override — superadmin only */}
            {isSuperadmin && (
              <div className={cardCls}>
                <button
                  type="button"
                  onClick={() => setAiExpanded(!aiExpanded)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base font-bold text-studio-text-primary">System Prompt Override</h3>
                      <p className="text-xs text-studio-text-tertiary">Skrivene instrukcije — korisnik ih ne vidi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 flex items-center gap-1">
                      <ShieldAlert size={10} />
                      Superadmin
                    </span>
                    {aiExpanded ? <ChevronUp size={16} className="text-studio-text-tertiary" /> : <ChevronDown size={16} className="text-studio-text-tertiary" />}
                  </div>
                </button>

                {aiExpanded && (
                  <div className="mt-5 space-y-4">
                    {/* Warning */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                      <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-500">
                        Ovo zamjenjuje kompletni AI system prompt. Pogrešna konfiguracija može degradirati kvalitetu generiranog sadržaja. Ostavite prazno za automatski generirani prompt.
                      </p>
                    </div>

                    <div>
                      <label className={labelCls}>Custom system prompt</label>
                      <textarea
                        className={`${inputCls} min-h-[150px] font-mono text-xs resize-none`}
                        value={data.ai_system_prompt_override}
                        onChange={e => update('ai_system_prompt_override', e.target.value)}
                        disabled={!canEdit}
                        placeholder="Ti si AI asistent za brand [ime]. Tvoj zadatak je..."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/*  Sticky Save Bar                                                 */}
      {/* ================================================================ */}
      {isDirty && canEdit && (
        <div
          className="fixed bottom-0 right-0 z-40 bg-studio-surface-0/95 backdrop-blur-xl border-t border-studio-border px-6 py-3 flex items-center justify-between animate-fade-in"
          style={{ left: `${sidebarLeft}px` }}
        >
          <p className="text-sm text-studio-text-secondary hidden sm:block">
            Imate nespremljene promjene
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={handleDiscard}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-studio-text-secondary bg-studio-surface-1 border border-studio-border rounded-xl hover:bg-studio-surface-2 transition-all"
            >
              <RotateCcw size={14} />
              Odbaci
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-brand-accent text-white rounded-xl text-sm font-bold hover:bg-brand-accent/90 transition-all disabled:opacity-50 shadow-md shadow-brand-accent/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saved ? 'Spremljeno!' : 'Spremi promjene'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
