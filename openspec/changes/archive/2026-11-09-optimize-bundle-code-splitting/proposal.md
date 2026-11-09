# Proposal: Bundle optimization and code splitting

## Why

The production build shipped one 1.80 MB JavaScript chunk (553 kB gzipped), dominated by ECharts. Two causes:

1. `echarts-for-react`'s root entry imports the **full** `echarts` package, even though every chart already uses the modular `echarts/core` API and passes its own `echarts` instance.
2. All chart components were statically imported, so the charting library sat on the critical path even when results were not yet computed.

Phase 12 promises production build optimization; this change delivers it.

## What Changes

- Import the ECharts-for-React core component (`echarts-for-react/lib/core`) instead of the package root.
- Remove the unused `CustomChart` import and explicitly register `LegendComponent` in `PriceChart` (the legend previously depended on the full-package import).
- Split `echarts` and `react` into vendor chunks via Rolldown `codeSplitting` groups.
- Lazy-load `PriceChart`, the forensics charts, and the Monte Carlo fan chart so ECharts is never module-preloaded by the initial document.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `deployment`: adds production bundle requirements — vendor chunking, lazy chart loading, and modular ECharts imports.

## Impact

- `web/vite.config.ts` (code splitting), `web/src/App.tsx`, `web/src/components/charts/*`, `web/src/components/controls/MonteCarloForensics*.tsx`, `web/src/components/controls/MonteCarloVisualization.tsx`.
- Test mocks updated for `echarts-for-react/lib/core` and lazy-loaded charts.
- No runtime behavior change; lazy chart sections use fixed-height skeleton fallbacks.
