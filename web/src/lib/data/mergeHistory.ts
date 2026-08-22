import type { PricePoint } from '@/types/price'

export function mergePriceHistory(
  staticPoints: PricePoint[],
  livePoints: PricePoint[],
): PricePoint[] {
  const byTimestamp = new Map<number, number>()

  for (const point of staticPoints) {
    byTimestamp.set(point.timestamp_ms, point.price_usd)
  }

  for (const point of livePoints) {
    byTimestamp.set(point.timestamp_ms, point.price_usd)
  }

  return [...byTimestamp.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp_ms, price_usd]) => ({ timestamp_ms, price_usd }))
}
