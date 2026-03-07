import api from './client'

export interface CampaignResearchItem {
  id: string
  title: string
  campaign_type: string | null
  status: 'uploaded' | 'analyzing' | 'researching' | 'generating' | 'complete' | 'failed'
  uploaded_filename: string | null
  extracted_brief: Record<string, any> | null
  research_data: Record<string, any> | null
  generated_plan: Record<string, any> | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export const campaignResearchApi = {
  list: () => api.get<CampaignResearchItem[]>('/campaign-research'),
  get: (id: string) => api.get<CampaignResearchItem>(`/campaign-research/${id}`),
  upload: (formData: FormData) =>
    api.post<{ id: string; status: string; task_id: string }>('/campaign-research/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadText: (text: string, title?: string) => {
    const fd = new FormData()
    fd.append('text', text)
    if (title) fd.append('title', title)
    return api.post<{ id: string; status: string; task_id: string }>('/campaign-research/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  delete: (id: string) => api.delete(`/campaign-research/${id}`),
}
