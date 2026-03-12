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
  FlaskConical,
  Settings,
  Shield,
  Building2,
  X,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useSidebar } from './Layout'
import { useAuth } from '../../contexts/AuthContext'
import { useClient } from '../../contexts/ClientContext'

// --- Role hierarchy ---
type NavRole = 'viewer' | 'moderator' | 'admin' | 'superadmin'

const ROLE_LEVEL: Record<NavRole, number> = {
  viewer: 0,
  moderator: 1,
  admin: 2,
  superadmin: 3,
}

function hasAccess(userRole: NavRole | null, required: NavRole): boolean {
  if (!userRole) return false
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[required]
}

// --- Navigation items ---
interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  requiredRole: NavRole
}

const navigation: NavItem[] = [
  // Viewer — everyone
  { name: 'Nadzorna ploča', href: '/', icon: LayoutDashboard, requiredRole: 'viewer' },
  { name: 'Istraživanje tržišta', href: '/market-research', icon: Globe, requiredRole: 'viewer' },
  { name: 'Analitika', href: '/analytics', icon: BarChart3, requiredRole: 'viewer' },
  { name: 'Izvještaji', href: '/reports', icon: FileText, requiredRole: 'viewer' },
  { name: 'Profil klijenta', href: '/brand-profile', icon: Building2, requiredRole: 'viewer' },

  // Moderator
  { name: 'Audit kanala', href: '/channels', icon: Radio, requiredRole: 'moderator' },
  { name: 'Konkurencija', href: '/competitors', icon: Users, requiredRole: 'moderator' },
  { name: 'Segmentacija korisnika', href: '/fans', icon: Heart, requiredRole: 'moderator' },
  { name: 'Kalendar sadržaja', href: '/content', icon: CalendarDays, requiredRole: 'moderator' },
  { name: 'Kampanje', href: '/campaigns', icon: Megaphone, requiredRole: 'moderator' },
  { name: 'Sentiment', href: '/sentiment', icon: MessageCircle, requiredRole: 'moderator' },
  { name: 'Social listening', href: '/social-listening', icon: Ear, requiredRole: 'moderator' },
  { name: 'Geografska tržišta', href: '/diaspora', icon: MapPin, requiredRole: 'moderator' },

  // Admin
  { name: 'Partneri & kreatori', href: '/academy', icon: GraduationCap, requiredRole: 'admin' },
  { name: 'Istraživanje kampanja', href: '/campaign-research', icon: FlaskConical, requiredRole: 'admin' },
  { name: 'Postavke', href: '/settings', icon: Settings, requiredRole: 'admin' },

  // Superadmin
  { name: 'Administracija', href: '/admin', icon: Shield, requiredRole: 'superadmin' },
]

export default function Sidebar() {
  const { collapsed, mobileOpen, setMobileOpen, toggleSidebar } = useSidebar()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { currentClient, clientRole } = useClient()

  const handleNavClick = () => {
    if (mobileOpen) setMobileOpen(false)
  }

  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 1024

  // Effective role: superadmin overrides, else use client role
  const effectiveRole: NavRole = user?.is_superadmin
    ? 'superadmin'
    : (clientRole as NavRole) || 'viewer'

  const filteredNav = navigation.filter((item) => hasAccess(effectiveRole, item.requiredRole))

  // Group into sections
  const sections = [
    { label: null, items: filteredNav.filter((i) => i.requiredRole === 'viewer') },
    { label: 'Upravljanje', items: filteredNav.filter((i) => i.requiredRole === 'moderator') },
    {
      label: 'Administracija',
      items: filteredNav.filter(
        (i) => i.requiredRole === 'admin' || i.requiredRole === 'superadmin'
      ),
    },
  ].filter((s) => s.items.length > 0)

  return (
    <>
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 bg-studio-surface-0 flex flex-col transition-all duration-300 ease-in-out border-r border-studio-border',
          !isMobileView && (collapsed ? 'w-[72px]' : 'w-64'),
          isMobileView && (mobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full')
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-studio-border justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-accent flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="font-headline text-sm text-brand-primary font-bold">S1Z</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-headline text-lg tracking-wider text-studio-text-primary leading-none font-bold truncate">
                  SHIFTONEZERO
                </h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-studio-text-tertiary truncate">
                  Marketing Platforma
                </p>
              </div>
            )}
          </div>
          {isMobileView && mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-studio-text-secondary hover:text-studio-text-primary hover:bg-studio-surface-3 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {sections.map((section, idx) => (
            <div key={idx}>
              {/* Section label */}
              {section.label && !collapsed && (
                <div className="px-3 pt-4 pb-2">
                  <span className="text-[10px] uppercase tracking-widest text-studio-text-tertiary font-semibold">
                    {section.label}
                  </span>
                </div>
              )}
              {/* Collapsed divider */}
              {section.label && collapsed && (
                <div className="mx-3 my-2 h-px bg-studio-border" />
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === '/'
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
                            ? 'bg-brand-accent/10 text-brand-accent'
                            : 'text-studio-text-secondary hover:text-studio-text-primary hover:bg-studio-surface-2'
                        )}
                      >
                        {isActive && !collapsed && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-accent rounded-r-full" />
                        )}
                        <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                        {collapsed && (
                          <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-studio-surface-4 rounded-lg text-xs text-studio-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none shadow-xl z-50">
                            {item.name}
                          </div>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={clsx('p-3 border-t border-studio-border', collapsed && 'flex flex-col items-center gap-2')}>
          {!collapsed && user && (
            <div className="flex items-center gap-2.5 mb-3 px-1">
              <div className="w-8 h-8 rounded-xl bg-studio-surface-3 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-brand-accent">{user.full_name?.[0] || 'U'}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-studio-text-primary font-medium truncate">{user.full_name}</p>
                <p className="text-[10px] text-studio-text-tertiary truncate capitalize">{currentClient?.role || user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title={collapsed ? 'Odjava' : undefined}
            className={clsx(
              'flex items-center gap-2 text-studio-text-secondary hover:text-studio-text-primary hover:bg-studio-surface-2 rounded-xl transition-colors w-full',
              collapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2'
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="text-xs">Odjava</span>}
          </button>
          <div className="flex items-center gap-2 mt-1 px-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            {!collapsed && <span className="text-[10px] text-studio-text-tertiary truncate">Demo način aktivan</span>}
          </div>
        </div>
      </aside>

      {/* Collapse toggle */}
      {!isMobileView && (
        <button
          onClick={toggleSidebar}
          className="fixed top-1/2 -translate-y-1/2 z-[51] w-6 h-6 rounded-full bg-studio-surface-3 border border-studio-border shadow-md flex items-center justify-center hover:border-brand-accent hover:bg-brand-accent hover:text-brand-primary text-studio-text-secondary transition-all duration-200 hover:shadow-lg hover:scale-110"
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
