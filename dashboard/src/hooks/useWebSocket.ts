import { useEffect, useRef, useState, useCallback } from 'react'

interface UseWebSocketOptions {
  url: string
  /** UUID of the client to scope the stream to.  Required for /ws/live. */
  clientId?: string | null
  reconnectInterval?: number
  maxRetries?: number
}

export function useWebSocket<T = unknown>({
  url,
  clientId,
  reconnectInterval = 5000,
  maxRetries = 10,
}: UseWebSocketOptions) {
  const [data, setData] = useState<T | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    const token = localStorage.getItem('auth_token')

    // Both token and clientId are required — do not attempt connection without them
    if (!token || !clientId) {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}${url}?token=${encodeURIComponent(token)}&client_id=${encodeURIComponent(clientId)}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      retriesRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as T
        setData(parsed)
      } catch {
        // non-JSON message
      }
    }

    ws.onclose = (event) => {
      setIsConnected(false)
      wsRef.current = null

      // 4001 = unauthenticated, 4003 = forbidden — do not retry auth failures
      if (event.code === 4001 || event.code === 4003) {
        return
      }

      if (retriesRef.current < maxRetries) {
        retriesRef.current += 1
        reconnectTimerRef.current = setTimeout(connect, reconnectInterval)
      }
    }

    ws.onerror = () => {
      // onclose will fire after onerror
    }
  }, [url, clientId, reconnectInterval, maxRetries])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { data, isConnected }
}
