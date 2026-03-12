import { Outlet } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import Sidebar from './Sidebar'
import NavigationProgress from './NavigationProgress'

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
  }, [])

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen)
    } else {
      setCollapsed(!collapsed)
    }
  }

  const sidebarWidth = isMobile ? 0 : collapsed ? 72 : 256

  return (
    <SidebarContext.Provider value={{ collapsed, mobileOpen, setCollapsed, setMobileOpen, toggleSidebar }}>
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(180deg, #daedfb 0%, #e4f0fc 30%, #edf5fd 60%, #F5F9FF 100%)' }}>
        {/* Subtle cloud decoration at bottom */}
        <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-0">
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/60 via-white/30 to-transparent" />
          <div className="absolute -bottom-12 left-[5%] w-[400px] h-[140px] bg-white/40 rounded-[50%] blur-lg" />
          <div className="absolute -bottom-16 left-[30%] w-[350px] h-[120px] bg-white/35 rounded-[50%] blur-xl" />
          <div className="absolute -bottom-10 right-[10%] w-[380px] h-[130px] bg-white/40 rounded-[50%] blur-lg" />
        </div>
        <NavigationProgress />
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
          style={{ marginLeft: sidebarWidth }}
        >
          <Outlet />
        </main>
      </div>
    </SidebarContext.Provider>
  )
}
