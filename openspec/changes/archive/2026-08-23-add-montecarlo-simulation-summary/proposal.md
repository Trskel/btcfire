# Proposal: Monte Carlo Simulation with Outcome Summary

## Why

BTCFire currently simulates retirement against deterministic band paths only (median, ±1σ/±2σ, percentile bands). A single path says "here is one future" — the product's core promise is "will I be okay?", which needs a distribution: thousands of randomly sampled price paths, classified into real retirement outcomes. This is roadmap Phase 9 and the engine the entire product vision (the Today advisor, Phase 15) is built around.

## What Changes

- New Monte Carlo engine in Rust: samples many price paths around the selected model's projection (log-normal random walk driven by the model's per-year median growth and band dispersion), runs the existing withdrawal engine per path, and aggregates outcomes.
- **Outcome classification per path** into three mutually exclusive buckets that partition every run:
  - **Ran out of money** — portfolio depleted to zero before the horizon ends.
  - **Below minimum, never broke** — never depleted, but actual spending fell below the inflation-adjusted minimum floor in at least one year.
  - **Success** — never depleted and never below the minimum.
- **Outcome summary at the beginning of the results**, before any year-by-year detail:
  - % of paths that ran out of money
  - % of paths that did not run out but had to spend below the minimum
  - % of success paths
  - % of years, across success paths only, where spending reached the desired level (inflation-adjusted desired spend)
- Deterministic, reproducible runs: fixed seed → identical results for identical inputs; run count fixed at 10,000 (no UI control in this change).
- Percentile series (p10/p25/p50/p75/p90 of BTC holdings per year) computed by the engine and returned in the result, ready for the Phase 10 fan charts (fan chart *rendering* stays out of scope).
- The withdrawal engine gains the ability to start from an arbitrary `RuntimeState` (BTC, cash, year, buffer flags), so Monte Carlo can later be conditioned on the Today advisor's real state — without it, this change still runs from retirement-day state.
- UI: the plan results card renders the four-part Monte Carlo summary first, above the existing band-path detail. The summary replaces nothing yet — deterministic band paths stay until Phase 10 visualizations land.

## Capabilities

### New Capabilities

- `monte-carlo-simulation`: path sampling around model projections, deterministic seeded RNG, outcome classification (depletion / below-minimum / success), the four-part outcome summary, desired-spend coverage across success paths, percentile series over time, the WASM/TS boundary for all of it, and the summary UI at the beginning of plan results.

### Modified Capabilities

- `withdrawal-policy`: the deterministic engine gains resume-from-state — `run_withdrawal_on_path` must accept an arbitrary `RuntimeState` as its starting point instead of always initializing from retirement day.

## Impact

- `wasm/src/simulation/` — new Monte Carlo engine module (sampling, classification, aggregation); `engine.rs` gains a start-state parameter; `runtime.rs` unchanged (existing `RuntimeState` reused).
- `wasm/src/lib.rs` — new `run_monte_carlo` WASM binding.
- `web/src/lib/wasm.ts`, `web/src/lib/withdrawal.ts` (or a new `montecarlo.ts`) — TS bindings and run orchestration.
- `web/src/components/controls/WithdrawalResults.tsx` — Monte Carlo summary section at the top of results.
- `web/src/content/info.ts` — educational copy for the summary metrics.
- Tests: Rust (seeded reproducibility, classification partition sums to 100%, edge cases: zero holdings, single-year horizon, no band dispersion, zero minimum spend) and React (summary rendering).
- Specs: `specs/roadmap.md` Phase 9 status note on completion.
