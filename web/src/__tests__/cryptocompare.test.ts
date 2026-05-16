import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBtcPriceHistory } from '@/lib/api/cryptocompare'

const mockResponse = {
  Data: {
    Data: [
      { time: 1367107200, close: 135.3 },
      { time: 1367193600, close: 141.96 },
      { time: 1367280000, close: 0 },
      { time: 1367366400, close: 139.0 },
    ],
  },
}

describe('fetchBtcPriceHistory', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and parses price data, filtering zero-price entries', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    )

    const result = await fetchBtcPriceHistory()

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ timestamp_ms: 1367107200000, price_usd: 135.3 })
    expect(result[1]).toEqual({ timestamp_ms: 1367193600000, price_usd: 141.96 })
    expect(result[2]).toEqual({ timestamp_ms: 1367366400000, price_usd: 139.0 })
  })

  it('constructs the correct URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    )

    await fetchBtcPriceHistory()

    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('/histoday')
    expect(url).toContain('fsym=BTC')
    expect(url).toContain('tsym=USD')
    expect(url).toContain('allData=true')
  })

  it('throws on non-429 HTTP errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Server Error', { status: 500, statusText: 'Internal Server Error' }),
    )

    await expect(fetchBtcPriceHistory()).rejects.toThrow('CryptoCompare API error: 500')
  })

  it('retries on 429 rate limit', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      )

    const result = await fetchBtcPriceHistory()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(result).toHaveLength(3)
  })

  it('throws after exhausting retries on 429', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 429 }))

    await expect(fetchBtcPriceHistory()).rejects.toThrow('rate limit')
  })
})
