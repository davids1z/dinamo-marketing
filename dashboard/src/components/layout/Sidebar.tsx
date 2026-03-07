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
  Shield,
  X,
  LogOut,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useSidebar } from './Layout'
import { useAuth } from '../../contexts/AuthContext'

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
  { name: 'Administracija', href: '/admin', icon: Shield, adminOnly: true },
] as const

export default function Sidebar() {
  const { collapsed, mobileOpen, setMobileOpen, toggleSidebar } = useSidebar()
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleNavClick = () => {
    if (mobileOpen) setMobileOpen(false)
  }

  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 1024

  return (
    <>
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 bg-dinamo-dark-light border-r border-white/[0.06] flex flex-col transition-all duration-300 ease-in-out',
          !isMobileView && (collapsed ? 'w-[72px]' : 'w-64'),
          isMobileView && (mobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full')
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/[0.06] justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-dinamo-accent flex items-center justify-center flex-shrink-0 shadow-sm">
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
          {isMobileView && mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-dinamo-muted-light hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-0.5">
            {navigation.filter((item) => !('adminOnly' in item && item.adminOnly) || user?.role === 'admin').map((item) => {
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
                      'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 relative group',
                      collapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2.5',
                      isActive
                        ? 'bg-dinamo-accent/15 text-dinamo-accent'
                        : 'text-dinamo-muted-light hover:text-white hover:bg-white/[0.06]'
                    )}
                  >
                    {isActive && !collapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-dinamo-accent rounded-r-full" />
                    )}
                    <item.icon className={clsx('w-[18px] h-[18px] flex-shrink-0', isActive && 'drop-shadow-[0_0_4px_rgba(184,255,0,0.3)]')} />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-dinamo-dark rounded-lg text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none shadow-xl z-50 border border-white/10">
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
        <div className={clsx('p-3 border-t border-white/[0.06]', collapsed && 'flex flex-col items-center gap-2')}>
          {!collapsed && user && (
            <div className="flex items-center gap-2.5 mb-3 px-1">
              <div className="w-8 h-8 rounded-xl bg-dinamo-accent/15 flex items-center justify-center flex-shrink-0 ring-1 ring-dinamo-accent/20">
                <span className="text-xs font-bold text-dinamo-accent">{user.full_name?.[0] || 'U'}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white font-medium truncate">{user.full_name}</p>
                <p className="text-[10px] text-dinamo-muted-light truncate">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title={collapsed ? 'Odjava' : undefined}
            className={clsx(
              'flex items-center gap-2 text-dinamo-muted-light hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors w-full',
              collapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2'
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="text-xs">Odjava</span>}
          </button>
          <div className="flex items-center gap-2 mt-1 px-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            {!collapsed && <span className="text-[10px] text-dinamo-muted-light truncate">Mock način aktivan</span>}
          </div>
        </div>
      </aside>

      {/* Collapse toggle */}
      {!isMobileView && (
        <button
          onClick={toggleSidebar}
          className="fixed top-1/2 -translate-y-1/2 z-[51] w-6 h-6 rounded-full bg-dinamo-dark-lighter border border-dinamo-dark-border shadow-md flex items-center justify-center hover:border-dinamo-accent hover:bg-dinamo-accent hover:text-gray-900 text-gray-400 transition-all duration-200 hover:shadow-lg hover:scale-110"
          style={{ left: collapsed ? 72 - 12 : 256 - 12 }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="transition-transform duration-200" style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
            <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </>
  )
}
