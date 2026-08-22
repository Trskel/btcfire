# Proposal: Results dashboard — fan charts

## Why

Phase 9 computed the full Monte Carlo percentile series (BTC holdings, annual spend, cash-buffer years at p10/p25/p50/p75/p90 per year) but only renders the four-metric summary and failure forensics. The percentile series — the heart of "honest uncertainty" — has no visual rendering yet, and the year-by-year view shows a single deterministic band path rather than the distribution. This change completes the Phase 10 roadmap deliverable: a complete, mobile-friendly results dashboard for classic FIRE.

## What Changes

- Add a **fan chart** (ECharts stacked percentile bands p10–p90 outer, p25–p75 inner, p50 line) with a metric toggle across BTC holdings, annual spend, and cash-buffer years.
- Add a **year-by-year distribution table** driven by the Monte Carlo percentile series (median BTC, spend, buffer years, survival share per year), rendering as cards below `sm` and as a table at `sm+`.
- Charts adapt axis density and legend placement to container width; table switches to card layout on mobile.
- Educational info buttons on the fan-chart metric toggle and distribution-table columns, reusing the existing `InfoButton` component and `content/info.ts` copy.
- Keep the existing single-path year table and price-path strip as-is (deterministic band detail remains available below the distribution views).

## Capabilities

### New Capabilities

- `results-visualization`: Rendering of the Monte Carlo percentile series as fan charts with a metric selector, a year-by-year distribution table with mobile card layout, responsive chart/table behavior, and educational tooltips on all new result elements.

### Modified Capabilities

<!-- none — percentile computation (monte-carlo-simulation), InfoButton component (info-buttons), and the summary/forensics sections already satisfy their specs -->

## Impact

- Web only: `web/src/components/charts/` (new fan chart), `web/src/components/tables/` (new distribution table), `web/src/components/controls/WithdrawalResults.tsx` (integrate new sections above the price-path strip), `web/src/content/info.ts` (new tooltip copy).
- No WASM changes — percentile series already crosses the boundary in `MonteCarloResult.percentiles`.
- New dependency: none. ECharts stacked-area band pattern already in use in `PriceChart.tsx`.
- Tests: Vitest component tests for the fan-chart option builder and the distribution table's mobile/desktop rendering.
