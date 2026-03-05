import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(url: string, immediate = true): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get<T>(url)
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (immediate) {
      fetchData()
    }
  }, [fetchData, immediate])

  return { data, loading, error, refetch: fetchData }
}

export function usePolling<T>(url: string, intervalMs: number): UseApiResult<T> {
  const result = useApi<T>(url)

  useEffect(() => {
    const interval = setInterval(result.refetch, intervalMs)
    return () => clearInterval(interval)
  }, [result.refetch, intervalMs])

  return result
}
