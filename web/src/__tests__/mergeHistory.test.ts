import { describe, it, expect } from 'vitest'
import { mergePriceHistory } from '@/lib/data/mergeHistory'
import type { PricePoint } from '@/types/price'

const staticPoints: PricePoint[] = [
  { timestamp_ms: 1000, price_usd: 10 },
  { timestamp_ms: 2000, price_usd: 20 },
  { timestamp_ms: 3000, price_usd: 30 },
]

describe('mergePriceHistory', () => {
  it('merges disjoint series in ascending order', () => {
    const live: PricePoint[] = [
      { timestamp_ms: 4000, price_usd: 40 },
      { timestamp_ms: 5000, price_usd: 50 },
    ]

    expect(mergePriceHistory(staticPoints, live)).toEqual([
      { timestamp_ms: 1000, price_usd: 10 },
      { timestamp_ms: 2000, price_usd: 20 },
      { timestamp_ms: 3000, price_usd: 30 },
      { timestamp_ms: 4000, price_usd: 40 },
      { timestamp_ms: 5000, price_usd: 50 },
    ])
  })

  it('lets live values win on overlapping timestamps', () => {
    const live: PricePoint[] = [
      { timestamp_ms: 2000, price_usd: 22 },
      { timestamp_ms: 4000, price_usd: 44 },
    ]

    expect(mergePriceHistory(staticPoints, live)).toEqual([
      { timestamp_ms: 1000, price_usd: 10 },
      { timestamp_ms: 2000, price_usd: 22 },
      { timestamp_ms: 3000, price_usd: 30 },
      { timestamp_ms: 4000, price_usd: 44 },
    ])
  })

  it('returns static series when the tail is empty', () => {
    expect(mergePriceHistory(staticPoints, [])).toEqual(staticPoints)
  })

  it('returns only live series when static is empty', () => {
    const live: PricePoint[] = [{ timestamp_ms: 1000, price_usd: 1 }]
    expect(mergePriceHistory([], live)).toEqual(live)
  })

  it('produces strictly increasing timestamps with no duplicates from unsorted input', () => {
    const unsortedStatic: PricePoint[] = [
      { timestamp_ms: 3000, price_usd: 30 },
      { timestamp_ms: 1000, price_usd: 10 },
    ]
    const live: PricePoint[] = [
      { timestamp_ms: 2000, price_usd: 20 },
      { timestamp_ms: 3000, price_usd: 33 },
    ]

    const merged = mergePriceHistory(unsortedStatic, live)

    expect(merged.map((p) => p.timestamp_ms)).toEqual([1000, 2000, 3000])
    expect(merged[2].price_usd).toBe(33)
  })
})
