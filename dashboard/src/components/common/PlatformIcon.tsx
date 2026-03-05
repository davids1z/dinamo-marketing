import { Instagram, Facebook, Youtube, Globe, Music2, Twitter } from 'lucide-react'
import { clsx } from 'clsx'
import { PLATFORMS } from '../../utils/constants'

interface PlatformIconProps {
  platform: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const icons: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
  twitter: Twitter,
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

export default function PlatformIcon({ platform, size = 'md', showLabel = false }: PlatformIconProps) {
  const Icon = icons[platform] || Globe
  const config = PLATFORMS[platform as keyof typeof PLATFORMS]

  return (
    <div className="flex items-center gap-2">
      <Icon className={clsx(sizes[size])} style={{ color: config?.color || '#6B7280' }} />
      {showLabel && <span className="text-sm text-gray-300">{config?.name || platform}</span>}
    </div>
  )
}
