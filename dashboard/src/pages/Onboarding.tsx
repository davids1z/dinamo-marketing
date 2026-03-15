import { useState, useEffect, useRef } from 'react'
import {
  Brain, Palette, FolderKanban, ChevronRight, ChevronLeft, Check,
  Sparkles, Zap, BarChart3, MessageSquare, Building2,
  Globe, Upload, Loader2, CheckCircle2, AlertCircle, SkipForward,
  X, Plus, Link2,
} from 'lucide-react'
import api from '../api/client'
import { useClient } from '../contexts/ClientContext'
import { useAuth } from '../contexts/AuthContext'
import PlatformIcon from '../components/common/PlatformIcon'
import { CONTENT_PILLARS, detectPlatformFromUrl } from '../utils/constants'

/* ------------------------------------------------------------------ */
/*  4-step onboarding wizard (Step 0: org creation if no client)       */
/* ------------------------------------------------------------------ */

const WIZARD_STEPS = [
  { label: 'Organizacija', icon: Building2 },
  { label: 'Nahrani AI', icon: Brain },
  { label: 'Identitet', icon: Palette },
  { label: 'Projekt', icon: FolderKanban },
]

// AI_STEPS removed — always show all 4 steps for consistency across tabs

const TONES = [
  { value: 'professional', label: 'Profesionalan', emoji: '🎯' },
  { value: 'friendly', label: 'Prijateljski', emoji: '👋' },
  { value: 'bold', label: 'Hrabar i direktan', emoji: '🔥' },
  { value: 'creative', label: 'Kreativan', emoji: '🎨' },
  { value: 'formal', label: 'Formalan', emoji: '📋' },
  { value: 'casual', label: 'Opušten', emoji: '☕' },
  { value: 'inspirational', label: 'Inspirativan', emoji: '✨' },
  { value: 'humorous', label: 'Humorističan', emoji: '😄' },
]

interface FormData {
  // Step 0: Organization
  company_name: string
  // Step 1: AI context
  business_description: string
  product_info: string
  target_audience: string
  tone_of_voice: string
  website_url: string
  // Step 2: Visual + social
  brand_colors: string[]
  logo_url: string
  social_handles: Record<string, string>
  hashtags: string[]
  content_pillars: string[]
  languages: string[]
  // Step 3: Project
  project_name: string
  project_description: string
}

export default function Onboarding() {
  const { currentClient } = useClient()
  const { user } = useAuth()

  // Superadmin must NEVER see onboarding — they are visitors, not owners.
  // This is a safety net in case ProtectedRoute guard was bypassed (e.g. SW cache).
  if (user?.is_superadmin) {
    window.location.replace('/')
    return null
  }

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  // Magic Import state
  const [magicLoading, setMagicLoading] = useState(false)
  const [magicSource, setMagicSource] = useState<'url' | 'file' | null>(null)
  const [magicError, setMagicError] = useState('')
  const [magicDone, setMagicDone] = useState(false)
  const [magicUrl, setMagicUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 2: Social links, hashtags, content pillars
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([])
  const [socialInput, setSocialInput] = useState('')
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null)
  const [hashtagInput, setHashtagInput] = useState('#')
  const [showCustomPillar, setShowCustomPillar] = useState(false)
  const [customPillarInput, setCustomPillarInput] = useState('')

  const [form, setForm] = useState<FormData>({
    company_name: currentClient?.client_name || '',
    business_description: '',
    product_info: '',
    target_audience: '',
    tone_of_voice: '',
    website_url: '',
    brand_colors: ['#0A1A28', '#0EA5E9', '#0057A8'],
    logo_url: '',
    social_handles: { instagram: '', facebook: '', twitter: '', linkedin: '' },
    hashtags: [],
    content_pillars: [],
    languages: ['hr'],
    project_name: '',
    project_description: '',
  })

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  // Sync socialLinks array → form.social_handles dict (last entry per platform wins)
  useEffect(() => {
    const handles: Record<string, string> = {}
    for (const link of socialLinks) {
      handles[link.platform] = link.url
    }
    updateField('social_handles', handles)
  }, [socialLinks])

  const handleMagicImport = async (source: 'url' | 'file', file?: File) => {
    const clientId = currentClient?.client_id || localStorage.getItem('current_client_id')
    if (!clientId) return

    setMagicLoading(true)
    setMagicSource(source)
    setMagicError('')
    setMagicDone(false)

    try {
      const formData = new FormData()
      if (source === 'url' && magicUrl.trim()) {
        formData.append('url', magicUrl.trim())
      } else if (source === 'file' && file) {
        formData.append('file', file)
      } else {
        setMagicError('Unesite URL ili odaberite datoteku')
        setMagicLoading(false)
        return
      }

      const res = await api.post(`/clients/${clientId}/magic-import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })

      const s = res.data.suggestions
      if (s.business_description) updateField('business_description', s.business_description)
      if (s.product_info) updateField('product_info', s.product_info)
      if (s.target_audience) updateField('target_audience', s.target_audience)
      if (s.tone_of_voice) updateField('tone_of_voice', s.tone_of_voice)
      if (source === 'url' && magicUrl.trim()) updateField('website_url', magicUrl.trim())

      setMagicDone(true)
    } catch (err: any) {
      setMagicError(err.response?.data?.detail || 'AI analiza nije uspjela. Pokušajte ponovno.')
    } finally {
      setMagicLoading(false)
      setMagicSource(null)
    }
  }

  const steps = WIZARD_STEPS

  const handleCreateOrganization = async () => {
    if (!form.company_name.trim()) return
    setLoading(true)
    setError('')
    try {
      // Upsert: creates org if none exists, returns existing if already created
      const res = await api.post('/auth/create-organization', {
        company_name: form.company_name.trim(),
      })
      // Set the client in context (works for both new and existing)
      localStorage.setItem('current_client_id', res.data.client_id)
      if (res.data.projects?.[0]) {
        localStorage.setItem('current_project_id', res.data.projects[0].project_id)
      }
      // Move to next step
      setStep(1)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Greška pri kreiranju organizacije')
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = async () => {
    const clientId = currentClient?.client_id || localStorage.getItem('current_client_id')
    if (!clientId) return
    setLoading(true)
    setError('')

    try {
      // 1. Save brand profile
      await api.put(`/clients/${clientId}`, {
        business_description: form.business_description,
        product_info: form.product_info,
        website_url: form.website_url,
        brand_colors: form.brand_colors,
        logo_url: form.logo_url,
        tone_of_voice: form.tone_of_voice,
        target_audience: form.target_audience,
        languages: form.languages,
        social_handles: form.social_handles,
        hashtags: form.hashtags,
        content_pillars: form.content_pillars,
      })

      // 2. Complete onboarding
      await api.post(`/clients/${clientId}/onboarding/complete`, {})

      // 3. Create project (mandatory)
      const slug = form.project_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      await api.post('/projects/', {
        name: form.project_name.trim(),
        slug: slug || 'projekt-1',
        description: form.project_description,
      })

      // 4. Show "AI analyzing" magic moment
      setLoading(false)
      setAnalyzing(true)

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Greška pri spremanju. Pokušajte ponovno.')
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    const clientId = currentClient?.client_id || localStorage.getItem('current_client_id')
    if (!clientId) return
    setLoading(true)
    setError('')
    try {
      // Save whatever data they've entered so far
      const partial: Record<string, unknown> = {}
      if (form.business_description.trim()) partial.business_description = form.business_description
      if (form.product_info.trim()) partial.product_info = form.product_info
      if (form.target_audience.trim()) partial.target_audience = form.target_audience
      if (form.tone_of_voice) partial.tone_of_voice = form.tone_of_voice
      if (form.website_url.trim()) partial.website_url = form.website_url
      if (Object.keys(partial).length > 0) {
        await api.put(`/clients/${clientId}`, partial)
      }
      // Create a fallback project so the system is never without one
      const fallbackName = (form.company_name.trim() || currentClient?.client_name || 'Moj') + ' — Projekt 1'
      const fallbackSlug = fallbackName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'projekt-1'
      try {
        await api.post('/projects/', {
          name: fallbackName,
          slug: fallbackSlug,
          description: '',
        })
      } catch {
        // Project may already exist — ignore
      }
      // Mark onboarding as completed
      await api.post(`/clients/${clientId}/onboarding/complete`, {})
      window.location.href = '/'
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Greška. Pokušajte ponovno.')
      setLoading(false)
    }
  }

  // AI analyzing -> redirect after delay
  useEffect(() => {
    if (!analyzing) return
    const timer = setTimeout(() => {
      window.location.href = '/brand-profile'
    }, 3000)
    return () => clearTimeout(timer)
  }, [analyzing])

  const canProceed = () => {
    switch (step) {
      case 0: return form.company_name.trim().length >= 2
      case 1: return true // soft validation only — user can skip or fill later
      case 2: return true
      case 3: return form.project_name.trim().length >= 2
      default: return true
    }
  }

  const charCount = form.business_description.length
  const charTarget = 100

  /* ------------------------------------------------------------------ */
  /*  AI Analyzing animation (magic moment)                              */
  /* ------------------------------------------------------------------ */
  if (analyzing) {
    return (
      <div className="min-h-screen bg-studio-base flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          {/* Animated brain icon */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-brand-accent/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-brand-accent/10 animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-studio-surface-1 border border-brand-accent/30 flex items-center justify-center">
              <Brain className="w-10 h-10 text-brand-accent animate-pulse" />
            </div>
          </div>

          <h2 className="font-headline text-2xl text-studio-text-primary mb-3">
            AI analizira vaš profil...
          </h2>
          <p className="text-studio-text-tertiary text-sm mb-8">
            Pripremamo personalizirane uvide i preporuke za vaš brand.
          </p>

          {/* Animated steps */}
          <div className="space-y-3 text-left">
            <AnalyzingStep icon={MessageSquare} text="Analiziram ton komunikacije" delay={0} />
            <AnalyzingStep icon={BarChart3} text="Pripremam tržišne uvide" delay={800} />
            <AnalyzingStep icon={Zap} text="Generiram prijedloge kampanja" delay={1600} />
            <AnalyzingStep icon={Sparkles} text="Finaliziram profil" delay={2200} />
          </div>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Main wizard UI                                                     */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-studio-base flex flex-col">
      {/* Header with progress */}
      <div className="bg-studio-surface-1 border-b border-studio-border px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center">
                <span className="font-headline text-xs text-white font-bold">
                  {currentClient?.client_name?.charAt(0)?.toUpperCase() || form.company_name?.charAt(0)?.toUpperCase() || 'S'}
                </span>
              </div>
              <div>
                <h1 className="font-headline text-lg text-studio-text-primary font-bold leading-tight">
                  {currentClient?.client_name || form.company_name || 'Postavljanje'}
                </h1>
                <p className="text-xs text-studio-text-tertiary">Postavljanje profila</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {step >= 1 && (
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-studio-text-tertiary hover:text-studio-text-secondary hover:bg-studio-surface-2 transition-all disabled:opacity-50"
                >
                  <SkipForward size={12} />
                  Preskoči
                </button>
              )}
              <span className="text-sm text-studio-text-tertiary font-mono">{step + 1} / {steps.length}</span>
            </div>
          </div>

          {/* Step tabs */}
          <div className="flex gap-2">
            {steps.map((s, i) => {
              const Icon = s.icon
              return (
                <button
                  key={i}
                  onClick={() => i < step && setStep(i)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    i === step
                      ? 'bg-brand-accent text-white'
                      : i < step
                        ? 'bg-brand-accent/20 text-brand-accent cursor-pointer'
                        : 'bg-studio-surface-2 text-studio-text-tertiary'
                  }`}
                >
                  {i < step ? <Check size={16} /> : <Icon size={16} />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-3xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
              <span>{error}</span>
              <button onClick={() => setError('')} className="ml-auto text-red-400/60 hover:text-red-400">&times;</button>
            </div>
          )}

          {/* ---- STEP 0: Kreiraj organizaciju ---- */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-2xl p-6 border border-sky-200/30">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-sky-600" />
                  </div>
                  <div>
                    <h2 className="font-headline text-xl text-studio-text-primary mb-1">Kreirajte svoju organizaciju</h2>
                    <p className="text-sm text-studio-text-secondary leading-relaxed">
                      Organizacija je prostor u kojem upravljate brandovima, projektima i timom.
                      Možete pozvati kolege i partnere da vam se pridruže.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-studio-surface-1 rounded-2xl p-6 border border-studio-border">
                <label className="block text-sm font-semibold text-studio-text-primary mb-2">
                  Naziv tvrtke ili organizacije *
                </label>
                <p className="text-xs text-studio-text-tertiary mb-3">
                  Ovo je ime pod kojim ćete se voditi u sustavu. Možete ga promijeniti kasnije.
                </p>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={e => updateField('company_name', e.target.value)}
                  className="w-full px-4 py-3.5 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                  placeholder="Npr. Moja Agencija d.o.o."
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* ---- STEP 1: Nahrani AI ---- */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Hero message */}
              <div className="bg-gradient-to-br from-brand-accent/10 to-studio-ai-purple/10 rounded-2xl p-6 border border-brand-accent/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-accent/20 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-brand-accent" />
                  </div>
                  <div>
                    <h2 className="font-headline text-xl text-studio-text-primary mb-1">Nahrani AI</h2>
                    <p className="text-sm text-studio-text-secondary leading-relaxed">
                      Što više napišete o svom biznisu, to će AI bolje generirati sadržaj, kampanje i uvide.
                      Ovo je najvažniji korak — AI koristi ove informacije za <strong className="text-brand-accent">sve</strong> što radi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Magic Import — AI auto-fill */}
              <div className={`bg-studio-surface-1 rounded-2xl p-6 border transition-colors ${
                magicDone ? 'border-brand-accent/40 bg-brand-accent/5' : 'border-studio-border'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={16} className="text-brand-accent" />
                  <h3 className="text-sm font-semibold text-studio-text-primary">Magic Import</h3>
                  {magicDone && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-brand-accent font-medium">
                      <CheckCircle2 size={14} />
                      AI je popunio polja
                    </span>
                  )}
                </div>
                <p className="text-xs text-studio-text-tertiary mb-4">
                  Unesite URL web stranice ili uploadajte dokument — AI automatski popunjava polja ispod.
                </p>

                {/* URL input */}
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-studio-text-tertiary" />
                    <input
                      type="url"
                      value={magicUrl}
                      onChange={e => setMagicUrl(e.target.value)}
                      disabled={magicLoading}
                      className="w-full pl-10 pr-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 disabled:opacity-50"
                      placeholder="https://www.vaša-stranica.hr"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && magicUrl.trim()) {
                          e.preventDefault()
                          handleMagicImport('url')
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={() => handleMagicImport('url')}
                    disabled={!magicUrl.trim() || magicLoading}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-brand-accent text-white hover:bg-brand-accent-hover transition-all disabled:opacity-50 shadow-sm shadow-brand-accent/20"
                  >
                    {magicSource === 'url' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Zap size={16} />
                    )}
                    {magicSource === 'url' ? 'Analiziram...' : 'Analiziraj'}
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-studio-border" />
                  <span className="text-xs text-studio-text-tertiary font-medium">ili</span>
                  <div className="flex-1 h-px bg-studio-border" />
                </div>

                {/* File upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleMagicImport('file', file)
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={magicLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-studio-border rounded-xl text-sm text-studio-text-secondary hover:border-brand-accent/30 hover:bg-studio-surface-2 transition-all disabled:opacity-50"
                >
                  {magicSource === 'file' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  <span>{magicSource === 'file' ? 'Analiziram dokument...' : 'Uploadajte PDF, DOCX ili TXT'}</span>
                </button>

                {/* Magic import status messages */}
                {magicError && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{magicError}</span>
                  </div>
                )}
                {magicLoading && (
                  <div className="mt-3 flex items-center gap-2 p-3 bg-brand-accent/5 border border-brand-accent/10 rounded-xl text-xs text-brand-accent">
                    <Loader2 size={14} className="animate-spin flex-shrink-0" />
                    <span>AI analizira sadržaj i popunjava polja... Ovo može potrajati do 30 sekundi.</span>
                  </div>
                )}
              </div>

              {/* Main textarea — big and prominent */}
              <div className="bg-studio-surface-1 rounded-2xl p-6 border border-studio-border">
                <label className="block text-sm font-semibold text-studio-text-primary mb-2">
                  Opišite svoj biznis *
                </label>
                <p className="text-xs text-studio-text-tertiary mb-3">
                  Misija, vizija, što vas čini posebnima, kakve proizvode ili usluge nudite...
                </p>
                <textarea
                  value={form.business_description}
                  onChange={e => updateField('business_description', e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 resize-none leading-relaxed"
                  placeholder="Npr. Mi smo digitalna marketing agencija specijalizirana za e-commerce brendove. Radimo s malim i srednjim poduzećima koji žele povećati svoju online prisutnost kroz social media marketing, content creation i performance kampanje..."
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {charCount < 20 && (
                      <span className="text-xs text-red-400">Minimalno 20 znakova</span>
                    )}
                    {charCount >= 20 && charCount < charTarget && (
                      <span className="text-xs text-amber-400">Dobro, ali više detalja = bolji AI rezultati</span>
                    )}
                    {charCount >= charTarget && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <Check size={12} /> Odlično! AI ima dovoljno konteksta
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-studio-text-tertiary font-mono">{charCount}</span>
                </div>
              </div>

              {/* Product info */}
              {form.product_info && (
                <div className="bg-studio-surface-1 rounded-2xl p-6 border border-studio-border">
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">
                    Proizvodi / usluge
                  </label>
                  <textarea
                    value={form.product_info}
                    onChange={e => updateField('product_info', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 resize-none"
                    placeholder="Proizvodi ili usluge koje nudite..."
                  />
                </div>
              )}

              {/* Secondary fields */}
              <div className="bg-studio-surface-1 rounded-2xl p-6 border border-studio-border space-y-4">
                <div>
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">
                    Tko su vaši klijenti / kupci?
                  </label>
                  <textarea
                    value={form.target_audience}
                    onChange={e => updateField('target_audience', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 resize-none"
                    placeholder="Npr. Mladi poduzetnici 25-40, zainteresirani za digital marketing i e-commerce..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-studio-text-secondary mb-2">
                    Ton komunikacije
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TONES.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => updateField('tone_of_voice', t.value)}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                          form.tone_of_voice === t.value
                            ? 'bg-brand-accent text-white ring-2 ring-brand-accent/30'
                            : 'bg-studio-surface-2 text-studio-text-secondary hover:bg-studio-surface-3'
                        }`}
                      >
                        <span className="mr-1.5">{t.emoji}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Web stranica</label>
                  <input
                    type="url"
                    value={form.website_url}
                    onChange={e => updateField('website_url', e.target.value)}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                    placeholder="https://www.vaša-stranica.hr"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ---- STEP 2: Vizualni identitet + mreže ---- */}
          {step === 2 && (
            <div className="space-y-6">
              {/* --- Visual Identity: Colors, Logo, Languages --- */}
              <div className="bg-studio-surface-1 rounded-2xl p-6 border border-studio-border">
                <h2 className="font-headline text-xl text-studio-text-primary mb-1">Vizualni identitet</h2>
                <p className="text-sm text-studio-text-tertiary mb-5">Boje, logo i jezici vašeg brenda.</p>

                <div className="space-y-5">
                  {/* Brand Colors */}
                  <div>
                    <label className="block text-sm font-medium text-studio-text-secondary mb-2">Boje brenda</label>
                    <div className="flex gap-4">
                      {form.brand_colors.map((color, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="color"
                            value={color}
                            onChange={e => {
                              const newColors = [...form.brand_colors]
                              newColors[i] = e.target.value
                              updateField('brand_colors', newColors)
                            }}
                            className="w-12 h-12 rounded-xl border border-studio-border cursor-pointer bg-transparent"
                          />
                          <span className="text-xs text-studio-text-tertiary font-mono">{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Logo URL with live preview */}
                  <div>
                    <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Logo</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="url"
                        value={form.logo_url}
                        onChange={e => updateField('logo_url', e.target.value)}
                        className="flex-1 px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                        placeholder="https://example.com/logo.png"
                      />
                      {form.logo_url && (
                        <div className="w-12 h-12 rounded-xl border border-studio-border overflow-hidden flex-shrink-0 bg-studio-surface-2 flex items-center justify-center">
                          <img
                            src={form.logo_url}
                            alt="Logo preview"
                            className="w-full h-full object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            onLoad={e => { (e.target as HTMLImageElement).style.display = 'block' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <label className="block text-sm font-medium text-studio-text-secondary mb-2">Jezici sadržaja</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { code: 'hr', label: 'Hrvatski' },
                        { code: 'en', label: 'English' },
                        { code: 'de', label: 'Deutsch' },
                        { code: 'it', label: 'Italiano' },
                        { code: 'sl', label: 'Slovenščina' },
                      ].map(lang => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            const langs = form.languages.includes(lang.code)
                              ? form.languages.filter(l => l !== lang.code)
                              : [...form.languages, lang.code]
                            updateField('languages', langs)
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            form.languages.includes(lang.code)
                              ? 'bg-brand-accent text-white'
                              : 'bg-studio-surface-2 text-studio-text-secondary hover:bg-studio-surface-3'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* --- Social Links: Auto-Detect from URL --- */}
              <div className="bg-studio-surface-1 rounded-2xl p-6 border border-studio-border">
                <h2 className="font-headline text-xl text-studio-text-primary mb-1">Društvene mreže</h2>
                <p className="text-sm text-studio-text-tertiary mb-4">Zalijepite linkove svojih profila — automatski prepoznajemo platformu.</p>

                <div className="space-y-3">
                  {/* Added links list */}
                  {socialLinks.map((link, i) => (
                    <div key={i} className="flex items-center gap-3 bg-studio-surface-0 border border-studio-border rounded-xl px-4 py-3 group">
                      <PlatformIcon platform={link.platform} size="md" />
                      <span className="text-sm text-studio-text-primary flex-1 truncate">{link.url}</span>
                      <button
                        type="button"
                        onClick={() => setSocialLinks(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-studio-text-tertiary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Add new link input */}
                  <div className="relative">
                    <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-studio-text-tertiary" />
                    <input
                      type="url"
                      value={socialInput}
                      onChange={e => {
                        setSocialInput(e.target.value)
                        setDetectedPlatform(detectPlatformFromUrl(e.target.value))
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && socialInput.trim()) {
                          e.preventDefault()
                          const platform = detectedPlatform || 'web'
                          setSocialLinks(prev => [...prev, { platform, url: socialInput.trim() }])
                          setSocialInput('')
                          setDetectedPlatform(null)
                        }
                      }}
                      className="w-full pl-10 pr-36 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                      placeholder="https://instagram.com/vaš_brand"
                    />
                    {detectedPlatform && socialInput.trim() && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <PlatformIcon platform={detectedPlatform} size="sm" showLabel />
                        <button
                          type="button"
                          onClick={() => {
                            setSocialLinks(prev => [...prev, { platform: detectedPlatform, url: socialInput.trim() }])
                            setSocialInput('')
                            setDetectedPlatform(null)
                          }}
                          className="px-3 py-1 bg-brand-accent text-white rounded-lg text-xs font-bold hover:bg-brand-accent-hover transition-colors"
                        >
                          Dodaj
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-studio-text-tertiary">Instagram, Facebook, X/Twitter, LinkedIn, TikTok, YouTube — automatski prepoznajemo platformu iz linka.</p>
                </div>
              </div>

              {/* --- Hashtags: Tag Input --- */}
              <div className="bg-studio-surface-1 rounded-2xl p-6 border border-studio-border">
                <h2 className="font-headline text-xl text-studio-text-primary mb-1">Strategija sadržaja</h2>
                <p className="text-sm text-studio-text-tertiary mb-4">Hashtags i stupovi sadržaja koje AI koristi za generiranje.</p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-studio-text-secondary mb-2">Hashtags</label>
                    <div className="flex flex-wrap gap-2 p-3 border border-studio-border rounded-xl bg-studio-surface-0 min-h-[48px] focus-within:border-brand-accent/50 focus-within:ring-2 focus-within:ring-brand-accent/10 transition-all cursor-text"
                      onClick={() => document.getElementById('hashtag-input')?.focus()}
                    >
                      {form.hashtags.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-full text-sm font-medium"
                        >
                          #{tag.replace(/^#/, '')}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation()
                              updateField('hashtags', form.hashtags.filter((_, idx) => idx !== i))
                            }}
                            className="hover:text-red-500 transition-colors ml-0.5"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <input
                        id="hashtag-input"
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
                            if (tag && !form.hashtags.includes(tag)) {
                              updateField('hashtags', [...form.hashtags, tag])
                            }
                            setHashtagInput('#')
                          }
                          // Prevent deleting the # prefix
                          if (e.key === 'Backspace' && hashtagInput === '#') {
                            e.preventDefault()
                          }
                        }}
                        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-studio-text-primary placeholder:text-studio-text-tertiary py-1"
                        placeholder={form.hashtags.length === 0 ? 'hashtag + Enter' : 'Dodaj još...'}
                      />
                    </div>
                  </div>

                  {/* --- Content Pillars: Selectable Chips --- */}
                  <div>
                    <label className="block text-sm font-medium text-studio-text-secondary mb-2">Stupovi sadržaja</label>
                    <p className="text-xs text-studio-text-tertiary mb-3">Odaberite teme o kojima AI smije generirati sadržaj za vaš brand.</p>
                    <div className="flex flex-wrap gap-2">
                      {CONTENT_PILLARS.map(pillar => {
                        const isSelected = form.content_pillars.includes(pillar.name)
                        return (
                          <button
                            key={pillar.id}
                            type="button"
                            onClick={() => {
                              const pillars = isSelected
                                ? form.content_pillars.filter(p => p !== pillar.name)
                                : [...form.content_pillars, pillar.name]
                              updateField('content_pillars', pillars)
                            }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                              isSelected
                                ? 'bg-brand-accent text-white border-brand-accent shadow-sm'
                                : 'bg-studio-surface-0 text-studio-text-secondary border-studio-border hover:border-brand-accent/30 hover:bg-brand-accent/5'
                            }`}
                          >
                            {pillar.name}
                          </button>
                        )
                      })}

                      {/* Custom pillars (non-preset) shown as removable chips */}
                      {form.content_pillars
                        .filter(p => !CONTENT_PILLARS.some(cp => cp.name === p))
                        .map(customPillar => (
                          <span
                            key={customPillar}
                            className="inline-flex items-center gap-1 px-4 py-2 bg-brand-accent text-white rounded-full text-sm font-medium border border-brand-accent shadow-sm"
                          >
                            {customPillar}
                            <button
                              type="button"
                              onClick={() => updateField('content_pillars', form.content_pillars.filter(p => p !== customPillar))}
                              className="hover:text-red-200 transition-colors ml-0.5"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}

                      {/* Add custom pillar */}
                      {showCustomPillar ? (
                        <input
                          type="text"
                          value={customPillarInput}
                          onChange={e => setCustomPillarInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && customPillarInput.trim()) {
                              e.preventDefault()
                              if (!form.content_pillars.includes(customPillarInput.trim())) {
                                updateField('content_pillars', [...form.content_pillars, customPillarInput.trim()])
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
                            if (customPillarInput.trim()) {
                              if (!form.content_pillars.includes(customPillarInput.trim())) {
                                updateField('content_pillars', [...form.content_pillars, customPillarInput.trim()])
                              }
                            }
                            setCustomPillarInput('')
                            setShowCustomPillar(false)
                          }}
                          autoFocus
                          className="px-4 py-2 rounded-full text-sm border border-brand-accent/50 bg-studio-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-accent/10 w-40"
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
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---- STEP 3: Project ---- */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-studio-ai-purple/10 to-brand-accent/5 rounded-2xl p-6 border border-studio-ai-purple/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-studio-ai-purple/20 flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="w-6 h-6 text-studio-ai-purple" />
                  </div>
                  <div>
                    <h2 className="font-headline text-xl text-studio-text-primary mb-1">Imenujte svoj prvi projekt</h2>
                    <p className="text-sm text-studio-text-secondary leading-relaxed">
                      Projekti organiziraju kampanje, sadržaj i izvještaje. Svaki projekt može imati svoj AI kontekst.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-studio-surface-1 rounded-2xl p-6 border border-studio-border space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-studio-text-primary mb-1.5">
                    Naziv projekta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.project_name}
                    onChange={e => updateField('project_name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 ${
                      form.project_name.trim().length === 0 ? 'border-red-300' : 'border-studio-border'
                    }`}
                    placeholder="Npr. Q2 Kampanja, Lansiranje proizvoda..."
                  />
                  {form.project_name.trim().length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Naziv projekta je obavezan</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-studio-text-primary mb-1.5">Opis projekta</label>
                  <textarea
                    value={form.project_description}
                    onChange={e => updateField('project_description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 resize-none"
                    placeholder="Cilj projekta, vremenski okvir, specifičnosti..."
                  />
                </div>
              </div>

              {/* Summary card */}
              <div className="bg-studio-surface-1 rounded-2xl p-6 border border-studio-border">
                <h3 className="text-sm font-semibold text-studio-text-primary mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-brand-accent" />
                  Sažetak vašeg profila
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <SummaryItem
                    label="Opis biznisa"
                    value={form.business_description ? `${form.business_description.slice(0, 60)}...` : '—'}
                    ok={form.business_description.length >= 20}
                  />
                  <SummaryItem
                    label="Ciljna publika"
                    value={form.target_audience ? `${form.target_audience.slice(0, 60)}...` : '—'}
                    ok={form.target_audience.length > 0}
                  />
                  <SummaryItem
                    label="Ton"
                    value={TONES.find(t => t.value === form.tone_of_voice)?.label || '—'}
                    ok={!!form.tone_of_voice}
                  />
                  <SummaryItem
                    label="Mreže"
                    value={Object.values(form.social_handles).filter(Boolean).length + ' povezano'}
                    ok={Object.values(form.social_handles).filter(Boolean).length > 0}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-studio-text-secondary hover:text-studio-text-primary hover:bg-studio-surface-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              Natrag
            </button>

            {step === 0 ? (
              <button
                onClick={handleCreateOrganization}
                disabled={!canProceed() || loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-accent text-white hover:bg-brand-accent-hover transition-all disabled:opacity-50 shadow-md shadow-brand-accent/20"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Kreiram...
                  </>
                ) : (
                  <>
                    Dalje
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            ) : step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-accent text-white hover:bg-brand-accent-hover transition-all disabled:opacity-50 shadow-md shadow-brand-accent/20"
              >
                Dalje
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={loading || !canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-accent text-white hover:bg-brand-accent-hover transition-all disabled:opacity-50 shadow-md shadow-brand-accent/20"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                    Spremanje...
                  </>
                ) : (
                  <>
                    Pokreni AI
                    <Sparkles size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Helper components                                                   */
/* ------------------------------------------------------------------ */

function AnalyzingStep({ icon: Icon, text, delay }: { icon: typeof Brain; text: string; delay: number }) {
  const [visible, setVisible] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), delay)
    const t2 = setTimeout(() => setDone(true), delay + 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [delay])

  if (!visible) return <div className="h-10" />

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-500 ${
      done ? 'bg-brand-accent/10' : 'bg-studio-surface-1'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${
        done ? 'bg-brand-accent/20' : 'bg-studio-surface-2'
      }`}>
        {done ? (
          <Check size={14} className="text-brand-accent" />
        ) : (
          <Icon size={14} className="text-studio-text-tertiary animate-pulse" />
        )}
      </div>
      <span className={`text-sm transition-all duration-500 ${
        done ? 'text-brand-accent font-medium' : 'text-studio-text-secondary'
      }`}>
        {text}
      </span>
    </div>
  )
}

function SummaryItem({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-studio-surface-0">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        ok ? 'bg-brand-accent/20' : 'bg-studio-surface-2'
      }`}>
        {ok && <Check size={10} className="text-brand-accent" />}
      </div>
      <div>
        <span className="text-studio-text-tertiary block">{label}</span>
        <span className="text-studio-text-secondary">{value}</span>
      </div>
    </div>
  )
}
