# Phase 4 — S2F Price Model: Requirements

## Goal

Implement the classic PlanB Stock-to-Flow (S2F) price model in Rust/WASM, add a model selector (tabs) so users can switch between Power Law and S2F, and overlay S2F projections onto the historic price chart. The S2F model uses the same interface pattern established in Phase 3.

## Scope

### In scope

- **Rust S2F module** (`wasm/src/models/s2f.rs`): classic PlanB model — `log10(price) = a * log10(S2F) + b` via least-squares linear regression.
  - Hardcoded Bitcoin halving schedule (block height, date, subsidy) from genesis through future halvings.
  - S2F computation: given a date, compute total supply mined to date and annual issuance (current block subsidy × ~52,560 blocks/year), then `S2F = stock / flow`.
  - Fit `log10(price)` against `log10(S2F)` using historic price data. The module computes S2F for each historic data point from the halving schedule.
  - Project forward: compute future S2F values from the halving schedule (S2F doubles at each halving), apply the fitted model to get projected prices for each future year.
  - Confidence bands: ±1σ from residual standard deviation of the fit.
- **WASM bindings**: single export `run_s2f_wasm(config_js: JsValue, historic_data_js: JsValue) -> JsValue`. Same pattern as `run_power_law_wasm`.
- **Model selector tabs** (`web/src/components/controls/ModelSelector.tsx`): a tab bar above the chart with one tab per available model. Only one model is active at a time. Switching tabs swaps the controls panel and chart overlay.
- **S2F controls** (`web/src/components/controls/S2FControls.tsx`): projection horizon slider (5–50 years, default 30). S2F has fewer configurable parameters than Power Law since it's a single-formulation model.
- **Refactor Power Law integration**: wrap `PowerLawControls` inside the tab system. The chart overlay source is determined by which tab is active.
- **Tests**: Rust unit tests for S2F computation and regression against hand-computed values. React component tests for model selector tabs and S2F controls.

### Out of scope

- S2FX cross-asset model — not included in this phase.
- Bitcoin24 model — Phase 5.
- Withdrawal strategies — Phase 7+.
- Monte Carlo simulation — Phase 9.
- User financial parameters — Phase 6.
- Scenario comparison (multiple models on same chart simultaneously) — Phase 13.
- Any changes to the Power Law model's internal logic or tests.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| S2F formulation | Classic PlanB only (`log(price) ~ log(S2F)`) | The user chose the simplest, best-known formulation. S2FX adds complexity without proportional benefit at this stage. |
| Model selector | Tabs above controls | User preference. Tabs provide clear visual hierarchy: each model gets its own tab with its own controls panel below. Matches mobile-first navigation patterns. |
| Test reference values | Validate from first principles | Rather than relying on external reference prices, verify the regression math directly — compute expected S2F ratios from known halving timestamps and validate the formula against hand-calculated inputs. More robust than depending on published price targets. |
| Halving schedule data | Hardcoded in Rust | Bitcoin's halving schedule is deterministic and public knowledge. Hardcoding avoids an external data dependency and keeps the WASM module self-contained. Include future halving dates projected at 210,000-block intervals (~4 years). |
| S2F computation | Date-driven lookup in halving schedule | For each data point, determine the current halving epoch by comparing the timestamp to halving dates. Simple, fast, no need for exact block-level precision since S2F changes only at halvings. |
| Confidence bands | ±1σ only (residual-based) | Same as Power Law default. Simple, consistent across models. Users can compare models knowing the band has the same statistical meaning. |
| Model controls pattern | Each model has its own controls component | Consistent with Phase 3. Phase 5 (Bitcoin24) will add a third tab and controls component. The tab selector composes cleanly. |
| Simultaneous models on chart | Not in this phase | Switching tabs replaces the overlay. Showing both models at once is a Phase 13 (scenario comparison) feature. |

## Context

This is Phase 4 of the BTCFire roadmap. It introduces the second price model and the model selector pattern. The S2F model is PlanB's most famous work — it relates Bitcoin's scarcity (stock-to-flow ratio) to its price using a cross-sectional regression. Unlike the Power Law (which fits price against time), S2F fits price against the stock-to-flow ratio, which changes discontinuously at each halving.

The model selector tabs create the pattern for Phase 5 (Bitcoin24) to join as a third tab. The chart overlay interface (`modelOverlay` prop on `PriceChart`) from Phase 3 already supports the overlay pattern — Phase 4 extends it by switching which model's data populates the overlay.

S2F has fewer configurable parameters than Power Law because there's only one formulation — no presets or custom a/b inputs. The projection horizon slider is the only user-facing control. However, the Rust module should follow the same config/result struct pattern for consistency and future extensibility.
