import type { PricePoint } from '@/types/price'

const BASE_URL = 'https://min-api.cryptocompare.com/data/v2'
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1500

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function validatePricePoints(data: unknown): PricePoint[] {
  if (!Array.isArray(data)) {
    throw new Error('CryptoCompare response is not an array')
  }
  return data
    .filter(
      (item): item is { time: number; close: number } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).time === 'number' &&
        typeof (item as Record<string, unknown>).close === 'number' &&
        ((item as Record<string, unknown>).close as number) > 0,
    )
    .map((d) => ({
      timestamp_ms: d.time * 1000,
      price_usd: d.close,
    }))
}

export async function fetchBtcPriceHistory(): Promise<PricePoint[]> {
  const url = `${BASE_URL}/histoday?fsym=BTC&tsym=USD&allData=true`

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS * attempt)

    const response = await fetch(url)

    if (response.status === 429) {
      lastError = new Error('CryptoCompare rate limit exceeded')
      continue
    }

    if (!response.ok) {
      throw new Error(`CryptoCompare API error: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()
    const rawData = (json as { Data?: { Data?: unknown } })?.Data?.Data

    if (!rawData) {
      throw new Error('CryptoCompare returned unexpected response shape')
    }

    return validatePricePoints(rawData)
  }

  throw lastError ?? new Error('Failed to fetch price data')
}
