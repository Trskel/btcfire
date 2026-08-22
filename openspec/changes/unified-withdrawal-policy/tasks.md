## 1. Rust policy core

- [ ] 1.1 Create `wasm/src/strategies/policy.rs` with `WithdrawalPolicy`, `Anchor`, `Payout`, `Review`, `Guardrails`, `Buffer`, `Valuation`, and `PresetId` types (serde Serialize/Deserialize), with per-knob bounds constants
- [ ] 1.2 Implement preset constructors (`classic_fire`, `fixed_pct`, `guardrails`, `valuation_based`, `custom`) with the documented defaults and a `clamp` function validating all knobs against bounds
- [ ] 1.3 Add Rust unit tests for defaults, clamping, and serde round-trip of every preset

## 2. Deterministic engine (amount-based presets)

- [ ] 2.1 Create `wasm/src/simulation/runtime.rs` with `RuntimeState` (year, btc, cash_usd, buffer_years, initial_rate, base_spend_usd, deferred_buffer) and `YearResult` (year, btc, cash_usd, buffer_years, spend_usd, sold_btc, phase)
- [ ] 2.2 Implement yearly stepping in `wasm/src/simulation/engine.rs`: anchor math (`% of initial` set once, `% of current` re-derived, `FixedUsd` with per-path rate derivation), inflation referencing from `SimulationParams`, payout/review cadence quantization, spend floor enforcement, depletion handling
- [ ] 2.3 Implement guardrail rules (ceiling cut, floor raise, prosperity gate, floor protection) applied at each review
- [ ] 2.4 Add Rust tests: anchor math per scenario, inflation compounding, floor rises, `% of current` ignores inflation, guardrail triggers and prosperity gate, depletion to zero, determinism (same inputs → identical results)

## 3. Valuation preset and monthly stepping

- [ ] 3.1 Implement monthly stepping with geometric interpolation between yearly price points; extend engine to choose step from the policy
- [ ] 3.2 Implement phase computation from the Power Law quantile indicator (below 50th → bear, 50th–85th → fair, above 85th → euphoria)
- [ ] 3.3 Implement per-phase surplus sale rates and buffer actions (frozen / organic / recharge), safety valve, and deferred onboarding (drip-only until first euphoria)
- [ ] 3.4 Add Rust tests: phase determination, bear buffer freeze, euphoria recharge to upper target, safety valve trigger, deferred onboarding at bear-phase start

## 4. WASM bindings

- [ ] 4.1 Add `run_withdrawal_wasm(config_js, params_js, prices_js)` export to `wasm/src/lib.rs` returning the `YearResult` vector as JsValue
- [ ] 4.2 Build the wasm crate (`wasm-pack build --target web`) and verify the export is callable from JS with a smoke test

## 5. Web types, hook, and persistence

- [ ] 5.1 Add `web/src/types/policy.ts` with TypeScript mirrors of the policy types and a `POLICY_BOUNDS` table (matching the `PARAM_BOUNDS` pattern)
- [ ] 5.2 Add `inflationRate` to `SimulationParams`, `PARAM_BOUNDS`, and `defaultSimulationParams` (bounds 0–10%, default 3.0), with sanitization of stored data missing the field
- [ ] 5.3 Create `web/src/hooks/useWithdrawalPolicy.ts`: defaults (Classic FIRE), localStorage under `btcfire.withdrawalPolicy.v1`, clamp/sanitize on restore, dirty-marker state
- [ ] 5.4 Add Vitest tests for policy sanitization, dirty marking, and the inflation param migration path

## 6. UI: tabbed control card and Withdrawal tab

- [ ] 6.1 Add a Tabs container (Base UI) and restructure `App.tsx`: chart first, tabbed card below (Scenario · Price model · Withdrawal), removing the desktop sidebar; move `ParameterPanel` and the inflation input into the Scenario tab, projection horizon + `ModelSelector` into the Price model tab
- [ ] 6.2 Build `web/src/components/controls/WithdrawalTab.tsx`: preset selector cards, knob visibility rules (guardrail/valuation/buffer knobs hidden when off), dirty marker on the preset label, 44px touch targets
- [ ] 6.3 Render year-by-year results under the chart: card list on mobile, table on desktop, from `run_withdrawal_wasm` output
- [ ] 6.4 Update existing React tests (App, ParameterPanel) for the new layout and add tests for tab switching, knob visibility, and preset selection

## 7. Verification

- [ ] 7.1 Run `wasm-pack test --node` in `wasm/` and `npm test` in `web/`; fix any failures
- [ ] 7.2 Run `npm run lint` in `web/` and fix violations
- [ ] 7.3 Manual check at 375px viewport: no horizontal scroll, all controls reachable, chart above controls
