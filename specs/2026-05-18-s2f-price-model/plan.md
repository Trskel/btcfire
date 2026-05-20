# Phase 4 — S2F Price Model: Plan

## Task Group 1: Rust S2F model + tests

1. Create `wasm/src/models/s2f.rs` with inline `#[cfg(test)]` module.
2. Hardcode Bitcoin halving schedule: block subsidy by epoch (50, 25, 12.5, 6.25, 3.125, …) with timestamps from genesis through epoch 10 (~2048).
3. Implement `get_s2f_for_timestamp(ts_ms: i64) -> f64`:
   - Determine which halving epoch the timestamp falls in.
   - Compute total supply: sum of fully-mined epoch coins + prorated blocks in the current epoch × current subsidy.
   - Compute annual issuance: current subsidy × 52,560.
   - Return `supply / annual_issuance`.
4. Implement least-squares linear regression in the module (reuse pattern from power_law.rs — duplicated for module independence).
5. Define `S2FConfig` struct: `{ projection_years: i32 }` (default 30), with serde camelCase derives.
6. Reuse `ModelPoint` from `power_law` (import `crate::models::power_law::ModelPoint`). Populate only `±1σ` band fields; leave `±2σ` and percentile fields `None`.
7. Define `S2FResult` struct: `{ points: Vec<ModelPoint>, r_squared: f64, a: f64, b: f64 }`, with serde camelCase derives.
8. Implement `run_s2f(config: S2FConfig, historic_data: Vec<PricePoint>) -> Result<S2FResult, String>`:
   - Validate inputs (non-empty, ≥2 points, non-negative projection years).
   - Filter data to points after the first halving (≥ 2012-11-28).
   - Compute S2F for each remaining point. Run `log10(price) ~ log10(S2F)` regression.
   - For each year from first historic year to `current_year + projection_years`:
     - Compute S2F at July 1 of that year.
     - Apply fitted model to get median price.
     - Compute ±1σ band from residual standard deviation.
     - Push a `ModelPoint` to the result.
   - Return `S2FResult`.
9. **Tests** (in `#[cfg(test)]` module):
   - S2F in each halving epoch matches hand-computed values within a tolerance range.
   - S2F approximately doubles at halving boundaries (ratio 1.5–2.5).
   - Regression against sample data returns positive slope and R² in [0, 1].
   - Projection includes both historic and future years.
   - Confidence bands are ordered: `band_low < median < band_high`.
   - Edge cases: empty data, single point, negative projection years all return errors.
   - S2F increases monotonically over time (blocks ~2014, 2018, 2022).
10. Run `wasm-pack test --node` — all tests pass.

## Task Group 2: WASM bindings

1. Add `serde` derives (`Serialize`, `Deserialize`) to `S2FConfig` and `S2FResult`.
2. Implement `wasm-bindgen` export: `run_s2f_wasm(config_js: JsValue, historic_data_js: JsValue) -> Result<JsValue, JsValue>`.
3. Deserialize config and historic data from JS, call `run_s2f`, serialize and return result.
4. Error handling: return JS error string if deserialization fails or model fit fails.
5. Register the export in `wasm/src/lib.rs`.
6. Build: `wasm-pack build --target web` succeeds with no warnings.

## Task Group 3: Types and shared definitions

1. Add `ModelId = 'power-law' | 's2f'` to `web/src/types/models.ts`.
2. Add `modelId: ModelId` field to `ModelOverlay` interface.
3. Add `MODEL_COLORS: Record<ModelId, string>` map: `'power-law' → '#eab308'`, `'s2f' → '#0694a2'`.
4. Add `S2FConfig` and `S2FResult` TypeScript interfaces.
5. Update `toModelOverlay` to accept `modelId: ModelId` as a second parameter and include it in the returned overlay.
6. Update call sites in `PowerLawControls` (`'power-law'`) and `S2FControls` (`'s2f'`).

## Task Group 4: Visibility checkboxes + expandable controls

1. Rewrite `web/src/components/controls/ModelSelector.tsx`:
   - Accept `models: ModelEntry[]`, `visibleModels: Set<ModelId>`, `expandedModel: ModelId | null`, and toggle callbacks.
   - Render a vertical list of model rows, each with:
     - A checkbox to toggle visibility on the chart (≥44px touch target).
     - A label showing the model name (full on desktop, short on mobile).
     - A chevron button to expand/collapse the controls panel.
   - When expanded, the model's controls render below the row header in a bordered section.
   - Only one model's controls are expanded at a time (accordion behavior).
   - Checked models have a subtle background highlight; unchecked appear dimmed.
   - All interactive elements have ≥44×44px touch targets.
 2. Update `App.tsx` state:
    - Replace `modelOverlay: ModelOverlay | null` with `modelOverlays: Record<ModelId, ModelOverlay | null>`.
    - Add `visibleModels: Set<ModelId>` state, default `new Set(['power-law'])`.
    - Add `expandedModel: ModelId | null` state, default `'power-law'`.
    - Add `projectionYears: number` state, default 30. Render a shared projection horizon slider above the model list in the card.
    - Checking a model's visibility checkbox auto-expands its controls panel (`handleToggleVisibility` also calls `setExpandedModel` when adding to the set).
    - Each model's controls component receives `projectionYears` as a prop (but not `onProjectionChange` — the shared slider above owns the change handler).
    - Pass visible overlays as an array to `PriceChart.modelOverlays`.
 3. Both controls components (`PowerLawControls`, `S2FControls`) continue to auto-compute on mount — their overlays are always kept up to date regardless of visibility. Both accept `projectionYears` as a prop and remove their individual projection horizon sliders (the shared slider in the card header owns this control).

## Task Group 5: S2F controls UI

1. Create `web/src/components/controls/S2FControls.tsx`:
   - Accepts `historicData: PricePoint[]` and `projectionYears: number` props.
   - Calls WASM `run_s2f_wasm` reactively on every change to `projectionYears` (reactive, no run button).
   - Exposes results via `onModelChange` callback to parent.
   - Passes `modelId` to `toModelOverlay`.
   - No individual projection horizon slider — the shared slider in the parent card controls all models.
2. S2F info display: show the fitted `a`, `b`, and `R²` values.
3. Brief plain-language explanation of the S2F model.
4. All inputs have touch-friendly sizing (min 44×44px).
5. Controls stack vertically on mobile, full-width layout.

## Task Group 6: Multi-overlay PriceChart refactor

1. Change `PriceChart` prop from `modelOverlay?: ModelOverlay | null` to `modelOverlays?: ModelOverlay[]`.
2. Extract the single-overlay series-building logic into a reusable helper that takes a `ModelOverlay` and returns an array of ECharts series.
3. Prefix stack names with model ID to prevent area-fill collisions: e.g., `power-law-band-1sigma`, `s2f-band-1sigma`.
4. Prefix series names with the model's display label: e.g., "Power Law Median", "S2F ±1σ".
5. Look up each model's color from `MODEL_COLORS[overlay.modelId]`.
6. Render the "Today" markLine only once (using the first overlay's `todayTimestamp` — they are all the same).
7. Show legend when `modelOverlays.length > 0`.
8. Update tooltip formatter to show all relevant series (BTC Price + all model medians + band entries), not just a single model's.
9. Verify: chart renders correctly with 0, 1, and 2 visible overlays. Both models' median lines and bands are distinguishable.

## Task Group 7: Mobile responsiveness

1. `ModelSelector` checkbox rows are full-width, comfortable to tap (≥44px height).
2. Expand/collapse chevron button is ≥44×44px.
3. Each controls panel stacks vertically, full-width, no horizontal scrolling at 375px.
4. All inputs, sliders, and checkboxes have ≥44×44px touch targets.
5. Chart fills available width; no horizontal scroll.
6. Legend adapts: multiple model entries don't overflow at 375px.
7. Model labels use compact text on mobile (`"Power Law"` → `"Power Law"`, `"Stock-to-Flow (S2F)"` → `"S2F"`).

## Task Group 8: Building and verification

1. Ensure `wasm-pack build --target web` includes the S2F module.
2. Run full build: `npm run build` produces a working static site.
3. Run full test suite: `npm test` (runs both `wasm-pack test --node` and `cd web && npm test`).
4. Manual verification checklist matches `validation.md`.
5. Update `PriceChart.test.tsx` to test with 0, 1, and 2 `modelOverlays`.
