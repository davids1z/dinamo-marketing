import React, { useState } from 'react';
import Header from '../components/layout/Header';
import StatusBadge from '../components/common/StatusBadge';
import { Calendar, ChevronLeft, ChevronRight, Check, X, Clock, Image, Video, FileText } from 'lucide-react';

const DAYS_OF_WEEK = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];

interface ScheduledPost {
  id: string;
  platform: string;
  type: string;
  color: string;
}

// Generate calendar data for March 2026
const calendarData: Record<number, ScheduledPost[]> = {
  1: [{ id: '1', platform: 'instagram', type: 'reel', color: 'bg-pink-500' }],
  2: [
    { id: '2', platform: 'tiktok', type: 'video', color: 'bg-purple-500' },
    { id: '3', platform: 'facebook', type: 'image', color: 'bg-blue-500' },
  ],
  3: [{ id: '4', platform: 'youtube', type: 'video', color: 'bg-red-500' }],
  4: [
    { id: '5', platform: 'instagram', type: 'story', color: 'bg-pink-500' },
    { id: '6', platform: 'tiktok', type: 'video', color: 'bg-purple-500' },
    { id: '7', platform: 'facebook', type: 'post', color: 'bg-blue-500' },
  ],
  5: [{ id: '8', platform: 'instagram', type: 'reel', color: 'bg-pink-500' }],
  6: [
    { id: '9', platform: 'instagram', type: 'carousel', color: 'bg-pink-500' },
    { id: '10', platform: 'youtube', type: 'short', color: 'bg-red-500' },
  ],
  7: [
    { id: '11', platform: 'tiktok', type: 'video', color: 'bg-purple-500' },
    { id: '12', platform: 'facebook', type: 'event', color: 'bg-blue-500' },
    { id: '13', platform: 'instagram', type: 'reel', color: 'bg-pink-500' },
  ],
  8: [{ id: '14', platform: 'instagram', type: 'story', color: 'bg-pink-500' }],
  9: [{ id: '15', platform: 'tiktok', type: 'video', color: 'bg-purple-500' }],
  10: [
    { id: '16', platform: 'instagram', type: 'reel', color: 'bg-pink-500' },
    { id: '17', platform: 'facebook', type: 'image', color: 'bg-blue-500' },
  ],
  11: [{ id: '18', platform: 'youtube', type: 'video', color: 'bg-red-500' }],
  12: [],
  13: [
    { id: '19', platform: 'instagram', type: 'carousel', color: 'bg-pink-500' },
    { id: '20', platform: 'tiktok', type: 'video', color: 'bg-purple-500' },
  ],
  14: [
    { id: '21', platform: 'instagram', type: 'reel', color: 'bg-pink-500' },
    { id: '22', platform: 'facebook', type: 'post', color: 'bg-blue-500' },
    { id: '23', platform: 'youtube', type: 'short', color: 'bg-red-500' },
  ],
  15: [{ id: '24', platform: 'tiktok', type: 'video', color: 'bg-purple-500' }],
  16: [{ id: '25', platform: 'instagram', type: 'story', color: 'bg-pink-500' }],
  17: [
    { id: '26', platform: 'instagram', type: 'reel', color: 'bg-pink-500' },
    { id: '27', platform: 'facebook', type: 'image', color: 'bg-blue-500' },
  ],
  18: [{ id: '28', platform: 'youtube', type: 'video', color: 'bg-red-500' }],
  19: [{ id: '29', platform: 'tiktok', type: 'video', color: 'bg-purple-500' }],
  20: [
    { id: '30', platform: 'instagram', type: 'carousel', color: 'bg-pink-500' },
    { id: '31', platform: 'tiktok', type: 'video', color: 'bg-purple-500' },
    { id: '32', platform: 'facebook', type: 'post', color: 'bg-blue-500' },
  ],
  21: [{ id: '33', platform: 'instagram', type: 'reel', color: 'bg-pink-500' }],
  22: [{ id: '34', platform: 'youtube', type: 'short', color: 'bg-red-500' }],
  23: [
    { id: '35', platform: 'instagram', type: 'story', color: 'bg-pink-500' },
    { id: '36', platform: 'tiktok', type: 'video', color: 'bg-purple-500' },
  ],
  24: [{ id: '37', platform: 'instagram', type: 'reel', color: 'bg-pink-500' }],
  25: [
    { id: '38', platform: 'facebook', type: 'image', color: 'bg-blue-500' },
    { id: '39', platform: 'youtube', type: 'video', color: 'bg-red-500' },
  ],
  26: [{ id: '40', platform: 'tiktok', type: 'video', color: 'bg-purple-500' }],
  27: [
    { id: '41', platform: 'instagram', type: 'reel', color: 'bg-pink-500' },
    { id: '42', platform: 'facebook', type: 'post', color: 'bg-blue-500' },
  ],
  28: [{ id: '43', platform: 'instagram', type: 'carousel', color: 'bg-pink-500' }],
  29: [{ id: '44', platform: 'tiktok', type: 'video', color: 'bg-purple-500' }],
  30: [
    { id: '45', platform: 'instagram', type: 'reel', color: 'bg-pink-500' },
    { id: '46', platform: 'youtube', type: 'short', color: 'bg-red-500' },
  ],
  31: [{ id: '47', platform: 'facebook', type: 'event', color: 'bg-blue-500' }],
};

const approvalQueue = [
  { id: 1, title: 'Najava utakmice: Dinamo vs Hajduk', platform: 'Instagram Reel', author: 'Tim za sadržaj', submitted: 'prije 2 sata', pillar: 'Dan utakmice' },
  { id: 2, title: 'Akademija u fokusu: Highlights omladinskog kupa', platform: 'TikTok video', author: 'Mediji akademije', submitted: 'prije 5 sati', pillar: 'Akademija' },
  { id: 3, title: 'Fan Q&A s Petkovićem', platform: 'YouTube Short', author: 'Odnosi s igračima', submitted: 'prije 1 dan', pillar: 'Igrači' },
  { id: 4, title: 'Iza kulisa: Trening', platform: 'Instagram karusel', author: 'Tim za sadržaj', submitted: 'prije 1 dan', pillar: 'Iza kulisa' },
  { id: 5, title: 'Navijački event dijaspore — Beč', platform: 'Facebook event', author: 'Tim za zajednicu', submitted: 'prije 2 dana', pillar: 'Zajednica' },
];

export default function ContentCalendar() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'approvals'>('calendar');

  // March 2026 starts on Sunday (0), but we use Monday-start
  // March 1, 2026 is a Sunday => index 6 (Mon=0)
  const firstDayOffset = 6; // Sunday = last column in Mon-start calendar
  const daysInMonth = 31;
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header title="KALENDAR SADRŽAJA" subtitle="Ožujak 2026 — Planiranje i odobrenja" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-gray-200 pb-1">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'calendar'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-dinamo-muted hover:text-gray-700'
            }`}
          >
            <Calendar size={16} className="inline mr-2" />
            Kalendar
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'approvals'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-dinamo-muted hover:text-gray-700'
            }`}
          >
            <Clock size={16} className="inline mr-2" />
            Red za odobrenje
            <span className="ml-2 text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded-full">{approvalQueue.length}</span>
          </button>
        </div>

        {activeTab === 'calendar' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6">
              <button className="p-2 text-dinamo-muted hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-bold text-gray-900">Ožujak 2026</h2>
              <button className="p-2 text-dinamo-muted hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="text-center text-xs text-dinamo-muted font-medium py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: totalCells }, (_, i) => {
                const dayNum = i - firstDayOffset + 1;
                const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
                const isToday = dayNum === 5;
                const posts = isCurrentMonth ? (calendarData[dayNum] || []) : [];

                return (
                  <div
                    key={i}
                    className={`min-h-[80px] p-2 rounded-lg border transition-colors ${
                      isToday
                        ? 'border-blue-500 bg-blue-50'
                        : isCurrentMonth
                          ? 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                          : 'border-transparent bg-transparent'
                    }`}
                  >
                    {isCurrentMonth && (
                      <>
                        <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-dinamo-muted'}`}>
                          {dayNum}
                        </span>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {posts.map((post) => (
                            <div
                              key={post.id}
                              className={`w-2.5 h-2.5 rounded-full ${post.color}`}
                              title={`${post.platform} - ${post.type}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
              <span className="text-xs text-dinamo-muted">Platforme:</span>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-pink-500" /><span className="text-xs text-dinamo-muted">Instagram</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-xs text-dinamo-muted">Facebook</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /><span className="text-xs text-dinamo-muted">TikTok</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-xs text-dinamo-muted">YouTube</span></div>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Čeka odobrenje</h2>
            <div className="space-y-3">
              {approvalQueue.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{item.pillar}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-dinamo-muted">{item.platform}</span>
                      <span className="text-xs text-dinamo-muted">|</span>
                      <span className="text-xs text-dinamo-muted">{item.author}</span>
                      <span className="text-xs text-dinamo-muted">|</span>
                      <span className="text-xs text-dinamo-muted">{item.submitted}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-600 text-white text-xs rounded-lg transition-colors">
                      <Check size={14} />
                      Odobri
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs rounded-lg border border-red-300 transition-colors">
                      <X size={14} />
                      Odbij
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
