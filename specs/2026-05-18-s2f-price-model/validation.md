# Phase 4 — S2F Price Model: Validation

## Merge criteria

All nine checks must pass before this phase can be merged to `main`.

### 1. S2F model computes correct S2F ratios

- `get_s2f_for_date` returns correct S2F for a date in each halving epoch (verified against hand-computed values).
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

### 4. Model selector tabs work

- `ModelSelector` renders two tabs: "Power Law" and "Stock-to-Flow (S2F)".
- Clicking a tab switches the active model and updates the controls panel below.
- The active tab is visually highlighted.
- Only one model is active at a time.
- Switching tabs replaces the chart overlay with the newly selected model's projection.

### 5. S2F overlay appears on chart when selected

- Selecting the S2F tab renders the S2F model line + confidence band on the `PriceChart`.
- The median line is solid through the historic fit range and dashed in the projection region (future).
- A vertical reference line separates past from future.
- Confidence bands (±1σ) are visible as semi-transparent filled regions around the median.
- The overlay coexists with the historic price line — both are visible and distinguishable.
- Zoom and pan controls affect all series together.

### 6. S2F controls change the overlay in real time

- Changing the projection horizon slider updates the S2F overlay without a "run" button.
- The slider range is 5–50, default 30. Changing it extends or shrinks the future projection region.
- Fitted `a`, `b`, and `R²` values are displayed below the slider and update if historic data changes.

### 7. Power Law model still works (no regressions)

- Switching to the Power Law tab shows the Power Law controls from Phase 3.
- All Power Law functionality from Phase 3 works: formulation presets (log-log, power fit, custom), confidence band styles (±1σ, ±1σ & ±2σ, custom percentiles), projection horizon slider.
- Power Law chart overlay renders correctly when its tab is active.
- Phase 3 tests still pass.

### 8. Mobile-responsive at 375px

- `ModelSelector` tabs are full-width, comfortably tappable (≥44px height).
- Each controls panel stacks vertically, no horizontal scrolling.
- All interactive elements (tabs, sliders) have ≥44×44px touch targets.
- Chart fills available width; no horizontal scroll.
- Switching tabs does not cause layout shift or scroll position jump.

### 9. Tests pass

- `cd wasm && wasm-pack test --node` — all Rust unit tests pass:
  - S2F computation for known dates.
  - S2F doubling at halving boundaries.
  - Regression coefficients against hand-computed values.
  - Projection formula output.
  - Edge cases (empty data, single point, projection_years=0).
  - Confidence band ordering.
- `cd web && npm test` — Vitest tests pass:
  - `ModelSelector` renders with both tabs.
  - Clicking a tab switches active model.
  - `S2FControls` renders with default projection horizon.
  - Projection horizon slider changes the displayed value.
  - `PowerLawControls` still renders correctly inside tabs.
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
# → Model selector tabs are visible above the controls.
# → Power Law tab is active by default — controls and overlay from Phase 3 work.
# → Click "Stock-to-Flow (S2F)" tab — controls switch to S2F projection horizon slider.
# → S2F overlay renders: median line + ±1σ band on chart.
# → Line is dashed into the future.
# → Changing the projection horizon slider updates the chart immediately.
# → Switching back to Power Law tab restores Power Law controls and overlay.
# → Test at 375px viewport: tabs are full-width and tappable, controls stack vertically, no horizontal scrolling.
```

## What "done" looks like

The app shows the historic BTC price chart from Phase 2. Above it, a tab bar with two tabs: "Power Law" and "Stock-to-Flow (S2F)". The Power Law tab shows the full Phase 3 controls (formulation presets, confidence band styles, projection horizon). Switching to the S2F tab shows the S2F controls (projection horizon slider and fitted parameters display). The chart overlay switches to show the selected model's projection — a colored median line (dashed into the future) with a semi-transparent ±1σ confidence band. Both models work interchangeably; switching tabs is instant. All controls are fully usable on a phone screen.
