import api from './client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';

export const reportsApi = {
  generateWeekly: () => api.post('/reports/generate/weekly'),
  generateMonthly: (month: number, year: number) =>
    api.post('/reports/generate/monthly', { month, year }),
  getWeeklyReports: () => api.get('/reports/weekly'),
  getMonthlyReports: () => api.get('/reports/monthly'),
  getWeeklyReport: (id: string) => api.get(`/reports/weekly/${id}`),
  getMonthlyReport: (id: string) => api.get(`/reports/monthly/${id}`),
  downloadWeeklyPdf: (id: string) => `${API_BASE}/reports/weekly/${id}/download`,
  downloadMonthlyPdf: (id: string) => `${API_BASE}/reports/monthly/${id}/download`,
};
