# Phase 3 — Power Law Price Model: Plan

## Task Group 1: Rust Power Law model + tests

1. Create `wasm/src/models/mod.rs` and `wasm/src/models/power_law.rs`.
2. Implement `log10` and `pow10` helper functions (avoid external crate dependencies).
3. Implement least-squares linear regression: given `Vec<PricePoint>` (historic data), compute `log10(days_since_genesis)` for each point, solve for slope `a` and intercept `b`, return `R²` fit quality.
4. Implement **Preset A — Log-log fit**: `log10(price) = a * log10(days_since_genesis) + b`. Returns median price and confidence band boundaries for each year from genesis through projection end.
5. Implement **Preset B — Direct power fit**: `price = a * days_since_genesis^b`. Fit `a` and `b` by applying log-transform then least-squares (equivalent to Preset A with different output framing).
6. Implement **Custom parameters**: user supplies `a` and `b` directly, model computes price at each year using the log-log formula.
7. Implement confidence band calculations:
   - `±1σ`: compute residual standard deviation from the fit, apply to all years.
   - `±1σ and ±2σ`: nested bands at 68% and 95%.
   - **Custom percentiles**: P10/P90 and P25/P75 from residual distribution empirical percentiles.
8. Define `ModelPoint { year: i32, median_price_usd: f64, band_low: f64, band_high: f64 }` (or equivalent struct with multiple band fields).
9. Define `PowerLawConfig` struct: formulation enum, band style enum, custom a/b (optional), projection_years.
10. Define `PowerLawResult { points: Vec<ModelPoint>, R_squared: f64, a: f64, b: f64, formulation_used: String }`.
11. Implement the top-level `run_power_law(config: PowerLawConfig, historic_data: Vec<PricePoint>) -> PowerLawResult` function.
12. **Tests** (in `#[cfg(test)]` module):
    - Hardcoded sample dataset (10 BTC price points) — verify both presets return correct `a`, `b`, and `R²` values computed independently.
    - Reference value test: median price for year 2024 ~$55k ±5% (PlanB/Santostasi Power Law chart value).
    - Confidence band widths increase over time (bands diverge as projection extends).
    - Custom parameter mode: given `a=5.84, b=-17.3`, verify output matches expected calculation.
    - Edge cases: empty historic data returns error, single data point returns degenerate fit, projection_years=0 returns only historic years.
    - R² is between 0 and 1.
13. Run `wasm-pack test --node` — all tests pass.

## Task Group 2: WASM bindings

1. Add `serde` derives to all config and result structs.
2. Implement `wasm-bindgen` export function `run_power_law_wasm(config_js: JsValue, historic_data_js: JsValue) -> JsValue`.
3. Deserialize config and historic data from JS, call `run_power_law`, serialize and return result.
4. Handle errors: return a JS error if deserialization fails or model fitting fails.
5. Build: `wasm-pack build --target web` succeeds with no warnings.
6. Verify in the web app: import and call `run_power_law_wasm` from a test page or console, confirm it returns valid JSON.

## Task Group 3: Chart overlay (extend PriceChart)

1. Define `ModelOverlay` TypeScript type in `web/src/types/models.ts`: `{ median: { year: number, price: number }[], bandLow: { year: number, price: number }[], bandHigh: { year: number, price: number }[], ... }`.
2. Add optional `modelOverlay?: ModelOverlay` prop to `PriceChart`.
3. Render model overlay as additional ECharts series:
   - Median line: solid from genesis to today, dashed from today to projection end. Distinct color (e.g., gold/amber). Include in legend.
   - Confidence band: two overlapping semi-transparent `areaStyle` series (if ±2σ mode, two nested bands with different opacities).
   - Add a vertical dashed reference line at "today" separating historic from projection region.
4. Ensure model series live in the same grid/axes as historic data and respond to the same zoom controls.
5. Update the `dataZoom` configuration so model series also participate in zoom/pan.

## Task Group 4: Model controls UI

1. Create `web/src/components/controls/PowerLawControls.tsx`.
2. Formulation selector: radio group or segmented control — "Log-log fit" (default), "Power fit", "Custom".
3. Custom parameter fields: visible only when "Custom" is selected. Two numeric inputs for `a` and `b` with sensible defaults.
4. Confidence band selector: dropdown — "±1σ (default)", "±1σ and ±2σ", "Custom percentiles".
5. Custom percentile fields: visible only when custom percentiles selected. Two inputs each for low/high percentile pairs (P10=10, P90=90; P25=25, P75=75 as defaults).
6. Projection horizon: slider `[5, 50]` with numeric display, default 30. Snap to integers.
7. All inputs have touch-friendly sizing (min 44×44px).
8. Component accepts `historicData: PricePoint[]` prop and calls WASM `run_power_law_wasm` on every change, exposing results via an `onModelChange` callback to the parent.
9. Wire into `App.tsx`: render `PowerLawControls` above the `PriceChart`. Pass results to `PriceChart.modelOverlay`.

## Task Group 5: Mobile responsiveness

1. `PowerLawControls` stacks vertically at default breakpoint, uses full-width inputs.
2. At `md` breakpoint, controls can render beside the chart or in a two-column layout.
3. Slider thumbs and radio buttons meet 44×44px minimum touch target.
4. Chart tooltips include model values (median + band range) alongside historic price.
5. Legend adapts to screen width — stacks vertically on mobile, horizontal on desktop.
6. No horizontal scrolling at 375px viewport width.

## Task Group 6: Building and verification

1. Add `wasm-build` script to `web/package.json` if not present, or ensure the build step runs.
2. Run full build: `npm run build` produces a working static site.
3. Run full test suite: `npm test` (runs both `wasm-pack test --node` and `cd web && npm test`).
4. Manual verification checklist matches `validation.md`.
