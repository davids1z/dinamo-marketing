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
        <div className="h-6 bg-studio-surface-2 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-studio-surface-1 rounded" />)}
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
        <Activity size={20} className="text-emerald-400" />
        <h2 className="section-title">Zdravlje sustava</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
          isHealthy
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-amber-500/10 text-amber-400'
        }`}>
          {isHealthy ? 'Zdravo' : 'Degradirano'}
        </span>
      </div>

      <div className="space-y-3">
        {checks.map((check) => {
          const ok = check.status === 'ok' || check.status === 'healthy'
          return (
            <div key={check.name} className="flex items-center justify-between p-3 bg-studio-surface-1 rounded-lg">
              <div className="flex items-center gap-3">
                <check.icon size={18} className={ok ? 'text-emerald-400' : 'text-red-400'} />
                <div>
                  <p className="text-sm font-medium text-studio-text-primary">{check.name}</p>
                  {check.detail && <p className="text-xs text-studio-text-tertiary">{check.detail}</p>}
                </div>
              </div>
              {ok ? (
                <CheckCircle2 size={18} className="text-emerald-400" />
              ) : (
                <AlertCircle size={18} className="text-red-400" />
              )}
            </div>
          )
        })}
      </div>

      {Object.keys(breakers).length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-studio-text-tertiary uppercase tracking-wider mb-2">Circuit Breakers</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(breakers).map(([name, info]) => (
              <div key={name} className="flex items-center gap-2 p-2 bg-studio-surface-1 rounded text-xs">
                <Wifi size={14} className={
                  info.state === 'closed' ? 'text-emerald-400' :
                  info.state === 'half_open' ? 'text-amber-400' : 'text-red-400'
                } />
                <span className="text-studio-text-secondary truncate">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
