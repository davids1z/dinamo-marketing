import api from './client';

export const reportsApi = {
  generateWeekly: () => api.post('/reports/generate/weekly'),
  generateMonthly: (month: number, year: number) =>
    api.post('/reports/generate/monthly', { month, year }),
  getWeeklyReports: () => api.get('/reports/weekly'),
  getMonthlyReports: () => api.get('/reports/monthly'),
  getWeeklyReport: (id: string) => api.get(`/reports/weekly/${id}`),
  getMonthlyReport: (id: string) => api.get(`/reports/monthly/${id}`),

  /** Download report as PDF blob and trigger browser download */
  downloadPdf: async (id: string, type: 'weekly' | 'monthly') => {
    const response = await api.get(`/reports/${type}/${id}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dinamo_${type === 'weekly' ? 'tjedni' : 'mjesecni'}_izvjestaj_${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /** Send report via email */
  emailReport: (reportId: string, reportType: string, email?: string) =>
    api.post('/reports/email', {
      report_id: reportId,
      report_type: reportType,
      email: email || '',
    }),
};
