# Tasks — Static price history + live tail

## 1. Static data

- [x] 1.1 Create `scripts/snapshot-history.mjs` (Node ≥18 fetch, no deps): page Bitstamp `/api/v2/ohlc/btcusd/?step=86400` back to earliest candle, write `web/src/data/btcPriceHistory.json` with `{ source, generatedAt, points: [{timestamp_ms, price_usd}] }`
- [x] 1.2 Add `"snapshot:history": "node ../scripts/snapshot-history.mjs"` to `web/package.json`
- [x] 1.3 Run the snapshot; inspect output (point count, first/last dates) for data-quality sanity before committing
- [x] 1.4 Create `web/src/lib/data/staticHistory.ts` typed accessor (exports points + `generatedAt`)

## 2. Tail-only fetch

- [x] 2.1 Rename `web/src/lib/api/coingecko.ts` → `binance.ts`; update imports in `useHistoricPrices.ts` and tests
- [x] 2.2 Change the client to fetch only from the static end +1ms onward (keep pagination loop as safety net)
- [x] 2.3 Point the client at `https://api.binance.com/api/v3/klines` directly and remove the `/api/binance` proxy from `web/vite.config.ts`

## 3. Merge + cache

- [x] 3.1 Implement merge (dedupe by timestamp, live wins, strictly increasing) in `web/src/lib/data/mergeHistory.ts`
- [x] 3.2 Update `priceCache.ts`: record `generatedAt` + format version in cache payload; treat generation mismatch as expired
- [x] 3.3 Update `useHistoricPrices.ts`: merge static + live on load; fallback order fresh cache → fetch → stale cache → static-only (sets `isStale`)

## 4. Tests + verification

- [x] 4.1 Vitest: merge logic (overlap, disjoint, empty tail, monotonicity)
- [x] 4.2 Vitest: static accessor (metadata present, coverage floor ≤ 2011-09-01)
- [x] 4.3 Vitest: update API client + cache + hook tests for tail-only and generation-aware behavior
- [x] 4.4 `npm test` passes (Vitest + wasm-pack); `npm run build` succeeds

## 5. Spec housekeeping

- [x] 5.1 Validate: `openspec validate static-price-history-live-tail`
- [x] 5.2 Archive `sync-historic-data-binance` as superseded once this change lands
- [x] 5.3 Note the data-coverage change (2011 →) in CHANGELOG
