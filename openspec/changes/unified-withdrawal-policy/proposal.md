# Proposal: Unified Withdrawal Policy

## Why

The roadmap planned withdrawal strategies as three separate engines (Classic FIRE, Fixed %, Guardrails). They are not separate algorithms — they are points in one parameter space (anchor, inflation, review cadence, guardrail thresholds, cash buffer). Building them separately would triple the engine, triple the Monte Carlo wiring, and produce three incompatible UIs. One policy engine with named presets over a shared knob set expresses all three — plus a fourth, valuation-based strategy (from the user's own retirement strategy document) that a strategy-per-phase plan could never express — and becomes the single core that both the planner and the future "Today" advisor evaluate.

## What Changes

- New Rust `withdrawal-policy` module: a single policy struct over 13 knobs (anchor, rate/spend, payout frequency, review cadence, guardrails + thresholds + adjustment + prosperity rule, cash buffer + refill rules, absolute spend floor) plus a valuation dimension (indicator choice, phase thresholds, per-phase surplus sale rates, buffer target range, safety valve, onboarding mode).
- Presets as constructors: Classic FIRE, Fixed %, Guardrails, Valuation-based, Custom. Presets prefill knobs; editing a knob marks the preset dirty but keeps its label.
- Deterministic simulation engine over the policy, stepping yearly or monthly, emitting year-by-year BTC/cash balances and spend. Engine shares a `RuntimeState` struct with the future Monte Carlo engine (Phase 9) and Today advisor (Phase 15) — **breaking change to no existing code**, but sets the contract.
- Inflation moves from strategy level to simulation level: `SimulationParams` gains `inflationRate` (bounds, default, persistence). Withdrawal policy references it for amount-based anchors and the spend floor; it does not affect %-of-current math.
- UI: the parameter panel, price-model controls, and a new Withdrawal tab live in one tabbed card below the chart (Scenario · Price model · Withdrawal), replacing the desktop sidebar and the placeholder Strategies card. Results (year-by-year table/card list) render under the chart in the same Plan section.
- Policy config persists to localStorage under a versioned key, following the existing `btcfire.simParams.v1` convention.

**Non-goals (explicitly out of scope):** Monte Carlo randomness and percentile outputs (Phase 9), results fan charts (Phase 10), Buy-Borrow-Die preset (Phase 12, separate knob schema), scenario comparison (Phase 13), educational info buttons (Phase 14), taxes (candidate Phase 18).

## Capabilities

### New Capabilities

- `withdrawal-policy`: the unified policy struct, preset definitions, knob bounds and defaults, engine semantics (anchor math, inflation referencing, guardrail triggers, valuation phases, buffer rules, safety valve, onboarding protocol), `RuntimeState`, policy persistence, and the year-by-year results contract.

### Modified Capabilities

- `sim-parameters`: adds `inflationRate` to the parameter set; replaces the sidebar/stacked layout requirement with the tabbed Scenario/Price model/Withdrawal card below the chart.

## Impact

- `wasm/src/strategies/` — populated with the policy module (currently empty).
- `wasm/src/simulation/` — single-path deterministic engine + `RuntimeState` (currently empty).
- `wasm/src/lib.rs` — new `run_withdrawal_*` WASM bindings.
- `web/src/types/` — `WithdrawalPolicy` types, knob bounds table (mirroring `PARAM_BOUNDS` pattern).
- `web/src/components/controls/` — new tabs container + Withdrawal tab; `App.tsx` layout rework; `ParameterPanel` moves into the Scenario tab.
- `web/src/hooks/useSimulationParams.ts` — inflation param + storage migration path.
- `web/src/lib/wasm.ts` — bindings for the new WASM exports.
- Specs: `specs/roadmap.md` Phase 7 note loses its "Pending OpenSpec proposal" qualifier on completion.
