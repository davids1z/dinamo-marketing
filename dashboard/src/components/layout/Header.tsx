import { Bell, Search } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-6">
      <div>
        <h2 className="font-headline text-2xl tracking-wider text-white font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-dinamo-muted -mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dinamo-muted" />
          <input
            type="text"
            placeholder="Pretraži..."
            className="bg-dinamo-dark border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm text-gray-300 placeholder-dinamo-muted focus:outline-none focus:border-dinamo-accent/50 w-48"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
          <Bell className="w-5 h-5 text-dinamo-muted" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-dinamo-accent rounded-full" />
        </button>
      </div>
    </header>
  )
}
