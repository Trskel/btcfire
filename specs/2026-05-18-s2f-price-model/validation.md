# Phase 4 — S2F Price Model: Validation

## Merge criteria

All ten checks must pass before this phase can be merged to `main`.

### 1. S2F model computes correct S2F ratios

- `get_s2f_for_timestamp` returns correct S2F for a date in each halving epoch (verified against hand-computed values).
- S2F approximately doubles at halving boundaries (e.g., just before and just after 2024-04-20).
- Total supply calculation matches expected cumulative issuance at known dates.
- `wasm-pack test --node` passes all Rust unit tests for S2F computation.

### 2. S2F regression and projection are correct

- Regression against hardcoded sample (S2F, price) pairs returns the correct `a` and `b` coefficients (verified by hand calculation).
- `R²` is between 0 and 1.
- Projected price for a future year with known S2F matches the formula `10^(a * log10(S2F) + b)`.
- Confidence bands: `band_low < median_price < band_high` for all projected points.
- Edge cases: empty data returns error, single data point returns degenerate fit.

### 3. WASM bindings work end-to-end

- Calling `run_s2f_wasm` from the browser with valid config + historic data returns a valid result object.
- Calling with invalid config returns a descriptive error.
- The result object contains `points`, `r_squared`, `a`, `b`.
- `wasm-pack build --target web` succeeds with no errors or warnings.

### 4. Visibility checkboxes work

- `ModelSelector` renders a list of model rows: "Power Law" and "Stock-to-Flow (S2F)".
- Each row has a checkbox. The Power Law checkbox is checked by default.
- Toggling a checkbox adds/removes the model's overlay from the chart without recomputing.
- Multiple models can be checked at once — both overlays render on the chart simultaneously.

### 5. Expand/collapse controls work

- Each model row has a chevron button to expand/collapse its controls panel.
- Clicking the chevron toggles the controls panel visibility below the row.
- Only one model's controls are expanded at a time (expanding one collapses the other).
- When expanded, the controls panel shows the full model configuration (Power Law: formulation, bands, horizon; S2F: horizon slider).
- The expand/collapse transition is smooth and does not cause layout jumps.

### 6. Multiple overlays render correctly on the chart

- When both models are checked, both median lines appear on the chart with distinct colors (amber for Power Law, teal for S2F).
- Each model's confidence bands render as semi-transparent filled regions around its median line.
- The legend shows entries for both models (e.g., "Power Law Median", "S2F Median").
- Bands from different models do not visually overlap or interfere (stack names are model-prefixed).
- The "Today" reference line appears once.
- Zoom and pan controls affect all series together.
- Checking/unchecking a model adds/removes all its series from the chart instantly.

### 7. S2F controls change the overlay in real time

- When S2F is expanded, changing its projection horizon slider updates the S2F overlay immediately.
- The slider range is 5–50, default 30.
- Fitted `a`, `b`, and `R²` values are displayed below the slider.

### 8. Power Law model still works (no regressions)

- When Power Law is expanded, all its controls work: formulation presets (log-log, power fit, custom), confidence band styles (±1σ, ±1σ & ±2σ, custom percentiles), projection horizon slider.
- Power Law chart overlay renders correctly when checked.
- Phase 3 tests still pass.

### 9. Mobile-responsive at 375px

- Checkbox rows are full-width, comfortably tappable (≥44px height).
- Expand/collapse chevron button is ≥44×44px.
- Each controls panel stacks vertically, no horizontal scrolling.
- All interactive elements (checkboxes, sliders, selects, inputs) have ≥44×44px touch targets.
- Chart fills available width; no horizontal scroll.
- Model labels use compact text on mobile ("S2F" instead of "Stock-to-Flow (S2F)").
- Legend entries don't overflow at 375px.

### 10. Tests pass

- `cd wasm && wasm-pack test --node` — all Rust unit tests pass:
  - S2F computation for known dates.
  - S2F doubling at halving boundaries.
  - Regression coefficients against hand-computed values.
  - Projection formula output.
  - Edge cases (empty data, single point, projection_years=0).
  - Confidence band ordering.
- `cd web && npm test` — Vitest tests pass:
  - `ModelSelector` renders with both model rows and checkboxes.
  - Power Law is checked by default; S2F is not.
  - Toggling a checkbox changes the checked state.
  - Expand/collapse toggles control panel visibility.
  - `S2FControls` renders with default projection horizon.
  - `PowerLawControls` still renders correctly.
  - `PriceChart` renders with 0, 1, and 2 model overlays.
- `npm test` at repo root runs both suites and exits 0.

## How to test

```bash
# Build the WASM crate
cd wasm && wasm-pack build --target web && cd ..

# Run Rust tests
cd wasm && wasm-pack test --node && cd ..

# Install dependencies
cd web && npm install && cd ..

# Run React tests
cd web && npm test

# Run full combined test suite
npm test

# Start dev server and verify manually
cd web && npm run dev
# → Chart loads with BTC price history (Phase 2).
# → Model visibility list is visible above the chart: "Power Law" (checked) and "S2F" (unchecked).
# → Power Law is expanded by default — full controls visible.
# → Power Law overlay renders on chart (amber median line + bands).
# → Check the S2F checkbox. Power Law still visible, S2F appears on chart (teal).
# → Both models' median lines and bands are distinguishable.
# → Uncheck Power Law. Only S2F remains on chart.
# → Expand S2F. S2F controls panel opens (Power Law collapses).
# → Change S2F projection horizon slider — S2F overlay updates immediately.
# → Expand Power Law again. Power Law controls reappear, S2F panel collapses.
# → Test at 375px viewport: checkbox rows are full-width, controls stack, no horizontal scrolling.
```

## What "done" looks like

The app shows the historic BTC price chart from Phase 2. Below it, a model list with two rows: "Power Law" (checked, expanded) and "Stock-to-Flow (S2F)" (unchecked, collapsed). The chart shows the Power Law overlay — an amber median line (dashed into the future) with ±1σ confidence bands.

Checking the S2F checkbox adds a teal median line and its ±1σ bands to the chart, visible alongside the Power Law overlay. Both models' projections are clearly distinguishable by color. Expanding/collapsing a model's row shows or hides its controls panel. Only one panel is open at a time.

Each model's controls work independently: Power Law has formulation, band style, and projection horizon; S2F has projection horizon. Changing any control updates that model's chart overlay instantly. All controls and the model list are fully usable on a phone screen.
