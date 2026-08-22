# Proposal: Monte Carlo outcome reports (failure forensics, quality-of-life and legacy stats)

## Why

The Monte Carlo engine runs 10,000 full withdrawal paths but only keeps a four-number outcome classification and unrendered BTC percentiles. Every path's failure year, spending shortfall, buffer health, phase history, and final stack are computed and then discarded. The summary answers "what are my odds?" but not "when does it break, how badly, and what does a good retirement look like?" — the questions that actually inform plan changes.

## What Changes

- **Failure-event model.** Refine outcome classification around a first failure event per path: the first year a path spends below the inflation-adjusted floor (including depletion, which makes spend zero). The event's mode and year feed new forensics data. Existing classification precedence (depletion wins over below-minimum) is preserved, so the four summary tiles keep their current numbers — non-breaking.
- **Failure forensics data.** New `forensics` block in the Monte Carlo result: per-year survival curve (share of paths with no failure event through each year), failure-year histogram by mode, median failure year conditional on failing, and shortfall stats (worst-year gap vs. floor, median + p90, conditional on failing paths).
- **Expanded percentile series.** Spend and buffer-years percentiles per simulated year alongside the existing BTC percentiles. Rendered later by the Phase 10 fan charts; this change only computes and transports them.
- **Legacy stats.** Final BTC distribution (p10/p50/p90) over all paths and over success paths only — the "median bequest" number.
- **Phase-time stats.** Share of simulated months in bear/fair/euphoria across all paths.
- **New results section.** A "Failure forensics" section renders below the existing summary tiles: survival curve, failure-year histogram, median failure year, and shortfall stats. Legacy and phase-time stats render as compact stat tiles in the same section. The section hides when there are no failures or the horizon is zero.
- **Educational copy.** Info-button descriptions for every new metric, following the existing `RESULTS_INFO` pattern.

## Capabilities

### New Capabilities

None — everything extends the existing Monte Carlo capability.

### Modified Capabilities

- `monte-carlo-simulation`: classification refined around first failure events (summary unchanged); forensics, expanded percentiles, legacy, and phase-time data added to the result; a failure-forensics results section added to the UI.

## Impact

- **WASM**: `wasm/src/simulation/monte_carlo.rs` (per-path aggregation, result struct growth), `wasm/src/simulation/engine.rs` only if a failure-event helper is needed. Binding `run_monte_carlo_wasm` keeps its signature; its serialized payload grows.
- **Web**: `web/src/types/simulation.ts` (new types), `web/src/components/controls/MonteCarloSummary.tsx` (unchanged tiles), new `web/src/components/controls/MonteCarloForensics.tsx` (or similar), `web/src/components/controls/WithdrawalResults.tsx` (render the new section), `web/src/content/info.ts` (info copy).
- **Tests**: Rust (`wasm-pack test --node`) for every new stat incl. edge cases (zero horizon, no failures, all failures, resume-from-state); Vitest for the new section's rendering rules.
- **Payload/perf**: +2 percentile vectors (horizon × 10k f64 each, aggregated in-engine) plus small forensics structs — tens of KB serialized, negligible compute; WASM memory well within limits.
- **No breaking changes**: existing summary fields and BTC percentile fields keep their shape and semantics.
