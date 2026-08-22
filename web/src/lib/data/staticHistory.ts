import rawHistory from '@/data/btcPriceHistory.json'
import type { PricePoint } from '@/types/price'

interface RawStaticHistory {
  source: string
  generatedAt: string
  points: PricePoint[]
}

const history = rawHistory as RawStaticHistory

export const staticPricePoints: PricePoint[] = history.points
export const staticSource: string = history.source
export const staticGeneratedAt: string = history.generatedAt
export const staticEndMs: number =
  history.points.length > 0 ? history.points[history.points.length - 1].timestamp_ms : 0
