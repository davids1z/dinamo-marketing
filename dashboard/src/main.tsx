import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Auto-reload when a new service worker takes control (new deploy detected).
// Flow: user refreshes → old SW serves old page → browser finds new sw.js →
// new SW installs + skipWaiting + clientsClaim → controllerchange fires → reload.
// This ensures a normal refresh always shows the latest deployed version.
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}

// Handle stale chunk errors after deploys: unregister old SW and reload
window.addEventListener('error', (e) => {
  if (
    e.message?.includes('Failed to fetch dynamically imported module') ||
    e.message?.includes('Loading chunk') ||
    e.message?.includes('Loading CSS chunk')
  ) {
    // Prevent infinite reload loop
    const lastReload = sessionStorage.getItem('chunk_reload')
    if (!lastReload || Date.now() - Number(lastReload) > 10000) {
      sessionStorage.setItem('chunk_reload', String(Date.now()))
      // Unregister service workers then reload
      navigator.serviceWorker?.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister())
        window.location.reload()
      }).catch(() => window.location.reload())
    }
  }
})

// Also catch unhandled promise rejections (dynamic import() returns a promise)
window.addEventListener('unhandledrejection', (e) => {
  const msg = String(e.reason?.message || e.reason || '')
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk')
  ) {
    const lastReload = sessionStorage.getItem('chunk_reload')
    if (!lastReload || Date.now() - Number(lastReload) > 10000) {
      sessionStorage.setItem('chunk_reload', String(Date.now()))
      navigator.serviceWorker?.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister())
        window.location.reload()
      }).catch(() => window.location.reload())
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
