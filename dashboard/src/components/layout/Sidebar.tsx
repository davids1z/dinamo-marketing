import { NavLink, useLocation, useNavigate } from 'react-router-dom'
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
  UsersRound,
  Activity,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useSidebar } from './Layout'
import { useAuth } from '../../contexts/AuthContext'
import { useClient } from '../../contexts/ClientContext'
import { prefetchRoute } from '../../utils/routePrefetch'

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

// --- Navigation sections ---
interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  requiredRole: NavRole
}

interface NavSection {
  label: string | null
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    label: null, // Core — no label, top level
    items: [
      { name: 'Nadzorna ploča', href: '/', icon: LayoutDashboard, requiredRole: 'viewer' },
      { name: 'Profil klijenta', href: '/brand-profile', icon: Building2, requiredRole: 'viewer' },
    ],
  },
  {
    label: 'Istraživanje',
    items: [
      { name: 'Istraživanje tržišta', href: '/market-research', icon: Globe, requiredRole: 'viewer' },
      { name: 'Konkurencija', href: '/competitors', icon: Users, requiredRole: 'moderator' },
      { name: 'Analitika', href: '/analytics', icon: BarChart3, requiredRole: 'viewer' },
      { name: 'Sentiment', href: '/sentiment', icon: MessageCircle, requiredRole: 'moderator' },
      { name: 'Social listening', href: '/social-listening', icon: Ear, requiredRole: 'moderator' },
      { name: 'Izvještaji', href: '/reports', icon: FileText, requiredRole: 'viewer' },
    ],
  },
  {
    label: 'Operativa',
    items: [
      { name: 'Audit kanala', href: '/channels', icon: Radio, requiredRole: 'moderator' },
      { name: 'Segmentacija korisnika', href: '/fans', icon: Heart, requiredRole: 'moderator' },
      { name: 'Kalendar sadržaja', href: '/content', icon: CalendarDays, requiredRole: 'moderator' },
      { name: 'Kampanje', href: '/campaigns', icon: Megaphone, requiredRole: 'moderator' },
      { name: 'Partneri & kreatori', href: '/academy', icon: GraduationCap, requiredRole: 'admin' },
      { name: 'Geografska tržišta', href: '/diaspora', icon: MapPin, requiredRole: 'moderator' },
      { name: 'Istraživanje kampanja', href: '/campaign-research', icon: FlaskConical, requiredRole: 'admin' },
    ],
  },
  {
    label: 'Administracija',
    items: [
      { name: 'Tim', href: '/team', icon: UsersRound, requiredRole: 'admin' },
      { name: 'Postavke', href: '/settings', icon: Settings, requiredRole: 'admin' },
      { name: 'Superadmin Panel', href: '/admin', icon: Shield, requiredRole: 'superadmin' },
    ],
  },
]

// --- System navigation (superadmin panel mode) ---
const systemSections: NavSection[] = [
  {
    label: null,
    items: [
      { name: 'Nadzorna ploča', href: '/admin', icon: Activity, requiredRole: 'superadmin' },
    ],
  },
  {
    label: 'Upravljanje',
    items: [
      { name: 'Klijenti', href: '/admin/clients', icon: Building2, requiredRole: 'superadmin' },
      { name: 'Korisnici', href: '/admin/users', icon: Users, requiredRole: 'superadmin' },
      { name: 'Audit Log', href: '/admin/audit', icon: FileText, requiredRole: 'superadmin' },
      { name: 'Postavke', href: '/settings', icon: Settings, requiredRole: 'superadmin' },
    ],
  },
]

export default function Sidebar() {
  const { collapsed, mobileOpen, setMobileOpen, toggleSidebar } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { currentClient, clientRole } = useClient()

  // Superadmin panel mode — auto-detect from URL
  const isSuperadmin = user?.is_superadmin ?? false
  const adminMode = location.pathname.startsWith('/admin')

  const handleNavClick = () => {
    if (mobileOpen) setMobileOpen(false)
  }

  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 1024

  // Effective role: superadmin overrides, else use client role
  const effectiveRole: NavRole = user?.is_superadmin
    ? 'superadmin'
    : (clientRole as NavRole) || 'viewer'

  // Filter sections by role
  const filteredSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasAccess(effectiveRole, item.requiredRole)),
    }))
    .filter((section) => section.items.length > 0)

  // When in admin mode, show system navigation instead
  const activeSections = adminMode && isSuperadmin ? systemSections : filteredSections

  return (
    <>
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 bg-white flex flex-col transition-all duration-300 ease-in-out border-r border-slate-200/70 shadow-[2px_0_8px_rgba(0,0,0,0.04)]',
          !isMobileView && (collapsed ? 'w-[72px]' : 'w-64'),
          isMobileView && (mobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full')
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-200/70 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm',
              adminMode && isSuperadmin ? 'bg-red-500' : 'bg-brand-accent'
            )}>
              {adminMode && isSuperadmin ? (
                <Shield className="w-4 h-4 text-white" />
              ) : (
                <span className="font-headline text-sm text-white font-bold">S1Z</span>
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-headline text-lg tracking-wider text-slate-800 leading-none font-bold truncate">
                  {adminMode && isSuperadmin ? 'ADMIN' : 'SHIFTONEZERO'}
                </h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 truncate">
                  {adminMode && isSuperadmin ? 'Upravljanje sustavom' : 'Marketing Platforma'}
                </p>
              </div>
            )}
          </div>
          {isMobileView && mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 sidebar-scroll">
          {activeSections.map((section, idx) => (
            <div key={idx}>
              {/* Section label */}
              {section.label && !collapsed && (
                <div className="px-3 pt-4 pb-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                    {section.label}
                  </span>
                </div>
              )}
              {/* Collapsed divider */}
              {section.label && collapsed && (
                <div className="mx-3 my-2 h-px bg-slate-200" />
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === '/' || item.href === '/admin'
                      ? location.pathname === item.href
                      : location.pathname.startsWith(item.href)

                  return (
                    <li key={item.name}>
                      <NavLink
                        to={item.href}
                        end={item.href === '/'}
                        onClick={handleNavClick}
                        onMouseEnter={() => prefetchRoute(item.href)}
                        onFocus={() => prefetchRoute(item.href)}
                        onTouchStart={() => prefetchRoute(item.href)}
                        viewTransition
                        title={collapsed ? item.name : undefined}
                        className={clsx(
                          'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 relative group',
                          collapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2.5',
                          isActive
                            ? 'bg-sky-50 text-sky-600'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        )}
                      >
                        {isActive && !collapsed && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sky-500 rounded-r-full" />
                        )}
                        <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                        {collapsed && (
                          <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-800 rounded-lg text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none shadow-xl z-50">
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
        <div className={clsx('p-3 border-t border-slate-200/70', collapsed && 'flex flex-col items-center gap-2')}>
          {!collapsed && user && (
            <div className="flex items-center gap-2.5 mb-3 px-1">
              <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-sky-600">{user.full_name?.[0] || 'U'}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-800 font-medium truncate">{user.full_name}</p>
                <p className="text-[10px] text-slate-400 truncate capitalize">
                  {isSuperadmin ? 'Superadmin' : currentClient?.role || user.role}
                </p>
              </div>
            </div>
          )}
          {/* Superadmin: Admin Panel toggle */}
          {isSuperadmin && (
            <button
              onClick={() => navigate(adminMode ? '/' : '/admin')}
              title={collapsed ? (adminMode ? 'Natrag' : 'Admin Panel') : undefined}
              className={clsx(
                'relative group flex items-center gap-2 rounded-xl transition-all w-full mb-1 text-sm font-medium',
                collapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2.5',
                adminMode
                  ? 'text-sky-600 bg-sky-50 hover:bg-sky-100'
                  : 'text-red-500 bg-red-50/70 hover:bg-red-100'
              )}
            >
              {adminMode ? (
                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Shield className="w-4 h-4 flex-shrink-0" />
              )}
              {!collapsed && (
                <span className="truncate">{adminMode ? 'Natrag na klijenta' : 'Admin Panel'}</span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-800 rounded-lg text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none shadow-xl z-50">
                  {adminMode ? 'Natrag na klijenta' : 'Admin Panel'}
                </div>
              )}
            </button>
          )}
          <button
            onClick={logout}
            title={collapsed ? 'Odjava' : undefined}
            className={clsx(
              'flex items-center gap-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors w-full',
              collapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2'
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="text-xs">Odjava</span>}
          </button>
        </div>
      </aside>

      {/* Collapse toggle */}
      {!isMobileView && (
        <button
          onClick={toggleSidebar}
          className="fixed top-1/2 -translate-y-1/2 z-[51] w-6 h-6 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 text-slate-400 transition-all duration-200 hover:shadow-lg hover:scale-110"
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
