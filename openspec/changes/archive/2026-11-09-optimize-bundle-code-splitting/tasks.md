# Tasks: Bundle optimization and code splitting

## 1. Modular ECharts imports

- [x] 1.1 Switch `PriceChart`, `MonteCarloForensics`, and `MonteCarloFanChart` to `echarts-for-react/lib/core`
- [x] 1.2 Remove the unused `CustomChart` import and add `LegendComponent` registration in `PriceChart`
- [x] 1.3 Update Vitest mocks for `echarts-for-react/lib/core` and the component registration set

## 2. Vendor code splitting

- [x] 2.1 Add Rolldown `codeSplitting` groups for `echarts`/`zrender` and `react`/`react-dom`/`scheduler` in `vite.config.ts`

## 3. Lazy chart loading

- [x] 3.1 Lazy-load `PriceChart` in `App` with a 400 px spinner fallback
- [x] 3.2 Extract the forensics chart components into `MonteCarloForensicsCharts.tsx` and lazy-load them inside `MonteCarloForensics` with 200 px fallbacks
- [x] 3.3 Lazy-load `MonteCarloFanChart` in `MonteCarloVisualization` with a 320 px fallback
- [x] 3.4 Update affected tests to await lazy chart mounts

## 4. Verification

- [x] 4.1 Production build: ECharts chunk 625.57 kB (208.17 kB gzip), entry 469.22 kB (119.33 kB gzip), React 189.64 kB (59.65 kB gzip); no ECharts modulepreload in `index.html`
- [x] 4.2 `npm run lint` and `npm test` pass (170 tests)
- [x] 4.3 Deploy to Cloudflare Pages and verify the new entry, lazy chunks, and ECharts chunk return `application/javascript`
