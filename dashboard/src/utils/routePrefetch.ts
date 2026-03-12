/**
 * Route chunk prefetching utility.
 *
 * 1. prefetchAllRoutes() — call once after login; uses requestIdleCallback
 *    to preload every page chunk in the background so subsequent navigation
 *    is instant (no spinner, no network wait for JS).
 *
 * 2. prefetchRoute(path) — call on hover/focus of a nav link to eagerly
 *    load that single chunk before the user clicks.
 */

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
  '/campaign-research': () => import('../pages/CampaignResearch'),
}

const prefetched = new Set<string>()

/** Prefetch a single route chunk (idempotent — safe to call multiple times) */
export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return
  const loader = routeImports[path]
  if (loader) {
    prefetched.add(path)
    loader().catch(() => {
      // If the fetch fails (e.g. offline), allow retry next time
      prefetched.delete(path)
    })
  }
}

/**
 * Prefetch all route chunks during idle time.
 * Critical routes (Dashboard, BrandProfile, Analytics) load first,
 * then everything else staggers with 200ms gaps to avoid network contention.
 */
export function prefetchAllRoutes() {
  const ric = window.requestIdleCallback || ((cb: IdleRequestCallback) => setTimeout(cb, 200))

  const critical = ['/', '/brand-profile', '/analytics', '/reports']
  const rest = Object.keys(routeImports).filter(p => !critical.includes(p))

  ric(() => {
    // Load critical routes immediately
    critical.forEach(p => prefetchRoute(p))

    // Stagger the rest to avoid saturating the network
    rest.forEach((p, i) => {
      setTimeout(() => prefetchRoute(p), (i + 1) * 200)
    })
  })
}
