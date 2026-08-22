# Tasks: Monte Carlo outcome reports

## 1. Rust — result structs and aggregation

- [x] 1.1 Add `MonteCarloForensics`, `LegacyStats`, and `PhaseTimeStats` structs and extend `YearPercentiles` with spend and buffer-years percentile fields in `wasm/src/simulation/monte_carlo.rs` (camelCase serde)
- [x] 1.2 Extend `MonteCarloResult` with `forensics`, `legacy`, and `phase_time` fields; update the zero-horizon early return with empty/null blocks
- [x] 1.3 Record per-path failure events in the run loop: depletion year (first `btc <= EPS && sold_btc <= EPS`) and below-minimum year (first `spend < floor * (1 - EPS)`), mode per existing precedence
- [x] 1.4 Aggregate the failure-year histogram by mode and derive the survival-by-year curve (cumulative sum)
- [x] 1.5 Aggregate shortfall: per failing path the max over years of `max(0, floor - spend)`; report median and p90 across failing paths
- [x] 1.6 Aggregate legacy stats: final-year BTC p10/p50/p90 across all paths and median across success paths only
- [x] 1.7 Aggregate phase-time shares from year-end phases when `policy.valuation.enabled`; null otherwise
- [x] 1.8 Extend the per-year percentile aggregation to collect and sort spend and buffer-years vectors alongside BTC
- [x] 1.9 Confirm the zero-horizon path returns empty/null new blocks without error

## 2. Rust — tests

- [x] 2.1 Failure event model: depleted path fails at depletion year; below-minimum path fails at first below-floor year; success path has no event; modes match summary counts; zero floor yields depletion-mode failures only
- [x] 2.2 Forensics: survival is 100 at first year and equals success % at last year; all-success run keeps survival 100 with null median/shortfall; immediate failure drops survival to 0; histogram sums to failing-path count; shortfall values non-negative; zero-horizon forensics empty/null
- [x] 2.3 Legacy stats: p10 ≤ p50 ≤ p90; all-depleted run yields zeros and null success median; final percentiles equal the percentile series' last year
- [x] 2.4 Phase-time: shares sum to 100 for valuation policies; null for yearly policies; null for zero horizon
- [x] 2.5 Percentile tests: ordering holds for BTC, spend, and buffer years; median-path tracking holds for all three quantities
- [x] 2.6 Reproducibility: same seed twice returns identical forensics, legacy, and phase-time blocks

## 3. Web — types and educational copy

- [x] 3.1 Extend `web/src/types/simulation.ts`: `MonteCarloForensics`, `LegacyStats`, `PhaseTimeStats`, expanded `YearPercentiles`, and the grown `MonteCarloResult`
- [x] 3.2 Add `RESULTS_INFO` entries for the forensics section, survival curve, failure-year histogram, median failure year, shortfall, final BTC stats, and phase-time shares in `web/src/content/info.ts`

## 4. Web — UI

- [x] 4.1 Extract `MetricTile` from `web/src/components/controls/MonteCarloSummary.tsx` into `web/src/components/ui/metric-tile.tsx` and reuse it in the summary
- [x] 4.2 Create `web/src/components/controls/MonteCarloForensics.tsx` with the survival line chart and failure-year histogram (ECharts, mobile-safe config per design)
- [x] 4.3 Add the stat tiles: median failure year, shortfall median + p90, legacy final-BTC percentiles, success-path median, phase-time shares
- [x] 4.4 Wire the section into `web/src/components/controls/WithdrawalResults.tsx` below the summary tiles; hide failure parts when there are no failures and the whole section when the horizon is zero

## 5. Web — tests and verification

- [x] 5.1 Update Monte Carlo fixtures in `web/src/__tests__/WithdrawalResults.test.tsx` for the grown result type
- [x] 5.2 Add `MonteCarloForensics` tests: renders below summary; hides failure parts when no failures; hidden at zero horizon; info buttons per metric
- [x] 5.3 Run the full test suite (`wasm-pack test --node` in `wasm/` and `vitest run` in `web/`) and fix failures
- [x] 5.4 Run `npm run lint` and `npm run build` in `web/` and fix issues
