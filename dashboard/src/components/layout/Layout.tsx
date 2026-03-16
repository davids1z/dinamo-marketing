/* eslint-disable react-refresh/only-export-components */
// Sidebar context and useScrolled hook are co-located with Layout by design
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import Sidebar from './Sidebar'
// NavigationProgress removed — user prefers instant transitions
import { useAuth } from '../../contexts/AuthContext'
import { useClient } from '../../contexts/ClientContext'

/** Convert hex color to space-separated RGB channels for CSS variable use */
function hexToRgbChannels(hex: string): string | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m || !m[1] || !m[2] || !m[3]) return null
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`
}

/** Darken a hex color by a fraction (0-1) and return space-separated RGB channels */
function darkenHexToRgb(hex: string, amount: number): string | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m || !m[1] || !m[2] || !m[3]) return null
  const r = Math.max(0, Math.round(parseInt(m[1], 16) * (1 - amount)))
  const g = Math.max(0, Math.round(parseInt(m[2], 16) * (1 - amount)))
  const b = Math.max(0, Math.round(parseInt(m[3], 16) * (1 - amount)))
  return `${r} ${g} ${b}`
}

interface SidebarContextType {
  collapsed: boolean
  mobileOpen: boolean
  setCollapsed: (v: boolean) => void
  setMobileOpen: (v: boolean) => void
  toggleSidebar: () => void
}

export const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  mobileOpen: false,
  setCollapsed: () => {},
  setMobileOpen: () => {},
  toggleSidebar: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

export default function Layout() {
  const { user, impersonating, stopImpersonating } = useAuth()
  const { currentClient } = useClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }, [collapsed])

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileOpen) setMobileOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]) // Close mobile menu on route change

  // Dynamic brand theming — inject client accent color as CSS variable
  useEffect(() => {
    const colors = currentClient?.brand_colors
    if (!colors) return

    // brand_colors can be string[] (from onboarding) or Record<string,string> (from BrandProfile)
    let accentHex: string | undefined
    if (Array.isArray(colors) && colors[1]) {
      accentHex = colors[1] // [0]=primary, [1]=accent, [2]=blue
    } else if (typeof colors === 'object' && !Array.isArray(colors)) {
      accentHex = (colors as Record<string, string>).accent || Object.values(colors)[1]
    }

    if (!accentHex) return
    const rgb = hexToRgbChannels(accentHex)
    if (!rgb) return

    const el = document.documentElement
    el.style.setProperty('--brand-accent', rgb)
    el.style.setProperty('--brand-accent-hover', darkenHexToRgb(accentHex, 0.12) || rgb)
    el.style.setProperty('--brand-accent-dark', darkenHexToRgb(accentHex, 0.25) || rgb)

    return () => {
      el.style.removeProperty('--brand-accent')
      el.style.removeProperty('--brand-accent-hover')
      el.style.removeProperty('--brand-accent-dark')
    }
  }, [currentClient?.client_id, currentClient?.brand_colors])

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen)
    } else {
      setCollapsed(!collapsed)
    }
  }

  const handleStopImpersonating = () => {
    stopImpersonating()
    navigate('/admin/users')
  }

  const sidebarWidth = isMobile ? 0 : collapsed ? 72 : 256

  return (
    <SidebarContext.Provider value={{ collapsed, mobileOpen, setCollapsed, setMobileOpen, toggleSidebar }}>
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(180deg, #daedfb 0%, #e4f0fc 30%, #edf5fd 60%, #F5F9FF 100%)' }}>
        {/* Impersonation Banner */}
        {impersonating && user && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Prijavljeni ste kao <strong>{user.full_name}</strong> ({user.email})
            </span>
            <button
              onClick={handleStopImpersonating}
              className="flex items-center gap-1 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Vrati se na admin
            </button>
          </div>
        )}

        {/* Subtle cloud decoration at bottom */}
        <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-0">
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/60 via-white/30 to-transparent" />
          <div className="absolute -bottom-12 left-[5%] w-[400px] h-[140px] bg-white/40 rounded-[50%] blur-lg" />
          <div className="absolute -bottom-16 left-[30%] w-[350px] h-[120px] bg-white/35 rounded-[50%] blur-xl" />
          <div className="absolute -bottom-10 right-[10%] w-[380px] h-[130px] bg-white/40 rounded-[50%] blur-lg" />
        </div>
        {/* NavigationProgress removed */}
        <Sidebar />
        {/* Mobile overlay */}
        {isMobile && mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <main
          className="min-h-screen transition-[margin] duration-300 ease-in-out relative z-[1]"
          style={{ marginLeft: sidebarWidth, paddingTop: impersonating ? 40 : 0 }}
        >
          <Outlet />
        </main>
      </div>
    </SidebarContext.Provider>
  )
}
