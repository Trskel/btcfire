# Design: Bundle optimization and code splitting

## Context

Vite 8 / Rolldown builds the SPA into a single entry. ECharts is the largest dependency and is used by three components: `PriceChart`, `MonteCarloForensics`, and `MonteCarloFanChart`. The app already imports from `echarts/core` and registers only the charts/components it uses, but `echarts-for-react`'s root module imports the full ECharts package at module scope.

## Goals / Non-Goals

**Goals**
- Remove the full ECharts package from the graph.
- Isolate ECharts into its own chunk and keep it off the document's preload list.
- Preserve chart behavior, including the price-chart legend, which relies on explicit component registration under modular imports.

**Non-Goals**
- Replacing ECharts or changing chart features.
- WASM size changes (the release profile already uses `opt-level = "s"` + `lto`; attempts to add `panic = "abort"`/`strip` produced wasm-opt bulk-memory validation failures and were reverted).
- PWA/offline support and Monte Carlo profiling (moved to Phase 15).

## Decisions

1. **Use `echarts-for-react/lib/core`.** The root entry (`lib/index.js`) does `import * as echarts from 'echarts'`, defeating tree-shaking. The core entry accepts the `echarts` prop, exactly how all three components already use it.

2. **Vendor chunks via Rolldown `codeSplitting.groups`.** Groups `echarts` (`echarts|zrender`) and `react` (`react|react-dom|scheduler`) keep large, stable libraries cacheable and out of the app chunk. Groups are preferred over deprecated `manualChunks`.

3. **Dynamic imports at the render boundaries.** `PriceChart` is lazy in `App`; `MonteCarloFanChart` is lazy in `MonteCarloVisualization`; the two forensics chart components are extracted into `MonteCarloForensicsCharts.tsx` and lazy-loaded inside `MonteCarloForensics`. The forensics tiles stay synchronous, so only the chart rendering suspends.

4. **Skeleton fallbacks sized to the chart.** `PriceChart` falls back to the existing 400 px spinner; the fan chart to a 320 px block; the forensics charts to a 200 px block, avoiding layout shift.

5. **Explicit `LegendComponent` in `PriceChart`.** Modular imports register components globally; without the full-package import, the legend would silently disappear. The regression is covered by keeping the chart's existing tests and mocks in sync.

## Risks / Trade-offs

- **[Dynamic import waterfall]** → The chart chunk is discovered after the entry executes. Acceptable: the entry/render shell paints first and the chart was already the heaviest item; the ECharts chunk is small enough gzipped (208 kB) to fetch quickly.
- **[Suspense flashes]** → Fixed-height fallbacks match final chart dimensions; no cumulative layout shift.
- **[Test async boundaries]** → Lazy tests now await `findBy*`; suite remains green.

## Migration Plan

Build and deploy normally (`npm run deploy`). Rollback is a Cloudflare Pages deployment rollback or reverting the code; no data migration.
