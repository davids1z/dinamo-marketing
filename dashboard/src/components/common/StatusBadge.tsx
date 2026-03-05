import { clsx } from 'clsx'

const statusStyles: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400',
  published: 'bg-green-500/10 text-green-400',
  approved: 'bg-green-500/10 text-green-400',
  winner: 'bg-green-500/10 text-green-400',
  healthy: 'bg-green-500/10 text-green-400',
  running: 'bg-blue-500/10 text-blue-400',
  scheduled: 'bg-blue-500/10 text-blue-400',
  pending_review: 'bg-yellow-500/10 text-yellow-400',
  draft: 'bg-gray-500/10 text-gray-400',
  paused: 'bg-yellow-500/10 text-yellow-400',
  failed: 'bg-red-500/10 text-red-400',
  loser: 'bg-red-500/10 text-red-400',
  completed: 'bg-purple-500/10 text-purple-400',
  archived: 'bg-gray-500/10 text-gray-500',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] || 'bg-gray-500/10 text-gray-400'
  const label = status.replace(/_/g, ' ')

  return (
    <span className={clsx('badge capitalize', style, className)}>
      {label}
    </span>
  )
}
