import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Upload, FileText, Search, Sparkles, Loader2, CheckCircle2,
  XCircle, Clock, Trash2, Globe, Target,
  Calendar, DollarSign, AlertTriangle, TrendingUp, ExternalLink
} from 'lucide-react'
import Header from '../components/layout/Header'
import { campaignResearchApi, type CampaignResearchItem } from '../api/campaignResearch'

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Loader2; color: string; bg: string }> = {
  uploaded: { label: 'Učitano', icon: Clock, color: 'text-studio-text-secondary', bg: 'bg-studio-surface-1' },
  analyzing: { label: 'Analiziranje dokumenta...', icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  researching: { label: 'Istraživanje interneta...', icon: Search, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  generating: { label: 'Generiranje plana...', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  complete: { label: 'Gotovo', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  failed: { label: 'Greška', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
}

const CAMPAIGN_TYPES: Record<string, string> = {
  matchday: 'Utakmica',
  transfer: 'Transfer',
  season_ticket: 'Sezonska ulaznica',
  merchandise: 'Merchandise',
  sponsor: 'Sponzorstvo',
  academy: 'Akademija',
  diaspora: 'Dijaspora',
  european: 'Europska natjecanja',
  community: 'Zajednica',
  other: 'Ostalo',
}

export default function CampaignResearch() {
  const [campaigns, setCampaigns] = useState<CampaignResearchItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<CampaignResearchItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [dragOver, setDragOver] = useState(false)
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

    const statusCfg = (STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.uploaded)!
    const StatusIcon = statusCfg.icon
    const isProcessing = ['analyzing', 'researching', 'generating'].includes(selected.status)

    return (
      <div className="space-y-6">
        {/* Status Banner */}
        <div className={`${statusCfg.bg} border border-studio-border rounded-2xl p-5 flex items-center gap-4`}>
          <div className={`w-12 h-12 rounded-xl ${statusCfg.bg} flex items-center justify-center`}>
            <StatusIcon className={`w-6 h-6 ${statusCfg.color} ${isProcessing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className={`text-sm font-bold ${statusCfg.color}`}>{statusCfg.label}</p>
            <p className="text-xs text-studio-text-tertiary mt-0.5">{selected.title}</p>
          </div>
          {isProcessing && (
            <div className="ml-auto flex items-center gap-2">
              <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${
                  selected.status === 'analyzing' ? 'w-1/3 bg-blue-500' :
                  selected.status === 'researching' ? 'w-2/3 bg-purple-500' :
                  'w-11/12 bg-amber-500'
                }`} />
              </div>
            </div>
          )}
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

        {/* Brief Section */}
        {selected.extracted_brief && (
          <div className="card">
            <h3 className="font-headline text-sm tracking-wider text-studio-text-primary font-bold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              ANALIZA BRIEFA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selected.extracted_brief.campaign_type && (
                <div className="bg-studio-surface-1 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-studio-text-tertiary mb-1">Tip kampanje</p>
                  <p className="text-sm font-semibold text-studio-text-primary">
                    {CAMPAIGN_TYPES[selected.extracted_brief.campaign_type] || selected.extracted_brief.campaign_type}
                  </p>
                </div>
              )}
              {selected.extracted_brief.timeline && (
                <div className="bg-studio-surface-1 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-studio-text-tertiary mb-1">Trajanje</p>
                  <p className="text-sm font-semibold text-studio-text-primary">{selected.extracted_brief.timeline}</p>
                </div>
              )}
              {selected.extracted_brief.objectives?.length > 0 && (
                <div className="bg-studio-surface-1 rounded-xl p-3 md:col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-studio-text-tertiary mb-2">Ciljevi</p>
                  <ul className="space-y-1">
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
                <div className="bg-studio-surface-1 rounded-xl p-3 md:col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-studio-text-tertiary mb-2">Ciljna publika</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.extracted_brief.target_audience.map((a: string, i: number) => (
                      <span key={i} className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded-full">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {selected.extracted_brief.summary && (
                <div className="bg-studio-surface-1 rounded-xl p-3 md:col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-studio-text-tertiary mb-1">Sažetak</p>
                  <p className="text-sm text-studio-text-secondary">{selected.extracted_brief.summary}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Research Section */}
        {selected.research_data && (
          <div className="card">
            <h3 className="font-headline text-sm tracking-wider text-studio-text-primary font-bold mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              REZULTATI ISTRAŽIVANJA
              <span className="text-xs font-normal text-studio-text-tertiary ml-auto">
                {selected.research_data.total_sources} izvora
              </span>
            </h3>
            {selected.research_data.summary && (
              <p className="text-sm text-studio-text-secondary mb-4 bg-purple-500/10 rounded-xl p-3">
                {selected.research_data.summary}
              </p>
            )}
            <div className="space-y-2">
              {(selected.research_data.results || []).slice(0, 8).map((r: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-studio-surface-1 transition-colors group">
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 text-xs font-bold text-studio-text-tertiary">
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

        {/* Marketing Plan Section */}
        {selected.generated_plan && (
          <div className="card">
            <h3 className="font-headline text-sm tracking-wider text-studio-text-primary font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              MARKETING PLAN
            </h3>

            {/* Executive Summary */}
            {selected.generated_plan.executive_summary && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-5">
                <p className="text-sm text-studio-text-secondary">{selected.generated_plan.executive_summary}</p>
              </div>
            )}

            {/* Strategy */}
            {selected.generated_plan.strategy && (
              <div className="mb-5">
                <h4 className="text-xs font-bold text-studio-text-tertiary uppercase tracking-wider mb-3">Strategija</h4>
                <p className="text-sm text-studio-text-secondary mb-3">{selected.generated_plan.strategy.approach}</p>
                {selected.generated_plan.strategy.success_metrics?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selected.generated_plan.strategy.success_metrics.map((m: string, i: number) => (
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

            {/* Budget Allocation */}
            {selected.generated_plan.budget_allocation && (
              <div className="mb-5">
                <h4 className="text-xs font-bold text-studio-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> Raspodjela budžeta
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(selected.generated_plan.budget_allocation).map(([key, val]) => (
                    <div key={key} className="bg-studio-surface-1 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-studio-text-primary">{val as string}</p>
                      <p className="text-[10px] text-studio-text-tertiary uppercase">{key.replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Calendar */}
            {selected.generated_plan.content_calendar?.length > 0 && (
              <div className="mb-5">
                <h4 className="text-xs font-bold text-studio-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Kalendar sadržaja
                </h4>
                <div className="space-y-3">
                  {selected.generated_plan.content_calendar.map((week: any) => (
                    <div key={week.week} className="border border-studio-border rounded-xl overflow-hidden">
                      <div className="bg-studio-surface-1 px-4 py-2.5 border-b border-studio-border">
                        <p className="text-xs font-bold text-studio-text-secondary">Tjedan {week.week}: {week.theme}</p>
                      </div>
                      <div className="divide-y divide-studio-border">
                        {(week.posts || []).map((post: any, pi: number) => (
                          <div key={pi} className="px-4 py-3 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold uppercase ${
                              post.platform === 'instagram' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                              post.platform === 'tiktok' ? 'bg-black' :
                              post.platform === 'youtube' ? 'bg-red-600' :
                              'bg-blue-600'
                            }`}>
                              {post.platform?.slice(0, 2)}
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
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {selected.generated_plan.recommendations?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-studio-text-tertiary uppercase tracking-wider mb-3">Preporuke</h4>
                <ul className="space-y-2">
                  {selected.generated_plan.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-studio-text-secondary">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Header
        title="Istraživanje kampanja"
        subtitle="Upload brief &rarr; AI istraživanje &rarr; Marketing plan"
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
                  : 'border-studio-border hover:border-studio-text-tertiary hover:bg-studio-surface-1'
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
                  <Upload className="w-8 h-8 text-studio-text-tertiary mx-auto mb-2" />
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
                placeholder="Opiši kampanju koju želiš istražiti..."
                className="w-full h-24 bg-studio-surface-1 border border-studio-border rounded-xl px-3 py-2.5 text-sm text-studio-text-primary placeholder-studio-text-disabled focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 resize-none"
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || uploading}
                className="mt-2 w-full py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Istraži kampanju
              </button>
            </div>

            {/* Past Researches */}
            <div>
              <p className="text-xs font-semibold text-studio-text-tertiary uppercase tracking-wider mb-3">
                Prethodna istraživanja
              </p>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-studio-surface-1 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 text-studio-text-disabled">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nema prethodnih istraživanja</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {campaigns.map((c) => {
                    const cfg = (STATUS_CONFIG[c.status] ?? STATUS_CONFIG.uploaded)!
                    const Icon = cfg.icon
                    const isActive = selectedId === c.id
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group ${
                          isActive
                            ? 'bg-brand-accent/10 border border-brand-accent/30'
                            : 'bg-studio-surface-0 border border-studio-border hover:bg-studio-surface-1'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon
                            className={`w-4 h-4 ${cfg.color} ${
                              ['analyzing', 'researching', 'generating'].includes(c.status) ? 'animate-spin' : ''
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-studio-text-primary truncate">{c.title}</p>
                          <p className="text-[10px] text-studio-text-tertiary">
                            {c.campaign_type
                              ? CAMPAIGN_TYPES[c.campaign_type] || c.campaign_type
                              : 'Nepoznato'}{' '}
                            &middot; {new Date(c.created_at).toLocaleDateString('hr-HR')}
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
              <div className="flex flex-col items-center justify-center h-[500px] text-center card">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="font-headline text-lg text-studio-text-primary font-bold">Istraži kampanju</h3>
                <p className="text-sm text-studio-text-tertiary mt-2 max-w-sm">
                  Upload PDF ili opiši kampanju tekstom. AI će analizirati brief, istražiti internet i generirati marketing plan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
