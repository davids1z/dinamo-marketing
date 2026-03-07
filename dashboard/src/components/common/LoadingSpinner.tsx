import { clsx } from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div
        className={clsx(
          'animate-spin rounded-full border-2 border-dinamo-accent/20 border-t-dinamo-accent',
          sizes[size]
        )}
      />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-dinamo-muted mt-4">Ucitavanje...</p>
      </div>
    </div>
  )
}

export function CardSkeleton({ count = 4, cols }: { count?: number; cols?: string }) {
  return (
    <div className={cols || "metric-grid"}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-8 w-28 bg-gray-200 rounded" />
            </div>
            <div className="h-8 w-8 bg-gray-200 rounded" />
          </div>
          <div className="h-3 w-32 bg-gray-200 rounded mt-3" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="card animate-pulse">
      <div className="h-4 w-48 bg-gray-200 rounded mb-4" />
      <div className="flex items-end gap-1" style={{ height }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card animate-pulse">
      <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
      <div className="space-y-3">
        <div className="flex gap-4 pb-2 border-b border-gray-100">
          {[120, 80, 60, 80, 60].map((w, i) => (
            <div key={i} className="h-3 bg-gray-200 rounded" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2">
            {[120, 80, 60, 80, 60].map((w, j) => (
              <div key={j} className="h-3 bg-gray-100 rounded" style={{ width: w + Math.random() * 20 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="page-wrapper space-y-6">
      <CardSkeleton count={4} />
      <ChartSkeleton />
      <TableSkeleton />
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
        <span className="text-red-400 text-xl">!</span>
      </div>
      <p className="text-gray-500 mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">
          Pokusaj ponovo
        </button>
      )}
    </div>
  )
}
