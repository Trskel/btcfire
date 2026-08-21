# Power Law Price Model Specification

## Purpose

The BTC Power Law price model implemented in Rust/WASM, overlaid on the historic price chart with full configuration controls.

## Requirements

### Requirement: Power Law formulations
The system SHALL implement a Rust Power Law module in `wasm/src/models/power_law.rs` supporting three formulations: Preset A (log-log linear regression fitting `log10(price) = a * log10(days_since_genesis) + b`), Preset B (direct power function fitting `price = a * days_since_genesis^b` via non-linear regression), and Custom (user-supplied `a` and `b` bypassing the fit). The module SHALL accept `Vec<PricePoint>` historic data and compute coefficients via least-squares regression.

#### Scenario: Preset A fit
- **WHEN** historic data is provided
- **THEN** preset A computes valid `a` and `b` coefficients via least-squares regression

#### Scenario: Custom parameters
- **WHEN** the user selects the custom formulation with `a` and `b` values
- **THEN** the model projects using those values without fitting

### Requirement: Confidence bands
The system SHALL support configurable confidence bands with a default of ±1σ: ±1σ only (68% band), ±1σ and ±2σ (68% and 95% nested bands), and custom percentiles (P10/P90 and/or P25/P75) derived from the residual distribution.

#### Scenario: Default bands
- **WHEN** the model runs with default band settings
- **THEN** each projected point includes a ±1σ band centered on the regression line

#### Scenario: Nested bands
- **WHEN** the user selects ±1σ and ±2σ
- **THEN** both 68% and 95% bands are present and the wider band contains the narrower one

### Requirement: Projection horizon
The system SHALL support a configurable projection horizon in years with a default of 30, ranging from 5 to 50 years. The model SHALL return a `Vec<ModelPoint>` with entries for each year from genesis to end-of-projection.

#### Scenario: Default horizon
- **WHEN** the model runs with default settings
- **THEN** projections extend 30 years beyond the current year

### Requirement: WASM binding
The system SHALL expose `run_power_law_wasm(config_js: JsValue, historic_data_js: JsValue) -> JsValue` accepting a serialized config object and `Vec<PricePoint>`, returning serialized projections (median plus bands for each year).

#### Scenario: Valid input
- **WHEN** the WASM function is called with a valid config and historic data
- **THEN** it returns serialized model projections for each year through the projection horizon

### Requirement: Chart overlay
The system SHALL extend `PriceChart` to accept a `modelOverlay` prop and render the fitted model line spanning past and future, dashed into the future region, with semi-transparent confidence band area fills. Historic actual prices SHALL remain visible as a separate series.

#### Scenario: Overlay rendering
- **WHEN** a model overlay is passed to the chart
- **THEN** the model line, future-dashed segment, and band fills render alongside the historic price series

### Requirement: Model controls UI
The system SHALL provide a `PowerLawControls` component allowing users to select the formulation preset, enter custom `a` and `b` inputs when custom is selected, choose the confidence band style, and set the projection horizon via a slider or number input (5–50 years, default 30).

#### Scenario: Custom formulation reveals inputs
- **WHEN** the user selects the custom formulation
- **THEN** `a` and `b` numeric inputs appear

### Requirement: Reactive model execution
The system SHALL recompute the model via WASM whenever any control changes and update the chart overlay in real time, without an explicit run button.

#### Scenario: Slider update recomputes
- **WHEN** the user changes a control value
- **THEN** the WASM call fires and the chart overlay updates immediately

### Requirement: Power Law tests
The system SHALL include Rust unit tests validating both presets against known reference values (e.g., median BTC price near ~$55k for 2024) and formula outputs from hardcoded sample data, plus React component tests for the controls and chart overlay.

#### Scenario: All Power Law tests pass
- **WHEN** the test suites are run
- **THEN** all power-law tests pass without failure
