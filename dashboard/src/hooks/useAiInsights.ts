import { useState, useCallback, useRef, useEffect } from 'react'
import { generateInsights, pollInsightTask, AiInsightsResponse } from '../api/aiInsights'

interface UseAiInsightsResult {
  insights: AiInsightsResponse | null
  loading: boolean
  error: string | null
  cached: boolean
  generate: (pageData: Record<string, unknown>) => void
}

export function useAiInsights(pageKey: string): UseAiInsightsResult {
  const [insights, setInsights] = useState<AiInsightsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cached, setCached] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [])

  const generate = useCallback(async (pageData: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    setCached(false)

    try {
      const result = await generateInsights(pageKey, pageData)

      if (!mountedRef.current) return

      if (result.status === 'done' && result.insights) {
        setInsights(result.insights)
        setCached(!!result.cached)
        setLoading(false)
        return
      }

      if (result.status === 'running' && result.task_id) {
        const taskId = result.task_id

        // Poll every 2 seconds
        pollRef.current = setInterval(async () => {
          try {
            const poll = await pollInsightTask(taskId)
            if (!mountedRef.current) {
              if (pollRef.current) clearInterval(pollRef.current)
              return
            }

            if (poll.status === 'done' && poll.insights) {
              setInsights(poll.insights)
              setLoading(false)
              if (pollRef.current) {
                clearInterval(pollRef.current)
                pollRef.current = null
              }
            } else if (poll.status === 'error') {
              setError(poll.error || 'Generiranje nije uspjelo')
              setLoading(false)
              if (pollRef.current) {
                clearInterval(pollRef.current)
                pollRef.current = null
              }
            }
          } catch {
            if (!mountedRef.current) return
            setError('Greška pri dohvaćanju rezultata')
            setLoading(false)
            if (pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }
          }
        }, 2000)
      } else if (result.status === 'error') {
        setError(result.error || 'Generiranje nije uspjelo')
        setLoading(false)
      }
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Greška pri pokretanju analize')
      setLoading(false)
    }
  }, [pageKey])

  return { insights, loading, error, cached, generate }
}
