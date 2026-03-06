import { useState, useRef, useEffect } from 'react'
import { Bell, Search, Menu, TrendingUp, AlertTriangle, Zap, ChevronRight } from 'lucide-react'
import { useSidebar } from './Layout'
import { useNotifications, type Notification } from '../../hooks/useNotifications'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

const severityConfig: Record<string, { icon: typeof TrendingUp; iconColor: string; iconBg: string; accentColor: string }> = {
  info: { icon: TrendingUp, iconColor: 'text-blue-600', iconBg: 'bg-blue-50', accentColor: 'border-l-blue-500' },
  warning: { icon: AlertTriangle, iconColor: 'text-amber-600', iconBg: 'bg-amber-50', accentColor: 'border-l-amber-500' },
  critical: { icon: Zap, iconColor: 'text-red-600', iconBg: 'bg-red-50', accentColor: 'border-l-red-500' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Upravo'
  if (mins < 60) return `Prije ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Prije ${hours}h`
  const days = Math.floor(hours / 24)
  return `Prije ${days}d`
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const { toggleSidebar } = useSidebar()
  const { notifications, unreadCount, markRead } = useNotifications()
  const [showNotifs, setShowNotifs] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
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

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white/80 backdrop-blur-xl sticky top-0 z-30 shadow-glass">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-500" />
        </button>
        <div className="min-w-0">
          <h2 className="font-headline text-lg sm:text-xl tracking-wider text-gray-900 font-bold truncate">{title}</h2>
          {subtitle && <p className="text-xs text-dinamo-muted truncate -mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {actions}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pretraži..."
            className="bg-gray-50/80 border border-gray-200/80 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-dinamo-accent/50 focus:ring-2 focus:ring-dinamo-accent/10 w-52 transition-all"
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifs(!showNotifs); setExpandedId(null) }}
            className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <>
            {/* Backdrop overlay to block background interaction */}
            <div className="fixed inset-0 z-40" onClick={() => { setShowNotifs(false); setExpandedId(null) }} />
            <div
              className="absolute top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in"
              style={{ width: '380px', maxWidth: 'calc(100vw - 24px)', right: '-8px' }}
            >
              {/* Header */}
              <div className="px-5 py-4 bg-slate-50/80 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Obavijesti</h3>
                    <p className="text-[11px] text-gray-500">{notifications.length} ukupno · {unreadCount} nepročitane</p>
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
                {notifications.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Nema obavijesti</p>
                  </div>
                ) : (
                  notifications.map((n: Notification) => {
                    const isExpanded = expandedId === n.id
                    const cfg = severityConfig[n.severity] || severityConfig.info
                    const Icon = cfg.icon
                    return (
                      <div key={n.id} className={`border-l-[3px] ${cfg.accentColor} transition-colors ${!n.is_read ? 'bg-blue-50/30' : 'bg-white'}`}>
                        <div
                          className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50/80 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : n.id)}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
                            <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-semibold text-gray-900 leading-tight truncate">{n.title}</p>
                              {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                            </div>
                            <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                            <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                            <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-4 pb-3.5 ml-12 mr-4 animate-fade-in">
                            {n.link && (
                              <a href={n.link} className="text-[12px] text-blue-600 hover:underline block mb-2">
                                Pogledaj detalje →
                              </a>
                            )}
                            {!n.is_read && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markRead(n.id); setExpandedId(null) }}
                                className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                              >
                                Označi kao pročitano
                              </button>
                            )}
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
