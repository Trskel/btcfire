import { describe, it, expect, beforeEach } from 'vitest'
import { getCachedPrices, getStaleCachedPrices, setCachedPrices } from '@/lib/cache/priceCache'
import type { PricePoint } from '@/types/price'

const GENERATION = '2026-08-22T00:00:00.000Z'
const OTHER_GENERATION = '2026-08-21T00:00:00.000Z'

const samplePrices: PricePoint[] = [
  { timestamp_ms: 1367107200000, price_usd: 135.3 },
  { timestamp_ms: 1367193600000, price_usd: 141.96 },
]

describe('priceCache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when cache is empty', () => {
    expect(getCachedPrices(GENERATION)).toBeNull()
    expect(getStaleCachedPrices()).toBeNull()
  })

  it('stores and retrieves prices within TTL for the matching generation', () => {
    setCachedPrices(samplePrices, GENERATION)
    const result = getCachedPrices(GENERATION)
    expect(result).toEqual(samplePrices)
  })

  it('treats a generation mismatch as expired even within TTL', () => {
    setCachedPrices(samplePrices, GENERATION)
    expect(getCachedPrices(OTHER_GENERATION)).toBeNull()
    expect(getStaleCachedPrices()).toEqual(samplePrices)
  })

  it('returns null from getCachedPrices when TTL expired', () => {
    setCachedPrices(samplePrices, GENERATION)

    const stored = JSON.parse(localStorage.getItem('btcfire_price_history')!)
    stored.timestamp = Date.now() - 25 * 60 * 60 * 1000
    localStorage.setItem('btcfire_price_history', JSON.stringify(stored))

    expect(getCachedPrices(GENERATION)).toBeNull()
  })

  it('returns data from getStaleCachedPrices even when TTL expired', () => {
    setCachedPrices(samplePrices, GENERATION)

    const stored = JSON.parse(localStorage.getItem('btcfire_price_history')!)
    stored.timestamp = Date.now() - 48 * 60 * 60 * 1000
    localStorage.setItem('btcfire_price_history', JSON.stringify(stored))

    expect(getStaleCachedPrices()).toEqual(samplePrices)
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('btcfire_price_history', 'not-json')
    expect(getCachedPrices(GENERATION)).toBeNull()
    expect(getStaleCachedPrices()).toBeNull()
  })

  it('treats a foreign format version as unreadable', () => {
    setCachedPrices(samplePrices, GENERATION)

    const stored = JSON.parse(localStorage.getItem('btcfire_price_history')!)
    stored.formatVersion = 999
    localStorage.setItem('btcfire_price_history', JSON.stringify(stored))

    expect(getCachedPrices(GENERATION)).toBeNull()
    expect(getStaleCachedPrices()).toBeNull()
  })
})
