import { Instagram, Facebook, Youtube, Globe, Music2, Twitter, Linkedin, Link2 } from 'lucide-react'
import { clsx } from 'clsx'
import { PLATFORMS } from '../../utils/constants'

interface DataSourceBadgeProps {
  platforms: string[]
  variant?: 'dark' | 'light'
  className?: string
}

const icons: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Music2,
  linkedin: Linkedin,
  web: Globe,
  twitter: Twitter,
}

export default function DataSourceBadge({ platforms, variant = 'dark', className }: DataSourceBadgeProps) {
  if (platforms.length === 0) {
    return (
      <div
        className={clsx('flex items-center gap-1', className)}
        title="Nema povezanih izvora podataka"
      >
        <div className={clsx(
          'w-5 h-5 rounded-full flex items-center justify-center',
          variant === 'light' ? 'bg-white/10' : 'bg-studio-surface-2'
        )}>
          <Link2 size={10} className={variant === 'light' ? 'text-white/40' : 'text-studio-text-disabled'} />
        </div>
      </div>
    )
  }

  const visible = platforms.slice(0, 3)
  const tooltipParts = platforms.map(p => {
    const config = PLATFORMS[p as keyof typeof PLATFORMS]
    return config?.name || p
  })
  const tooltip = `Izvor: ${tooltipParts.join(', ')}`

  return (
    <div className={clsx('flex items-center -space-x-1', className)} title={tooltip}>
      {visible.map(platform => {
        const Icon = icons[platform] || Globe
        const config = PLATFORMS[platform as keyof typeof PLATFORMS]
        return (
          <div
            key={platform}
            className={clsx(
              'w-5 h-5 rounded-full flex items-center justify-center ring-1',
              variant === 'light'
                ? 'bg-white/10 ring-white/10'
                : 'bg-studio-surface-2 ring-studio-border'
            )}
          >
            <Icon
              size={10}
              style={{ color: config?.color || '#6B7280' }}
            />
          </div>
        )
      })}
    </div>
  )
}
