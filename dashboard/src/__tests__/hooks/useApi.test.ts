import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGet = vi.fn()

vi.mock('../../api/client', () => ({
  default: { get: mockGet },
}))

let mockRefreshSignal = 0

vi.mock('../../contexts/ClientContext', () => ({
  useClient: () => ({ refreshSignal: mockRefreshSignal }),
}))

function resetCaches() {
  window.sessionStorage.clear()
  window.localStorage.clear()
  vi.clearAllMocks()
}

describe('useApi', () => {
  beforeEach(() => {
    resetCaches()
    mockRefreshSignal = 0
    mockGet.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns data on a successful fetch', async () => {
    const payload = { followers: 1000, reach: 5000 }
    mockGet.mockResolvedValueOnce({ data: payload })
    const { useApi } = await import('../../hooks/useApi')
    const { result } = renderHook(() => useApi('/api/v1/analytics/overview'))
    await waitFor(() => expect(result.current.data).toEqual(payload))
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('sets loading=true while fetching and loading=false after', async () => {
    let resolveRequest!: (val: unknown) => void
    const pendingPromise = new Promise((res) => { resolveRequest = res })
    mockGet.mockReturnValueOnce(pendingPromise)
    const { useApi } = await import('../../hooks/useApi')
    const { result } = renderHook(() => useApi('/api/v1/analytics/loading-test'))
    expect(result.current.loading).toBe(true)
    act(() => { resolveRequest({ data: { ok: true } }) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ ok: true })
  })

  it('serves cached data and does not re-fetch within TTL', async () => {
    const payload = { cached: true }
    mockGet.mockResolvedValue({ data: payload })
    const { useApi } = await import('../../hooks/useApi')
    const { result: result1 } = renderHook(() => useApi('/api/v1/analytics/cached'))
    await waitFor(() => expect(result1.current.data).toEqual(payload))
    expect(mockGet).toHaveBeenCalledTimes(1)
    const { result: result2 } = renderHook(() => useApi('/api/v1/analytics/cached'))
    expect(result2.current.data).toEqual(payload)
    await waitFor(() => expect(result2.current.loading).toBe(false))
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('re-fetches in background when cached entry is older than TTL', async () => {
    const stalePayload = { version: 'stale' }
    const freshPayload = { version: 'fresh' }
    mockGet.mockResolvedValueOnce({ data: stalePayload })
    const { useApi } = await import('../../hooks/useApi')
    const { result } = renderHook(() => useApi('/api/v1/analytics/ttl-test', true, 100))
    await waitFor(() => expect(result.current.data).toEqual(stalePayload))
    expect(mockGet).toHaveBeenCalledTimes(1)
    await new Promise((r) => setTimeout(r, 150))
    mockGet.mockResolvedValueOnce({ data: freshPayload })
    const { result: result2 } = renderHook(() => useApi('/api/v1/analytics/ttl-test', true, 100))
    expect(result2.current.data).toEqual(stalePayload)
    await waitFor(() => expect(result2.current.data).toEqual(freshPayload))
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('sets error state when the fetch fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'))
    const { useApi } = await import('../../hooks/useApi')
    const { result } = renderHook(() => useApi('/api/v1/analytics/error-test'))
    await waitFor(() => expect(result.current.error).toBe('Network Error'))
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('sets generic error message for non-Error rejections', async () => {
    mockGet.mockRejectedValueOnce('something went wrong')
    const { useApi } = await import('../../hooks/useApi')
    const { result } = renderHook(() => useApi('/api/v1/analytics/error-string'))
    await waitFor(() => expect(result.current.error).toBe('An error occurred'))
    expect(result.current.loading).toBe(false)
  })

  it('refetch() forces a new network call, bypassing the cache', async () => {
    const firstPayload = { count: 1 }
    const secondPayload = { count: 2 }
    mockGet
      .mockResolvedValueOnce({ data: firstPayload })
      .mockResolvedValueOnce({ data: secondPayload })
    const { useApi } = await import('../../hooks/useApi')
    const { result } = renderHook(() => useApi('/api/v1/analytics/refetch-test'))
    await waitFor(() => expect(result.current.data).toEqual(firstPayload))
    expect(mockGet).toHaveBeenCalledTimes(1)
    act(() => { result.current.refetch() })
    await waitFor(() => expect(result.current.data).toEqual(secondPayload))
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('does not fetch on mount when immediate=false', async () => {
    const { useApi } = await import('../../hooks/useApi')
    const { result } = renderHook(() => useApi('/api/v1/analytics/no-fetch', false))
    await new Promise((r) => setTimeout(r, 50))
    expect(mockGet).not.toHaveBeenCalled()
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('deduplicates concurrent requests to the same URL', async () => {
    let resolveRequest!: (val: unknown) => void
    const sharedPromise = new Promise((res) => { resolveRequest = res })
    mockGet.mockReturnValue(sharedPromise)
    const { useApi } = await import('../../hooks/useApi')
    const { result: r1 } = renderHook(() => useApi('/api/v1/analytics/dedup'))
    const { result: r2 } = renderHook(() => useApi('/api/v1/analytics/dedup'))
    expect(r1.current.loading).toBe(true)
    expect(r2.current.loading).toBe(true)
    act(() => { resolveRequest({ data: { deduped: true } }) })
    await waitFor(() => expect(r1.current.data).toEqual({ deduped: true }))
    await waitFor(() => expect(r2.current.data).toEqual({ deduped: true }))
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('busts cache and re-fetches when refreshSignal increments', async () => {
    const stalePayload = { profile: 'old' }
    const freshPayload = { profile: 'new' }
    mockGet.mockResolvedValueOnce({ data: stalePayload })
    const { useApi } = await import('../../hooks/useApi')
    const { result, rerender } = renderHook(
      ({ signal }: { signal: number }) => {
        mockRefreshSignal = signal
        return useApi('/api/v1/clients/profile')
      },
      { initialProps: { signal: 0 } }
    )
    await waitFor(() => expect(result.current.data).toEqual(stalePayload))
    expect(mockGet).toHaveBeenCalledTimes(1)
    mockGet.mockResolvedValueOnce({ data: freshPayload })
    rerender({ signal: 1 })
    await waitFor(() => expect(result.current.data).toEqual(freshPayload))
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('reads from sessionStorage when in-memory cache is empty', async () => {
    const cachedPayload = { persisted: true }
    const storageKey = 'ac:_:_:/api/v1/analytics/persist'
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({ d: cachedPayload, t: Date.now() })
    )
    const { useApi } = await import('../../hooks/useApi')
    const { result } = renderHook(() => useApi('/api/v1/analytics/persist'))
    await waitFor(() => expect(result.current.data).toEqual(cachedPayload))
    expect(mockGet).not.toHaveBeenCalled()
  })
})
