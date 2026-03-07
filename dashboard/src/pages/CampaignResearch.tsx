import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Upload, FileText, Search, Sparkles, Loader2, CheckCircle2,
  XCircle, Clock, Trash2, Globe, Target,
  Calendar, DollarSign, AlertTriangle, TrendingUp, ExternalLink
} from 'lucide-react'
import Header from '../components/layout/Header'
import { campaignResearchApi, type CampaignResearchItem } from '../api/campaignResearch'

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Loader2; color: string; bg: string }> = {
  uploaded: { label: 'Ucitano', icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50' },
  analyzing: { label: 'Analiziranje dokumenta...', icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50' },
  researching: { label: 'Istrazivanje interneta...', icon: Search, color: 'text-purple-600', bg: 'bg-purple-50' },
  generating: { label: 'Generiranje plana...', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
  complete: { label: 'Gotovo', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  failed: { label: 'Greska', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
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
        <div className={`${statusCfg.bg} border border-gray-200 rounded-2xl p-5 flex items-center gap-4`}>
          <div className={`w-12 h-12 rounded-xl ${statusCfg.bg} flex items-center justify-center`}>
            <StatusIcon className={`w-6 h-6 ${statusCfg.color} ${isProcessing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className={`text-sm font-bold ${statusCfg.color}`}>{statusCfg.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{selected.title}</p>
          </div>
          {isProcessing && (
            <div className="ml-auto flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Greska u istrazivanju</p>
              <p className="text-xs text-red-600 mt-1">{selected.error_message}</p>
            </div>
          </div>
        )}

        {/* Brief Section */}
        {selected.extracted_brief && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="font-headline text-sm tracking-wider text-gray-900 font-bold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              ANALIZA BRIEFA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selected.extracted_brief.campaign_type && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Tip kampanje</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {CAMPAIGN_TYPES[selected.extracted_brief.campaign_type] || selected.extracted_brief.campaign_type}
                  </p>
                </div>
              )}
              {selected.extracted_brief.timeline && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Trajanje</p>
                  <p className="text-sm font-semibold text-gray-900">{selected.extracted_brief.timeline}</p>
                </div>
              )}
              {selected.extracted_brief.objectives?.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 md:col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Ciljevi</p>
                  <ul className="space-y-1">
                    {selected.extracted_brief.objectives.map((obj: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <Target className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.extracted_brief.target_audience?.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 md:col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Ciljna publika</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.extracted_brief.target_audience.map((a: string, i: number) => (
                      <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {selected.extracted_brief.summary && (
                <div className="bg-gray-50 rounded-xl p-3 md:col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Sazetak</p>
                  <p className="text-sm text-gray-700">{selected.extracted_brief.summary}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Research Section */}
        {selected.research_data && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="font-headline text-sm tracking-wider text-gray-900 font-bold mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-600" />
              REZULTATI ISTRAZIVANJA
              <span className="text-xs font-normal text-gray-500 ml-auto">
                {selected.research_data.total_sources} izvora
              </span>
            </h3>
            {selected.research_data.summary && (
              <p className="text-sm text-gray-700 mb-4 bg-purple-50 rounded-xl p-3">
                {selected.research_data.summary}
              </p>
            )}
            <div className="space-y-2">
              {(selected.research_data.results || []).slice(0, 8).map((r: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.snippet}</p>
                  </div>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Marketing Plan Section */}
        {selected.generated_plan && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="font-headline text-sm tracking-wider text-gray-900 font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              MARKETING PLAN
            </h3>

            {/* Executive Summary */}
            {selected.generated_plan.executive_summary && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-sm text-gray-800">{selected.generated_plan.executive_summary}</p>
              </div>
            )}

            {/* Strategy */}
            {selected.generated_plan.strategy && (
              <div className="mb-5">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Strategija</h4>
                <p className="text-sm text-gray-700 mb-3">{selected.generated_plan.strategy.approach}</p>
                {selected.generated_plan.strategy.success_metrics?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selected.generated_plan.strategy.success_metrics.map((m: string, i: number) => (
                      <span
                        key={i}
                        className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
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
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> Raspodjela budzeta
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(selected.generated_plan.budget_allocation).map(([key, val]) => (
                    <div key={key} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-gray-900">{val as string}</p>
                      <p className="text-[10px] text-gray-500 uppercase">{key.replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Calendar */}
            {selected.generated_plan.content_calendar?.length > 0 && (
              <div className="mb-5">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Kalendar sadrzaja
                </h4>
                <div className="space-y-3">
                  {selected.generated_plan.content_calendar.map((week: any) => (
                    <div key={week.week} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                        <p className="text-xs font-bold text-gray-700">Tjedan {week.week}: {week.theme}</p>
                      </div>
                      <div className="divide-y divide-gray-100">
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
                              <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                              <p className="text-xs text-gray-500">
                                {post.day} &middot; {post.best_time} &middot; {post.format}
                              </p>
                            </div>
                            {post.hashtags?.length > 0 && (
                              <div className="hidden sm:flex gap-1">
                                {post.hashtags.slice(0, 2).map((h: string, hi: number) => (
                                  <span key={hi} className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
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
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Preporuke</h4>
                <ul className="space-y-2">
                  {selected.generated_plan.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
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
        title="Istrazivanje kampanja"
        subtitle="Upload brief &rarr; AI istrazivanje &rarr; Marketing plan"
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
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                <Loader2 className="w-8 h-8 text-blue-500 mx-auto animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Povuci PDF, DOCX ili TXT</p>
                  <p className="text-xs text-gray-400 mt-1">ili klikni za odabir datoteke</p>
                </>
              )}
            </div>

            {/* Text Input */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Ili opisi kampanju tekstom
              </p>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Opisi kampanju koju zelis istraziti..."
                className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || uploading}
                className="mt-2 w-full py-2.5 bg-dinamo-blue hover:bg-dinamo-blue-hover text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Istrazi kampanju
              </button>
            </div>

            {/* Past Researches */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Prethodna istrazivanja
              </p>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nema prethodnih istrazivanja</p>
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
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
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
                          <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                          <p className="text-[10px] text-gray-500">
                            {c.campaign_type
                              ? CAMPAIGN_TYPES[c.campaign_type] || c.campaign_type
                              : 'Nepoznato'}{' '}
                            &middot; {new Date(c.created_at).toLocaleDateString('hr-HR')}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(c.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
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
              <div className="flex flex-col items-center justify-center h-[500px] text-center bg-white border border-gray-200 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="font-headline text-lg text-gray-900 font-bold">Istrazi kampanju</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-sm">
                  Upload PDF ili opisi kampanju tekstom. AI ce analizirati brief, istraziti internet i generirati marketing plan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
