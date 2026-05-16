import { describe, it, expect, beforeEach } from 'vitest'
import { getCachedPrices, getStaleCachedPrices, setCachedPrices } from '@/lib/cache/priceCache'
import type { PricePoint } from '@/types/price'

const samplePrices: PricePoint[] = [
  { timestamp_ms: 1367107200000, price_usd: 135.3 },
  { timestamp_ms: 1367193600000, price_usd: 141.96 },
]

describe('priceCache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when cache is empty', () => {
    expect(getCachedPrices()).toBeNull()
    expect(getStaleCachedPrices()).toBeNull()
  })

  it('stores and retrieves prices within TTL', () => {
    setCachedPrices(samplePrices)
    const result = getCachedPrices()
    expect(result).toEqual(samplePrices)
  })

  it('returns null from getCachedPrices when TTL expired', () => {
    setCachedPrices(samplePrices)

    const stored = JSON.parse(localStorage.getItem('btcfire_price_history')!)
    stored.timestamp = Date.now() - 25 * 60 * 60 * 1000
    localStorage.setItem('btcfire_price_history', JSON.stringify(stored))

    expect(getCachedPrices()).toBeNull()
  })

  it('returns data from getStaleCachedPrices even when TTL expired', () => {
    setCachedPrices(samplePrices)

    const stored = JSON.parse(localStorage.getItem('btcfire_price_history')!)
    stored.timestamp = Date.now() - 48 * 60 * 60 * 1000
    localStorage.setItem('btcfire_price_history', JSON.stringify(stored))

    expect(getStaleCachedPrices()).toEqual(samplePrices)
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('btcfire_price_history', 'not-json')
    expect(getCachedPrices()).toBeNull()
    expect(getStaleCachedPrices()).toBeNull()
  })
})
