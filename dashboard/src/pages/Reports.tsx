import React, { useState } from 'react';
import Header from '../components/layout/Header';
import StatusBadge from '../components/common/StatusBadge';
import { FileText, Download, Calendar, Clock, CheckCircle, Loader2, AlertCircle, Plus } from 'lucide-react';

type ReportTab = 'weekly' | 'monthly';

interface Report {
  id: number;
  title: string;
  period: string;
  date: string;
  status: 'completed' | 'generating' | 'failed';
  pages: number;
  size: string;
}

const weeklyReports: Report[] = [
  { id: 1, title: 'Weekly Performance Report', period: 'Feb 24 - Mar 2, 2026', date: 'Mar 3, 2026', status: 'completed', pages: 12, size: '2.4 MB' },
  { id: 2, title: 'Weekly Performance Report', period: 'Feb 17 - Feb 23, 2026', date: 'Feb 24, 2026', status: 'completed', pages: 11, size: '2.1 MB' },
  { id: 3, title: 'Weekly Performance Report', period: 'Feb 10 - Feb 16, 2026', date: 'Feb 17, 2026', status: 'completed', pages: 13, size: '2.8 MB' },
  { id: 4, title: 'Weekly Performance Report', period: 'Feb 3 - Feb 9, 2026', date: 'Feb 10, 2026', status: 'completed', pages: 10, size: '1.9 MB' },
  { id: 5, title: 'Weekly Performance Report', period: 'Jan 27 - Feb 2, 2026', date: 'Feb 3, 2026', status: 'completed', pages: 11, size: '2.2 MB' },
  { id: 6, title: 'Weekly Performance Report', period: 'Jan 20 - Jan 26, 2026', date: 'Jan 27, 2026', status: 'completed', pages: 9, size: '1.7 MB' },
];

const monthlyReports: Report[] = [
  { id: 10, title: 'Monthly Marketing Report', period: 'February 2026', date: 'Mar 1, 2026', status: 'generating', pages: 0, size: '--' },
  { id: 11, title: 'Monthly Marketing Report', period: 'January 2026', date: 'Feb 1, 2026', status: 'completed', pages: 28, size: '5.6 MB' },
  { id: 12, title: 'Monthly Marketing Report', period: 'December 2025', date: 'Jan 1, 2026', status: 'completed', pages: 32, size: '6.2 MB' },
  { id: 13, title: 'Monthly Marketing Report', period: 'November 2025', date: 'Dec 1, 2025', status: 'completed', pages: 26, size: '4.8 MB' },
  { id: 14, title: 'Monthly Marketing Report', period: 'October 2025', date: 'Nov 1, 2025', status: 'completed', pages: 24, size: '4.5 MB' },
];

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'completed') return <CheckCircle size={16} className="text-green-400" />;
  if (status === 'generating') return <Loader2 size={16} className="text-blue-400 animate-spin" />;
  return <AlertCircle size={16} className="text-red-400" />;
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('weekly');
  const reports = activeTab === 'weekly' ? weeklyReports : monthlyReports;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header title="REPORTS" subtitle="Automated Report Generation & Archive" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Actions & Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 border-b border-gray-800 pb-1">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'weekly'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Weekly Reports
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'monthly'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Monthly Reports
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            <Plus size={16} />
            Generate Report
          </button>
        </div>

        {/* Report Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 text-gray-400 mb-1"><FileText size={16} />Total Reports</div>
            <p className="text-3xl font-bold text-white">{weeklyReports.length + monthlyReports.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 text-gray-400 mb-1"><Calendar size={16} />Last Generated</div>
            <p className="text-lg font-bold text-white">Mar 3, 2026</p>
            <p className="text-xs text-gray-500 mt-1">Weekly Performance Report</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 text-gray-400 mb-1"><Clock size={16} />Next Scheduled</div>
            <p className="text-lg font-bold text-white">Mar 9, 2026</p>
            <p className="text-xs text-gray-500 mt-1">Weekly auto-generation (Monday 8:00 AM)</p>
          </div>
        </div>

        {/* Report List */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {activeTab === 'weekly' ? 'Weekly Reports' : 'Monthly Reports'}
          </h2>
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <StatusIcon status={report.status} />
                  <div>
                    <h3 className="text-sm font-medium text-white">{report.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">{report.period}</span>
                      <span className="text-xs text-gray-600">|</span>
                      <span className="text-xs text-gray-500">Generated: {report.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {report.status === 'completed' && (
                    <>
                      <span className="text-xs text-gray-500">{report.pages} pages</span>
                      <span className="text-xs text-gray-500">{report.size}</span>
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-lg transition-colors">
                        <Download size={14} />
                        Download
                      </button>
                    </>
                  )}
                  {report.status === 'generating' && (
                    <span className="text-xs text-blue-400 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Generating...
                    </span>
                  )}
                  {report.status === 'failed' && (
                    <button className="text-xs text-red-400 hover:text-red-300">
                      Retry
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
