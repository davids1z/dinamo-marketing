import api from './client';

export const reportsApi = {
  generateWeekly: () => api.post('/reports/generate/weekly'),
  generateMonthly: (month: number, year: number) =>
    api.post('/reports/generate/monthly', { month, year }),
  getWeeklyReports: () => api.get('/reports/weekly'),
  getMonthlyReports: () => api.get('/reports/monthly'),
  getWeeklyReport: (id: string) => api.get(`/reports/weekly/${id}`),
  getMonthlyReport: (id: string) => api.get(`/reports/monthly/${id}`),
};
