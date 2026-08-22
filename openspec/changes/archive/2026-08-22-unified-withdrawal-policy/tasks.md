## 1. Rust policy core

- [x] 1.1 Create `wasm/src/strategies/policy.rs` with `WithdrawalPolicy`, `Anchor`, `Payout`, `Review`, `Guardrails`, `Buffer`, `Valuation`, and `PresetId` types (serde Serialize/Deserialize), with per-knob bounds constants
- [x] 1.2 Implement preset constructors (`classic_fire`, `fixed_pct`, `guardrails`, `valuation_based`, `custom`) with the documented defaults and a `clamp` function validating all knobs against bounds
- [x] 1.3 Add Rust unit tests for defaults, clamping, and serde round-trip of every preset

## 2. Deterministic engine (amount-based presets)

- [x] 2.1 Create `wasm/src/simulation/runtime.rs` with `RuntimeState` (year, btc, cash_usd, buffer_years, initial_rate, base_spend_usd, deferred_buffer) and `YearResult` (year, btc, cash_usd, buffer_years, spend_usd, sold_btc, phase)
- [x] 2.2 Implement yearly stepping in `wasm/src/simulation/engine.rs`: anchor math (`% of initial` set once, `% of current` re-derived, `FixedUsd` with per-path rate derivation), inflation referencing from `SimulationParams`, payout/review cadence quantization, spend floor enforcement, depletion handling
- [x] 2.3 Implement guardrail rules (ceiling cut, floor raise, prosperity gate, floor protection) applied at each review
- [x] 2.4 Add Rust tests: anchor math per scenario, inflation compounding, floor rises, `% of current` ignores inflation, guardrail triggers and prosperity gate, depletion to zero, determinism (same inputs → identical results)

## 3. Valuation preset and monthly stepping

- [x] 3.1 Implement monthly stepping with geometric interpolation between yearly price points; extend engine to choose step from the policy
- [x] 3.2 Implement phase computation from the Power Law quantile indicator (below 50th → bear, 50th–85th → fair, above 85th → euphoria)
- [x] 3.3 Implement per-phase surplus sale rates and buffer actions (frozen / organic / recharge), safety valve, and deferred onboarding (drip-only until first euphoria)
- [x] 3.4 Add Rust tests: phase determination, bear buffer freeze, euphoria recharge to upper target, safety valve trigger, deferred onboarding at bear-phase start

## 4. WASM bindings

- [x] 4.1 Add `run_withdrawal_wasm(config_js, params_js, prices_js)` export to `wasm/src/lib.rs` returning the `YearResult` vector as JsValue
- [x] 4.2 Build the wasm crate (`wasm-pack build --target web`) and verify the export is callable from JS with a smoke test

## 5. Web types, hook, and persistence

- [x] 5.1 Add `web/src/types/policy.ts` with TypeScript mirrors of the policy types and a `POLICY_BOUNDS` table (matching the `PARAM_BOUNDS` pattern)
- [x] 5.2 Add `inflationRate` to `SimulationParams`, `PARAM_BOUNDS`, and `defaultSimulationParams` (bounds 0–10%, default 3.0), with sanitization of stored data missing the field
- [x] 5.3 Create `web/src/hooks/useWithdrawalPolicy.ts`: defaults (Classic FIRE), localStorage under `btcfire.withdrawalPolicy.v1`, clamp/sanitize on restore, dirty-marker state
- [x] 5.4 Add Vitest tests for policy sanitization, dirty marking, and the inflation param migration path

## 6. UI: tabbed control card and Withdrawal tab

- [x] 6.1 Add a Tabs container (Base UI) and restructure `App.tsx`: chart first, tabbed card below (Scenario · Price model · Withdrawal), removing the desktop sidebar; move `ParameterPanel` and the inflation input into the Scenario tab, projection horizon + `ModelSelector` into the Price model tab
- [x] 6.2 Build `web/src/components/controls/WithdrawalTab.tsx`: preset selector cards, knob visibility rules (guardrail/valuation/buffer knobs hidden when off), dirty marker on the preset label, 44px touch targets
- [x] 6.3 Render year-by-year results under the chart: card list on mobile, table on desktop, from `run_withdrawal_wasm` output
- [x] 6.4 Update existing React tests (App, ParameterPanel) for the new layout and add tests for tab switching, knob visibility, and preset selection

## 7. Verification

- [x] 7.1 Run `wasm-pack test --node` in `wasm/` and `npm test` in `web/`; fix any failures
- [x] 7.2 Run `npm run lint` in `web/` and fix violations
- [x] 7.3 Manual check at 375px viewport: no horizontal scroll, all controls reachable, chart above controls

## 8. Band-path simulation across models (scope extension)

- [x] 8.1 Add optional `pathPriceUsd` to `ModelPoint` (serde default) and use it as the path price in the engine so band paths get real phases; add Rust tests for band-path phases (median → fair, −1σ → bear, +2σ → euphoria) and the median fallback
- [x] 8.2 Emit 2σ bands in the S2F and Bitcoin24 models (+ tests) so euphoria is reachable on every model at default thresholds
- [x] 8.3 Web: run the plan against one selected visible model across its band paths (median, ±1σ, ±2σ, percentiles); add a plan-model picker in the Plan card, a path selector for the year-by-year results, and a per-path summary strip (end-of-plan BTC, depletion year, final phase)
- [x] 8.4 Update web tests (App, WithdrawalResults) for the picker/paths/summary; rerun `wasm-pack test --node`, `npm test`, `npm run lint`, and the 375px browser check

## 9. Layout adjustments (user-directed)

- [x] 9.1 Reorder the page: results card below the control card; tabs reorder to Price model · Scenario · Withdrawal; rename the control card to "Plan Configuration" and make it collapsible (header toggle, active tab survives collapse)
- [x] 9.2 Update the sim-parameters spec (tab order, collapsible requirement, results-below-configuration) and the App tests for the new layout
- [x] 9.3 Verify: `npm test`, `npm run lint`, and the 375px browser check

## 10. Scenario-tab horizon and directional path tiles (user-directed)

- [x] 10.1 Move the projection horizon control into the Scenario tab
- [x] 10.2 Path tiles: directional names (Medium/Bearish/Bullish, Deep bear/Deep bull for 2σ) with the band descriptor on the second line and the outcome summary on the third
- [x] 10.3 Update specs (done in this section) and web tests; verify with `npm test`, `npm run lint`, and the 375px browser check

## 11. Results header: labeled model selector (user-directed)

- [x] 11.1 Fix the truncation note to reference the Scenario tab (the horizon moved there)
- [x] 11.2 Move the plan model dropdown into the results body above the truncation note with a "Price model used:" label
- [x] 11.3 Update specs (done in this section) and web tests; verify with `npm test`, `npm run lint`, and the 375px browser check

## 12. Horizon first in the Scenario tab (user-directed)

- [x] 12.1 Move the projection horizon slider above the parameter panel in the Scenario tab; update the spec scenario and the App test; verify with `npm test`, `npm run lint`, and the 375px browser check
