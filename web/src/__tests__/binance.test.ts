import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBtcPriceTail } from '@/lib/api/binance'
import { staticEndMs } from '@/lib/data/staticHistory'

const mockKlines = [
  [1367107200000, '135.0', '140.0', '130.0', '135.3', '1000.0', 1367193599999, '135000.0', 100, '500.0', '67500.0', '0'],
  [1367193600000, '141.0', '145.0', '139.0', '141.96', '1200.0', 1367279999999, '170000.0', 120, '600.0', '85000.0', '0'],
  [1367280000000, '0', '0', '0', '0', '0', 1367366399999, '0', 0, '0', '0', '0'],
  [1367366400000, '138.0', '142.0', '137.0', '139.0', '900.0', 1367452799999, '125000.0', 90, '450.0', '62500.0', '0'],
]

describe('fetchBtcPriceTail', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and parses klines, filtering zero-price entries', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockKlines), { status: 200 }),
    )

    const result = await fetchBtcPriceTail()

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ timestamp_ms: 1367107200000, price_usd: 135.3 })
    expect(result[1]).toEqual({ timestamp_ms: 1367193600000, price_usd: 141.96 })
    expect(result[2]).toEqual({ timestamp_ms: 1367366400000, price_usd: 139.0 })
  })

  it('constructs the correct URL, starting after the static history', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockKlines), { status: 200 }),
    )

    await fetchBtcPriceTail()

    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('https://api.binance.com/api/v3/klines')
    expect(url).toContain('BTCUSDT')
    expect(url).toContain('interval=1d')
    expect(url).toContain(`startTime=${staticEndMs + 1}`)
  })

  it('throws on HTTP errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Rate limited', { status: 429 }),
    )

    await expect(fetchBtcPriceTail()).rejects.toThrow('Binance API error: 429')
  })

  it('throws on invalid response shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ wrong: 'shape' }), { status: 200 }),
    )

    await expect(fetchBtcPriceTail()).rejects.toThrow('unexpected response shape')
  })
})
