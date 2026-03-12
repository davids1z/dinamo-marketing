import { FileQuestion } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <FileQuestion className="w-12 h-12 text-brand-muted mb-4" />
      <h3 className="font-headline text-xl text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-brand-muted mb-4">{description}</p>}
      {action}
    </div>
  )
}
