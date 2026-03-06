import { usePolling } from '../../hooks/useApi'
import { BarChart3 } from 'lucide-react'

interface QuotaUsage {
  service: string
  daily_used: number
  monthly_used: number
  daily_limit: number
}

const serviceLabels: Record<string, string> = {
  meta: 'Meta Graph API',
  tiktok: 'TikTok API',
  youtube: 'YouTube API',
  claude: 'Claude AI',
  sports_data: 'Sports Data',
  image_gen: 'Generiranje slika',
}

export default function QuotaDisplay() {
  const { data, loading } = usePolling<QuotaUsage[]>('/settings/quotas', 60000)

  if (loading && !data) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}
        </div>
      </div>
    )
  }

  const quotas = data || []

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={20} className="text-indigo-600" />
        <h2 className="section-title">API kvote</h2>
      </div>

      {quotas.length === 0 ? (
        <p className="text-sm text-dinamo-muted">Nema podataka o kvotama</p>
      ) : (
        <div className="space-y-4">
          {quotas.map((q) => {
            const pct = q.daily_limit > 0 ? Math.min((q.daily_used / q.daily_limit) * 100, 100) : 0
            const color =
              pct >= 90 ? 'bg-red-500' :
              pct >= 70 ? 'bg-yellow-500' :
              'bg-green-500'

            return (
              <div key={q.service}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {serviceLabels[q.service] || q.service}
                  </span>
                  <span className="text-xs text-dinamo-muted">
                    {q.daily_used} / {q.daily_limit} danas
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-dinamo-muted mt-0.5">
                  Mjesečno: {q.monthly_used} poziva
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
