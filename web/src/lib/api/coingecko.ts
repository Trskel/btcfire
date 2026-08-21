import type { PricePoint } from '@/types/price'

const BINANCE_API = '/api/binance/api/v3/klines'
const BATCH_SIZE = 1000

interface BinanceKline {
  0: number    // openTime
  4: string    // close price
  6: number    // closeTime
}

async function fetchBatch(symbol: string, interval: string, startTime: number, limit: number): Promise<BinanceKline[]> {
  const url = `${BINANCE_API}?symbol=${symbol}&interval=${interval}&startTime=${startTime}&limit=${limit}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`)
  }

  const data: unknown = await response.json()

  if (!Array.isArray(data)) {
    throw new Error('Binance returned unexpected response shape')
  }

  return data as BinanceKline[]
}

export async function fetchBtcPriceHistory(): Promise<PricePoint[]> {
  const symbol = 'BTCUSDT'
  const interval = '1d'

  // Fetch all data in batches from genesis-era to now
  const allCandles: BinanceKline[] = []
  let startTime = 1_230_940_800_000 // Bitcoin genesis block timestamp (Jan 3 2009)

  while (true) {
    const batch = await fetchBatch(symbol, interval, startTime, BATCH_SIZE)

    if (batch.length === 0) break

    allCandles.push(...batch)

    if (batch.length < BATCH_SIZE) break

    // Last candle's close time + 1ms to avoid overlap
    startTime = batch[batch.length - 1][6] + 1

    // Guard against infinite loop
    if (startTime > Date.now()) break
  }

  return allCandles
    .filter((candle) => parseFloat(candle[4]) > 0)
    .map((candle) => ({
      timestamp_ms: candle[0],
      price_usd: parseFloat(candle[4]),
    }))
}
