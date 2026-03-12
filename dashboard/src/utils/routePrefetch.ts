/**
 * Route chunk + API data prefetching utility.
 *
 * - prefetchRoute(path)     — preload JS chunk + warm API cache on hover
 * - prefetchAllRoutes()     — idle-time preload of all page chunks
 * - warmAllCaches()         — idle-time preload of all primary API endpoints
 */
import { prefetchApi } from '../hooks/useApi'

// ---------------------------------------------------------------------------
// Route chunk imports (mirrors App.tsx lazy() imports)
// ---------------------------------------------------------------------------
const routeImports: Record<string, () => Promise<unknown>> = {
  '/':                  () => import('../pages/Dashboard'),
  '/brand-profile':     () => import('../pages/BrandProfile'),
  '/market-research':   () => import('../pages/MarketResearch'),
  '/channels':          () => import('../pages/ChannelAudit'),
  '/competitors':       () => import('../pages/Competitors'),
  '/fans':              () => import('../pages/FanInsights'),
  '/content':           () => import('../pages/ContentCalendar'),
  '/campaigns':         () => import('../pages/Campaigns'),
  '/analytics':         () => import('../pages/Analytics'),
  '/sentiment':         () => import('../pages/SentimentAnalysis'),
  '/social-listening':  () => import('../pages/SocialListening'),
  '/academy':           () => import('../pages/Academy'),
  '/diaspora':          () => import('../pages/Diaspora'),
  '/reports':           () => import('../pages/Reports'),
  '/settings':          () => import('../pages/Settings'),
  '/admin':             () => import('../pages/Admin'),
  '/team':              () => import('../pages/Team'),
  '/campaign-research': () => import('../pages/CampaignResearch'),
}

// ---------------------------------------------------------------------------
// Primary API endpoints per page (warmed on hover + login)
// ---------------------------------------------------------------------------
const PAGE_APIS: Record<string, string[]> = {
  '/':                  ['/analytics/overview?days=30'],
  '/analytics':         ['/analytics/overview'],
  '/market-research':   ['/market-research/countries'],
  '/channels':          ['/channels'],
  '/competitors':       ['/competitors'],
  '/sentiment':         ['/sentiment/overview'],
  '/social-listening':  ['/social-listening/trending'],
  '/academy':           ['/academy/players'],
  '/diaspora':          ['/diaspora/populations'],
  '/reports':           ['/reports/weekly', '/reports/monthly'],
  '/campaigns':         ['/campaigns'],
  '/settings':          ['/settings/api-status'],
}

// ---------------------------------------------------------------------------
// Chunk prefetching
// ---------------------------------------------------------------------------
const prefetched = new Set<string>()

/** Prefetch a single route: JS chunk + its primary API data */
export function prefetchRoute(path: string) {
  // 1. JS chunk
  if (!prefetched.has(path)) {
    const loader = routeImports[path]
    if (loader) {
      prefetched.add(path)
      loader().catch(() => prefetched.delete(path))
    }
  }

  // 2. API data
  const apis = PAGE_APIS[path]
  if (apis) apis.forEach(prefetchApi)
}

/**
 * Prefetch all route chunks during idle time.
 * Critical routes first, then staggered.
 */
export function prefetchAllRoutes() {
  const ric = window.requestIdleCallback || ((cb: IdleRequestCallback) => setTimeout(cb, 200))

  const critical = ['/', '/brand-profile', '/analytics', '/reports']
  const rest = Object.keys(routeImports).filter(p => !critical.includes(p))

  ric(() => {
    critical.forEach(p => {
      if (!prefetched.has(p)) {
        const loader = routeImports[p]
        if (loader) { prefetched.add(p); loader().catch(() => prefetched.delete(p)) }
      }
    })
    rest.forEach((p, i) => {
      setTimeout(() => {
        if (!prefetched.has(p)) {
          const loader = routeImports[p]
          if (loader) { prefetched.add(p); loader().catch(() => prefetched.delete(p)) }
        }
      }, (i + 1) * 200)
    })
  })
}

/**
 * Warm all primary API caches during idle time.
 * Called once after login — ensures every major endpoint is cached
 * so first navigation shows data instantly.
 */
export function warmAllCaches() {
  const ric = window.requestIdleCallback || ((cb: IdleRequestCallback) => setTimeout(cb, 300))

  // Flatten all unique API URLs
  const allUrls = [...new Set(Object.values(PAGE_APIS).flat())]

  ric(() => {
    allUrls.forEach((url, i) => {
      setTimeout(() => prefetchApi(url), i * 250)
    })
  })
}
