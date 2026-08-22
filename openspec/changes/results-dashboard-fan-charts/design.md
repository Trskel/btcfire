# Design: Results dashboard — fan charts

## Context

Phase 9 delivered the Monte Carlo engine and its data contract: `MonteCarloResult` crosses the WASM boundary with `summary`, `percentiles` (BTC/spend/buffer-years at p10–p90 per year), `forensics.survivalByYear`, `legacy`, and `phaseTime`. The plan results (`WithdrawalResults.tsx`) currently render the summary tiles, the forensics section (survival curve + failure histogram), the price-path strip, and a single deterministic band-path year table. The percentile series has no rendering, and the year-by-year view shows one deterministic path instead of the distribution. This change adds the fan charts and the distribution table that consume the already-computed series — web-only, no WASM work.

## Goals / Non-Goals

**Goals:**

- Render the Monte Carlo percentile series as stacked fan charts with a metric toggle (BTC holdings / annual spend / cash-buffer years).
- Add a year-by-year distribution table (median BTC, p10–p90 BTC range, median spend, median buffer years, survival share) with a mobile card layout below 640px.
- Responsive chart containers (axis density, legend placement) and no horizontal scrolling at 375px.
- Educational info buttons on the metric toggle and every distribution column, reusing `InfoButton` and `content/info.ts`.

**Non-Goals:**

- No changes to the WASM engine or the `MonteCarloResult` contract.
- No rework of the existing summary/forensics sections, price-path strip, or single-path table.
- No scenario-comparison overlay (Phase 13).
- No new charting library — ECharts stays.

## Decisions

**1. Fan charts reuse the stacked-band technique from `PriceChart.tsx`**

The price chart already renders percentile bands via ECharts stacked area series: transparent lower-bound series (`stack` id + invisible line/area) paired with a filled upper series. The fan chart uses the same pattern per metric: an invisible p10 series stacked with a filled p10–p90 band, an invisible p25 series stacked with a filled p25–p75 band, and a normal p50 line. Rationale: proven in this codebase, supports both dark/light theming via theme-derived colors, and avoids new dependencies. Alternative considered: ECharts `custom` series drawing polygons per band — more code, no visual gain.

**2. One chart component, client-side metric switch**

`MonteCarloFanChart` holds the metric as local React state (default BTC holdings) and rebuilds the ECharts option via a pure `buildFanChartOption(metric, percentiles, theme)` helper. Rationale: a single chart instance with option swapping is smoother than three mounted charts and keeps axis-animation states consistent; a pure option builder is trivially unit-testable in Vitest. Alternative: three side-by-side mini charts — rejected, mobile-first density.

**3. Option builder is a pure function, theme-aware**

The builder takes `(metric, percentiles: YearPercentiles[], isDark: boolean)` and returns an ECharts option. Axis label formatters per metric: BTC → `formatBtc` (8-dp trimmed), spend → compact USD (`$12k`), buffer years → `x.x y`. Colors: outer band `hsl(var(--primary))`-derived at low opacity, inner band higher opacity, p50 line solid primary, grid/axis text from `--muted-foreground`. Rationale: keeps theming consistent with the price chart and makes chart math testable without rendering.

**4. Responsive behavior via matchMedia breakpoint at 640px**

A `useIsDesktop()` hook (matchMedia `(min-width: 640px)`) drives axis density (mobile: ≤1 x-label per 10 horizon years; desktop: auto) and legend placement (mobile: top; desktop: right). Rationale: ECharts options are per-render; a hook re-render is cheaper and more predictable than container-resize observers for a binary layout switch, and mirrors the existing Tailwind `sm:` convention. Alternative: ECharts `resize` + media query in option — rejected, harder to test.

**5. Distribution table is a new component pair in `components/tables/`**

`DistributionTable` (desktop `sm+`) and `DistributionCards` (mobile) both consume the same derived row type `DistributionRow { year, btcP10, btcP50, btcP90, spendP50, bufferP50, survivalPct }` built from `percentiles` + `survivalByYear` by a shared `buildDistributionRows(result)` pure helper. Rationale: mirrors the existing `YearlyCards`/`YearlyTable` split in `WithdrawalResults.tsx`, keeps a single source of truth for row derivation, and both forms are testable. Missing survival entries (years beyond the forensics horizon) render "—".

**6. Section integration in `WithdrawalResults.tsx`**

New `MonteCarloVisualization` section component rendered between `<MonteCarloForensics/>` and the price-path strip, gated on `run.totalYears > 0 && run.monteCarlo`. Rationale: keeps `WithdrawalResults` lean and satisfies the ordering scenarios in the spec without touching existing sections.

**7. Tooltip copy in `content/info.ts`**

Add `VISUALIZATION_INFO` entries: `fanChartBands`, `metricBtc`, `metricSpend`, `metricBuffer`, `colMedianBtc`, `colBtcRange`, `colMedianSpend`, `colMedianBuffer`, `colSurvival`. Rationale: all educational copy already lives there; the `InfoButton` component is a drop-in.

## Risks / Trade-offs

- [Band stacking with ECharts `stack` requires the lower series to be fully transparent — if theme colors leak through the invisible series, bands will look wrong] → Reuse the exact pattern from `PriceChart.tsx` (opacity 0 on line/area, filled upper only) and add a Vitest assertion that invisible series carry zero opacity.
- [Zero or near-zero BTC/spend values make log or naive scales misleading; bands can flatten to 0] → Use linear scales with non-negative data (engine guarantees positivity of prices, BTC ≥ 0); axis min 0 for BTC/spend; this matches the honest-uncertainty principle (flat bands are true information).
- [Long horizons (60+ years) with 5 columns risk cramped cards at 375px] → Card grid uses the existing 2-column label/value pattern; BTC range collapses to "p10–p90" on one line; verify at 375px in the acceptance pass.
- [ECharts option churn on every metric switch could stutter] → Metrics are small arrays (≤ horizon length); rebuild is cheap. No virtual DOM for charts needed.
- [Performance: chart re-renders on every slider move] → Already the case for existing charts; option builder is pure and memoized with `useMemo` on `(metric, percentiles, isDark)`.

## Migration Plan

- Pure additive UI: new components and one insertion point in `WithdrawalResults.tsx`. No data-model or storage changes, so no migration or rollback steps beyond reverting the change.
- Acceptance: `npm test` (Vitest for builder helpers + component tests) and a manual pass at 375px/768px/1024px with light and dark themes, verifying no horizontal scroll.

## Open Questions

- None blocking. Whether the fan-chart section should later gain an "overlay model bands" toggle is deferred to Phase 13 (scenario comparison).
