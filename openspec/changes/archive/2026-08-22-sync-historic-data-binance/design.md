# Design — Sync historic-price-data spec to Binance reality

## Context

The code already uses Binance klines (`web/src/lib/api/coingecko.ts`): batched 1000-candle requests from the genesis timestamp, paginating by last closeTime + 1ms, filtering non-positive closes. The spec still mandates CoinGecko's `/market_chart/range` endpoint. This change reconciles the spec with the implemented system; it is primarily a documentation sync with one optional code cleanup (file rename).

## Goals / Non-Goals

**Goals**
- Make `openspec/specs/historic-price-data/spec.md` describe the actual Binance pipeline (endpoint, batching, data coverage, stale-cache behavior, manual refresh).
- Record *why* the source changed (CoinGecko free tier rate-capped) so future work doesn't flip back.

**Non-Goals**
- Changing the data source again, altering fetch/cache behavior, or touching model calibration.
- Fixing unrelated spec drift (config.yaml, roadmap, tech-stack were corrected separately as constitution edits).

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Update spec via delta (MODIFIED) | Only the API client and cache requirements change | The rest of the spec (Rust types, chart, hook, tests) still matches reality |
| Data coverage floor | Earliest available Binance BTCUSDT daily candle (2017-08-17), not genesis | Binance has no data before its listing; the loop's genesis startTime is just a lower bound |
| File rename | Optional task, default yes | `coingecko.ts` naming is a fossil that actively misleads; rename to `binance.ts` and update the two test imports |
| Manual refresh requirement | Added to cache requirement | Already implemented (README + UI control); was missing from the spec |

## Risks / Trade-offs

- [Spec claims coverage from 2017-08-17, but if Binance backfills earlier data the scenario becomes stale] → Wording uses "earliest available", not a fixed date mandate.
- [Renaming the file could break an import the tests don't cover] → `grep -r coingecko web/src` before renaming; `npm test` after.
- [Vite proxy `/api/binance/` is dev-only; production static hosting has no proxy] → Out of scope here, but flagged as a Phase 15 deployment consideration.

## Migration Plan

1. Apply spec delta (this change).
2. Optional: rename `coingecko.ts` → `binance.ts`, update imports in `coingecko.test.ts` and any other importers.
3. Run `npm test` (Vitest + wasm-pack).
4. No deploy needed — behavior is unchanged.

## Open Questions

- Should production call Binance directly from the browser (CORS support unverified) or keep a rewrite/proxy layer? Decide in Phase 15 (deployment).
