import { useState, useCallback } from 'react'
import api from '../api/client'

interface MutationResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  mutate: (data?: unknown) => Promise<T | null>
  reset: () => void
}

export function useApiMutation<T>(
  url: string,
  method: 'post' | 'patch' | 'put' | 'delete' = 'post'
): MutationResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (payload?: unknown): Promise<T | null> => {
    setLoading(true)
    setError(null)
    try {
      const response = await api[method]<T>(url, payload)
      setData(response.data)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [url, method])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, mutate, reset }
}
