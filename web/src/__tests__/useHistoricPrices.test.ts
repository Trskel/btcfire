import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useHistoricPrices } from '@/hooks/useHistoricPrices'
import type { PricePoint } from '@/types/price'

const staticState = vi.hoisted(() => ({
  points: [
    { timestamp_ms: 1000, price_usd: 10 },
    { timestamp_ms: 2000, price_usd: 20 },
  ] as PricePoint[],
  generatedAt: 'test-generation',
}))

const mockLivePrices: PricePoint[] = [
  { timestamp_ms: 3000, price_usd: 30 },
]

vi.mock('@/lib/data/staticHistory', () => ({
  get staticPricePoints() { return staticState.points },
  get staticGeneratedAt() { return staticState.generatedAt },
}))

vi.mock('@/lib/api/binance', () => ({
  fetchBtcPriceTail: vi.fn(),
}))

vi.mock('@/lib/cache/priceCache', () => ({
  getCachedPrices: vi.fn(),
  getStaleCachedPrices: vi.fn(),
  setCachedPrices: vi.fn(),
}))

import { fetchBtcPriceTail } from '@/lib/api/binance'
import { getCachedPrices, getStaleCachedPrices } from '@/lib/cache/priceCache'

const mockFetch = vi.mocked(fetchBtcPriceTail)
const mockGetCached = vi.mocked(getCachedPrices)
const mockGetStale = vi.mocked(getStaleCachedPrices)

describe('useHistoricPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    staticState.points = [
      { timestamp_ms: 1000, price_usd: 10 },
      { timestamp_ms: 2000, price_usd: 20 },
    ]
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
    mockGetCached.mockReturnValue([{ timestamp_ms: 999, price_usd: 9 }])

    const { result } = renderHook(() => useHistoricPrices())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([{ timestamp_ms: 999, price_usd: 9 }])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('checks the cache against the current static generation', async () => {
    mockGetCached.mockReturnValue(null)
    mockFetch.mockResolvedValue(mockLivePrices)

    renderHook(() => useHistoricPrices())

    await waitFor(() => expect(mockGetCached).toHaveBeenCalledWith('test-generation'))
  })

  it('merges static and live data when fetching', async () => {
    mockFetch.mockResolvedValue(mockLivePrices)

    const { result } = renderHook(() => useHistoricPrices())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([
      { timestamp_ms: 1000, price_usd: 10 },
      { timestamp_ms: 2000, price_usd: 20 },
      { timestamp_ms: 3000, price_usd: 30 },
    ])
    expect(result.current.error).toBeNull()
    expect(result.current.isStale).toBe(false)
  })

  it('falls back to stale cache on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    mockGetStale.mockReturnValue(mockLivePrices)

    const { result } = renderHook(() => useHistoricPrices())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(mockLivePrices)
    expect(result.current.isStale).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('serves the static series when fetch fails and no cache exists', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useHistoricPrices())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(staticState.points)
    expect(result.current.isStale).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('sets error when fetch fails and no static data exists', async () => {
    staticState.points = []
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useHistoricPrices())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Network error')
  })
})
