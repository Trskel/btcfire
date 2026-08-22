# Design: Monte Carlo Simulation with Outcome Summary

## Context

BTCFire currently simulates retirement over deterministic band paths (median, ±1σ/±2σ, percentile bands) using `run_withdrawal_on_path` in `wasm/src/simulation/engine.rs`. Roadmap Phase 9 adds the Monte Carlo engine: thousands of sampled price paths per configuration, aggregated into outcome probabilities. This change adds the engine plus the four-part outcome summary the user asked for (run-out %, below-minimum %, success %, desired-spend coverage in success paths only), rendered at the beginning of the plan results. The engine must also support starting from an arbitrary `RuntimeState` — the roadmap mandate that lets the Phase 15 "Today" advisor condition runs on real state.

Constraints: everything client-side (privacy), WASM for speed, deterministic results for testability, mobile-first UI, existing conventions (serde camelCase across the boundary, `wasm-pack test --node` + Vitest, no comments unless asked).

## Goals / Non-Goals

**Goals:**

- Sample 10,000 price paths around the selected model's projection per plan run, seeded and reproducible.
- Classify each path into exactly one of: depleted / below-minimum / success (counts sum to 10,000).
- Produce the four-part summary: run-out %, below-minimum %, success %, and % of year-instances at desired spend across success paths only (null when no success paths).
- Return per-year percentile series (p10/p25/p50/p75/p90 of BTC) for Phase 10 fan charts.
- Render the summary as the first section of plan results, mobile-first, with educational info buttons.
- Allow the engine to resume from an arbitrary `RuntimeState` (used by Monte Carlo now, Today advisor later).

**Non-Goals:**

- Fan-chart rendering (Phase 10) — percentiles are computed, not plotted.
- A run-count or seed UI control — fixed 10,000 paths, fixed seed.
- Replacing the deterministic band-path tiles — they stay below the summary.
- Persisting Monte Carlo results — runs recompute on every parameter change, like the band paths.

## Decisions

### 1. Path sampling: log-normal random walk around the model median

Each path is an autoregressive walk in log space:

```
ln P_0 = ln M_0                          (retirement year, no innovation)
ln P_t = ln P_{t-1} + (ln M_t − ln M_{t-1}) + σ_t · ε_t    ε_t ~ N(0,1) iid
```

- `M_t` = model median at year t (always present), `σ_t` = model dispersion at year t via the existing `PathPoint::sigma()` chain (1σ bands → symmetric percentile bands → absent).
- Drift follows the model's median growth; volatility is the model's own dispersion each year. A path that dips stays low (persistence), which is realistic for BTC and standard for retirement Monte Carlo.
- `σ_t` absent → the innovation term is skipped, so no-dispersion models degrade gracefully to the median path (spec: "Randomness only around dispersion").
- Sampled prices are exponentiated, so they are strictly positive by construction.
- *Alternatives considered:* independent yearly draws `P_t = M_t·exp(σ_t·ε_t)` — simpler but path noise cancels year to year with no momentum, producing unrealistic whiplash paths; constant-volatility GBM — ignores that the model's dispersion varies by year and by band style; both rejected.

### 2. RNG: `rand_chacha::ChaCha8Rng`, fixed seed 42

- `rand_chacha` is a tiny, no-platform-dependency crate (no `getrandom` needed for WASM since we seed explicitly with `SeedableRng::seed_from_u64`), and ChaCha's output stream is version-stable — reproducibility across builds and platforms, which the spec requires.
- One RNG instance per run, seeded once; innovations drawn sequentially with `StandardNormal` (Box–Muller/Ziggurat inside rand) — deterministic stream.
- *Alternatives considered:* `rand` with `SmallRng` (stream not guaranteed stable across rand versions — rejected); hand-rolled LCG + Box–Muller (zero deps but reinvents an audited wheel — rejected).

### 3. Engine reuse: one sampled path = one `Vec<PathPoint>` + `run_withdrawal_on_path`

- No new engine. The sampler builds per-path `Vec<PathPoint>` reusing the existing struct (`price_usd` = sampled price, median and band fields copied from the model points so the phase indicator still works inside the withdrawal engine).
- `engine.rs` gains a start-state parameter: `run_withdrawal_on_path_from_state(policy, params, points, Option<&RuntimeState>)`; `run_withdrawal_on_path` delegates with `None`. `run_yearly`/`run_monthly` replace `RuntimeState::new(...)` + rate/base-spend derivation with the provided state when present. Monte Carlo passes `None` today; the advisor will pass a real state later (spec: "Deterministic engine resume from state").

### 4. Aggregation lives in a new module `wasm/src/simulation/monte_carlo.rs`

```rust
pub struct MonteCarloSummary {
    pub run_out_pct: f64,
    pub below_min_pct: f64,
    pub success_pct: f64,
    pub desired_spend_pct: Option<f64>,
}
pub struct YearPercentiles { pub year: i32, pub p10: f64, pub p25: f64, pub p50: f64, pub p75: f64, pub p90: f64 }
pub struct MonteCarloResult { pub run_count: usize, pub seed: u32, pub summary: MonteCarloSummary, pub percentiles: Vec<YearPercentiles> }
pub fn run_monte_carlo(policy, params, model_points, seed, start_state: Option<&RuntimeState>) -> Result<MonteCarloResult, String>
```

Classification per path (tolerance ε = 1e-9):
- **depleted** — any year with `btc ≤ ε && sold_btc ≤ ε` (matches the UI's existing depletion check).
- **below-minimum** — not depleted and any year with `spend_usd < params.floor_usd(t) · (1 − ε)`.
- **success** — otherwise.

Summary:
- run-out/below-min/success = counts / run_count · 100 (sums to 100 by construction).
- desired-spend coverage = Σ year-instances in success paths where `spend_usd ≥ params.inflation_mult(t) · annual_spend_usd · (1 − ε)`, divided by total year-instances in success paths; `None` when success count is 0.

Percentiles: per year index, collect all paths' final-year BTC, sort, nearest-rank selection at 10/25/50/75/90.

### 5. WASM boundary mirrors the existing pattern

`run_monte_carlo_wasm(policy_js, params_js, points_js, seed: u32) -> Result<JsValue, JsValue>` in `lib.rs`, following `run_withdrawal_wasm` (serde-wasm-bindgen both ways, camelCase output). One call per run — 10,000 paths stay inside WASM; crossing the boundary per path would be unusable.

### 6. Web orchestration extends the existing `runWithdrawal`

`web/src/lib/withdrawal.ts`: `runWithdrawal` gains one `run_monte_carlo_wasm(policy, effective, medianPoints, MONTE_CARLO_SEED)` call; the returned `WithdrawalRun` gains `monteCarlo: MonteCarloResult | null`. The median model points feed the sampler (sampling uses medians + bands; `path_price_usd` is irrelevant). The effective (horizon-truncated) params are used, consistent with band paths. TS types mirror the Rust structs in `web/src/types/simulation.ts` (or a new `montecarlo.ts`).

### 7. UI: summary section at the top of `WithdrawalResults`

New `web/src/components/controls/MonteCarloSummary.tsx` rendered first inside `WithdrawalResults` (before the path strip). Four rows, label + percentage (1 decimal), `tabular-nums`, "—" for a null coverage value, an `InfoButton` per row with new `RESULTS_INFO` entries (`monteCarlo`, `runOut`, `belowMin`, `success`, `desiredSpend`) in `web/src/content/info.ts`. Hidden when `totalYears` is 0 (zero-year horizon). Mobile-first: stacked rows, no horizontal scroll at 375px. The summary recomputes automatically because it flows through the existing `useEffect`-driven plan run in `App.tsx`.

## Risks / Trade-offs

- **Performance on low-end phones** (10k × ≤55y × 12 months ≈ 6.6M monthly steps worst case, each with an `erf` evaluation) → single WASM call, async, only on parameter commit (not per keystroke); Rust wasm is expected to complete in tens of ms; if profiling says otherwise, the run count can drop or become a knob in a later phase.
- **Random stream stability** → ChaCha8Rng fixed seed; spec test locks reproducibility; `Cargo.lock` pins versions.
- **Classification edge semantics** (float noise at the floor, exactly-zero spend) → ε = 1e-9 tolerance and unit tests for zero holdings, zero minimum spend, no-dispersion, single-year and zero-year horizons.
- **"Below minimum" may confuse users** (floor is often 0 for non-valuation presets, making the bucket empty) → info buttons explain each metric; UI shows the actual percentages, never inventing categories.
- **Truncated horizon** (model projection shorter than lifespan) shifts summary semantics slightly → same truncation note the band paths already show; consistent behavior across the results section.
- **New dependency** (`rand_chacha`) → tiny, no transitive platform bindings; acceptable under the privacy-first constraint since nothing leaves the machine.

## Open Questions

- None blocking. The desired-spend comparison uses the inflation-adjusted desired annual spend; if the user later wants it compared against the *unadjusted* desired spend, that is a one-line change in `monte_carlo.rs`.
