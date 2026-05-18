import { useState, useEffect, useCallback } from 'react'
import type { PricePoint } from '@/types/price'
import { fetchBtcPriceHistory } from '@/lib/api/cryptocompare'
import {
  getCachedPrices,
  getStaleCachedPrices,
  setCachedPrices,
} from '@/lib/cache/priceCache'

interface UseHistoricPricesResult {
  data: PricePoint[] | null
  isLoading: boolean
  error: string | null
  isStale: boolean
  refresh: () => void
}

export function useHistoricPrices(): UseHistoricPricesResult {
  const [data, setData] = useState<PricePoint[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)

  const load = useCallback(async (force = false) => {
    setIsLoading(true)
    setError(null)
    setIsStale(false)

    if (!force) {
      const cached = getCachedPrices()
      if (cached) {
        setData(cached)
        setIsLoading(false)
        return
      }
    }

    try {
      const prices = await fetchBtcPriceHistory()
      setCachedPrices(prices)
      setData(prices)
    } catch (err) {
      const stale = getStaleCachedPrices()
      if (stale) {
        setData(stale)
        setIsStale(true)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load price data')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      load()
    }, 0)
    return () => clearTimeout(id)
  }, [load])

  const refresh = useCallback(() => {
    load(true)
  }, [load])

  return { data, isLoading, error, isStale, refresh }
}
