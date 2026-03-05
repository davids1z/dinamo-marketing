import { useState, useRef, useEffect } from 'react'
import { Bell, Search, Menu, TrendingUp, AlertTriangle, Zap, Calendar, Trophy, X } from 'lucide-react'
import { useSidebar } from './Layout'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

const notifications = [
  {
    id: 1,
    icon: TrendingUp,
    color: 'text-green-500 bg-green-50',
    title: 'Engagement porastao +23%',
    desc: 'Instagram reels imaju 23% veći engagement nego prošli tjedan',
    time: 'Prije 2h',
    unread: true,
  },
  {
    id: 2,
    icon: AlertTriangle,
    color: 'text-amber-500 bg-amber-50',
    title: 'Negativni sentiment detektiran',
    desc: 'Porast negativnih komentara na posljednju objavu o transferu',
    time: 'Prije 4h',
    unread: true,
  },
  {
    id: 3,
    icon: Zap,
    color: 'text-blue-500 bg-blue-50',
    title: 'Viralni sadržaj',
    desc: 'TikTok video "Petković golčina" prešao 500K pregleda',
    time: 'Prije 6h',
    unread: true,
  },
  {
    id: 4,
    icon: Calendar,
    color: 'text-purple-500 bg-purple-50',
    title: 'Zakazane objave sutra',
    desc: '4 objave čekaju odobrenje za sutrašnji matchday',
    time: 'Prije 8h',
    unread: false,
  },
  {
    id: 5,
    icon: Trophy,
    color: 'text-dinamo-accent bg-lime-50',
    title: 'Mjesečni cilj dostignut',
    desc: 'Ukupni reach premašio 2M za ovaj mjesec — novi rekord!',
    time: 'Prije 1d',
    unread: false,
  },
]

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const { toggleSidebar } = useSidebar()
  const [showNotifs, setShowNotifs] = useState(false)
  const [dismissed, setDismissed] = useState<number[]>([])
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const visibleNotifs = notifications.filter(n => !dismissed.includes(n.id))
  const unreadCount = visibleNotifs.filter(n => n.unread).length

  return (
    <header className="h-16 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 bg-white sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
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
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pretraži..."
            className="bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-dinamo-accent/50 w-48"
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-headline text-sm font-bold tracking-wider text-gray-900">OBAVIJESTI</h3>
                {unreadCount > 0 && (
                  <span className="text-xs font-medium text-dinamo-accent bg-dinamo-accent/10 px-2 py-0.5 rounded-full">
                    {unreadCount} novo
                  </span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {visibleNotifs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">Nema obavijesti</div>
                ) : (
                  visibleNotifs.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 ${n.unread ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${n.color}`}>
                        <n.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{n.title}</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDismissed([...dismissed, n.id]) }}
                            className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.desc}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                      </div>
                      {n.unread && <div className="w-2 h-2 rounded-full bg-dinamo-accent flex-shrink-0 mt-1.5" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
