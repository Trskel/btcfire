# Tasks: Results dashboard — fan charts

## 1. Data helpers and tooltip copy

- [ ] 1.1 Add `VISUALIZATION_INFO` entries to `web/src/content/info.ts` (fanChartBands, metricBtc, metricSpend, metricBuffer, colMedianBtc, colBtcRange, colMedianSpend, colMedianBuffer, colSurvival) with non-empty educational copy
- [ ] 1.2 Add pure `buildFanChartOption(metric, percentiles, isDark, isDesktop)` helper in `web/src/lib/` producing the ECharts option (stacked p10–p90 + p25–p75 bands, p50 line, per-metric axis formatters, theme colors)
- [ ] 1.3 Add pure `buildDistributionRows(result)` helper in `web/src/lib/` deriving `DistributionRow[]` from `percentiles` + `forensics.survivalByYear`
- [ ] 1.4 Add `useIsDesktop()` hook (matchMedia `(min-width: 640px)`) in `web/src/hooks/`
- [ ] 1.5 Add Vitest tests for `buildFanChartOption` (band structure, invisible lower series carry zero opacity, mobile axis density ≤1 label/10y, formatters) and `buildDistributionRows` (row count, value mapping, missing survival → "—")

## 2. Fan chart component

- [ ] 2.1 Create `web/src/components/charts/MonteCarloFanChart.tsx` with the metric toggle (BTC holdings / annual spend / cash-buffer years), InfoButton on the toggle, and memoized option
- [ ] 2.2 Wire responsive behavior: mobile legend on top, desktop legend right; axis density from `useIsDesktop`
- [ ] 2.3 Add Vitest component tests: renders bands for selected metric, metric switch re-renders, no render without a valid run

## 3. Distribution table and cards

- [ ] 3.1 Create `web/src/components/tables/DistributionTable.tsx` (desktop table: median BTC, p10–p90 range, median spend, median buffer years, survival share; InfoButton per column header)
- [ ] 3.2 Create `web/src/components/tables/DistributionCards.tsx` (mobile card layout, one card per year, shared info buttons)
- [ ] 3.3 Add Vitest component tests: table shown at `sm+`, cards below `sm`, one row per simulated year, values match the run

## 4. Integration into plan results

- [ ] 4.1 Create `web/src/components/controls/MonteCarloVisualization.tsx` composing the fan chart and distribution table/cards, gated on a valid Monte Carlo run with non-zero horizon
- [ ] 4.2 Insert `MonteCarloVisualization` into `WithdrawalResults.tsx` between the forensics section and the price-path strip
- [ ] 4.3 Verify zero-horizon and no-run paths render no visualization section

## 5. Verification

- [ ] 5.1 Run `npm test` — all Vitest and wasm tests pass
- [ ] 5.2 Run `npm run lint` and `npm run typecheck` (or the repo's equivalent checks) with no errors
- [ ] 5.3 Manual pass at 375px / 768px / 1024px in light and dark themes: no horizontal scrolling, axis density and legend per spec, table↔card switch at 640px, info buttons open panels on all new elements
