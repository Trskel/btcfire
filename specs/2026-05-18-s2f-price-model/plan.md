# Phase 4 — S2F Price Model: Plan

## Task Group 1: Rust S2F model + tests

1. Create `wasm/src/models/s2f.rs` with inline `#[cfg(test)]` module.
2. Define `HalvingEpoch` struct: `{ start_date: NaiveDate, subsidy: f64 }`.
3. Hardcode halving schedule as a static array:
   - Epoch 0: 2009-01-03, 50 BTC/block
   - Epoch 1: 2012-11-28, 25 BTC/block
   - Epoch 2: 2016-07-09, 12.5 BTC/block
   - Epoch 3: 2020-05-11, 6.25 BTC/block
   - Epoch 4: 2024-04-20, 3.125 BTC/block
   - Future epochs projected at ~4-year intervals: Epoch 5: ~2028, Epoch 6: ~2032, etc. through Epoch 10 (~2048).
4. Implement `get_s2f_for_date(date: NaiveDate) -> f64`:
   - Determine which halving epoch the date falls in.
   - Compute total supply: sum of coins mined in all prior epochs plus prorated coins in the current epoch (blocks mined so far × current subsidy, or date-proportional if simpler).
   - Compute annual issuance: current subsidy × 52,560 blocks/year.
   - Return `total_supply / annual_issuance`.
5. Implement `compute_s2f_values(historic_data: &[PricePoint]) -> Vec<(NaiveDate, f64)>`:
   - For each price data point, compute S2F at that date. Return (date, s2f) pairs.
6. Implement least-squares linear regression: given `Vec<(f64, f64)>` of (x=log10_s2f, y=log10_price) points, compute slope `a`, intercept `b`, and `R²`.
7. Define `S2FConfig` struct: `{ projection_years: u32 }` (default 30).
8. Define `ModelPoint { year: i32, median_price_usd: f64, band_low_usd: f64, band_high_usd: f64 }` — reuse or define in `models/mod.rs` (if Power Law already defines it, import it).
9. Define `S2FResult { points: Vec<ModelPoint>, r_squared: f64, a: f64, b: f64 }`.
10. Implement `run_s2f(config: &S2FConfig, historic_data: &[PricePoint]) -> Result<S2FResult, String>`:
    - Compute S2F for each historic price point.
    - Filter out pre-halving data points (before 2012-11-28, since S2F before the first halving is not meaningful for the model — or alternatively use all data and let regression handle it).
    - Run `log10(S2F) ~ log10(price)` regression.
    - For each year from genesis to `current_year + projection_years`:
      - Compute predicted S2F at the midpoint of that year (accounting for halvings within the year).
      - Apply the fitted model: `log10(price) = a * log10(S2F) + b`, solve for price.
      - Compute ±1σ confidence band from residual standard deviation.
      - If the year is in the past, also compute the actual price from historic data for validation (not used in the chart, but useful for R²).
11. **Tests** (in `#[cfg(test)]` module):
    - Halving epoch lookup: date 2015-01-01 returns epoch 1 (25 BTC subsidy).
    - S2F computation: for a date in mid-2024 (epoch 4, 3.125 BTC subsidy), verify S2F matches hand-computed value. Supply ~19.7M BTC, issuance ~164k BTC/year, S2F ≈ 120.
    - S2F doubling at halving: S2F just before and just after a halving boundary should approximately double.
    - Regression against hardcoded sample data: given 5 hand-picked (S2F, price) pairs, verify `a` and `b` coefficients match a by-hand calculation.
    - Projection: with known `a` and `b`, verify projected price for a future year with known S2F.
    - Edge cases: empty historic data returns error, single data point returns degenerate fit (R² not computable).
    - R² is between 0 and 1.
    - Confidence bands: band_low < median_price < band_high for all projected points.
12. Run `wasm-pack test --node` — all tests pass.

## Task Group 2: WASM bindings

1. Add `serde` derives (`Serialize`, `Deserialize`) to `S2FConfig` and `S2FResult`.
2. Implement `wasm-bindgen` export: `run_s2f_wasm(config_js: JsValue, historic_data_js: JsValue) -> Result<JsValue, JsValue>`.
3. Deserialize config and historic data from JS, call `run_s2f`, serialize and return result.
4. Error handling: return JS error string if deserialization fails or model fit fails.
5. Register the export in `wasm/src/lib.rs`.
6. Build: `wasm-pack build --target web` succeeds with no warnings.
7. Verify in browser console: call `run_s2f_wasm` with valid inputs, confirm it returns valid JSON.

## Task Group 3: Model selector tabs

1. Create `web/src/components/controls/ModelSelector.tsx`:
   - Displays a tab bar with one tab per available model: "Power Law", "Stock-to-Flow (S2F)".
   - Accepts `activeModel` and `onModelChange` props.
   - Active tab is visually highlighted (shadcn/ui Tabs component or styled divs).
   - Below the tab bar, render the active model's controls component.
   - Tabs have ≥44px height and full-width on mobile.
2. Create a shared TypeScript type for model identifiers: `type ModelId = 'power-law' | 's2f'`.
3. Define `ModelOverlay` type in `web/src/types/models.ts` if not already present (likely created in Phase 3). Ensure it supports both Power Law and S2F overlays (they share the same structure).
4. Add a `useModel` hook or lift state to `App.tsx` that tracks `activeModel: ModelId` and the current model's result.

## Task Group 4: S2F controls UI

1. Create `web/src/components/controls/S2FControls.tsx`:
   - Projection horizon slider: range 5–50, default 30. Numeric display next to slider. Touch-friendly (≥44px height).
   - Accepts `historicData: PricePoint[]` prop.
   - Calls WASM `run_s2f_wasm` on every slider change (reactive, no run button).
   - Exposes results via `onModelChange` callback to parent.
2. S2F info display: show the fitted `a`, `b`, and `R²` values below the slider so users can see the regression quality.
3. All inputs have touch-friendly sizing (min 44×44px).
4. Controls stack vertically on mobile, full-width layout.

## Task Group 5: Refactor Power Law integration for tabs

1. Update `App.tsx` (or the chart page component):
   - Add `ModelSelector` above the `PriceChart`.
   - Track `activeModel` state, default to `'power-law'`.
   - When `activeModel` is `'power-law'`, render `PowerLawControls` inside the tab; when `'s2f'`, render `S2FControls`.
   - Pass whichever model's result to `PriceChart.modelOverlay`.
   - When switching tabs, the overlay updates to show the active model.
2. Ensure `PowerLawControls` works unchanged inside the tab wrapper (no functionality regressions).
3. Chart clears/updates the overlay when switching models (brief transition between different model lines).

## Task Group 6: Mobile responsiveness

1. `ModelSelector` tabs are full-width, horizontally scrollable or use compact labels on mobile.
2. Each controls panel stacks vertically, full-width, no horizontal scrolling at 375px.
3. Tab touch targets ≥44px height.
4. Chart adjusts to available space with controls above it.
5. Legend adapts: on mobile, model overlay entries don't overwhelm the historic price entry.
6. Verify no horizontal scrolling at 375px viewport width.

## Task Group 7: Building and verification

1. Ensure `wasm-pack build --target web` includes the S2F module.
2. Run full build: `npm run build` produces a working static site.
3. Run full test suite: `npm test` (runs both `wasm-pack test --node` and `cd web && npm test`).
4. Manual verification checklist matches `validation.md`.
