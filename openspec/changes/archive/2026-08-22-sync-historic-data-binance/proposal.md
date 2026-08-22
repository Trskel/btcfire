## Why

The `historic-price-data` spec still mandates the CoinGecko free-tier API, but CoinGecko's free tier became rate-capped and the app was switched to Binance's public klines API. The spec now describes an implementation that no longer exists, which will mislead future work (Phase 7+) that reads it as ground truth.

## What Changes

- Update the price-history API client requirements from CoinGecko `/coins/bitcoin/market_chart/range` to Binance `/api/v3/klines` (BTCUSDT, 1d interval, batched 1000-candle requests paginated from genesis, proxied via the Vite dev server).
- Update data-coverage expectations: earliest available Binance daily candle is 2017-08-17 (not 2013-04-28).
- Keep the 24h-TTL cache requirement; add the stale-cache-served-during-refresh behavior already implemented in `useHistoricPrices`.
- Optionally rename `web/src/lib/api/coingecko.ts` → `binance.ts` (fossil filename; tests import by name).

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `historic-price-data`: API client source and data coverage requirements change from CoinGecko to Binance klines.

## Impact

- `web/src/lib/api/coingecko.ts` — client code (optionally renamed to `binance.ts`)
- `web/src/hooks/useHistoricPrices.ts`, `web/src/lib/cache/priceCache.ts` — unchanged, already implement Binance-era behavior
- `web/src/__tests__/coingecko.test.ts` — import path updates if renamed
- `web/vite.config.ts` — `/api/binance/` proxy already exists; no change
- `openspec/specs/historic-price-data/spec.md` — requirement updates (delta spec)
