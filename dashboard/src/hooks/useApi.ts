import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/client'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// In-memory cache shared across all hook instances
const cache = new Map<string, { data: unknown; timestamp: number }>()
const inflight = new Map<string, Promise<unknown>>()

const DEFAULT_TTL = 5 * 60 * 1000 // 5 min stale-while-revalidate

export function useApi<T>(url: string, immediate = true, ttl = DEFAULT_TTL): UseApiResult<T> {
  const cached = cache.get(url)
  const [data, setData] = useState<T | null>(cached ? (cached.data as T) : null)
  const [loading, setLoading] = useState(immediate && !cached)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async (background = false) => {
    // Deduplicate concurrent requests to the same URL
    let promise = inflight.get(url) as Promise<T> | undefined
    if (!promise) {
      if (!background) setLoading(true)
      setError(null)
      promise = api.get<T>(url).then(r => r.data)
      inflight.set(url, promise)
    }

    try {
      const result = await promise
      cache.set(url, { data: result, timestamp: Date.now() })
      if (mountedRef.current) {
        setData(result)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    } finally {
      inflight.delete(url)
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [url])

  useEffect(() => {
    mountedRef.current = true
    if (!immediate) return

    const entry = cache.get(url)
    if (entry) {
      // Serve cached data immediately
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
    cache.delete(url)
    fetchData()
  }, [url, fetchData])

  return { data, loading, error, refetch }
}

export function usePolling<T>(url: string, intervalMs: number): UseApiResult<T> {
  const result = useApi<T>(url)

  useEffect(() => {
    const interval = setInterval(result.refetch, intervalMs)
    return () => clearInterval(interval)
  }, [result.refetch, intervalMs])

  return result
}
