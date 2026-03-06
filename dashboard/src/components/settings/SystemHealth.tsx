import { usePolling } from '../../hooks/useApi'
import { Activity, Database, Server, Wifi, AlertCircle, CheckCircle2 } from 'lucide-react'

interface HealthData {
  status: string
  checks: {
    database: { status: string; latency_ms?: number }
    redis: { status: string }
    celery: { status: string; workers?: number }
    circuit_breakers?: Record<string, { state: string; failures: number }>
  }
}

export default function SystemHealth() {
  const { data, loading } = usePolling<HealthData>('/settings/health', 30000)

  if (loading && !data) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded" />)}
        </div>
      </div>
    )
  }

  const health = data
  const isHealthy = health?.status === 'healthy'

  const checks = [
    {
      name: 'Baza podataka',
      icon: Database,
      status: health?.checks?.database?.status || 'unknown',
      detail: health?.checks?.database?.latency_ms
        ? `${health.checks.database.latency_ms}ms latencija`
        : undefined,
    },
    {
      name: 'Redis',
      icon: Server,
      status: health?.checks?.redis?.status || 'unknown',
    },
    {
      name: 'Celery radnici',
      icon: Activity,
      status: health?.checks?.celery?.status || 'unknown',
      detail: health?.checks?.celery?.workers
        ? `${health.checks.celery.workers} aktivnih`
        : undefined,
    },
  ]

  const breakers = health?.checks?.circuit_breakers || {}

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <Activity size={20} className="text-green-600" />
        <h2 className="section-title">Zdravlje sustava</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
          isHealthy
            ? 'bg-green-100 text-green-700'
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {isHealthy ? 'Zdravo' : 'Degradirano'}
        </span>
      </div>

      <div className="space-y-3">
        {checks.map((check) => {
          const ok = check.status === 'ok' || check.status === 'healthy'
          return (
            <div key={check.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <check.icon size={18} className={ok ? 'text-green-600' : 'text-red-500'} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{check.name}</p>
                  {check.detail && <p className="text-xs text-dinamo-muted">{check.detail}</p>}
                </div>
              </div>
              {ok ? (
                <CheckCircle2 size={18} className="text-green-500" />
              ) : (
                <AlertCircle size={18} className="text-red-500" />
              )}
            </div>
          )
        })}
      </div>

      {Object.keys(breakers).length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Circuit Breakers</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(breakers).map(([name, info]) => (
              <div key={name} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                <Wifi size={14} className={
                  info.state === 'closed' ? 'text-green-500' :
                  info.state === 'half_open' ? 'text-yellow-500' : 'text-red-500'
                } />
                <span className="text-gray-700 truncate">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
