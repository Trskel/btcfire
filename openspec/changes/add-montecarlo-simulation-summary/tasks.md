## 1. Rust: engine resume-from-state

- [x] 1.1 Add `rand = { version = "0.9", default-features = false }` and `rand_chacha = "0.9"` to `wasm/Cargo.toml` dependencies (0.9 is the rand 0.9-compatible line, not 0.3)
- [x] 1.2 Refactor `wasm/src/simulation/engine.rs`: add `run_withdrawal_on_path_from_state(policy, params, points, Option<&RuntimeState>)` that starts from the provided state (BTC, cash, buffer years, deferred-buffer flag, year, initial rate, base spend); `run_withdrawal_on_path` delegates with `None`; `run_yearly`/`run_monthly` use the provided state instead of `RuntimeState::new` + default derivations when present
- [x] 1.3 Add Rust tests: default (None) start equals today's behavior; custom state (0.5 BTC, $20k cash, deferred buffer) reflected in first-year results; determinism of the resume path (also converted the module's previously-silent plain `#[test]`s to `#[wasm_bindgen_test]` so they run under `wasm-pack test --node`)

## 2. Rust: Monte Carlo engine

- [x] 2.1 Create `wasm/src/simulation/monte_carlo.rs` with `MonteCarloSummary` (run_out_pct, below_min_pct, success_pct, desired_spend_pct: Option<f64>), `YearPercentiles` (year, p10/p25/p50/p75/p90), and `MonteCarloResult` (run_count, seed, summary, percentiles) — all serde camelCase
- [x] 2.2 Implement path sampling: log-normal random walk `ln P_t = ln P_{t-1} + (ln M_t − ln M_{t-1}) + σ_t·ε_t` using `ChaCha8Rng` seeded from a fixed seed and `StandardNormal`; dispersion via the existing `PathPoint::sigma()` chain; skip innovation when dispersion absent; retire a per-path `Vec<PathPoint>` with sampled `price_usd` and copied median/band fields
- [x] 2.3 Implement the run loop: 10,000 paths through `run_withdrawal_on_path_from_state`, classification (depleted: any year btc ≤ ε && sold ≤ ε; below-minimum: never depleted and any year spend < floor·(1−ε); success otherwise; ε = 1e-9), and summary aggregation (percentages over the run count; desired-spend coverage over success-path year-instances vs inflation-adjusted desired spend, null when zero success paths)
- [x] 2.4 Implement the percentile series: per year index, nearest-rank p10/p25/p50/p75/p90 of path BTC holdings across all paths
- [x] 2.5 Handle edge cases without error: zero-year horizon (empty result), zero holdings, single-year horizon, zero minimum spend, models without dispersion

## 3. Rust tests for Monte Carlo

- [x] 3.1 Determinism: same policy/params/points/seed twice → identical summary and percentiles
- [x] 3.2 Classification partition: run-out + below-minimum + success = 10,000 for every tested configuration; depletion precedence over below-minimum
- [x] 3.3 Below-minimum vs success: a policy/params combo where some paths dip under the floor without depleting (e.g. % of current) counts below-minimum; a safe configuration counts success
- [x] 3.4 Desired-spend coverage: only success-path year-instances contribute; null when zero success paths; 100% when a success path always meets the desired spend
- [x] 3.5 Percentiles: ordering p10 ≤ p25 ≤ p50 ≤ p75 ≤ p90 per year; all equal to the median path when dispersion is absent
- [x] 3.6 Edge cases: zero holdings → all depleted; zero minimum → no below-minimum; single-year horizon → valid summary and percentiles; zero-year horizon → empty valid result

## 4. WASM binding

- [x] 4.1 Add `run_monte_carlo_wasm(policy_js, params_js, points_js, seed: u32) -> Result<JsValue, JsValue>` to `wasm/src/lib.rs` following the `run_withdrawal_wasm` pattern
- [x] 4.2 Add a `wasm_bindgen_test` smoke test: default policy + flat no-band projection returns a `MonteCarloResult` with 10,000 runs and 100% success

## 5. Web: types and orchestration

- [x] 5.1 Add TypeScript mirrors of `MonteCarloSummary`, `YearPercentiles`, and `MonteCarloResult` to `web/src/types/simulation.ts`
- [x] 5.2 Extend `web/src/lib/withdrawal.ts`: `runWithdrawal` additionally calls `run_monte_carlo_wasm` once with the effective (truncated-horizon) params and the median model points, attaching `monteCarlo` to `WithdrawalRun`; export the fixed seed constant
- [x] 5.3 Verify the wasm package is rebuilt (`wasm-pack build --target web`) so the new export is available to the web app

## 6. Web: summary UI

- [x] 6.1 Create `web/src/components/controls/MonteCarloSummary.tsx`: four labeled rows — "Ran out of money", "Below minimum spending", "Success", "Time at desired spend (successful runs only)" — each with percentage (1 decimal, tabular-nums) and an `InfoButton`; "—" for a null coverage value; hidden when the horizon is zero
- [x] 6.2 Add `RESULTS_INFO` entries (`monteCarlo`, `runOut`, `belowMin`, `success`, `desiredSpend`) to `web/src/content/info.ts` with educational copy
- [x] 6.3 Render `MonteCarloSummary` as the first section of `WithdrawalResults`, above the path strip and yearly detail
- [x] 6.4 Update existing React tests (App, WithdrawalResults) for the new first section and add tests: summary renders four rows with expected percentages, "—" when coverage is null, hidden on zero-year horizon, no horizontal scroll at 375px

## 7. Verification

- [x] 7.1 Run `wasm-pack test --node` in `wasm/` and `npm test` in `web/`; fix any failures
- [x] 7.2 Run `npm run lint` in `web/` and fix violations
- [x] 7.3 Manual check at 375px viewport: summary renders above the path strip, no horizontal scroll, percentages change when parameters change
- [x] 7.4 Update `specs/roadmap.md` Phase 9 status note to reference this change
