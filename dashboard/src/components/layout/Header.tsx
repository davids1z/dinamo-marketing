import { Bell, Search, Menu } from 'lucide-react'
import { useSidebar } from './Layout'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const { toggleSidebar } = useSidebar()

  return (
    <header className="h-16 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 bg-white sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu toggle */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <div className="min-w-0">
          <h2 className="font-headline text-lg sm:text-2xl tracking-wider text-gray-900 font-bold truncate">{title}</h2>
          {subtitle && <p className="text-xs sm:text-sm text-dinamo-muted truncate -mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {actions}
        {/* Search - hidden on small screens */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pretraži..."
            className="bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-dinamo-accent/50 w-48"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-dinamo-accent rounded-full" />
        </button>
      </div>
    </header>
  )
}
