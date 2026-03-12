import { useState, useEffect } from 'react'
import {
  Brain, Palette, FolderKanban, ChevronRight, ChevronLeft, Check,
  Sparkles, Zap, BarChart3, MessageSquare,
} from 'lucide-react'
import api from '../api/client'
import { useClient } from '../contexts/ClientContext'

/* ------------------------------------------------------------------ */
/*  3-step AI-focused onboarding wizard                                */
/* ------------------------------------------------------------------ */

const STEPS = [
  { label: 'Nahrani AI', icon: Brain },
  { label: 'Identitet', icon: Palette },
  { label: 'Projekt', icon: FolderKanban },
]

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
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const { currentClient } = useClient()

  const [form, setForm] = useState<FormData>({
    business_description: '',
    product_info: '',
    target_audience: '',
    tone_of_voice: '',
    website_url: '',
    brand_colors: ['#0A1A28', '#B8FF00', '#0057A8'],
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

  const handleFinish = async () => {
    if (!currentClient) return
    setLoading(true)
    setError('')

    try {
      // 1. Save brand profile
      await api.put(`/clients/${currentClient.client_id}`, {
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
      await api.post(`/clients/${currentClient.client_id}/onboarding/complete`, {})

      // 3. Create named project if user specified one
      if (form.project_name.trim() && form.project_name.trim().toLowerCase() !== 'default') {
        const slug = form.project_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        await api.post('/projects/', {
          name: form.project_name.trim(),
          slug: slug || 'projekt-1',
          description: form.project_description,
        })
      }

      // 4. Show "AI analyzing" magic moment
      setLoading(false)
      setAnalyzing(true)

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Greška pri spremanju. Pokušajte ponovno.')
      setLoading(false)
    }
  }

  // AI analyzing → redirect after delay
  useEffect(() => {
    if (!analyzing) return
    const timer = setTimeout(() => {
      window.location.href = '/brand-profile'
    }, 3000)
    return () => clearTimeout(timer)
  }, [analyzing])

  const canProceed = () => {
    switch (step) {
      case 0: return form.business_description.trim().length >= 20
      case 1: return true
      case 2: return true
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
      {/* Header with client name + progress */}
      <div className="bg-studio-surface-1 border-b border-studio-border px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center">
                <span className="font-headline text-xs text-brand-primary font-bold">
                  {currentClient?.client_name?.charAt(0)?.toUpperCase() || 'S'}
                </span>
              </div>
              <div>
                <h1 className="font-headline text-lg text-studio-text-primary font-bold leading-tight">
                  {currentClient?.client_name || 'Postavljanje'}
                </h1>
                <p className="text-xs text-studio-text-tertiary">Postavljanje profila</p>
              </div>
            </div>
            <span className="text-sm text-studio-text-tertiary font-mono">{step + 1} / {STEPS.length}</span>
          </div>

          {/* Step tabs */}
          <div className="flex gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <button
                  key={i}
                  onClick={() => i < step && setStep(i)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    i === step
                      ? 'bg-brand-accent text-brand-primary'
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

          {/* ---- STEP 1: Nahrani AI ---- */}
          {step === 0 && (
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
                            ? 'bg-brand-accent text-brand-primary ring-2 ring-brand-accent/30'
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
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-studio-surface-1 rounded-2xl p-6 border border-studio-border">
                <h2 className="font-headline text-xl text-studio-text-primary mb-1">Vizualni identitet</h2>
                <p className="text-sm text-studio-text-tertiary mb-5">Boje, logo i jezici vašeg brenda.</p>

                <div className="space-y-5">
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

                  <div>
                    <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Logo URL</label>
                    <input
                      type="url"
                      value={form.logo_url}
                      onChange={e => updateField('logo_url', e.target.value)}
                      className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

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
                              ? 'bg-brand-accent text-brand-primary'
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

              <div className="bg-studio-surface-1 rounded-2xl p-6 border border-studio-border">
                <h2 className="font-headline text-xl text-studio-text-primary mb-1">Društvene mreže</h2>
                <p className="text-sm text-studio-text-tertiary mb-5">Vaši profili i strategija sadržaja.</p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {(['instagram', 'facebook', 'twitter', 'linkedin'] as const).map(platform => (
                      <div key={platform}>
                        <label className="block text-sm font-medium text-studio-text-secondary mb-1.5 capitalize">{platform}</label>
                        <input
                          type="text"
                          value={form.social_handles[platform] || ''}
                          onChange={e => updateField('social_handles', { ...form.social_handles, [platform]: e.target.value })}
                          className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                          placeholder={`@vaš_${platform}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">
                      Hashtags <span className="text-studio-text-tertiary font-normal">(razdvojeno zarezom)</span>
                    </label>
                    <input
                      type="text"
                      value={form.hashtags.join(', ')}
                      onChange={e => updateField('hashtags', e.target.value.split(',').map(h => h.trim()).filter(Boolean))}
                      className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                      placeholder="#brand, #marketing, #digital"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">
                      Stupovi sadržaja <span className="text-studio-text-tertiary font-normal">(razdvojeno zarezom)</span>
                    </label>
                    <input
                      type="text"
                      value={form.content_pillars.join(', ')}
                      onChange={e => updateField('content_pillars', e.target.value.split(',').map(p => p.trim()).filter(Boolean))}
                      className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                      placeholder="Edukacija, Inspiracija, Produkt, Zabava"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---- STEP 3: Project ---- */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-studio-ai-purple/10 to-brand-accent/5 rounded-2xl p-6 border border-studio-ai-purple/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-studio-ai-purple/20 flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="w-6 h-6 text-studio-ai-purple" />
                  </div>
                  <div>
                    <h2 className="font-headline text-xl text-studio-text-primary mb-1">Kreirajte prvi projekt</h2>
                    <p className="text-sm text-studio-text-secondary leading-relaxed">
                      Projekti organiziraju kampanje, sadržaj i izvještaje. Svaki projekt može imati svoj AI kontekst.
                      <br />
                      <span className="text-studio-text-tertiary">Možete preskočiti ovaj korak — koristit ćete "Default" projekt.</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-studio-surface-1 rounded-2xl p-6 border border-studio-border space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-studio-text-primary mb-1.5">Naziv projekta</label>
                  <input
                    type="text"
                    value={form.project_name}
                    onChange={e => updateField('project_name', e.target.value)}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                    placeholder="Npr. Q1 2026 Kampanja, Lansiranje proizvoda, Božićna kampanja..."
                  />
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

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-accent text-brand-primary hover:bg-brand-accent-hover transition-all disabled:opacity-50 shadow-md shadow-brand-accent/20"
              >
                Dalje
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-accent text-brand-primary hover:bg-brand-accent-hover transition-all disabled:opacity-50 shadow-md shadow-brand-accent/20"
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
