import api from './client';

export interface StrategyMonth {
  month: number
  year: number
  month_name: string
  month_theme: string
  plan_id: string | null
  status: string
  total_posts: number
  approved_count?: number
  published_count?: number
  status_breakdown?: Record<string, number>
  platform_breakdown?: Record<string, number>
  created_at?: string
}

export const contentApi = {
  generatePlan: (data: { month: number; year: number; context?: Record<string, unknown> }) =>
    api.post('/content/generate-plan', data),
  generateAIPlan: (data: { month: number; year: number }) =>
    api.post('/content/generate-ai-plan', data),
  getAIPlanResult: (taskId: string) =>
    api.get(`/content/generate-ai-plan/${taskId}`),
  getPlans: () => api.get('/content/plans'),
  getPlan: (id: string) => api.get(`/content/plans/${id}`),
  getCalendar: (month: number, year: number) =>
    api.get('/content/calendar', { params: { month, year } }),
  getQueue: () => api.get('/content/queue'),
  approvePost: (id: string) => api.patch(`/content/posts/${id}/approve`),
  rejectPost: (id: string, reason?: string) =>
    api.patch(`/content/posts/${id}/reject`, { reason }),
  updatePost: (id: string, data: Record<string, unknown>) =>
    api.patch(`/content/posts/${id}`, data),
  publishPost: (id: string) => api.post(`/content/posts/${id}/publish`),
  generateVisual: (id: string) => api.post(`/content/posts/${id}/generate-visual`),
  generatePlanVisuals: (planId: string) => api.post(`/content/plans/${planId}/generate-visuals`),
  getTemplates: () => api.get('/content/templates'),
  reschedulePost: (id: string, data: { day: number; month: number; year: number }) =>
    api.patch(`/content/posts/${id}/reschedule`, data),
  // 6-Month Strategy
  generateStrategy: (data: { start_month: number; start_year: number; context?: Record<string, unknown> }) =>
    api.post('/content/strategy/generate', data),
  getStrategyTask: (taskId: string) =>
    api.get(`/content/strategy/task/${taskId}`),
  getStrategyOverview: (startMonth: number, startYear: number) =>
    api.get<StrategyMonth[]>('/content/strategy/overview', { params: { start_month: startMonth, start_year: startYear } }),
};
