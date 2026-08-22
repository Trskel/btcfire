import { describe, it, expect } from 'vitest'
import {
  staticPricePoints,
  staticSource,
  staticGeneratedAt,
  staticEndMs,
} from '@/lib/data/staticHistory'

describe('staticHistory', () => {
  it('ships provenance metadata', () => {
    expect(staticSource).toBe('bitstamp')
    expect(staticGeneratedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('covers history from no later than 2011-09-01', () => {
    expect(staticPricePoints.length).toBeGreaterThan(1000)
    const first = staticPricePoints[0]
    expect(first.timestamp_ms).toBeLessThanOrEqual(Date.UTC(2011, 8, 1))
  })

  it('exposes the last static timestamp as the tail boundary', () => {
    expect(staticEndMs).toBe(staticPricePoints[staticPricePoints.length - 1].timestamp_ms)
    expect(staticEndMs).toBeGreaterThan(0)
  })

  it('is sorted and free of duplicate timestamps', () => {
    const timestamps = staticPricePoints.map((p) => p.timestamp_ms)
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b))
    expect(new Set(timestamps).size).toBe(timestamps.length)
  })
})
