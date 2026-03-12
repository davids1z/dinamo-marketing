import { useState } from 'react'
import { Briefcase, Palette, Users, Share2, FolderKanban, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import api from '../api/client'
import { useClient } from '../contexts/ClientContext'

const STEPS = [
  { label: 'Posao', icon: Briefcase },
  { label: 'Brand', icon: Palette },
  { label: 'Publika', icon: Users },
  { label: 'Mreže', icon: Share2 },
  { label: 'Projekt', icon: FolderKanban },
]

interface FormData {
  // Step 1: Business
  business_description: string
  product_info: string
  website_url: string
  // Step 2: Brand
  brand_colors: string[]
  brand_fonts: string
  logo_url: string
  // Step 3: Audience
  tone_of_voice: string
  target_audience: string
  languages: string[]
  // Step 4: Social
  social_handles: Record<string, string>
  hashtags: string[]
  content_pillars: string[]
  // Step 5: Project
  project_name: string
  project_description: string
}

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { currentClient } = useClient()

  const [form, setForm] = useState<FormData>({
    business_description: '',
    product_info: '',
    website_url: '',
    brand_colors: ['#0A1A28', '#B8FF00', '#0057A8'],
    brand_fonts: '',
    logo_url: '',
    tone_of_voice: '',
    target_audience: '',
    languages: ['hr'],
    social_handles: { instagram: '', facebook: '', twitter: '', linkedin: '' },
    hashtags: [],
    content_pillars: [],
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
        brand_fonts: form.brand_fonts,
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

      // Redirect to dashboard — force full reload to refresh auth context
      window.location.href = '/'
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Greška pri spremanju')
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 0: return form.business_description.trim().length > 10
      case 1: return true // optional
      case 2: return form.tone_of_voice.trim().length > 0
      case 3: return true // optional
      case 4: return true // project name optional
      default: return true
    }
  }

  return (
    <div className="min-h-screen bg-studio-base flex flex-col">
      {/* Progress bar */}
      <div className="bg-studio-surface-1 border-b border-studio-border px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-headline text-xl text-studio-text-primary font-bold">Postavljanje profila</h1>
            <span className="text-sm text-studio-text-tertiary">{step + 1} / {STEPS.length}</span>
          </div>
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
                  {i < step ? (
                    <Check size={16} />
                  ) : (
                    <Icon size={16} />
                  )}
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
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="bg-studio-surface-1 rounded-2xl p-8 border border-studio-border">
            {/* Step 1: Business */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-headline text-xl text-studio-text-primary mb-1">Opišite svoj posao</h2>
                  <p className="text-sm text-studio-text-tertiary">AI koristi ove informacije za kreiranje sadržaja prilagođenog vašem brendu.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Opis poslovanja *</label>
                  <textarea
                    value={form.business_description}
                    onChange={e => updateField('business_description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 resize-none"
                    placeholder="Npr. Digitalna marketing agencija specijalizirana za e-commerce brendove..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Proizvodi / Usluge</label>
                  <textarea
                    value={form.product_info}
                    onChange={e => updateField('product_info', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 resize-none"
                    placeholder="Što nudite klijentima / kupcima?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Web stranica</label>
                  <input
                    type="url"
                    value={form.website_url}
                    onChange={e => updateField('website_url', e.target.value)}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Brand */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-headline text-xl text-studio-text-primary mb-1">Vizualni identitet</h2>
                  <p className="text-sm text-studio-text-tertiary">Boje, fontovi i logo vašeg brenda.</p>
                </div>
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
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Fontovi</label>
                  <input
                    type="text"
                    value={form.brand_fonts}
                    onChange={e => updateField('brand_fonts', e.target.value)}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                    placeholder="Npr. Inter, Montserrat..."
                  />
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
              </div>
            )}

            {/* Step 3: Audience */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-headline text-xl text-studio-text-primary mb-1">Publika i ton komunikacije</h2>
                  <p className="text-sm text-studio-text-tertiary">Kako komunicirate i kome se obraćate.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Ton komunikacije *</label>
                  <select
                    value={form.tone_of_voice}
                    onChange={e => updateField('tone_of_voice', e.target.value)}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                  >
                    <option value="">Odaberite ton...</option>
                    <option value="professional">Profesionalan</option>
                    <option value="friendly">Prijateljski</option>
                    <option value="bold">Hrabar i direktan</option>
                    <option value="creative">Kreativan</option>
                    <option value="formal">Formalan</option>
                    <option value="casual">Opušten</option>
                    <option value="inspirational">Inspirativan</option>
                    <option value="humorous">Humorističan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Ciljna publika</label>
                  <textarea
                    value={form.target_audience}
                    onChange={e => updateField('target_audience', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 resize-none"
                    placeholder="Npr. Mladi poduzetnici 25-40, zainteresirani za digital marketing..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-studio-text-secondary mb-2">Jezici sadržaja</label>
                  <div className="flex flex-wrap gap-2">
                    {['hr', 'en', 'de', 'it', 'sl'].map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          const langs = form.languages.includes(lang)
                            ? form.languages.filter(l => l !== lang)
                            : [...form.languages, lang]
                          updateField('languages', langs)
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          form.languages.includes(lang)
                            ? 'bg-brand-accent text-brand-primary'
                            : 'bg-studio-surface-2 text-studio-text-secondary hover:bg-studio-surface-3'
                        }`}
                      >
                        {{ hr: 'Hrvatski', en: 'English', de: 'Deutsch', it: 'Italiano', sl: 'Slovenščina' }[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Social */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-headline text-xl text-studio-text-primary mb-1">Društvene mreže</h2>
                  <p className="text-sm text-studio-text-tertiary">Vaši profili i strategija sadržaja.</p>
                </div>
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
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Hashtags (razdvojeno zarezom)</label>
                  <input
                    type="text"
                    value={form.hashtags.join(', ')}
                    onChange={e => updateField('hashtags', e.target.value.split(',').map(h => h.trim()).filter(Boolean))}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                    placeholder="#brand, #marketing, #digital"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Stupovi sadržaja (razdvojeno zarezom)</label>
                  <input
                    type="text"
                    value={form.content_pillars.join(', ')}
                    onChange={e => updateField('content_pillars', e.target.value.split(',').map(p => p.trim()).filter(Boolean))}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                    placeholder="Edukacija, Inspiracija, Produkt, Zabava"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Project */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-headline text-xl text-studio-text-primary mb-1">Kreirajte prvi projekt</h2>
                  <p className="text-sm text-studio-text-tertiary">Projekti organiziraju kampanje, sadržaj i izvještaje. Možete preskočiti i koristiti Default projekt.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Naziv projekta</label>
                  <input
                    type="text"
                    value={form.project_name}
                    onChange={e => updateField('project_name', e.target.value)}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0"
                    placeholder="Npr. Q1 2026 Kampanja, Lansiranje proizvoda..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Opis projekta</label>
                  <textarea
                    value={form.project_description}
                    onChange={e => updateField('project_description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 resize-none"
                    placeholder="Kratki opis projekta..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
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
                {loading ? 'Spremanje...' : 'Završi postavljanje'}
                <Check size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
