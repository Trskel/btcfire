import type { PricePoint } from '@/types/price'

const CACHE_KEY = 'btcfire_price_history'
const TTL_MS = 24 * 60 * 60 * 1000

interface CachedData {
  timestamp: number
  prices: PricePoint[]
}

export function getCachedPrices(): PricePoint[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const cached: CachedData = JSON.parse(raw)
    if (Date.now() - cached.timestamp > TTL_MS) return null

    return cached.prices
  } catch {
    return null
  }
}

export function getStaleCachedPrices(): PricePoint[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached: CachedData = JSON.parse(raw)
    return cached.prices
  } catch {
    return null
  }
}

export function setCachedPrices(prices: PricePoint[]): void {
  const data: CachedData = { timestamp: Date.now(), prices }
  localStorage.setItem(CACHE_KEY, JSON.stringify(data))
}
