import { type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { FileQuestion } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  /** 'default' = centered in content area, 'hero' = full-width card with gradient */
  variant?: 'default' | 'hero'
}

export default function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  if (variant === 'hero') {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-accent/5 via-studio-surface-1 to-blue-50 border border-studio-border rounded-2xl p-10 sm:p-14">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center mb-5">
            <Icon size={28} className="text-brand-accent" />
          </div>
          <h3 className="font-headline text-xl text-studio-text-primary mb-2 uppercase tracking-wide">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-studio-text-secondary leading-relaxed mb-6">
              {description}
            </p>
          )}
          {action}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-12 h-12 rounded-xl bg-studio-surface-2 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-brand-muted" />
      </div>
      <h3 className="font-headline text-xl text-studio-text-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-brand-muted mb-4 max-w-sm text-center">{description}</p>}
      {action}
    </div>
  )
}
