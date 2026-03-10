import { clsx } from 'clsx'

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400',
  aktivna: 'bg-emerald-500/10 text-emerald-400',
  published: 'bg-emerald-500/10 text-emerald-400',
  approved: 'bg-emerald-500/10 text-emerald-400',
  winner: 'bg-emerald-500/10 text-emerald-400',
  healthy: 'bg-emerald-500/10 text-emerald-400',
  running: 'bg-blue-500/10 text-blue-400',
  scheduled: 'bg-blue-500/10 text-blue-400',
  pending_review: 'bg-amber-500/10 text-amber-400',
  draft: 'bg-white/5 text-studio-text-secondary',
  paused: 'bg-amber-500/10 text-amber-400',
  pauzirana: 'bg-amber-500/10 text-amber-400',
  failed: 'bg-red-500/10 text-red-400',
  loser: 'bg-red-500/10 text-red-400',
  completed: 'bg-purple-500/10 text-purple-400',
  archived: 'bg-white/5 text-studio-text-tertiary',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] || 'bg-white/5 text-studio-text-secondary'
  const label = status.replace(/_/g, ' ')

  return (
    <span className={clsx('badge capitalize', style, className)}>
      {label}
    </span>
  )
}
