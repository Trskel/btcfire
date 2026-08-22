# Design: Unified Withdrawal Policy

## Context

The roadmap planned three separate withdrawal engines (Classic FIRE, Fixed %, Guardrails) and a fourth for BBD. Exploration showed the first three are points in a single parameter space — one policy function with different knob values — and that the user's own retirement strategy (valuation-based selling rules keyed on the Mayer Multiple, with a cash buffer) needs a market-phase state machine no per-strategy plan could express. `wasm/src/strategies/` and `wasm/src/simulation/` are currently empty, so this is greenfield. The policy will also be the core both product faces evaluate: the planner (simulations, Phase 9+) and the "Today" advisor (Phase 15).

## Goals / Non-Goals

**Goals:**
- One policy struct + one deterministic engine loop expressing Classic FIRE, Fixed %, Guardrails, and Valuation-based as presets over a shared knob set.
- Inflation at the simulation level (`SimulationParams.inflationRate`), referenced by amount-based policy math.
- Engine state shaped for reuse: a single `RuntimeState` struct that Monte Carlo will clone per path and the advisor will hold once, in localStorage.
- Tabbed control area below the chart (Scenario · Price model · Withdrawal) replacing the sidebar + placeholder Strategies card.
- Year-by-year results (BTC, cash, spend) as the engine output contract.

**Non-Goals:** Monte Carlo randomness/percentiles (Phase 9), fan charts (Phase 10), BBD preset (Phase 12 — needs liability state), scenario comparison (Phase 13), education info buttons (Phase 14), taxes (Phase 18), regime-aware path conditioning (Phase 16).

## Decisions

1. **Policy as data, presets as constructors.** `WithdrawalPolicy` is a serializable struct (serde) with `preset: PresetId` plus knob values; presets are `impl WithdrawalPolicy { fn classic_fire(...) -> Self }` constructors. One engine loop matches on the policy, never on the preset. Rationale: the preset label is *identity* (what the user says they're doing), the knobs are *values*; the engine needs no branching per strategy. Alternative considered: per-strategy engines behind a trait — rejected, three times the code and incompatible state.

2. **Knob inventory (bounds, defaults).** Stored in Rust and mirrored in a TS bounds table (same pattern as `PARAM_BOUNDS`):
   - `anchor`: `%OfInitial | %OfCurrent | FixedUsd` (default `%OfInitial`)
   - `ratePct`: 0–20, step 0.25, default 4.0 — or `spendUsd` when `FixedUsd`
   - `payout`: `Monthly | Quarterly | Yearly` (default `Yearly`) — cash-flow granularity
   - `review`: `Once | Yearly | Monthly` (default `Yearly`) — when rules re-run
   - `guardrails`: `Off | On` (default `Off`); when on: `ceilingPct` +0–100 default 20, `floorPct` −0–100 default 20, `adjustPct` 1–50 default 10, `prosperity`: `Off | On` default `On` (GK v3)
   - `valuation`: `Off | On` (default `Off`); when on: `indicator` (`PowerLawQuantile` default; `MayerMultiple` reserved), `fairLow`/`fairHigh` (default 1.0/2.4 for M, 50th/85th percentile for PL), `bearSurplusPct` (0), `fairSurplusPct` (0), `euphoriaSurplusPct` (8), `bufferTargetLowYears` (2) / `bufferTargetHighYears` (4), `safetyValveM` (1.5), `onboarding`: `Immediate | DeferredToEuphoria` (default `DeferredToEuphoria`)
   - `cashBuffer`: `Off | On` (default `Off`); `bufferYears` 0–10 default 3 — non-valuation presets use a single target
   - Inflation is *not* a policy knob (see decision 3).

3. **Inflation at simulation level.** `SimulationParams` gains `inflationRate` (0–10%, step 0.5, default 3). The policy references it: amount-based spending rises by `(1+inflation)^t`; the absolute floor (`minimumSpendUsd`) rises with it; %-of-current math never touches it (BTC-denominated). Rationale: the price models are nominal, so inflation belongs on the spending side only — applying it to both would double-count. Guardrail thresholds, however, compare *withdrawal rates*, so they are inflation-agnostic.

4. **$ anchor is derived per path.** When `anchor = FixedUsd`, the rate is derived at t₀ from the (path's) retirement-day price — in Monte Carlo each path gets its own effective rate, and guardrail bands (rate-relative) follow. The engine therefore stores the policy in $ but computes a per-path `initialRate` at retirement; the UI displays the median-model-derived rate as a hint. Deterministic engine now = one path (the model's median projection), so this already works today.

5. **Stepping: yearly for amount presets, monthly for valuation.** The valuation preset's drip/phase checks are monthly by design; the engine supports `step: Yearly | Monthly`. Monthly stepping under yearly price models interpolates in log space between adjacent yearly model points (geometric interpolation). Payout and review cadence quantize onto the step grid (a monthly payout under a yearly step splits the annual amount evenly). Alternative considered: forcing yearly only — rejected, the valuation strategy is inherently monthly.

6. **Guardrails semantics (Guyton-Klinger).** Each review: compute current withdrawal rate = current spend / portfolio value. If rate > `initialRate × (1 + ceilingPct/100)` → spend *= (1 − adjustPct/100). If rate < `initialRate × (1 − floorPct/100)` → spend *= (1 + adjustPct/100), *only if* prosperity rule is off or portfolio > inflation-adjusted starting value. Cuts never take spend below the inflation-adjusted `minimumSpendUsd` floor.

7. **Valuation state machine.** Each month: compute `phase` from the indicator (PL quantile: below median → Bear; median–85th → Fair; above → Euphoria; M: <1.0 / 1.0–2.4 / >2.4). Drip = base spend (inflation-adjusted, floor-protected) always. Surplus sales = `phase.surplusPct` of current stack, sent to the buffer. Buffer actions per phase: Bear → frozen (no refill); Fair → organic (refill with surplus only); Euphoria → recharge toward `bufferTargetHighYears`. Safety valve: if `bufferYears < 1` and indicator > `safetyValveM` (M) or above-median (PL), recharge 1 year without waiting for Euphoria. Onboarding `DeferredToEuphoria`: at t₀, do not pre-sell to fill the buffer; drip monthly until the first Euphoria phase, then recharge. Power Law quantile is default because the model already emits percentile bands (analytic, no rolling window); Mayer Multiple needs a 200-day SMA over the simulated path and is deferred behind daily-granularity simulation; MVRV Z is out (on-chain data).

8. **`RuntimeState` shared struct.** `{ year, btc, cashUsd, bufferYears, initialRatePerPath, baseSpendUsd, deferredBuffer: bool, lots: Option<...> }` — one struct, two owners: the simulator clones it per path (Phase 9), the advisor serializes one instance to localStorage (Phase 15). This change ships the struct and the deterministic engine that steps it; it does not ship MC.

9. **UI: tabbed card below the chart.** A `Tabs` control (Base UI) in the main column: Scenario (current `ParameterPanel` + new inflation field), Price model (projection horizon + `ModelSelector` with per-model controls), Withdrawal (preset cards + visible knobs). The desktop sidebar is removed; mobile and desktop share the same structure (chart first, controls below). Rationale: one layout for all viewports, chart-first on mobile per the mission. Preset selection renders as a row of cards; editing any knob marks the preset label dirty (asterisk) without switching to Custom. Knob visibility rules: inflation hidden for %-of-current; guardrail knobs only when guardrails on; valuation knobs only when valuation on; buffer refill knobs only when buffer on.

10. **Persistence.** Policy serialized under `btcfire.withdrawalPolicy.v1` (version field, clamp/fallback like `useSimulationParams`). `simParams` storage gains `inflationRate` with sanitization (missing field → default 3%). Unknown versions reset to defaults.

11. **Results contract.** Engine returns `Vec<YearResult> { year, btc, cashUsd, bufferYears, spendUsd, soldBtc, phase? }` as JsValue; the web layer renders a card list on mobile / table on desktop (placeholder for Phase 10's fan charts).

## Risks / Trade-offs

- [Preset label lies after edits] → dirty marker (`Guardrails*`), never silently relabel; preset id preserved in storage.
- [Valuation preset scope blows up the change] → tasks ordered: core engine + amount presets first, valuation preset last; each group independently testable.
- [Monthly interpolation distorts the models] → log-space (geometric) interpolation between yearly points; document that monthly noise is not modeled until Phase 9.
- [GK thresholds ambiguous across sources] → pin to the decision-6 formulation; tests assert the exact triggers.
- [Layout regression risk from removing the sidebar] → the existing sim-parameters spec's layout requirements are replaced by the tab spec; App.test/ParameterPanel.test updated in the same change.
- [Monthly stepping is slow in JS] → all stepping in Rust/WASM; JS only renders returned vectors.

## Migration Plan

No existing policy data exists. `simParams.v1` gains a field: on load, missing `inflationRate` sanitizes to 3 (existing code path clamps per-field). Rollback is trivial: the change ships behind no feature flag, but reverting restores the sidebar layout and removes the Withdrawal tab; storage keys are new, so nothing else reads them.

## Open Questions

- Default preset on first load: Classic FIRE (recommended) vs. a wizard-style prompt — resolve at implementation with real content.
- Whether the Fixed % + absolute floor hybrid is exposed only via Custom (recommended) or as a visible knob in Fixed %.
