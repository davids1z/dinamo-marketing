import { useState } from 'react'
import {
  X, Send, CheckCircle, AlertTriangle, Loader2, ExternalLink,
  Image, Copy, Check, Sparkles,
} from 'lucide-react'
import { studioApi } from '../../api/studio'
import type { PublishResult } from '../../types/studio'

/* ------------------------------------------------------------------ */
/* Platform options                                                    */
/* ------------------------------------------------------------------ */

const PLATFORM_OPTIONS = [
  { value: 'telegram', label: 'Telegram', icon: '✈️', desc: 'Test kanal', badge: 'Test' },
  { value: 'instagram', label: 'Instagram', icon: '📸', desc: 'Feed / Reel / Story', badge: null },
  { value: 'facebook', label: 'Facebook', icon: '📘', desc: 'Stranica', badge: null },
  { value: 'tiktok', label: 'TikTok', icon: '🎵', desc: 'Video', badge: null },
  { value: 'youtube', label: 'YouTube', icon: '▶️', desc: 'Video / Short', badge: null },
]

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface PublishModalProps {
  postId: string
  platform: string
  caption: string
  hashtags: string[]
  outputUrl: string
  onClose: () => void
  onPublished: (result: PublishResult) => void
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function PublishModal({
  postId,
  platform,
  caption,
  hashtags,
  outputUrl,
  onClose,
  onPublished,
}: PublishModalProps) {
  const [editCaption, setEditCaption] = useState(caption)
  const [editHashtags, setEditHashtags] = useState(hashtags.join(' '))
  const [selectedPlatform, setSelectedPlatform] = useState('telegram')
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<PublishResult | null>(null)
  const [error, setError] = useState('')
  const [captionCopied, setCaptionCopied] = useState(false)

  const charCount = editCaption.length
  const platformLimit =
    selectedPlatform === 'instagram' ? 2200
      : selectedPlatform === 'tiktok' ? 4000
        : selectedPlatform === 'youtube' ? 5000
          : 4096 // default

  const handlePublish = async () => {
    setPublishing(true)
    setError('')

    try {
      // Save captions
      await studioApi.updateProject(postId, {
        generated_caption: editCaption,
        generated_hashtags: editHashtags.split(/\s+/).filter(Boolean),
      })

      const resp = await studioApi.publish(postId, selectedPlatform)
      setResult(resp.data)
      onPublished(resp.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Objavljivanje nije uspjelo')
    } finally {
      setPublishing(false)
    }
  }

  const copyCaption = () => {
    const fullText = `${editCaption}\n\n${editHashtags}`
    navigator.clipboard.writeText(fullText)
    setCaptionCopied(true)
    setTimeout(() => setCaptionCopied(false), 2000)
  }

  const selectedPlatformData = PLATFORM_OPTIONS.find(p => p.value === selectedPlatform)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-studio-surface-0 border border-studio-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 ai-success-card overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-studio-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-dinamo-accent/15 flex items-center justify-center">
              {result?.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <Send className="w-4 h-4 text-dinamo-accent" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-studio-text-primary">
                {result ? (result.success ? 'Objavljeno!' : 'Greška') : 'Objavi sadržaj'}
              </h2>
              <p className="text-[10px] text-studio-text-tertiary">
                {result ? result.platform : 'Pregledaj i objavi na platformu'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-studio-surface-2 transition-colors"
          >
            <X className="w-4 h-4 text-studio-text-tertiary" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────── */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 studio-scrollbar">

          {result ? (
            /* ── Result state ────────────────── */
            <div className="text-center py-8">
              {result.success ? (
                <div className="ai-success-card">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-lg font-bold text-studio-text-primary">
                    Uspješno objavljeno!
                  </p>
                  <p className="text-sm text-studio-text-secondary mt-1">
                    Sadržaj je objavljen na {result.platform}
                  </p>
                  {result.platform_post_url && (
                    <a
                      href={result.platform_post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 bg-dinamo-accent/10 text-dinamo-accent rounded-lg text-sm font-medium hover:bg-dinamo-accent/20 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Pogledaj objavu
                    </a>
                  )}
                </div>
              ) : (
                <div className="ai-panel-slide-in">
                  <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-lg font-bold text-studio-text-primary">
                    Objavljivanje nije uspjelo
                  </p>
                  <p className="text-sm text-red-400 mt-1">{result.error}</p>
                </div>
              )}
            </div>
          ) : (
            /* ── Edit state ───────────────────── */
            <>
              {/* Platform grid */}
              <div>
                <label className="block text-[10px] font-semibold text-studio-text-tertiary uppercase tracking-[1.5px] mb-2">
                  Odaberi platformu
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORM_OPTIONS.map((p) => {
                    const isSelected = selectedPlatform === p.value
                    return (
                      <button
                        key={p.value}
                        onClick={() => setSelectedPlatform(p.value)}
                        className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left group ${
                          isSelected
                            ? 'border-dinamo-accent bg-dinamo-accent/8'
                            : 'border-studio-border hover:border-studio-border-hover bg-studio-surface-1'
                        }`}
                      >
                        <span className="text-lg">{p.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-bold ${
                            isSelected ? 'text-studio-text-primary' : 'text-studio-text-secondary'
                          }`}>
                            {p.label}
                          </div>
                          <div className="text-[9px] text-studio-text-disabled truncate">{p.desc}</div>
                        </div>
                        {p.badge && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[8px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                            {p.badge}
                          </span>
                        )}
                        {isSelected && (
                          <div className="absolute -top-px -right-px w-5 h-5 bg-dinamo-accent rounded-bl-lg rounded-tr-[10px] flex items-center justify-center">
                            <Check className="w-3 h-3 text-black" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {selectedPlatform === 'telegram' && (
                  <p className="text-[10px] text-emerald-400 mt-1.5 px-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Telegram test kanal — sigurno za testiranje
                  </p>
                )}
                {selectedPlatform !== 'telegram' && platform && platform !== selectedPlatform && (
                  <p className="text-[10px] text-amber-400 mt-1.5 px-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Originalna platforma posta: {platform}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-studio-border-subtle" />

              {/* Preview + Caption side by side (or stacked) */}
              <div className="space-y-3">
                {/* Preview thumbnail */}
                {outputUrl && (
                  <div className="relative w-full aspect-video bg-studio-surface-1 rounded-xl overflow-hidden border border-studio-border-subtle">
                    <img
                      src={outputUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/60 rounded-full text-[9px] text-white/70">
                      <Image className="w-2.5 h-2.5" /> Pregled
                    </div>
                  </div>
                )}

                {/* Caption editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-semibold text-studio-text-tertiary uppercase tracking-[1.5px]">
                      Opis objave
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-mono ${
                        charCount > platformLimit ? 'text-red-400' : 'text-studio-text-disabled'
                      }`}>
                        {charCount}/{platformLimit}
                      </span>
                      <button
                        onClick={copyCaption}
                        className="p-1 rounded hover:bg-studio-surface-2 transition-colors"
                        title="Kopiraj"
                      >
                        {captionCopied ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-studio-text-disabled" />
                        )}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    rows={3}
                    className="w-full text-xs text-studio-text-primary bg-studio-surface-1 border border-studio-border rounded-lg px-3 py-2 focus:outline-none focus:border-dinamo-accent focus:ring-1 focus:ring-dinamo-accent/20 resize-none transition-colors placeholder:text-studio-text-disabled"
                    placeholder="Opis objave..."
                  />
                </div>

                {/* Hashtags */}
                <div>
                  <label className="block text-[10px] font-semibold text-studio-text-tertiary uppercase tracking-[1.5px] mb-1.5">
                    Hashtagovi
                  </label>
                  <input
                    type="text"
                    value={editHashtags}
                    onChange={(e) => setEditHashtags(e.target.value)}
                    className="w-full text-xs text-studio-text-primary bg-studio-surface-1 border border-studio-border rounded-lg px-3 py-2 focus:outline-none focus:border-dinamo-accent focus:ring-1 focus:ring-dinamo-accent/20 transition-colors placeholder:text-studio-text-disabled"
                    placeholder="#ShiftOneZero #Marketing ..."
                  />
                  {editHashtags.trim() && (
                    <p className="text-[9px] text-studio-text-disabled mt-1 px-1">
                      {editHashtags.split(/\s+/).filter(Boolean).length} hashtagova
                    </p>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        {!result && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-studio-border-subtle bg-studio-surface-1/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-studio-text-secondary hover:text-studio-text-primary hover:bg-studio-surface-2 rounded-lg transition-colors"
            >
              Odustani
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || charCount > platformLimit}
              className="flex items-center gap-2 px-5 py-2.5 bg-dinamo-accent text-black rounded-xl text-xs font-bold hover:bg-dinamo-accent-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(184,255,0,0.15)]"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Objavljivanje...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Objavi na {selectedPlatformData?.label || selectedPlatform}
                </>
              )}
            </button>
          </div>
        )}

        {/* Close button for result state */}
        {result && (
          <div className="flex items-center justify-center px-5 py-4 border-t border-studio-border-subtle">
            <button
              onClick={onClose}
              className="px-6 py-2 text-xs font-medium text-studio-text-secondary hover:text-studio-text-primary bg-studio-surface-2 hover:bg-studio-surface-3 rounded-lg transition-colors"
            >
              Zatvori
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
