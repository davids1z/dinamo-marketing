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
      <div className="min-h-screen bg-studio-bg">
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
          className="min-h-screen transition-[margin] duration-300 ease-in-out"
          style={{ marginLeft: sidebarWidth }}
        >
          <Outlet />
        </main>
      </div>
    </SidebarContext.Provider>
  )
}
