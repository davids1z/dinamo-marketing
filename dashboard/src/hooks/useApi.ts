import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/client'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// ---------------------------------------------------------------------------
// In-memory cache shared across all hook instances
// ---------------------------------------------------------------------------
const cache = new Map<string, { data: unknown; timestamp: number }>()
const inflight = new Map<string, Promise<unknown>>()

const DEFAULT_TTL = 5 * 60 * 1000 // 5 min stale-while-revalidate

// ---------------------------------------------------------------------------
// SessionStorage persistence layer
// Allows cached API responses to survive page reloads within a session.
// ---------------------------------------------------------------------------
const STORAGE_PREFIX = 'ac:'       // "api cache"
const MAX_STORAGE_ENTRIES = 60

function persistToStorage(key: string, data: unknown, timestamp: number) {
  try {
    sessionStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify({ d: data, t: timestamp })
    )
  } catch {
    // sessionStorage full — trim oldest entries and retry once
    trimStorage()
    try {
      sessionStorage.setItem(
        STORAGE_PREFIX + key,
        JSON.stringify({ d: data, t: timestamp })
      )
    } catch { /* give up — cache stays in-memory only */ }
  }
}

function readFromStorage(key: string): { data: unknown; timestamp: number } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { data: parsed.d, timestamp: parsed.t }
    }
  } catch { /* corrupt entry — ignore */ }
  return null
}

function removeFromStorage(key: string) {
  try { sessionStorage.removeItem(STORAGE_PREFIX + key) } catch { /* */ }
}

/** Remove the oldest half of cached entries to free space */
function trimStorage() {
  const entries: [string, number][] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      try {
        const { t } = JSON.parse(sessionStorage.getItem(key)!)
        entries.push([key, t])
      } catch {
        sessionStorage.removeItem(key!)
      }
    }
  }
  // Keep only the newest half
  entries.sort((a, b) => a[1] - b[1])
  const toRemove = entries.slice(0, Math.max(1, Math.ceil(entries.length / 2)))
  toRemove.forEach(([k]) => sessionStorage.removeItem(k))
}

// Enforce storage limit proactively (on module load)
;(() => {
  let count = 0
  for (let i = 0; i < sessionStorage.length; i++) {
    if (sessionStorage.key(i)?.startsWith(STORAGE_PREFIX)) count++
  }
  if (count > MAX_STORAGE_ENTRIES) trimStorage()
})()

// ---------------------------------------------------------------------------
// Build a cache key namespaced by the current client_id + project_id
// ---------------------------------------------------------------------------
function cacheKey(url: string): string {
  const clientId = localStorage.getItem('current_client_id') || '_'
  const projectId = localStorage.getItem('current_project_id') || '_'
  return `${clientId}:${projectId}:${url}`
}

// ---------------------------------------------------------------------------
// Resolve from memory → sessionStorage → null
// ---------------------------------------------------------------------------
function resolveCache(key: string): { data: unknown; timestamp: number } | null {
  // 1. In-memory (fastest)
  const mem = cache.get(key)
  if (mem) return mem

  // 2. sessionStorage (survives reload)
  const stored = readFromStorage(key)
  if (stored) {
    // Promote back to in-memory for subsequent reads
    cache.set(key, stored)
    return stored
  }

  return null
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------
export function useApi<T>(url: string, immediate = true, ttl = DEFAULT_TTL): UseApiResult<T> {
  const key = cacheKey(url)
  const cached = resolveCache(key)
  const [data, setData] = useState<T | null>(cached ? (cached.data as T) : null)
  const [loading, setLoading] = useState(immediate && !cached)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async (background = false) => {
    const k = cacheKey(url)
    // Deduplicate concurrent requests to the same URL + client
    let promise = inflight.get(k) as Promise<T> | undefined
    if (!promise) {
      if (!background) setLoading(true)
      setError(null)
      promise = api.get<T>(url).then(r => r.data)
      inflight.set(k, promise)
    }

    try {
      const result = await promise
      // Write to both in-memory and sessionStorage
      const ts = Date.now()
      cache.set(k, { data: result, timestamp: ts })
      persistToStorage(k, result, ts)
      if (mountedRef.current) {
        setData(result)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    } finally {
      inflight.delete(k)
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [url])

  useEffect(() => {
    mountedRef.current = true
    if (!immediate) return

    const k = cacheKey(url)
    const entry = resolveCache(k)
    if (entry) {
      // Serve cached data immediately (zero wait)
      setData(entry.data as T)
      setLoading(false)
      // Revalidate in background if stale
      if (Date.now() - entry.timestamp > ttl) {
        fetchData(true)
      }
    } else {
      fetchData()
    }

    return () => { mountedRef.current = false }
  }, [fetchData, immediate, url, ttl])

  const refetch = useCallback(() => {
    const k = cacheKey(url)
    cache.delete(k)
    removeFromStorage(k)
    fetchData()
  }, [url, fetchData])

  return { data, loading, error, refetch }
}

// ---------------------------------------------------------------------------
// Polling variant
// ---------------------------------------------------------------------------
export function usePolling<T>(url: string, intervalMs: number): UseApiResult<T> {
  const result = useApi<T>(url)

  useEffect(() => {
    const interval = setInterval(result.refetch, intervalMs)
    return () => clearInterval(interval)
  }, [result.refetch, intervalMs])

  return result
}
