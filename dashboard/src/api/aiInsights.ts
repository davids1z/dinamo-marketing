import api from './client'

export interface AiInsight {
  type: 'trend' | 'anomaly' | 'recommendation'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  action: string
}

export interface AiInsightsResponse {
  summary: string
  insights: AiInsight[]
  generated_at?: string
  page_key?: string
}

export interface GenerateResult {
  status: 'done' | 'running' | 'error' | 'not_found'
  task_id?: string
  insights?: AiInsightsResponse
  cached?: boolean
  error?: string
}

export async function generateInsights(pageKey: string, pageData: Record<string, unknown>): Promise<GenerateResult> {
  const res = await api.post<GenerateResult>('/ai-insights/generate', {
    page_key: pageKey,
    page_data: pageData,
  })
  return res.data
}

export async function pollInsightTask(taskId: string): Promise<GenerateResult> {
  const res = await api.get<GenerateResult>(`/ai-insights/task/${taskId}`)
  return res.data
}
