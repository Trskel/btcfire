# Phase 4 — S2F Price Model: Requirements

## Goal

Implement the classic PlanB Stock-to-Flow (S2F) price model in Rust/WASM, add checkbox-based visibility controls so users can toggle multiple model overlays on the chart simultaneously, and overlay S2F projections onto the historic price chart. The S2F model uses the same interface pattern established in Phase 3. The chart is upgraded to render multiple model overlays at once with distinct colors.

## Scope

### In scope

- **Rust S2F module** (`wasm/src/models/s2f.rs`): classic PlanB model — `log10(price) = a * log10(S2F) + b` via least-squares linear regression.
  - Hardcoded Bitcoin halving schedule (block height, date, subsidy) from genesis through future halvings.
  - S2F computation: given a date, compute total supply mined to date and annual issuance (current block subsidy × ~52,560 blocks/year), then `S2F = stock / flow`.
  - Fit `log10(price)` against `log10(S2F)` using historic price data. The module computes S2F for each historic data point from the halving schedule.
  - Project forward: compute future S2F values from the halving schedule (S2F doubles at each halving), apply the fitted model to get projected prices for each future year.
  - Confidence bands: ±1σ from residual standard deviation of the fit.
- **WASM bindings**: single export `run_s2f_wasm(config_js: JsValue, historic_data_js: JsValue) -> JsValue`. Same pattern as `run_power_law_wasm`.
- **Model visibility controls** (`web/src/components/controls/ModelSelector.tsx`): a list of models, each with a checkbox to toggle visibility on the chart. Multiple models can be visible at the same time. Each model row has an expand/collapse toggle to show its controls panel. Only one model's controls are expanded at a time. Checking a model's visibility checkbox automatically expands its controls panel.
- **Shared projection horizon**: a single projection horizon slider (5–50 years, default 30) rendered above the model list in the "Price Models" card. All models share the same projection horizon value — changing the slider updates all models' projections simultaneously. Individual model controls panels no longer contain their own horizon sliders.
- **S2F controls** (`web/src/components/controls/S2FControls.tsx`): S2F has fewer configurable parameters than Power Law since it's a single-formulation model. The projection horizon is provided by the parent via props.
- **Multi-overlay chart support**: `PriceChart` is refactored to accept an array of `ModelOverlay` objects (`modelOverlays?: ModelOverlay[]`) and render all of them simultaneously. Each model gets a distinct color. Legend shows all visible model entries.
- **State management**: `App.tsx` tracks a `Set<ModelId>` of visible models, a `Record<ModelId, ModelOverlay | null>` of computed overlays, and a single shared `projectionYears` value. All models' WASM computations run independently regardless of visibility — toggling visibility only adds/removes the overlay from the chart.
- **Tests**: Rust unit tests for S2F computation and regression against hand-computed values. React component tests for visibility checkboxes, expand/collapse, S2F controls, and multi-overlay chart rendering.

### Out of scope

- S2FX cross-asset model — not included in this phase.
- Bitcoin24 model — Phase 5.
- Withdrawal strategies — Phase 7+.
- Monte Carlo simulation — Phase 9.
- User financial parameters — Phase 6.
- Overlaying withdrawal strategy results on the chart — future phase.
- Any changes to the Power Law model's internal logic or tests.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| S2F formulation | Classic PlanB only (`log(price) ~ log(S2F)`) | The user chose the simplest, best-known formulation. S2FX adds complexity without proportional benefit at this stage. |
| Model visibility control | Checkboxes in a model list, one expandable controls panel at a time | User request. Checkboxes allow multiple models to overlay on the chart simultaneously. Expand/collapse keeps the page compact while giving access to each model's full controls. |
| Chart multi-overlay | `PriceChart` accepts `ModelOverlay[]` instead of a single overlay | The chart iterates all visible overlays and renders each with its own median line + bands + distinct color. Stack names and series names are model-prefixed to avoid collisions. |
| Model colors | `MODEL_COLORS` map: Power Law → amber `#eab308`, S2F → teal `#0694a2` | Distinct, accessible colors. Extensible for Bitcoin24 in Phase 5. |
| Overlay data flow | All models compute via WASM independently; visibility controls only which overlays are passed to `PriceChart` | Avoids recomputation on every toggle. Power Law parameters persist when S2F is edited and vice versa. |
| Test reference values | Validate from first principles | Rather than relying on external reference prices, verify the regression math directly — compute expected S2F ratios from known halving timestamps and validate the formula against hand-calculated inputs. |
| Halving schedule data | Hardcoded in Rust | Bitcoin's halving schedule is deterministic and public knowledge. Hardcoding avoids an external data dependency and keeps the WASM module self-contained. |
| S2F computation | Date-driven lookup in halving schedule | For each data point, determine the current halving epoch by comparing the timestamp to halving dates. Simple, fast, no need for exact block-level precision since S2F changes only at halvings. |
| Confidence bands | ±1σ only (residual-based) | Same as Power Law default. Simple, consistent across models. Users can compare models knowing the band has the same statistical meaning. |
| Model controls pattern | Each model has its own controls component | Consistent with Phase 3. Phase 5 (Bitcoin24) will add a third row to the model list. The expand/collapse pattern composes cleanly. |
| Simultaneous models on chart | In this phase | The chart renders all checked-in models at once. This was originally deferred to Phase 13 but is pulled forward as a core model comparison feature. |
| Projection horizon | Shared across all models, single slider above the model list | Comparing models is only meaningful with the same time horizon. A shared slider avoids inconsistent projections and reduces visual clutter. |
| Auto-expand on check | Checking a model's visibility checkbox automatically expands its controls panel | Users checking a model likely want to configure it. Auto-expanding removes an extra click and makes the interaction feel responsive. |

## Context

This is Phase 4 of the BTCFire roadmap. It introduces the second price model, multi-model overlay support on the chart, and a checkbox visibility control pattern that replaces the earlier single-model tab selector design. The S2F model is PlanB's most famous work — it relates Bitcoin's scarcity (stock-to-flow ratio) to its price using a cross-sectional regression.

Unlike the Power Law (which fits price against time), S2F fits price against the stock-to-flow ratio, which changes discontinuously at each halving. This gives S2F a distinctive step-like projection pattern compared to Power Law's smooth curve — making side-by-side comparison on the chart especially informative.

The checkbox + expand/collapse pattern is designed to scale: Phase 5 (Bitcoin24) adds a third row, and future strategy phases can add rows for withdrawal overlays. The `modelId` field on `ModelOverlay` enables the chart to look up each model's color and render distinct legend entries.
