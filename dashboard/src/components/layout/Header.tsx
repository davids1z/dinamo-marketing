import { useState, useRef, useEffect } from 'react'
import { Bell, Search, Menu, TrendingUp, AlertTriangle, Zap, Calendar, Trophy, ChevronRight } from 'lucide-react'
import { useSidebar } from './Layout'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

interface Notification {
  id: number
  icon: typeof TrendingUp
  iconColor: string
  iconBg: string
  accentColor: string
  title: string
  desc: string
  detail: string
  time: string
  unread: boolean
}

const notifications: Notification[] = [
  {
    id: 1,
    icon: TrendingUp,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    accentColor: 'border-l-emerald-500',
    title: 'Engagement porastao +23%',
    desc: 'Instagram reels imaju 23% veći engagement nego prošli tjedan',
    detail: 'Prosječni engagement rate za Reels porastao s 6.2% na 7.6% u zadnjih 7 dana. Najbolji post: "Petković golčina" s 9.4% engagement rate-om. Preporuka: nastaviti s kratkim highlight formatom.',
    time: 'Prije 2h',
    unread: true,
  },
  {
    id: 2,
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    accentColor: 'border-l-amber-500',
    title: 'Negativni sentiment detektiran',
    desc: 'Porast negativnih komentara na objavu o transferu',
    detail: 'Detektiran porast negativnog sentimenta od 34% na posljednju objavu o mogućem transferu igrača. 89 negativnih komentara u zadnja 4 sata. Preporuka: pripremiti službeno priopćenje.',
    time: 'Prije 4h',
    unread: true,
  },
  {
    id: 3,
    icon: Zap,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    accentColor: 'border-l-blue-500',
    title: 'Viralni sadržaj',
    desc: 'TikTok video "Petković golčina" prešao 500K pregleda',
    detail: 'Video je dosegao 500K pregleda za samo 6 sati. Share rate: 4.2% (prosjek 1.8%). Dolazi na For You Page u regiji. Preporuka: cross-post na Instagram Reels i YouTube Shorts.',
    time: 'Prije 6h',
    unread: false,
  },
  {
    id: 4,
    icon: Calendar,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-50',
    accentColor: 'border-l-violet-500',
    title: 'Zakazane objave sutra',
    desc: '4 objave čekaju odobrenje za sutrašnji matchday',
    detail: 'Čekaju odobrenje: 1× Instagram Reel (Matchday hype), 1× TikTok (Tunnel cam), 1× Facebook Event, 1× YouTube Short. Rok za odobrenje: danas do 20:00.',
    time: 'Prije 8h',
    unread: false,
  },
  {
    id: 5,
    icon: Trophy,
    iconColor: 'text-dinamo-accent-dark',
    iconBg: 'bg-lime-50',
    accentColor: 'border-l-dinamo-accent',
    title: 'Mjesečni cilj dostignut',
    desc: 'Ukupni reach premašio 2M — novi rekord!',
    detail: 'Ukupni reach za ožujak: 2.14M (cilj: 2M). To je porast od 28% u odnosu na veljače. Top platforma: Instagram (1.2M), TikTok (680K), YouTube (260K). Novi mjesečni rekord!',
    time: 'Prije 1d',
    unread: false,
  },
]

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const { toggleSidebar } = useSidebar()
  const [showNotifs, setShowNotifs] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState<number[]>([])
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
        setExpandedId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Lock body scroll when notification dropdown is open
  useEffect(() => {
    if (showNotifs) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showNotifs])

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
            onClick={() => { setShowNotifs(!showNotifs); setExpandedId(null) }}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-[11px] font-bold rounded-full px-1.5 ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <>
            {/* Backdrop overlay to block background interaction */}
            <div className="fixed inset-0 z-40" onClick={() => { setShowNotifs(false); setExpandedId(null) }} />
            <div
              className="absolute top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in"
              style={{ width: '380px', maxWidth: 'calc(100vw - 24px)', right: '-8px' }}
            >
              {/* Header */}
              <div className="px-5 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Obavijesti</h3>
                    <p className="text-[11px] text-gray-500">{visibleNotifs.length} ukupno · {unreadCount} nepročitane</p>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <span className="text-[11px] font-semibold text-white bg-red-500 px-2.5 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-[440px] overflow-y-auto divide-y divide-gray-50">
                {visibleNotifs.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Nema obavijesti</p>
                  </div>
                ) : (
                  visibleNotifs.map((n) => {
                    const isExpanded = expandedId === n.id
                    return (
                      <div key={n.id} className={`border-l-[3px] ${n.accentColor} transition-colors ${n.unread ? 'bg-blue-50/20' : 'bg-white'}`}>
                        <div
                          className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50/80 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : n.id)}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${n.iconBg}`}>
                            <n.icon className={`w-4 h-4 ${n.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-semibold text-gray-900 leading-tight truncate">{n.title}</p>
                              {n.unread && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                            </div>
                            <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{n.desc}</p>
                            <p className="text-[11px] text-gray-400 mt-1">{n.time}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                            <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-4 pb-3.5 ml-12 mr-4 animate-fade-in">
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                              <p className="text-[12px] text-gray-600 leading-relaxed">{n.detail}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDismissed([...dismissed, n.id]); setExpandedId(null) }}
                              className="mt-2 text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                            >
                              Ukloni obavijest
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
