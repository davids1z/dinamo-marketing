import api from './client'
import type { StudioProject, MediaAsset, GenerationTask, PublishResult } from '../types/studio'

export const studioApi = {
  // --- Uploads ---
  uploadMedia: (postId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<MediaAsset>(`/studio/upload?post_id=${postId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  listUploads: (postId: string) =>
    api.get<MediaAsset[]>(`/studio/uploads/${postId}`),

  deleteUpload: (assetId: string) =>
    api.delete(`/studio/uploads/${assetId}`),

  // --- Projects ---
  getProject: (postId: string) =>
    api.get<StudioProject>(`/studio/projects/${postId}`),

  updateProject: (postId: string, data: Record<string, unknown>) =>
    api.patch<StudioProject>(`/studio/projects/${postId}`, data),

  // --- AI Generation ---
  generateScenes: (postId: string, brief: string) =>
    api.post<{ task_id: string; status: string }>(`/studio/projects/${postId}/generate`, { brief }),

  getGenerationResult: (taskId: string) =>
    api.get<GenerationTask>(`/studio/projects/task/${taskId}`),

  // --- Rendering ---
  renderVideo: (postId: string, webmBlob: Blob) => {
    const formData = new FormData()
    formData.append('file', webmBlob, 'recording.webm')
    return api.post<{ output_url: string }>(`/studio/projects/${postId}/render-video`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  exportImage: (postId: string, pngBlob: Blob, filename = 'export.png') => {
    const formData = new FormData()
    formData.append('file', pngBlob, filename)
    return api.post<{ output_url: string }>(`/studio/projects/${postId}/export-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // --- Publishing ---
  publish: (postId: string, targetPlatform?: string) =>
    api.post<PublishResult>(`/studio/projects/${postId}/publish`, {
      target_platform: targetPlatform || null,
    }),
}
