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

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="metric-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-3 w-20 bg-dinamo-dark-lighter rounded" />
              <div className="h-8 w-28 bg-dinamo-dark-lighter rounded" />
            </div>
            <div className="h-8 w-8 bg-dinamo-dark-lighter rounded" />
          </div>
          <div className="h-3 w-32 bg-dinamo-dark-lighter rounded mt-3" />
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
        <span className="text-red-400 text-xl">!</span>
      </div>
      <p className="text-gray-400 mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">
          Pokusaj ponovo
        </button>
      )}
    </div>
  )
}
