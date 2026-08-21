# Bitcoin24 Price Model Specification

## Purpose

The Bitcoin24 CAGR (compound annual growth rate) price model in Rust/WASM, fitting log-price against years since genesis with ±1σ confidence bands, integrated into the model selector with a controls component.

## Requirements

### Requirement: CAGR regression on historic data
The system SHALL fit `log10(price_usd) = a * years_since_genesis + b` via ordinary least squares linear regression over all historic price data points. `years_since_genesis` is computed as `days_since_genesis(timestamp_ms) / 365.25`.

#### Scenario: Successful regression on valid data
- **WHEN** historic data contains 10+ price points spanning 2014–2024
- **THEN** regression returns valid a and b coefficients with R² > 0.0 and ≤ 1.0

#### Scenario: Insufficient data
- **WHEN** historic data has fewer than 2 data points
- **THEN** the function returns an error

#### Scenario: Empty data
- **WHEN** historic data is empty
- **THEN** the function returns an error

### Requirement: Future price projection
The system SHALL generate `ModelPoint` entries for every year from the first historic year through `current_year + projection_years` (or `current_year` when `projection_years` is 0). Each point SHALL contain median price computed as `10^(a * years_since_genesis + b)` using the year's January 1 timestamp.

#### Scenario: Projection horizon
- **WHEN** `projection_years` is set to 30
- **THEN** the output includes points for all historic years plus 30 future years beyond the current year

#### Scenario: Zero projection years
- **WHEN** `projection_years` is 0
- **THEN** the output includes points only up to the current year (no future projection)

#### Scenario: Negative projection years
- **WHEN** `projection_years` is negative
- **THEN** the function returns an error

### Requirement: Confidence bands
The system SHALL compute ±1σ confidence bands using the residual standard deviation from the regression. Each `ModelPoint` SHALL have `band_1sigma_low` and `band_1sigma_high` set to `10^(median_log ± sigma)`. All other band fields (`band_2sigma_*`, `band_p*`) SHALL be `None`.

#### Scenario: Band ordering
- **WHEN** confidence bands are generated for any projection year
- **THEN** `band_1sigma_low < median_price_usd < band_1sigma_high`

#### Scenario: Bands widen over time
- **WHEN** comparing bands across projection years
- **THEN** the absolute width of the 1σ band increases with time (dollar-denominated uncertainty grows over time)

### Requirement: WASM interface
The system SHALL expose `run_bitcoin24_wasm(config_js, historic_data_js)` via `#[wasm_bindgen]`, accepting `Bitcoin24Config` and `Vec<PricePoint>` serialized as `JsValue`, returning `Bitcoin24Result` serialized as `JsValue` or an error `JsValue`.

#### Scenario: Valid input
- **WHEN** WASM function is called with valid config and 10+ historic data points
- **THEN** returns serialized `Bitcoin24Result` with non-empty points array

#### Scenario: Invalid config serialization
- **WHEN** config JS value cannot be deserialized to `Bitcoin24Config`
- **THEN** returns an error `JsValue`

### Requirement: Model selector integration
The system SHALL register the Bitcoin24 model as `'bitcoin24'` in the `ModelId` union type, with a corresponding entry in `MODEL_COLORS` (`#f97316`), `MODEL_LABELS` (`'Bitcoin24'`), and the `modelEntries` array in `App.tsx`. The model SHALL have its own `Bitcoin24Controls` React component following the existing controls pattern.

#### Scenario: Three models visible in selector
- **WHEN** price data is loaded
- **THEN** the model selector displays three rows: Power Law, S2F, Bitcoin24

#### Scenario: Toggle visibility and overlay
- **WHEN** user checks the Bitcoin24 checkbox
- **THEN** a CAGR overlay appears on the price chart with orange color
- **WHEN** user unchecks the Bitcoin24 checkbox
- **THEN** the CAGR overlay disappears from the chart

### Requirement: Rust unit tests
The system SHALL include Rust unit tests using `#[wasm_bindgen_test]` that validate: regression R² > 0.9 on reference data, slope `a` is positive on reference data, median price near reference value at 2024, confidence band ordering, error on empty data, error on single data point, error on negative projection years, and zero projection years returns only historic range.

#### Scenario: All Bitcoin24 tests pass
- **WHEN** `wasm-pack test` is run
- **THEN** all `bitcoin24` module tests pass without failure
