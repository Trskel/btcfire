# Design — Static price history + live tail

## Context

The current pipeline (`useHistoricPrices` → `fetchBtcPriceHistory` → localStorage cache) fetches the entire BTC daily history from Binance klines on every expired-cache cycle: 7 paginated requests of 1000 candles, every visitor, every day, covering data that never changes. Binance's earliest candle is 2017-08-17, so the price models fit on ~9 years and miss the 2011–2017 segment that most defines the Power Law trend. Probes on 2026-08-22 established the source landscape:

| Source | Depth | CORS | Notes |
|---|---|---|---|
| Bitstamp | ~2011-08 → now | `*` | Best depth; keyless; paginated OHLC via `start`/`limit` (max 1000) |
| Binance | 2017-08 → now | `*` | Current source; geoblocked in some regions (451) |
| Kraken | last ~720 days | `*` | `since` cannot reach older data |
| CoinMetrics community | recent only | `*` | Deep history is paid |
| CoinPaprika | 1 year | — | Free tier now blocks older history (402) |

## Goals / Non-Goals

**Goals:**
- Ship deep history (≥ 2011-09) as a bundled static file; never re-fetch immutable data at runtime.
- Runtime fetches shrink to a single Binance tail request (or a few pages if the snapshot is stale).
- App remains fully usable offline: static floor serves even when the API and cache are unavailable.
- One-command snapshot refresh so the static file can be regenerated.
- Rename the `coingecko.ts` fossil to `binance.ts`.

**Non-Goals:**
- Recalibrating price model defaults (outputs change as a *side effect* of more data; that's accepted).
- Switching the live source off Binance (Bitstamp remains the snapshot source only).
- Production proxy/CDN work (out of scope; CORS makes the proxy unnecessary anyway).
- Changing the WASM/Rust side (`PricePoint` types stay as-is).

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Split point | Snapshot-end, not a fixed date | The static file records its own last timestamp; the live client starts there +1ms. A stale snapshot simply makes the tail fetch bigger — the system self-heals, no date constant to rot. |
| Static source | Bitstamp BTCUSD, one-shot snapshot | 15 years of depth, keyless, USD (no USDT basis in the old data), pagination is trivial (6×1000-candle requests). Snapshot script runs in Node, so CORS/rate limits are non-issues; Bitstamp's public API is generously rate-limited for a one-shot. |
| Live source | Binance klines, unchanged | Already implemented and tested; switching live source is scope creep. BTCUSDT vs BTCUSD basis (<0.1%) is irrelevant for model fitting; accepted. |
| Merge rule | Dedupe by `timestamp_ms`; live wins; output sorted strictly increasing | Deterministic, testable; guarantees the cache never regresses data. |
| Cache generation | Cache entry records static file's `generatedAt`; mismatch → expired | Prevents a newly shipped static file from being shadowed by a 24h-fresh cache written against the older one. |
| Static file location | `web/src/data/btcPriceHistory.json`, imported via a typed accessor (`lib/data/staticHistory.ts`) | Imported at build time — bundled, minified, zero network. Not `public/` (no fetch needed, no CORS semantics). |
| Snapshot script | `scripts/snapshot-history.mjs` at repo root, plain Node ≥18 `fetch`, run via `npm run snapshot:history` from `web/` | No dependencies; one command; output committed to git like any source file. CI cron refresh is a follow-up, not v1. |
| Cache fallback order | fresh cache → fetch → stale cache → static-only | The static floor replaces today's dead-end error state. Static-only marks `isStale` so the UI can inform the user. |
| Vite proxy | Remove `/api/binance` proxy; call `https://api.binance.com` directly | CORS `*` confirmed on klines. Fewer moving parts; dev and prod behave identically. If a user's region geoblocks Binance (451), the app degrades to static-only — acceptable, documented. |
| `sync-historic-data-binance` change | Superseded | Its spec deltas (Binance source, coverage, stale-serve) are subsumed by this change's spec. It should be archived as superseded when this lands. |

## Risks / Trade-offs

- [Static file grows stale if nobody re-runs the snapshot] → The tail fetch self-heals coverage; staleness only costs extra pagination and a shrinking time gap between snapshot and live data. Optional GitHub Actions cron can refresh monthly.
- [Bitstamp daily data has occasional gaps or odd candles (2011/2012 era)] → Snapshot script logs point count and date range for manual review at generation time; merge logic tolerates gaps.
- [Binance 451 in geoblocked regions kills the tail] → App degrades to static-only via the fallback order; switching the live source to Bitstamp is a small, contained follow-up if needed.
- [Model outputs shift visibly when 2011–2017 data appears] → Expected and desirable (better fits), but a UX surprise; note in CHANGELOG.
- [Bundle size grows ~150–250 KB (5500 points × ~40 bytes JSON)] → Trivial vs. current bundle; gzip shrinks numeric JSON well.
- [localStorage cache holds merged series; old cache key collides with new format] → Cache payload gains `generatedAt` and a format version; mismatches invalidate.

## Migration Plan

1. Run `node scripts/snapshot-history.mjs` to generate the initial static file; commit it.
2. Refactor client/hook/cache to the layered pipeline; remove the Vite proxy.
3. Run `npm test` (Vitest + wasm-pack) and `npm run build`.
4. Archive `sync-historic-data-binance` as superseded after this change lands.
5. No deploy ordering concerns — static site; behavior changes atomically with the bundle.

## Open Questions

- Should snapshot refreshes run in CI (GitHub Actions cron) or stay manual? (Follow-up, not blocking.)
- Is the 2011–2017 Bitstamp segment clean enough to ship without manual eyeballing, or do we need a data-quality pass first? (Verify during implementation of the snapshot task.)
