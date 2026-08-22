#!/usr/bin/env node
/**
 * Snapshot Bitstamp's full BTC/USD daily OHLC history into the static
 * price file bundled with the app. The deep history is immutable, so it
 * is fetched once by this script and shipped as data — never at runtime.
 *
 * Usage: node scripts/snapshot-history.mjs   (or `npm run snapshot:history` from web/)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BITSTAMP_OHLC = 'https://www.bitstamp.net/api/v2/ohlc/btcusd/'
const STEP_SECONDS = 86400
const PAGE_SIZE = 1000
const EARLIEST_PROBE = 1312156800 // 2011-08-01, before Bitstamp's first BTCUSD candle
const OUTPUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../web/src/data/btcPriceHistory.json',
)

async function fetchPage(start) {
  const url = `${BITSTAMP_OHLC}?step=${STEP_SECONDS}&limit=${PAGE_SIZE}&start=${start}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Bitstamp API error: ${response.status}`)
  }
  const body = await response.json()
  const candles = body?.data?.ohlc
  if (!Array.isArray(candles)) {
    throw new Error('Bitstamp returned unexpected response shape')
  }
  return candles
}

async function main() {
  const points = []
  const nowSec = Math.floor(Date.now() / 1000)
  let start = EARLIEST_PROBE
  let page = 0

  while (page < 100) {
    page += 1
    const candles = await fetchPage(start)
    if (candles.length === 0) break

    for (const candle of candles) {
      const timestampSec = Number(candle.timestamp)
      const close = parseFloat(candle.close)
      if (!Number.isFinite(timestampSec) || !Number.isFinite(close) || close <= 0) {
        continue
      }
      points.push({ timestamp_ms: timestampSec * 1000, price_usd: close })
    }

    const lastTs = Number(candles[candles.length - 1].timestamp)
    console.log(
      `page ${page}: ${candles.length} candles, latest ${new Date(
        lastTs * 1000,
      ).toISOString().slice(0, 10)}`,
    )

    if (lastTs + STEP_SECONDS > nowSec) break
    start = lastTs + STEP_SECONDS
  }

  if (points.length === 0) {
    throw new Error('No candles collected; aborting without writing output')
  }

  const output = {
    source: 'bitstamp',
    generatedAt: new Date().toISOString(),
    points,
  }

  await mkdir(path.dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`)

  console.log(
    `\nwrote ${points.length} points to ${path.relative(process.cwd(), OUTPUT)}`,
  )
  console.log(`coverage: ${new Date(points[0].timestamp_ms).toISOString().slice(0, 10)} → ${new Date(points[points.length - 1].timestamp_ms).toISOString().slice(0, 10)}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
