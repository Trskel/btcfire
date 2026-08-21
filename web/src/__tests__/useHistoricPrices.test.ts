import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useHistoricPrices } from '@/hooks/useHistoricPrices'
import type { PricePoint } from '@/types/price'

const mockPrices: PricePoint[] = [
  { timestamp_ms: 1367107200000, price_usd: 135.3 },
  { timestamp_ms: 1367193600000, price_usd: 141.96 },
]

vi.mock('@/lib/api/coingecko', () => ({
  fetchBtcPriceHistory: vi.fn(),
}))

vi.mock('@/lib/cache/priceCache', () => ({
  getCachedPrices: vi.fn(),
  getStaleCachedPrices: vi.fn(),
  setCachedPrices: vi.fn(),
}))

import { fetchBtcPriceHistory } from '@/lib/api/coingecko'
import { getCachedPrices, getStaleCachedPrices } from '@/lib/cache/priceCache'

const mockFetch = vi.mocked(fetchBtcPriceHistory)
const mockGetCached = vi.mocked(getCachedPrices)
const mockGetStale = vi.mocked(getStaleCachedPrices)

describe('useHistoricPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCached.mockReturnValue(null)
    mockGetStale.mockReturnValue(null)
  })

  it('starts in loading state', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useHistoricPrices())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('loads from cache without fetching', async () => {
    mockGetCached.mockReturnValue(mockPrices)

    const { result } = renderHook(() => useHistoricPrices())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(mockPrices)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches when cache is empty', async () => {
    mockFetch.mockResolvedValue(mockPrices)

    const { result } = renderHook(() => useHistoricPrices())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(mockPrices)
    expect(result.current.error).toBeNull()
  })

  it('falls back to stale cache on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    mockGetStale.mockReturnValue(mockPrices)

    const { result } = renderHook(() => useHistoricPrices())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(mockPrices)
    expect(result.current.isStale).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('sets error when fetch fails and no cache exists', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useHistoricPrices())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Network error')
  })
})
