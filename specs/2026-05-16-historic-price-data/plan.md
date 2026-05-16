# Phase 2 — Historic Price Data: Plan

## Task Group 1: Rust price data types

1. Define `PricePoint { timestamp_ms: i64, price_usd: f64 }` in a new `wasm/src/data/` module.
2. Add `serde` derive macros and `wasm-bindgen` bindings so the type can cross the JS/WASM boundary.
3. Expose a function that accepts a `Vec<PricePoint>` from JS and returns it (round-trip validation).
4. Add `data/mod.rs` and wire into `lib.rs`.
5. `wasm-pack build --target web` succeeds with the new types.

## Task Group 2: CoinGecko API client

1. Create `web/src/lib/api/coingecko.ts` with a function to fetch BTC price history.
2. Use the `/coins/bitcoin/market_chart/range` endpoint with daily granularity, from 2013-04-28 to today.
3. Parse the response into a `PricePoint[]` TypeScript type (mirroring the Rust struct).
4. Handle HTTP errors and rate limiting (retry with backoff on 429).

## Task Group 3: localStorage cache layer

1. Create `web/src/lib/cache/priceCache.ts` for read/write of cached price data.
2. Store the full price history in `localStorage` with a 24-hour TTL timestamp.
3. On load: return cached data immediately if TTL is valid; fetch fresh data otherwise.
4. On API failure: return stale cached data if available; throw if no cache exists.

## Task Group 4: React hook and loading states

1. Create `web/src/hooks/useHistoricPrices.ts` returning `{ data, isLoading, error }`.
2. On mount: check cache, fetch if stale, update state.
3. Expose a `refresh()` function to force re-fetch.
4. Wire loading and error states to UI (spinner while loading, error message with retry button).

## Task Group 5: ECharts price chart

1. Install `echarts` and `echarts-for-react`.
2. Create `web/src/components/charts/PriceChart.tsx`.
3. Render a line series of historic BTC prices with a time-based X axis.
4. Add log/linear Y-axis toggle (button or switch above the chart).
5. Configure `dataZoom` for both axes: `inside` type for pinch-to-zoom and drag-on-chart, `slider` type for axis ruler dragging on X and Y.
6. Add crosshair tooltip showing date and price on hover/touch.
7. Add a reset-zoom button that restores the full date range and auto-scaled Y axis.

## Task Group 6: Mobile responsiveness

1. Chart uses a responsive container that fills available width.
2. Simplify axis tick labels at narrow widths (e.g., `'20` instead of `2020`).
3. Touch targets for toggle and reset buttons are at least 44×44px.
4. Tooltip renders above/below the touch point, not under the finger.
5. No horizontal scrolling at 375px viewport width.
6. `dataZoom` slider handles are large enough for touch interaction.

## Task Group 7: Tests

1. **Rust**: unit test that `PricePoint` serializes/deserializes correctly via serde.
2. **API client**: Vitest test with mocked `fetch` — verifies correct URL construction, response parsing, and error handling (429, network failure).
3. **Cache layer**: Vitest test — verifies write/read, TTL expiry, and stale-cache-on-error fallback.
4. **Hook**: Vitest test with mocked API + cache — verifies loading/success/error state transitions.
5. **Chart component**: Vitest + Testing Library test — verifies chart renders with sample data, toggle switches scale mode, reset button is present.
