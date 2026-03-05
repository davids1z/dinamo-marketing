import api from './client';

export const contentApi = {
  generatePlan: (data: { month: number; year: number; context?: Record<string, unknown> }) =>
    api.post('/content/generate-plan', data),
  generateAIPlan: (data: { month: number; year: number }) =>
    api.post('/content/generate-ai-plan', data),
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
  getTemplates: () => api.get('/content/templates'),
};
