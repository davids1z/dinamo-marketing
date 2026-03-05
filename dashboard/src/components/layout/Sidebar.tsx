import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Globe,
  Radio,
  Users,
  Heart,
  CalendarDays,
  Megaphone,
  BarChart3,
  MessageCircle,
  Ear,
  GraduationCap,
  MapPin,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useSidebar } from './Layout'

const navigation = [
  { name: 'Nadzorna ploča', href: '/', icon: LayoutDashboard },
  { name: 'Istraživanje tržišta', href: '/market-research', icon: Globe },
  { name: 'Audit kanala', href: '/channels', icon: Radio },
  { name: 'Konkurencija', href: '/competitors', icon: Users },
  { name: 'Uvidi o navijačima', href: '/fans', icon: Heart },
  { name: 'Kalendar sadržaja', href: '/content', icon: CalendarDays },
  { name: 'Kampanje', href: '/campaigns', icon: Megaphone },
  { name: 'Analitika', href: '/analytics', icon: BarChart3 },
  { name: 'Sentiment', href: '/sentiment', icon: MessageCircle },
  { name: 'Social listening', href: '/social-listening', icon: Ear },
  { name: 'Akademija', href: '/academy', icon: GraduationCap },
  { name: 'Dijaspora', href: '/diaspora', icon: MapPin },
  { name: 'Izvještaji', href: '/reports', icon: FileText },
  { name: 'Postavke', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const { collapsed, mobileOpen, setMobileOpen, toggleSidebar } = useSidebar()
  const location = useLocation()

  // Close mobile menu on navigation
  const handleNavClick = () => {
    if (mobileOpen) setMobileOpen(false)
  }

  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 1024

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-50 bg-dinamo-dark-light border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out',
        // Desktop: collapsed or expanded
        !isMobileView && (collapsed ? 'w-[72px]' : 'w-64'),
        // Mobile: off-screen by default, slide in when open
        isMobileView && (mobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full')
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5 justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-dinamo-accent flex items-center justify-center flex-shrink-0">
            <span className="font-headline text-lg text-gray-900 font-bold">D</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-headline text-xl tracking-wider text-white leading-none font-bold truncate">
                DINAMO
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-dinamo-accent truncate">
                Marketing Platforma
              </p>
            </div>
          )}
        </div>
        {/* Close button on mobile */}
        {isMobileView && mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg text-dinamo-muted-light hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Collapse toggle (desktop only) */}
      {!isMobileView && (
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 z-50 w-6 h-6 rounded-full bg-dinamo-dark-light border border-white/10 flex items-center justify-center text-dinamo-muted-light hover:text-white hover:bg-dinamo-accent/20 transition-colors shadow-lg"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const isActive = item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href)

            return (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  end={item.href === '/'}
                  onClick={handleNavClick}
                  title={collapsed ? item.name : undefined}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 relative group',
                    collapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2',
                    isActive
                      ? 'bg-dinamo-accent/15 text-dinamo-accent'
                      : 'text-dinamo-muted-light hover:text-white hover:bg-white/5'
                  )}
                >
                  {isActive && !collapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-dinamo-accent rounded-r" />
                  )}
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                  {/* Tooltip on collapsed */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-dinamo-dark rounded-md text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none shadow-lg z-50">
                      {item.name}
                    </div>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className={clsx('p-3 border-t border-white/5', collapsed && 'flex justify-center')}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          {!collapsed && <span className="text-xs text-dinamo-muted-light truncate">Mock način aktivan</span>}
        </div>
      </div>
    </aside>
  )
}
