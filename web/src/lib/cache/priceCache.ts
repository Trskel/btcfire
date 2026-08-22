import type { PricePoint } from '@/types/price'

const CACHE_KEY = 'btcfire_price_history'
const FORMAT_VERSION = 2
const TTL_MS = 24 * 60 * 60 * 1000

interface CachedData {
  formatVersion: number
  generatedAt: string
  timestamp: number
  prices: PricePoint[]
}

function readCache(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached: CachedData = JSON.parse(raw)
    if (cached.formatVersion !== FORMAT_VERSION) return null
    return cached
  } catch {
    return null
  }
}

export function getCachedPrices(staticGeneratedAt: string): PricePoint[] | null {
  const cached = readCache()
  if (!cached) return null
  if (cached.generatedAt !== staticGeneratedAt) return null
  if (Date.now() - cached.timestamp > TTL_MS) return null
  return cached.prices
}

export function getStaleCachedPrices(): PricePoint[] | null {
  const cached = readCache()
  return cached?.prices ?? null
}

export function setCachedPrices(prices: PricePoint[], generatedAt: string): void {
  const data: CachedData = {
    formatVersion: FORMAT_VERSION,
    generatedAt,
    timestamp: Date.now(),
    prices,
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(data))
}
