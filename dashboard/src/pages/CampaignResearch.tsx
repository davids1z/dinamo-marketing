import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Upload, FileText, Search, Sparkles, Loader2, CheckCircle2,
  XCircle, Clock, Trash2, Globe, Target,
  Calendar, DollarSign, AlertTriangle, TrendingUp, ExternalLink,
  Zap, Megaphone, Eye, MousePointerClick, ArrowRight,
  Copy, BarChart3, Lightbulb, ShieldAlert, ChevronDown, ChevronUp,
} from 'lucide-react'
import Header from '../components/layout/Header'
import { campaignResearchApi, type CampaignResearchItem } from '../api/campaignResearch'

/* ─────────── Constants ─────────── */

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Loader2; color: string; bg: string; step: number }> = {
  uploaded:    { label: 'Učitano — čeka analizu', icon: Clock, color: 'text-studio-text-secondary', bg: 'bg-studio-surface-1', step: 0 },
  analyzing:   { label: 'Faza 1/3 — Analiziranje briefa...', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', step: 1 },
  researching: { label: 'Faza 2/3 — Istraživanje interneta...', icon: Globe, color: 'text-purple-400', bg: 'bg-purple-500/10', step: 2 },
  generating:  { label: 'Faza 3/3 — Generiranje plana...', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10', step: 3 },
  complete:    { label: 'Analiza gotova', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', step: 4 },
  failed:      { label: 'Greška u analizi', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', step: 0 },
}

const CAMPAIGN_TYPES: Record<string, { label: string; emoji: string }> = {
  product_launch:   { label: 'Lansiranje proizvoda', emoji: '🚀' },
  brand_awareness:  { label: 'Svijest o brendu', emoji: '📣' },
  seasonal:         { label: 'Sezonska kampanja', emoji: '🎄' },
  lead_generation:  { label: 'Prikupljanje leadova', emoji: '🎯' },
  event:            { label: 'Event / Događaj', emoji: '🎪' },
  social_media:     { label: 'Social Media', emoji: '📱' },
  content:          { label: 'Content Marketing', emoji: '✍️' },
  email:            { label: 'Email Marketing', emoji: '📧' },
  influencer:       { label: 'Influencer', emoji: '⭐' },
  other:            { label: 'Ostalo', emoji: '📋' },
  // Legacy types (backward compatibility)
  matchday:         { label: 'Event kampanja', emoji: '🎪' },
  transfer:         { label: 'Lansiranje', emoji: '🚀' },
  season_ticket:    { label: 'Pretplata', emoji: '🎫' },
  merchandise:      { label: 'Proizvod', emoji: '🛍️' },
  sponsor:          { label: 'Partnerstvo', emoji: '🤝' },
  academy:          { label: 'Edukacija', emoji: '🎓' },
  diaspora:         { label: 'Dijaspora', emoji: '🌍' },
  european:         { label: 'Međunarodna', emoji: '🏆' },
  community:        { label: 'Zajednica', emoji: '🤗' },
}

const BUDGET_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  instagram_ads: 'Instagram Ads',
  tiktok_ads: 'TikTok Ads',
  google_ads: 'Google Ads',
  youtube_ads: 'YouTube Ads',
  facebook_ads: 'Facebook Ads',
  influencer: 'Influenceri',
  content_production: 'Produkcija',
  production: 'Produkcija',
}

const BUDGET_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
  'bg-amber-500', 'bg-emerald-500', 'bg-cyan-500',
]

const PLATFORM_BADGE: Record<string, { bg: string; label: string }> = {
  instagram: { bg: 'bg-gradient-to-br from-purple-600 to-pink-500', label: 'IG' },
  tiktok: { bg: 'bg-black', label: 'TT' },
  youtube: { bg: 'bg-red-600', label: 'YT' },
  facebook: { bg: 'bg-blue-600', label: 'FB' },
  linkedin: { bg: 'bg-blue-700', label: 'LI' },
}

const PLACEHOLDER_HINTS = `Primjeri što možete napisati:

• "Želim prodati 1000 komada novog proizvoda do kraja mjeseca. Budžet: 2000€."
• "Pokrenuti awareness kampanju za lansiranje nove usluge u HR i DE tržištu."
• "Povećati broj pratitelja na Instagramu za 30% u 6 tjedana."
• "Organiziramo event 15. travnja — treba nam kompletna promo strategija."

AI će analizirati vaš brief, istražiti trendove na internetu i generirati kompletan marketing plan s budžetom, kalendarom sadržaja i prijedlozima oglasa.`

/* ─────────── Helpers ─────────── */

function getCampaignType(type: string | null): { label: string; emoji: string } {
  if (!type) return { label: 'Nepoznato', emoji: '📋' }
  return CAMPAIGN_TYPES[type] ?? { label: type, emoji: '📋' }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

/* ─────────── Processing Steps Indicator ─────────── */

function ProcessingSteps({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: 'Analiza briefa', done: currentStep > 1, active: currentStep === 1 },
    { label: 'Web istraživanje', done: currentStep > 2, active: currentStep === 2 },
    { label: 'Generiranje plana', done: currentStep > 3, active: currentStep === 3 },
  ]

  return (
    <div className="flex items-center gap-2 w-full">
      {steps.map((step, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
            step.done ? 'bg-emerald-500/20' :
            step.active ? 'bg-white/10' :
            'bg-studio-surface-2'
          }`}>
            {step.done ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : step.active ? (
              <Loader2 size={18} className="text-brand-accent animate-spin" />
            ) : (
              <span className="text-xs font-bold text-studio-text-disabled">{idx + 1}</span>
            )}
          </div>
          <span className={`text-[10px] font-medium text-center ${
            step.done ? 'text-emerald-400' :
            step.active ? 'text-studio-text-primary' :
            'text-studio-text-disabled'
          }`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─────────── Predicted Results Card ─────────── */

function PredictedResults({ results }: { results: Record<string, any> }) {
  const metrics = [
    { key: 'estimated_reach', label: 'Očekivani doseg', icon: Eye, color: 'text-blue-400' },
    { key: 'estimated_engagement_rate', label: 'Stopa angažmana', icon: TrendingUp, color: 'text-emerald-400' },
    { key: 'estimated_conversions', label: 'Konverzije', icon: MousePointerClick, color: 'text-purple-400' },
    { key: 'estimated_ctr', label: 'CTR', icon: Target, color: 'text-amber-400' },
    { key: 'estimated_roas', label: 'ROAS', icon: DollarSign, color: 'text-green-400' },
  ]

  const confidenceMap: Record<string, { label: string; color: string }> = {
    high: { label: 'Visoka pouzdanost', color: 'text-emerald-400 bg-emerald-500/10' },
    medium: { label: 'Srednja pouzdanost', color: 'text-amber-400 bg-amber-500/10' },
    low: { label: 'Niska pouzdanost', color: 'text-red-400 bg-red-500/10' },
  }

  const defaultConf = { label: 'Srednja pouzdanost', color: 'text-amber-400 bg-amber-500/10' }
  const conf = confidenceMap[results.confidence as string] ?? defaultConf

  return (
    <div className="card border border-brand-accent/15 bg-gradient-to-br from-brand-accent/5 to-transparent">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-headline text-sm tracking-wider text-studio-text-primary font-bold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-accent" />
          PREDVIĐENI REZULTATI
        </h3>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${conf.color}`}>
          {conf.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {metrics.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-studio-surface-0 rounded-xl p-3 border border-studio-border-subtle text-center">
            <Icon size={16} className={`${color} mx-auto mb-1.5`} />
            <p className="text-lg font-stats text-studio-text-primary">{results[key] || '—'}</p>
            <p className="text-[10px] text-studio-text-tertiary mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {results.reasoning && (
        <div className="bg-studio-surface-0 rounded-xl p-3 border border-studio-border-subtle">
          <div className="flex items-start gap-2">
            <Lightbulb size={14} className="text-brand-accent flex-shrink-0 mt-0.5" />
            <p className="text-xs text-studio-text-secondary leading-relaxed">{results.reasoning}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────── Ad Hooks Section ─────────── */

function AdHooksSection({ hooks }: { hooks: Array<Record<string, string>> }) {
  if (!hooks?.length) return null

  return (
    <div className="card">
      <h3 className="font-headline text-sm tracking-wider text-studio-text-primary font-bold mb-4 flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-pink-400" />
        PRIJEDLOZI OGLASA
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {hooks.map((hook, idx) => {
          const platKey = hook.platform || ''
          const plat = PLATFORM_BADGE[platKey] ?? { bg: 'bg-gray-600', label: platKey.slice(0, 2).toUpperCase() || '??' }
          return (
            <div key={idx} className="bg-studio-surface-0 rounded-xl border border-studio-border-subtle overflow-hidden group">
              <div className={`${plat.bg} px-4 py-2 flex items-center justify-between`}>
                <span className="text-white text-xs font-bold uppercase tracking-wider">{plat.label}</span>
                <button
                  onClick={() => copyToClipboard(`${hook.headline}\n\n${hook.body}\n\n${hook.cta}`)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all"
                  title="Kopiraj tekst"
                >
                  <Copy size={12} className="text-white/80" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-sm font-bold text-studio-text-primary">{hook.headline}</p>
                <p className="text-xs text-studio-text-secondary leading-relaxed">{hook.body}</p>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-accent bg-brand-accent/10 px-2.5 py-1 rounded-full">
                    <ArrowRight size={10} />
                    {hook.cta}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────── Budget Allocation Visual ─────────── */

function BudgetAllocation({ allocation }: { allocation: Record<string, string> }) {
  const entries = Object.entries(allocation)

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="h-6 rounded-full overflow-hidden flex">
        {entries.map(([key, val], idx) => {
          const pct = parseFloat(val)
          if (isNaN(pct) || pct <= 0) return null
          return (
            <div
              key={key}
              className={`${BUDGET_COLORS[idx % BUDGET_COLORS.length]} transition-all duration-700 first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${pct}%` }}
              title={`${BUDGET_LABELS[key] || key}: ${val}`}
            />
          )
        })}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {entries.map(([key, val], idx) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${BUDGET_COLORS[idx % BUDGET_COLORS.length]}`} />
            <span className="text-xs text-studio-text-secondary">{BUDGET_LABELS[key] || key.replace(/_/g, ' ')}</span>
            <span className="text-xs font-bold text-studio-text-primary ml-auto">{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function CampaignResearch() {
  const [campaigns, setCampaigns] = useState<CampaignResearchItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<CampaignResearchItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showCalendar, setShowCalendar] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load campaigns list
  const loadCampaigns = useCallback(async () => {
    try {
      const { data } = await campaignResearchApi.list()
      setCampaigns(data)
    } catch (err) {
      console.error('Failed to load campaigns', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  // Load selected campaign details
  const loadCampaign = useCallback(async (id: string) => {
    try {
      const { data } = await campaignResearchApi.get(id)
      setSelected(data)
      return data
    } catch (err) {
      console.error('Failed to load campaign', err)
      return null
    }
  }, [])

  // Poll for status updates
  useEffect(() => {
    if (!selectedId) return

    const poll = async () => {
      const data = await loadCampaign(selectedId)
      if (data && (data.status === 'complete' || data.status === 'failed')) {
        if (pollRef.current) clearInterval(pollRef.current)
        loadCampaigns()
      }
    }

    poll()
    pollRef.current = setInterval(poll, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [selectedId, loadCampaign, loadCampaigns])

  // Handle file upload
  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', file.name.replace(/\.[^/.]+$/, ''))
      const { data } = await campaignResearchApi.upload(fd)
      setSelectedId(data.id)
      await loadCampaigns()
    } catch (err) {
      console.error('Upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  // Handle text submit
  const handleTextSubmit = async () => {
    if (!textInput.trim()) return
    setUploading(true)
    try {
      const { data } = await campaignResearchApi.uploadText(textInput.trim())
      setSelectedId(data.id)
      setTextInput('')
      await loadCampaigns()
    } catch (err) {
      console.error('Text submit failed', err)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await campaignResearchApi.delete(id)
      if (selectedId === id) {
        setSelectedId(null)
        setSelected(null)
      }
      loadCampaigns()
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  // Render the detail/plan view
  const renderDetail = () => {
    if (!selected) return null

    const defaultStatus = { label: 'Učitano', icon: Clock, color: 'text-studio-text-secondary', bg: 'bg-studio-surface-1', step: 0 }
    const statusCfg = STATUS_CONFIG[selected.status] ?? defaultStatus
    const StatusIcon = statusCfg.icon
    const isProcessing = ['analyzing', 'researching', 'generating'].includes(selected.status)
    const plan = selected.generated_plan as Record<string, any> | null

    return (
      <div className="space-y-5">
        {/* Status Banner with Steps */}
        <div className={`${statusCfg.bg} border border-studio-border rounded-2xl p-5`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-11 h-11 rounded-xl ${statusCfg.bg} flex items-center justify-center`}>
              <StatusIcon className={`w-5 h-5 ${statusCfg.color} ${isProcessing ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${statusCfg.color}`}>{statusCfg.label}</p>
              <p className="text-xs text-studio-text-tertiary mt-0.5">{selected.title}</p>
            </div>
            {selected.status === 'complete' && (
              <button className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-brand-dark rounded-xl text-xs font-semibold hover:bg-brand-accent/90 transition-colors">
                <Calendar size={14} />
                Prebaci u kalendar
              </button>
            )}
          </div>
          {isProcessing && <ProcessingSteps currentStep={statusCfg.step} />}
        </div>

        {/* Error */}
        {selected.status === 'failed' && selected.error_message && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-400">Greška u istraživanju</p>
              <p className="text-xs text-red-400/80 mt-1">{selected.error_message}</p>
            </div>
          </div>
        )}

        {/* Predicted Results */}
        {plan?.predicted_results && <PredictedResults results={plan.predicted_results} />}

        {/* Executive Summary */}
        {plan?.executive_summary && (
          <div className="card border border-brand-accent/15 bg-gradient-to-r from-brand-accent/5 to-transparent">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                <Zap size={20} className="text-brand-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">AI strategija</span>
                  <span className="text-studio-text-tertiary">&middot;</span>
                  <span className="text-xs text-studio-text-tertiary">{plan.plan_title || 'Marketing Plan'}</span>
                </div>
                <p className="text-sm text-studio-text-secondary leading-relaxed">{plan.executive_summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Brief Section */}
        {selected.extracted_brief && (
          <div className="card">
            <h3 className="font-headline text-sm tracking-wider text-studio-text-primary font-bold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              ANALIZA BRIEFA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selected.extracted_brief.campaign_type && (
                <div className="bg-studio-surface-0 rounded-xl p-3 border border-studio-border-subtle">
                  <p className="text-[10px] uppercase tracking-wider text-studio-text-tertiary mb-1">Tip kampanje</p>
                  <p className="text-sm font-semibold text-studio-text-primary flex items-center gap-2">
                    <span>{getCampaignType(selected.extracted_brief.campaign_type).emoji}</span>
                    {getCampaignType(selected.extracted_brief.campaign_type).label}
                  </p>
                </div>
              )}
              {selected.extracted_brief.timeline && (
                <div className="bg-studio-surface-0 rounded-xl p-3 border border-studio-border-subtle">
                  <p className="text-[10px] uppercase tracking-wider text-studio-text-tertiary mb-1">Trajanje</p>
                  <p className="text-sm font-semibold text-studio-text-primary flex items-center gap-2">
                    <Clock size={14} className="text-studio-text-tertiary" />
                    {selected.extracted_brief.timeline}
                  </p>
                </div>
              )}
              {selected.extracted_brief.objectives?.length > 0 && (
                <div className="bg-studio-surface-0 rounded-xl p-3 md:col-span-2 border border-studio-border-subtle">
                  <p className="text-[10px] uppercase tracking-wider text-studio-text-tertiary mb-2">Ciljevi</p>
                  <ul className="space-y-1.5">
                    {selected.extracted_brief.objectives.map((obj: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-studio-text-secondary">
                        <Target className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.extracted_brief.target_audience?.length > 0 && (
                <div className="bg-studio-surface-0 rounded-xl p-3 md:col-span-2 border border-studio-border-subtle">
                  <p className="text-[10px] uppercase tracking-wider text-studio-text-tertiary mb-2">Ciljna publika</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.extracted_brief.target_audience.map((a: string, i: number) => (
                      <span key={i} className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded-full">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {selected.extracted_brief.summary && (
                <div className="bg-studio-surface-0 rounded-xl p-3 md:col-span-2 border border-studio-border-subtle">
                  <p className="text-[10px] uppercase tracking-wider text-studio-text-tertiary mb-1">Sažetak</p>
                  <p className="text-sm text-studio-text-secondary leading-relaxed">{selected.extracted_brief.summary}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Strategy */}
        {plan?.strategy && (
          <div className="card">
            <h3 className="font-headline text-sm tracking-wider text-studio-text-primary font-bold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              STRATEGIJA
            </h3>
            <p className="text-sm text-studio-text-secondary mb-4 leading-relaxed">{plan.strategy.approach}</p>

            {plan.strategy.key_differentiators?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {plan.strategy.key_differentiators.map((diff: string, i: number) => (
                  <div key={i} className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 text-center">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-sm font-bold text-emerald-400">{i + 1}</span>
                    </div>
                    <p className="text-xs text-studio-text-secondary leading-relaxed">{diff}</p>
                  </div>
                ))}
              </div>
            )}

            {plan.strategy.success_metrics?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {plan.strategy.success_metrics.map((m: string, i: number) => (
                  <span
                    key={i}
                    className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
                  >
                    <TrendingUp className="w-3 h-3" /> {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ad Hooks */}
        {plan?.ad_hooks && <AdHooksSection hooks={plan.ad_hooks} />}

        {/* Budget Allocation */}
        {plan?.budget_allocation && (
          <div className="card">
            <h3 className="font-headline text-sm tracking-wider text-studio-text-primary font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" /> RASPODJELA BUDŽETA
            </h3>
            <BudgetAllocation allocation={plan.budget_allocation} />
          </div>
        )}

        {/* Research Section */}
        {selected.research_data && (
          <div className="card">
            <h3 className="font-headline text-sm tracking-wider text-studio-text-primary font-bold mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              REZULTATI WEB ISTRAŽIVANJA
              <span className="text-xs font-normal text-studio-text-tertiary ml-auto">
                {selected.research_data.total_sources} izvora
              </span>
            </h3>
            {selected.research_data.summary && (
              <p className="text-sm text-studio-text-secondary mb-4 bg-purple-500/5 border border-purple-500/10 rounded-xl p-3 leading-relaxed">
                {selected.research_data.summary}
              </p>
            )}
            <div className="space-y-2">
              {(selected.research_data.results || []).slice(0, 8).map((r: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-studio-surface-1 transition-colors group">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-purple-400">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-studio-text-primary truncate">{r.title}</p>
                    <p className="text-xs text-studio-text-tertiary mt-0.5 line-clamp-2">{r.snippet}</p>
                  </div>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/5 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-studio-text-tertiary" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Calendar */}
        {plan?.content_calendar?.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-sm tracking-wider text-studio-text-primary font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" /> KALENDAR SADRŽAJA
              </h3>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="text-xs text-studio-text-tertiary hover:text-studio-text-secondary flex items-center gap-1 transition-colors"
              >
                {showCalendar ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showCalendar ? 'Sakrij' : 'Prikaži'}
              </button>
            </div>

            {showCalendar && (
              <div className="space-y-3">
                {plan!.content_calendar.map((week: any) => (
                  <div key={week.week} className="border border-studio-border rounded-xl overflow-hidden">
                    <div className="bg-studio-surface-0 px-4 py-2.5 border-b border-studio-border flex items-center justify-between">
                      <p className="text-xs font-bold text-studio-text-secondary">
                        Tjedan {week.week}: {week.theme}
                      </p>
                      <span className="text-[10px] text-studio-text-tertiary">
                        {(week.posts || []).length} objava
                      </span>
                    </div>
                    <div className="divide-y divide-studio-border-subtle">
                      {(week.posts || []).map((post: any, pi: number) => {
                        const plat = PLATFORM_BADGE[post.platform] ?? { bg: 'bg-gray-600', label: post.platform?.slice(0, 2).toUpperCase() }
                        return (
                          <div key={pi} className="px-4 py-3 flex items-center gap-3 hover:bg-studio-surface-1 transition-colors">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold uppercase ${plat.bg}`}>
                              {plat.label}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-studio-text-primary truncate">{post.title}</p>
                              <p className="text-xs text-studio-text-tertiary">
                                {post.day} &middot; {post.best_time} &middot; {post.format}
                              </p>
                            </div>
                            {post.hashtags?.length > 0 && (
                              <div className="hidden sm:flex gap-1">
                                {post.hashtags.slice(0, 2).map((h: string, hi: number) => (
                                  <span key={hi} className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                    {h}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Risk Factors */}
        {plan?.risk_factors?.length > 0 && (
          <div className="card">
            <h3 className="font-headline text-sm tracking-wider text-studio-text-primary font-bold mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" /> RIZICI
            </h3>
            <div className="space-y-2">
              {plan!.risk_factors.map((risk: string, i: number) => (
                <div key={i} className="flex items-start gap-2.5 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-studio-text-secondary leading-relaxed">{risk}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {plan?.recommendations?.length > 0 && (
          <div className="card">
            <h3 className="font-headline text-sm tracking-wider text-studio-text-primary font-bold mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-brand-accent" /> PREPORUKE
            </h3>
            <ul className="space-y-2">
              {plan!.recommendations.map((rec: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-studio-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bottom Actions */}
        {selected.status === 'complete' && (
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-brand-dark rounded-xl text-sm font-semibold hover:bg-brand-accent/90 transition-colors">
              <Calendar size={16} />
              Prebaci u kalendar
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-studio-surface-2 text-studio-text-primary rounded-xl text-sm font-medium hover:bg-studio-surface-3 transition-colors">
              <Copy size={16} />
              Kopiraj plan
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Header
        title="ISTRAŽIVANJE KAMPANJA"
        subtitle="Upload brief → AI istraživanje → Marketing plan"
      />
      <div className="page-wrapper">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Upload + List */}
          <div className="space-y-5">
            {/* Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-brand-accent bg-brand-accent/5'
                  : 'border-studio-border hover:border-brand-accent/30 hover:bg-studio-surface-1'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              {uploading ? (
                <Loader2 className="w-8 h-8 text-brand-accent mx-auto animate-spin" />
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-brand-accent/10 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-brand-accent" />
                  </div>
                  <p className="text-sm font-medium text-studio-text-secondary">Povuci PDF, DOCX ili TXT</p>
                  <p className="text-xs text-studio-text-disabled mt-1">ili klikni za odabir datoteke</p>
                </>
              )}
            </div>

            {/* Text Input */}
            <div className="card">
              <p className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider mb-2">
                Ili opiši kampanju tekstom
              </p>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={PLACEHOLDER_HINTS}
                className="w-full h-36 bg-studio-surface-0 border border-studio-border-subtle rounded-xl px-3 py-2.5 text-sm text-studio-text-primary placeholder-studio-text-disabled/50 focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 resize-none"
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || uploading}
                className="mt-2.5 w-full py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-brand-dark text-sm font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Istraži kampanju
              </button>
            </div>

            {/* Past Researches */}
            <div>
              <p className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider mb-3">
                Prethodna istraživanja ({campaigns.length})
              </p>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-studio-surface-1 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 bg-studio-surface-0 rounded-xl border border-studio-border-subtle">
                  <Search className="w-8 h-8 mx-auto mb-2 text-studio-text-disabled opacity-50" />
                  <p className="text-sm text-studio-text-disabled">Nema prethodnih istraživanja</p>
                  <p className="text-xs text-studio-text-disabled mt-1">Uploadajte brief ili opišite kampanju</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                  {campaigns.map((c) => {
                    const listDefault = { label: 'Učitano', icon: Clock, color: 'text-studio-text-secondary', bg: 'bg-studio-surface-1', step: 0 }
                    const cfg = STATUS_CONFIG[c.status] ?? listDefault
                    const Icon = cfg.icon
                    const isActive = selectedId === c.id
                    const type = getCampaignType(c.campaign_type)
                    const isProc = ['analyzing', 'researching', 'generating'].includes(c.status)
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group ${
                          isActive
                            ? 'bg-brand-accent/10 border border-brand-accent/30'
                            : 'bg-studio-surface-0 border border-studio-border-subtle hover:bg-studio-surface-1 hover:border-studio-border'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${cfg.color} ${isProc ? 'animate-spin' : ''}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-studio-text-primary truncate">{c.title}</p>
                          <p className="text-[10px] text-studio-text-tertiary flex items-center gap-1">
                            <span>{type.emoji}</span>
                            {type.label} &middot; {new Date(c.created_at).toLocaleDateString('hr-HR')}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(c.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-studio-text-tertiary hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Detail View */}
          <div className="lg:col-span-2">
            {selectedId && selected ? (
              renderDetail()
            ) : (
              <div className="flex flex-col items-center justify-center h-[600px] text-center card border-dashed border-2 border-studio-border">
                <div className="w-20 h-20 rounded-2xl bg-brand-accent/10 flex items-center justify-center mb-5">
                  <Sparkles className="w-10 h-10 text-brand-accent" />
                </div>
                <h3 className="font-headline text-lg text-studio-text-primary font-bold tracking-wider">Od briefa do strategije</h3>
                <p className="text-sm text-studio-text-tertiary mt-3 max-w-md leading-relaxed">
                  Uploadajte PDF brief ili opišite kampanju tekstom. AI će analizirati dokument,
                  istražiti trenutne trendove na internetu i generirati kompletan marketing plan
                  s budžetom, kalendarom sadržaja i prijedlozima oglasa.
                </p>
                <div className="flex items-center gap-6 mt-8">
                  {[
                    { icon: FileText, label: 'Analiza briefa', color: 'text-blue-400' },
                    { icon: Globe, label: 'Web istraživanje', color: 'text-purple-400' },
                    { icon: Sparkles, label: 'AI marketing plan', color: 'text-amber-400' },
                  ].map(({ icon: StepIcon, label, color }, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-studio-surface-2 flex items-center justify-center">
                        <StepIcon size={20} className={color} />
                      </div>
                      <span className="text-[10px] text-studio-text-tertiary">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
