# Phase 3 — Power Law Price Model: Validation

## Merge criteria

All seven checks must pass before this phase can be merged to `main`.

### 1. Power Law model computes correct values

- Preset A (log-log fit) against full BTC historic data returns `R² ≥ 0.90`.
- Preset A median price for year 2024 is within ±5% of the published PlanB/Santostasi reference (~$55k).
- Preset B (power fit) returns different but reasonable parameters (not identical to Preset A).
- Custom mode with `a=5.84, b=-17.3` yields expected output for any given year.
- `wasm-pack test --node` passes all Rust unit tests.

### 2. WASM bindings work end-to-end

- Calling `run_power_law_wasm` from the browser with valid config + historic data returns a valid result object.
- Calling with invalid config (missing fields, negative projection years) returns a descriptive error.
- The result object contains all fields: `points`, `R_squared`, `a`, `b`, `formulation_used`.

### 3. Model overlay appears on chart

- Selecting any formulation immediately renders the model line + confidence band on the `PriceChart`.
- The median line is solid through the historic range and dashed in the projection region (future).
- A vertical reference line separates past from future.
- Confidence bands are visible as semi-transparent filled regions around the median.
- The overlay coexists with the historic price line — both are visible and distinguishable.
- Zoom and pan controls affect all series (historic + model overlay) together.

### 4. Model controls change the output in real time

- Changing the formulation preset updates the overlay without a "run" button.
- Switching to Custom mode reveals `a` and `b` inputs; changing them updates the overlay.
- Changing the confidence band style (e.g., ±1σ → ±1σ+±2σ) updates the band rendering immediately.
- Changing the projection horizon slider extends or shrinks the future projection region.
- All changes render within one frame (sub-millisecond model computation, ECharts re-render).

### 5. Mobile-responsive at 375px

- `PowerLawControls` panel stacks vertically, full width, no horizontal scrolling.
- All interactive elements (radio buttons, dropdowns, sliders) have ≥44×44px touch targets.
- Chart legend does not overflow; tooltips appear near touch point, not obscured.
- Chart fills available width; no horizontal scroll at 375px.
- Controls are reachable above the chart without excessive scrolling.

### 6. Tests pass

- `cd wasm && wasm-pack test --node` — all Rust unit tests pass:
  - Both presets return correct `a`, `b`, `R²` against hardcoded data.
  - Reference value check: 2024 median ≈ $55k ±5%.
  - Confidence bands diverge over time.
  - Custom mode yields expected output.
  - Edge cases handled (empty data, single point, zero projection years).
- `cd web && npm test` — Vitest tests pass:
  - `PowerLawControls` renders with default settings.
  - Formulation selector toggles custom parameter fields.
  - Confidence band dropdown updates the selected option.
  - Projection horizon slider changes the displayed value.
- `npm test` at repo root runs both suites and exits 0.

### 7. Build succeeds

- `wasm-pack build --target web` succeeds with no errors or warnings.
- `cd web && npm run build` produces a working `dist/` folder.
- Loading the built app in a browser shows the Power Law controls and overlay.

## How to test

```bash
# Build the WASM crate
cd wasm && wasm-pack build --target web && cd ..

# Run Rust tests
cd wasm && wasm-pack test --node && cd ..

# Install dependencies (model overlay may not need new packages)
cd web && npm install && cd ..

# Run React tests
cd web && npm test

# Run full combined test suite
npm test

# Start dev server and verify manually
cd web && npm run dev
# → Chart loads with BTC price history (Phase 2).
# → Power Law controls panel is visible.
# → Selecting "Log-log fit" renders model line + ±1σ band on chart.
# → Line is dashed into the future (beyond today).
# → Switching to ±1σ + ±2σ shows nested band fills.
# → Switching to "Custom" reveals a and b inputs.
# → Changing projection horizon slider extends/foreshortens the future line.
# → All changes update the chart immediately.
# → Test at 375px viewport: controls stack, touch targets are comfortable.
```

## What "done" looks like

The app shows the historic BTC price chart from Phase 2. Above it, a Power Law controls panel lets users pick a formulation (log-log fit, power fit, or custom parameters), choose confidence band styles, and set the projection horizon. Changing any control instantly recomputes the model in Rust/WASM and updates the chart overlay — a colored median line running through history and extending dashed into the future, with semi-transparent confidence band fills around it. Tests validate the model against known reference values. All controls are fully usable on a phone screen.
