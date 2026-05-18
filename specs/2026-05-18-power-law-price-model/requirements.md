# Phase 3 — Power Law Price Model: Requirements

## Goal

Implement the BTC Power Law price model in Rust/WASM, overlay its projection onto the historic price chart, and expose full model configuration controls. Users can switch between two preset formulations or supply custom parameters, choose confidence band styles, and configure the projection horizon.

## Scope

### In scope

- **Rust Power Law module** (`wasm/src/models/power_law.rs`): two preset formulations plus custom parameter input.
  - **Preset A — Log-log linear regression**: fit `log10(price) = a * log10(days_since_genesis) + b` against historic BTC price data, then project forward. The Rust module accepts a `Vec<PricePoint>` of historic data and computes `a` and `b` via least-squares regression.
  - **Preset B — Direct power function**: fit `price = a * days_since_genesis^b` via non-linear regression against historic data.
  - **Custom**: user supplies their own `a` and `b` parameters directly (bypasses fitting).
- **Confidence bands** (configurable, default ±1σ):
  - `±1σ` only — 68% band centered on the regression line.
  - `±1σ and ±2σ` — 68% and 95% nested bands.
  - **Custom percentiles** — P10/P90 and/or P25/P75 derived from the residual distribution.
- **Projection horizon**: configurable in years, defaulting to 30 years from the current year. The model returns a `Vec<ModelPoint>` with entries for each year from genesis to end-of-projection.
- **WASM bindings**: the Rust model exposes a single pub function accepting a `JsValue` config object and a `Vec<PricePoint>` (historic data). Returns a `JsValue` containing the model projections (median + bands for each year).
- **Chart overlay**: extend the existing `PriceChart` component to accept an optional `modelOverlay` prop containing model series data. The overlay renders:
  - The fitted model line spanning the full date range (past + future), dashed into the future region.
  - Confidence band area fills (semi-transparent) between band boundaries.
  - Historic actual prices remain visible as a separate, un-styled-by-model series.
- **Model controls UI** (`web/src/components/controls/PowerLawControls.tsx`): a panel allowing users to:
  - Select formulation preset (preset A, preset B, or custom).
  - When custom is selected: show `a` and `b` numeric inputs.
  - Select confidence band style (dropdown or radio).
  - Set projection horizon (slider or number input, range 5–50 years, default 30).
- **UI integration**: the controls panel renders above or beside the chart. Changing any control triggers a WASM call to recompute the model and update the chart overlay in real time (no explicit "run" button).
- **Tests**: Rust unit tests validating both presets against known reference values (e.g., PlanB/Santostasi chart values: median BTC price ~$55k for 2024) and computing expected formula outputs from hardcoded sample data. React component tests for model controls and chart overlay presence.

### Out of scope

- Stock-to-Flow model — Phase 4.
- Bitcoin24 model — Phase 5.
- Withdrawal strategies — Phase 7+.
- Monte Carlo simulation — Phase 9.
- User financial parameters (holdings, spending, age) — Phase 6.
- Model comparison (side-by-side models on same chart) — Phase 4+.
- Saving/loading model configurations — that's per-session state for now.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Model formulations | Two presets (log-log fit, power function fit) + custom | Covers both the academic standard and the practical use case. Custom mode gives power users full control without needing to understand the fit logic. |
| Regression approach | Least-squares in Rust | Simple, deterministic, fast. Runs entirely in WASM — no numeric library dependencies beyond what we write. Both presets fit against the full historic dataset. |
| Confidence band default | ±1σ only | Least visual clutter for the default view. Users can expand to ±2σ or percentile-based when they want more detail. |
| Projection horizon default | 30 years | Long enough for retirement planning (most users planning 20–40 year horizons). The 5–50 year slider range covers all reasonable FIRE scenarios. |
| Chart integration | Extend `PriceChart` with `modelOverlay` prop | Avoids a separate chart component. The model overlay is naturally an additional series on the same axes. Keeps the component count low and the chart in one place. |
| Model execution trigger | Reactive (on control change) | Aligned with the mission principle "results update in real time as you drag sliders." The Power Law fit is cheap (<1ms for ~4500 data points) so no debounce needed beyond React's native re-render cycle. |
| Test reference values | PlanB/Santostasi published values + computed formula checks | External references ground the model in accepted community numbers. Internal formula checks ensure the math is correct regardless of input data. |
| Controls location | Separate `PowerLawControls` component, rendered above/beside chart | Modular — Phase 4 and 5 will add model selector tabs. Each model's controls live in its own component. |

## Context

This is Phase 3 of the BTCFire roadmap. It introduces the first price model and establishes the pattern for Phases 4 (S2F) and 5 (Bitcoin24). The model controls component is designed to be composed into a model-selector layout later. The Power Law is the most mathematically grounded of the three models — fitting it properly sets the standard for the others. The chart overlay interface (`modelOverlay` prop on `PriceChart`) must be designed to support multiple concurrent models in Phase 13 (scenario comparison).
