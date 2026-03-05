import { clsx } from 'clsx'

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  aktivna: 'bg-green-100 text-green-700',
  published: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-700',
  winner: 'bg-green-100 text-green-700',
  healthy: 'bg-green-100 text-green-700',
  running: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-blue-100 text-blue-700',
  pending_review: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-gray-100 text-gray-600',
  paused: 'bg-yellow-100 text-yellow-700',
  pauzirana: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  loser: 'bg-red-100 text-red-700',
  completed: 'bg-purple-100 text-purple-700',
  archived: 'bg-gray-100 text-gray-500',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] || 'bg-gray-100 text-gray-600'
  const label = status.replace(/_/g, ' ')

  return (
    <span className={clsx('badge capitalize', style, className)}>
      {label}
    </span>
  )
}
