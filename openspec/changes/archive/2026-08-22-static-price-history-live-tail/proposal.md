## Why

The current pipeline fetches the *entire* BTC price history from Binance on every fresh cache cycle — but everything before "now minus a few days" is settled history that never changes. Every visitor re-downloads immutable data forever, and Binance's 2017-08-17 floor silently truncates the series, starving the price models (Power Law especially) of the early years that define their fit. Bitstamp's public API (probed 2026-08-22) offers daily BTCUSD candles back to ~2011-08 with CORS `*` and no key, and Binance public klines confirmed CORS `*` — so no proxy is needed at all.

## What Changes

- Bundle the deep history (earliest available Bitstamp daily candle, ~2011-08 → snapshot date) as a static JSON data file shipped with the app; never fetched at runtime.
- Add a `scripts/snapshot-history.mjs` script that generates/refreshes the static file from Bitstamp's paginated OHLC endpoint, recording source + generation metadata in the file.
- Change the runtime API client to fetch only the *tail* (snapshot end → now) from Binance klines, with the static file as the guaranteed floor.
- Merge static + live layers by timestamp at runtime (dedupe, live wins on overlap) before caching in localStorage.
- On fetch failure: serve stale cache if present, else serve the static-only series instead of an error state.
- Rename `web/src/lib/api/coingecko.ts` → `binance.ts` (fossil name; test imports follow).

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `historic-price-data`: data pipeline changes from "fetch full history from one API" to "bundled static history + live tail fetch + merge"; new static-data and snapshot requirements; cache fallback now includes static-only.

## Impact

- New: `scripts/snapshot-history.mjs`, `web/src/data/` static price file, `web/src/lib/data/staticHistory.ts` accessor
- Modified: `web/src/lib/api/binance.ts` (renamed from `coingecko.ts`; tail-only fetch), `web/src/lib/cache/priceCache.ts` (generation-aware cache key), `web/src/hooks/useHistoricPrices.ts` (merge + static fallback), tests
- `web/vite.config.ts`: `/api/binance` proxy becomes optional (CORS confirmed); kept or removed as decided in design
- Model outputs change as a side effect: fits gain 2011–2017 data; not a calibration change
- Supersedes the pending `sync-historic-data-binance` change (its spec deltas are folded in here; it should be archived as superseded)
