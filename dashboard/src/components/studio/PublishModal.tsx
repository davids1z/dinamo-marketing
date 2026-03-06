import { useState } from 'react'
import { X, Send, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { studioApi } from '../../api/studio'
import type { PublishResult } from '../../types/studio'

interface PublishModalProps {
  postId: string
  platform: string
  caption: string
  hashtags: string[]
  outputUrl: string
  onClose: () => void
  onPublished: (result: PublishResult) => void
}

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
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<PublishResult | null>(null)
  const [error, setError] = useState('')

  const handlePublish = async () => {
    setPublishing(true)
    setError('')

    try {
      // Update captions first
      await studioApi.updateProject(postId, {
        generated_caption: editCaption,
        generated_hashtags: editHashtags.split(/\s+/).filter(Boolean),
      })

      const resp = await studioApi.publish(postId)
      setResult(resp.data)
      onPublished(resp.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Objavljivanje nije uspjelo')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">
            {result ? 'Objavljeno' : 'Objavi sadržaj'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {result ? (
            /* Success/Error state */
            <div className="text-center py-6">
              {result.success ? (
                <>
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-lg font-bold text-gray-900">Uspješno objavljeno!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Sadržaj je objavljen na {result.platform}
                  </p>
                  {result.platform_post_url && (
                    <a
                      href={result.platform_post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-4 text-sm text-blue-600 hover:underline"
                    >
                      Pogledaj objavu →
                    </a>
                  )}
                </>
              ) : (
                <>
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <p className="text-lg font-bold text-gray-900">Objavljivanje nije uspjelo</p>
                  <p className="text-sm text-red-500 mt-1">{result.error}</p>
                </>
              )}
            </div>
          ) : (
            /* Edit state */
            <>
              {/* Platform badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Platforma:</span>
                <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-full capitalize">
                  {platform}
                </span>
              </div>

              {/* Preview */}
              {outputUrl && (
                <div className="w-full aspect-video bg-gray-100 rounded-xl overflow-hidden">
                  <img
                    src={outputUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              )}

              {/* Caption */}
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Opis objave
                </label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-dinamo-accent/50 focus:ring-2 focus:ring-dinamo-accent/10 resize-none"
                  placeholder="Opis objave..."
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Hashtagovi
                </label>
                <input
                  type="text"
                  value={editHashtags}
                  onChange={(e) => setEditHashtags(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-dinamo-accent/50 focus:ring-2 focus:ring-dinamo-accent/10"
                  placeholder="#Dinamo #Modri ..."
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 text-red-600 rounded-lg text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Odustani
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-2 px-5 py-2 bg-dinamo-accent text-gray-900 rounded-xl text-sm font-semibold hover:bg-dinamo-accent-hover transition-colors disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {publishing ? 'Objavljivanje...' : 'Objavi'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
