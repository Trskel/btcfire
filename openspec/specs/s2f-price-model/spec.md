# S2F Price Model Specification

## Purpose

The PlanB Stock-to-Flow (S2F) price model in Rust/WASM, checkbox-based multi-model visibility controls, and simultaneous model overlays on the price chart.

## Requirements

### Requirement: S2F model computation
The system SHALL implement a Rust S2F module in `wasm/src/models/s2f.rs` fitting `log10(price) = a * log10(S2F) + b` via least-squares linear regression, using a hardcoded Bitcoin halving schedule (block height, date, subsidy) from genesis through future halvings.

#### Scenario: S2F values from halving schedule
- **WHEN** S2F is computed for a given date
- **THEN** the value is derived from the halving epoch active on that date, using total supply mined to date and annual issuance (subsidy × ~52,560 blocks/year)

#### Scenario: Future projections
- **WHEN** the model projects future years
- **THEN** future S2F values follow the halving schedule (S2F doubles at each halving) and prices are computed from the fitted model

### Requirement: S2F confidence bands
The system SHALL compute ±1σ confidence bands from the residual standard deviation of the fit for every projected point.

#### Scenario: Band ordering
- **WHEN** bands are generated for any projection year
- **THEN** the ±1σ band is centered on the projected median price

### Requirement: S2F WASM binding
The system SHALL expose `run_s2f_wasm(config_js: JsValue, historic_data_js: JsValue) -> JsValue` following the same pattern as `run_power_law_wasm`.

#### Scenario: Valid input
- **WHEN** the WASM function is called with a valid config and historic data
- **THEN** it returns serialized S2F projections for each year through the projection horizon

### Requirement: Model selector visibility controls
The system SHALL provide a `ModelSelector` component listing models with checkboxes to toggle chart visibility. Multiple models SHALL be visible simultaneously. Each model row SHALL have an expand/collapse toggle for its controls panel, with only one controls panel expanded at a time. Checking a model's visibility checkbox SHALL automatically expand its controls panel.

#### Scenario: Toggle model visibility
- **WHEN** the user checks a model's checkbox
- **THEN** the model overlay appears on the chart and its controls panel expands

#### Scenario: Single expanded panel
- **WHEN** the user expands one model's controls panel
- **THEN** any previously expanded panel collapses

### Requirement: Shared projection horizon
The system SHALL render a single projection horizon slider (5–50 years, default 30) above the model list, shared by all models. Individual model control panels SHALL NOT contain their own horizon sliders.

#### Scenario: Horizon change affects all models
- **WHEN** the user changes the shared projection horizon slider
- **THEN** all models' projections update simultaneously to the new horizon

### Requirement: S2F controls
The system SHALL provide an `S2FControls` component receiving the projection horizon from its parent via props.

#### Scenario: Controls render
- **WHEN** the S2F model's controls panel is expanded
- **THEN** the S2F controls render without a horizon slider of their own

### Requirement: Multi-overlay chart
The system SHALL refactor `PriceChart` to accept an array of `ModelOverlay` objects (`modelOverlays?: ModelOverlay[]`) and render all of them simultaneously, each with a distinct color from the `MODEL_COLORS` map (Power Law → amber `#eab308`, S2F → teal `#0694a2`), with a legend showing all visible model entries.

#### Scenario: Two visible models
- **WHEN** Power Law and S2F are both checked
- **THEN** the chart renders both overlays with distinct colors and a legend listing both

### Requirement: Overlay state management
The system SHALL track in `App.tsx` a `Set<ModelId>` of visible models, a `Record<ModelId, ModelOverlay | null>` of computed overlays, and a single shared `projectionYears` value. All models' WASM computations SHALL run independently regardless of visibility; toggling visibility SHALL only add or remove the overlay from the chart.

#### Scenario: Toggle does not recompute
- **WHEN** the user unchecks and rechecks a model
- **THEN** the previously computed overlay reappears without a new WASM computation

### Requirement: S2F tests
The system SHALL include Rust unit tests validating S2F computation and regression against hand-computed values, plus React component tests for visibility checkboxes, expand/collapse behavior, S2F controls, and multi-overlay chart rendering.

#### Scenario: All S2F tests pass
- **WHEN** the test suites are run
- **THEN** all s2f tests pass without failure
