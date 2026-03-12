import { useState, useEffect } from 'react'
import { Building2, Palette, Globe, Hash, MessageSquare, Sparkles, Save, Loader2, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
// import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import { useClient } from '../contexts/ClientContext'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'

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
  content_pillars: Array<{ id: string; name: string }> | null
  social_handles: Record<string, string> | null
  hashtags: string[] | null
  ai_system_prompt_override: string
}

export default function BrandProfile() {
  const { currentClient, isClientAdmin } = useClient()
  const { user } = useAuth()
  const canSeeAiOverride = isClientAdmin || user?.is_superadmin
  const [data, setData] = useState<BrandData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Depend on stable string, not unstable object reference
  const clientId = currentClient?.client_id

  useEffect(() => {
    if (!clientId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    api.get(`/api/v1/clients/${clientId}`)
      .then(res => { setData(res.data); setError(false) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [clientId])

  const handleSave = async () => {
    if (!data || !currentClient) return
    setSaving(true)
    try {
      await api.put(`/api/v1/clients/${currentClient.client_id}`, {
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
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save brand profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof BrandData, value: unknown) => {
    if (!data) return
    setData({ ...data, [field]: value })
  }

  if (!currentClient || loading) {
    return (
      <>
        <Header title="Profil klijenta" subtitle="Postavke klijenta i AI kontekst" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header title="Profil klijenta" subtitle="Postavke klijenta i AI kontekst" />
        <div className="p-8 text-center">
          <p className="text-studio-text-secondary mb-3">Nije moguće učitati podatke klijenta.</p>
          <button
            onClick={() => { setError(false); setLoading(true); api.get(`/api/v1/clients/${clientId}`).then(res => { setData(res.data); setError(false) }).catch(() => setError(true)).finally(() => setLoading(false)) }}
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

  return (
    <>
      <Header
        title="Profil klijenta"
        subtitle={data.name}
        actions={
          isClientAdmin ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-brand-primary rounded-xl text-sm font-bold hover:bg-brand-accent/90 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saved ? 'Spremljeno!' : 'Spremi'}
            </button>
          ) : null
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
        {/* AI Context Status Banner */}
        {!data.business_description && !data.product_info ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-studio-text-primary mb-1">AI kontekst nije postavljen</h3>
              <p className="text-sm text-studio-text-secondary mb-3">
                Opišite svoj posao i proizvode kako bi AI mogao generirati kampanje, sadržaj i analize prilagođene vašem brendu.
              </p>
              {isClientAdmin && (
                <p className="text-xs text-amber-400 font-medium">Ispunite polja ispod za aktivaciju AI konteksta.</p>
              )}
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

        {/* Basic Info */}
        <div className={cardCls}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand-accent" />
            </div>
            <div>
              <h3 className="text-base font-bold text-studio-text-primary">Osnovni podaci</h3>
              <p className="text-xs text-studio-text-tertiary">Ime klijenta i opis poslovanja</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Ime klijenta</label>
              <input className={inputCls} value={data.name} onChange={e => update('name', e.target.value)} disabled={!isClientAdmin} />
            </div>
            <div>
              <label className={labelCls}>Opis poslovanja</label>
              <textarea className={`${inputCls} min-h-[100px]`} value={data.business_description} onChange={e => update('business_description', e.target.value)} disabled={!isClientAdmin} placeholder="Opisi cime se tvoja firma bavi..." />
            </div>
            <div>
              <label className={labelCls}>Proizvodi / Usluge</label>
              <textarea className={`${inputCls} min-h-[80px]`} value={data.product_info} onChange={e => update('product_info', e.target.value)} disabled={!isClientAdmin} placeholder="Koji su tvoji glavni proizvodi ili usluge?" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Web stranica</label>
                <input className={inputCls} value={data.website_url} onChange={e => update('website_url', e.target.value)} disabled={!isClientAdmin} placeholder="https://..." />
              </div>
              <div>
                <label className={labelCls}>Logo URL</label>
                <input className={inputCls} value={data.logo_url} onChange={e => update('logo_url', e.target.value)} disabled={!isClientAdmin} />
              </div>
            </div>
          </div>
        </div>

        {/* Tone & Audience */}
        <div className={cardCls}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-studio-text-primary">Ton i Publika</h3>
              <p className="text-xs text-studio-text-tertiary">Kako komunicirate i kome se obracate</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Ton komunikacije</label>
              <input className={inputCls} value={data.tone_of_voice} onChange={e => update('tone_of_voice', e.target.value)} disabled={!isClientAdmin} placeholder="npr. Profesionalan, moderan, pristupacan" />
            </div>
            <div>
              <label className={labelCls}>Ciljna publika</label>
              <textarea className={`${inputCls} min-h-[80px]`} value={data.target_audience} onChange={e => update('target_audience', e.target.value)} disabled={!isClientAdmin} placeholder="Tko su tvoji idealni kupci?" />
            </div>
          </div>
        </div>

        {/* Visual Identity */}
        <div className={cardCls}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-studio-text-primary">Vizualni identitet</h3>
              <p className="text-xs text-studio-text-tertiary">Boje branda</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(data.brand_colors || {}).map(([key, val]) => (
              <div key={key}>
                <label className={labelCls}>{key}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={val}
                    onChange={e => update('brand_colors', { ...data.brand_colors, [key]: e.target.value })}
                    disabled={!isClientAdmin}
                    className="w-10 h-10 rounded-lg border border-studio-border cursor-pointer"
                  />
                  <input className={inputCls} value={val} onChange={e => update('brand_colors', { ...data.brand_colors, [key]: e.target.value })} disabled={!isClientAdmin} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Languages & Social */}
        <div className={cardCls}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-studio-text-primary">Jezici i Mreze</h3>
              <p className="text-xs text-studio-text-tertiary">Podrzani jezici i drustvene mreze</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Jezici (razdvojeni zarezom)</label>
              <input className={inputCls} value={(data.languages || []).join(', ')} onChange={e => update('languages', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} disabled={!isClientAdmin} placeholder="hr, en, de" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(data.social_handles || {}).map(([platform, handle]) => (
                <div key={platform}>
                  <label className={labelCls}>{platform}</label>
                  <input className={inputCls} value={handle} onChange={e => update('social_handles', { ...data.social_handles, [platform]: e.target.value })} disabled={!isClientAdmin} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hashtags */}
        <div className={cardCls}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-studio-text-primary">Hashtagovi</h3>
              <p className="text-xs text-studio-text-tertiary">Brand hashtagovi za sadrzaj</p>
            </div>
          </div>
          <div>
            <label className={labelCls}>Hashtagovi (razdvojeni zarezom)</label>
            <input className={inputCls} value={(data.hashtags || []).join(', ')} onChange={e => update('hashtags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} disabled={!isClientAdmin} placeholder="#MojBrand, #Inovacija" />
          </div>
        </div>

        {/* AI Override — only visible to admin+ */}
        {canSeeAiOverride ? (
          <div className={cardCls}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-brand-accent" />
              </div>
              <div>
                <h3 className="text-base font-bold text-studio-text-primary">AI System Prompt Override</h3>
                <p className="text-xs text-studio-text-tertiary">Opcionalno: potpuno custom AI prompt za ovog klijenta</p>
              </div>
              <span className="ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 flex items-center gap-1">
                <ShieldAlert size={10} />
                Samo admin
              </span>
            </div>
            <div>
              <label className={labelCls}>Custom system prompt (ostavi prazno za automatski)</label>
              <textarea
                className={`${inputCls} min-h-[150px] font-mono text-xs`}
                value={data.ai_system_prompt_override}
                onChange={e => update('ai_system_prompt_override', e.target.value)}
                disabled={!isClientAdmin}
                placeholder="Ti si AI asistent za brand [ime]. Tvoj zadatak je..."
              />
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
