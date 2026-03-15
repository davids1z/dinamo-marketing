import { CheckCircle, Loader2, Clock } from 'lucide-react'

interface SyncStatusBadgeProps {
  hasConnectedChannels: boolean
  hasData: boolean
  lastRefreshed?: string | null
}

function formatRelativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'upravo sada'
  if (diff < 3600) return `prije ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `prije ${Math.floor(diff / 3600)}h`
  return `prije ${Math.floor(diff / 86400)} dana`
}

type SyncState = 'synced' | 'syncing' | 'waiting'

export default function SyncStatusBadge({ hasConnectedChannels, hasData, lastRefreshed }: SyncStatusBadgeProps) {
  let state: SyncState
  if (hasConnectedChannels && hasData) {
    state = 'synced'
  } else if (hasConnectedChannels && !hasData) {
    state = 'syncing'
  } else {
    state = 'waiting'
  }

  const config: Record<SyncState, {
    icon: React.ElementType
    bg: string
    text: string
    label: string
    tooltip: string
    animate?: boolean
  }> = {
    synced: {
      icon: CheckCircle,
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      label: 'Podaci ažurni',
      tooltip: lastRefreshed
        ? `Podaci su ažurni. Osvježeno ${formatRelativeTime(lastRefreshed)}.`
        : 'Podaci su ažurni.',
    },
    syncing: {
      icon: Loader2,
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      label: 'Sinkronizacija...',
      tooltip: 'Kanali su povezani — čekamo prvu sinkronizaciju podataka.',
      animate: true,
    },
    waiting: {
      icon: Clock,
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      label: 'Čekamo podatke',
      tooltip: 'Povežite kanale (Instagram, Facebook...) za prikaz metrika.',
    },
  }

  const c = config[state]
  const Icon = c.icon

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium ${c.bg} ${c.text}`}
      title={c.tooltip}
    >
      <Icon size={11} className={c.animate ? 'animate-spin' : ''} />
      <span className="hidden lg:inline">{c.label}</span>
    </div>
  )
}
