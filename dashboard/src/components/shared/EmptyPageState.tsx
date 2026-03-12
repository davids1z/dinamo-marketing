import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

interface CTAButton {
  label: string
  to: string
  icon?: LucideIcon
  variant?: 'primary' | 'secondary'
}

interface EmptyPageStateProps {
  icon: LucideIcon
  title: string
  description: string
  actions?: CTAButton[]
  iconColor?: string
  iconBg?: string
}

export default function EmptyPageState({
  icon: Icon,
  title,
  description,
  actions = [],
  iconColor = 'text-studio-text-disabled',
  iconBg = 'bg-studio-surface-3',
}: EmptyPageStateProps) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mb-5`}>
        <Icon size={28} className={iconColor} />
      </div>
      <h3 className="text-base font-semibold text-studio-text-primary mb-2">{title}</h3>
      <p className="text-sm text-studio-text-tertiary max-w-md mb-6 leading-relaxed">{description}</p>
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actions.map((action) => {
            const ActionIcon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className={
                  action.variant === 'secondary'
                    ? 'btn-secondary flex items-center gap-2 text-sm'
                    : 'btn-primary flex items-center gap-2 text-sm'
                }
              >
                {ActionIcon && <ActionIcon size={16} />}
                {action.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
