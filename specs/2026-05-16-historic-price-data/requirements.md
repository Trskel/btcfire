# Phase 2 — Historic Price Data: Requirements

## Goal

Display BTC's full price history as an interactive, zoomable chart. Establish the data pipeline (API fetch, cache, shared types) that all future phases will build on.

## Scope

### In scope

- **Rust price data types** (`wasm/src/data/`): a `PricePoint` struct with serde + wasm-bindgen, ready for Phases 3–5 to consume in price model functions.
- **CoinGecko API client** (`web/src/lib/api/`): fetches daily BTC/USD prices from 2013-04-28 to present using the free `/coins/bitcoin/market_chart/range` endpoint.
- **localStorage cache**: full price history cached with a 24-hour TTL. Stale cache served as fallback when the API is unavailable.
- **React hook** (`useHistoricPrices`): manages loading, error, and data states for the price data pipeline.
- **ECharts line chart**: interactive chart with log/linear Y-axis toggle, dual-axis zoom/pan (pinch-to-zoom on touch, drag-on-axis-rulers on desktop), crosshair tooltip, and reset-zoom button.
- **Mobile-first responsive layout**: chart adapts to screen width with simplified labels, touch-friendly controls, and no horizontal scrolling at 375px.
- **Tests**: Rust serde tests, Vitest tests for API client, cache layer, hook, and chart component.

### Out of scope

- Price models (Power Law, S2F, Bitcoin24) — Phases 3–5.
- Monte Carlo fan chart rendering — Phase 10 (but ECharts is chosen specifically to support it later).
- User parameter inputs (holdings, retirement year) — Phase 6.
- Any data processing in WASM beyond type definitions — the fetch/cache/transform pipeline stays in TypeScript for this phase.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Charting library | ECharts (`echarts` + `echarts-for-react`) | Native `dataZoom` for both-axis zoom/pan with touch support. Stacked area series will support Monte Carlo fan charts in Phase 10. Replaces Recharts from original tech stack. |
| Price data API | CoinGecko free tier | No API key needed, daily granularity back to 2013, well-documented. |
| Cache strategy | localStorage with 24h TTL | Simple, no dependencies, survives page reload. Daily refresh is sufficient for historic data. |
| Data types in Rust | `PricePoint { timestamp_ms: i64, price_usd: f64 }` | Shared type prepares for Phases 3–5 where Rust price models will consume this data. Avoids a refactor later. |
| Data processing | TypeScript (not WASM) | ~4,500 data points — JS handles this in under a millisecond. Serialization overhead across the WASM boundary would cost more than the processing. |
| Error handling | Stale cache fallback + error UI | CoinGecko free tier has rate limits (10–30 req/min). Graceful degradation keeps the app usable. |

## Context

This is Phase 2 of the BTCFire roadmap. It introduces the first real data and visualization. The charting library choice (ECharts over Recharts) is a forward-looking decision — ECharts' stacked area series and dataZoom will be needed for Monte Carlo fan charts in Phase 10 and model overlay comparisons in Phases 3–5. The Rust `PricePoint` type is intentionally minimal now but positions the crate to accept price data as input for model functions in the next phases.
