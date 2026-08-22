# Design: Monte Carlo outcome reports

## Context

The Monte Carlo engine (`wasm/src/simulation/monte_carlo.rs`) runs 10,000 seeded paths through the withdrawal engine and currently keeps only the four-part classification summary plus per-year BTC percentiles (unrendered). Each path's full `YearResult` series — failure timing, shortfalls, spend, buffer years, phases, final stack — is discarded after classification. This change computes and transports failure forensics, quality-of-life and legacy statistics from that already-computed data, and renders a new results section. Phase 10 fan charts later consume the expanded percentile series.

## Goals / Non-Goals

**Goals:**
- Per-path failure events (year + mode) consistent with the existing classification; summary numbers unchanged.
- Forensics (survival curve, failure-year histogram by mode, median failure year, shortfall median/p90), legacy stats (final BTC p10/p50/p90 over all paths, median over success paths), and phase-time shares in the WASM result.
- Spend and buffer-years percentile series alongside BTC percentiles.
- A "Failure forensics" results section below the summary tiles with charts and labeled stats, mobile-usable at 375px.
- Determinism preserved: identical seed → identical result including the new blocks.

**Non-Goals:**
- Rendering fan charts (Phase 10).
- Parameter sweeps / safe withdrawal rate (Tier 2, separate change).
- Reporting sampling error or multi-seed resampling.
- Changing the four summary tiles or their semantics.
- Month-level retention inside Monte Carlo paths (yearly aggregates only).

## Decisions

### 1. Failure event = (year, mode); mode follows existing precedence
For each path, in a single pass over its results, record:
- `depletion_year` = first year with `btc <= EPS && sold_btc <= EPS` (same condition as today).
- `below_min_year` = first year with `spend < floor * (1 - EPS)` (same tolerance as today).
- Failure year = `depletion_year` if the path ever depletes (precedence preserved), else `below_min_year`; mode accordingly. Success = no event.

This preserves the summary partition exactly (existing spec scenario "Depletion takes precedence") while giving the histogram honest years. A depleted path that first under-spent in an earlier year reports its depletion year — the moment it actually broke.

*Alternatives considered:* first-event-wins (reclassifies some paths below-min, changing summary numbers — rejected as a breaking change to trusted headline numbers); reporting both years per path (rejected: complicates the histogram, marginal value).

### 2. Extend `YearPercentiles` with flat additive fields
`YearPercentiles` gains `spend_p10…spend_p90` and `buffer_years_p10…buffer_years_p90` (camelCase in JS: `spendP10`, `bufferYearsP10`). Existing BTC field names unchanged.

*Alternatives considered:* nested per-quantity objects (cleaner typing, but breaks existing Rust tests and TS types for zero benefit — nothing consumes these fields yet); separate parallel vectors keyed by quantity (rejected: splits the year series across arrays for no gain).

Memory: 3 × horizon × 10,000 × 8 B ≈ 12 MB transient for a 50-year horizon — well within WASM32 limits; runtime cost is two extra sorts of 10k-element vectors per year, negligible next to the existing sort.

### 3. Inline aggregation, no per-path retention
The loop already iterates every path's results once for classification. Extend that same pass to: record the failure year per path (two `Vec<i32>`s by mode), accumulate per-year histogram counts (`Vec<u32>` by mode, horizon-sized), the per-path worst shortfall (`Vec<f64>`), per-year spend/buffer vectors, final-BTC values (all and success-only), and per-phase year-end counts. Post-loop: sort small vectors for medians/percentiles; survival curve is a running cumulative sum over the histograms.

*Alternatives considered:* storing all 10,000 full path series and post-processing (rejected: ~5× memory, no benefit); a second aggregation pass over retained paths (rejected: doubles engine work).

No new RNG draws are added, so the RNG consumption order is untouched and seeded reproducibility holds for the new aggregates.

### 4. Phase-time from year-end phases, gated on valuation
The monthly engine reports one phase per year (the final month's phase); the yearly engine reports none. Phase-time therefore computes the share of year-end results per phase across all paths, and is `null` unless `policy.valuation.enabled`.

*Alternatives considered:* true month-share retention inside the monthly engine (rejected: invasive engine change for an approximation the info copy can disclose); always computing (rejected: meaningless zeros for yearly policies).

### 5. Result struct growth behind existing binding
`MonteCarloResult` gains `forensics`, `legacy`, and `phase_time` fields. `run_monte_carlo_wasm` keeps its signature; serde camelCase carries the new blocks. TS types in `web/src/types/simulation.ts` mirror the growth; `web/src/lib/withdrawal.ts` needs no logic change.

### 6. UI: one new section, shared tile component
- New `web/src/components/controls/MonteCarloForensics.tsx` takes the full `MonteCarloResult` (or its new blocks) and renders: survival line chart + failure-year histogram (ECharts, reusing the existing chart setup pattern from `PriceChart.tsx`), median failure year and shortfall tiles, legacy tiles, phase-time shares.
- Extract `MetricTile` from `MonteCarloSummary.tsx` into `web/src/components/ui/metric-tile.tsx` and reuse in both components (avoids a second copy of the same tile markup).
- `WithdrawalResults.tsx` renders the section below `MonteCarloSummary`, guarded by `run.totalYears > 0`; the component hides failure parts when the histogram is empty, per spec.
- Info copy: add `RESULTS_INFO` entries (`forensics`, `survival`, `failureYear`, `medianFailureYear`, `shortfall`, `finalBtc`, `phaseTime`).

*Alternatives considered:* merging into `MonteCarloSummary.tsx` (rejected: one component per concern, matches existing file-per-section style); separate sections for legacy and phase-time (rejected: three extra headers for two stat tiles; the spec groups them).

## Risks / Trade-offs

- **Serialized payload growth** (percentile series ×3 + forensics) → ~tens of KB over the WASM boundary per run; measured per run cadence (per slider commit) this is negligible. Mitigation: none needed; revisit if Phase 10 adds more.
- **Phase-time is a year-end approximation**, not a true month share → disclosed in the metric's info copy.
- **Shortfall for depleted paths** grows with late-horizon floors (spend zero vs. an inflating floor), skewing the p90 up → acceptable: it truthfully measures how far life falls below the floor; info copy explains the definition.
- **Chart rendering on mobile** (two charts + tiles at 375px) → minimal ECharts config (no dataZoom, compact axis labels, responsive heights), matching the existing PriceChart mobile behavior; covered by the spec's mobile scenario.
- **Rust test churn**: every existing `MonteCarloResult` construction in tests references fields; additive struct fields require updating test constructors → mechanical, caught by compile.
- **TSX fixture churn**: `WithdrawalResults.test.tsx` constructs `monteCarlo` fixtures; new required fields → update fixtures alongside.

## Migration Plan

No migration. Client-only: old serialized results are never persisted (results are recomputed each run), so no storage-version concern. Deploy is a normal frontend + WASM build.

## Open Questions

None blocking. If the survival curve feels too dense on mobile, the histogram can take priority and the curve can move behind a toggle — decide during implementation review.
