import { useState, useCallback, useRef } from 'react'
import { Upload, X, Image, Film, Music, FileWarning } from 'lucide-react'
import { studioApi } from '../../api/studio'
import type { MediaAsset } from '../../types/studio'

interface MediaUploaderProps {
  postId: string
  assets: MediaAsset[]
  onUploadComplete: (asset: MediaAsset) => void
  onDelete: (assetId: string) => void
}

export default function MediaUploader({ postId, assets, onUploadComplete, onDelete }: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError('')
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const resp = await studioApi.uploadMedia(postId, file)
        onUploadComplete(resp.data)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }, [postId, onUploadComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDelete = async (assetId: string) => {
    try {
      await studioApi.deleteUpload(assetId)
      onDelete(assetId)
    } catch {
      setError('Brisanje nije uspjelo')
    }
  }

  const typeIcon = (type: string) => {
    if (type === 'video') return <Film className="w-4 h-4" />
    if (type === 'audio') return <Music className="w-4 h-4" />
    return <Image className="w-4 h-4" />
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-dinamo-accent bg-dinamo-accent/5'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-6 h-6 border-2 border-dinamo-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500">Učitavanje...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="w-6 h-6 text-gray-400" />
            <div>
              <p className="text-xs font-medium text-gray-600">Povuci datoteke ovdje</p>
              <p className="text-[10px] text-gray-400 mt-0.5">ili klikni za odabir</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded-lg text-xs">
          <FileWarning className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Asset list */}
      {assets.length > 0 && (
        <div className="space-y-1.5">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {asset.asset_type === 'image' ? (
                  <img src={asset.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400">{typeIcon(asset.asset_type)}</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-700 truncate">{asset.original_filename}</p>
                <p className="text-[10px] text-gray-400">{formatSize(asset.file_size)}</p>
              </div>

              {/* Delete */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(asset.id) }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
