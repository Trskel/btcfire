# Historic Price Data Specification

## Purpose

BTC's full historic price series: the data pipeline (API fetch, cache, shared Rust types) and the interactive price chart all future phases build on.

## Requirements

### Requirement: Rust price data types
The system SHALL define a `PricePoint` struct in `wasm/src/data/` with fields `timestamp_ms: i64` and `price_usd: f64`, serializable via serde and passable across the WASM boundary via wasm-bindgen.

#### Scenario: Serde round-trip
- **WHEN** a `PricePoint` is serialized and deserialized
- **THEN** the deserialized value equals the original

### Requirement: Price history API client
The system SHALL fetch daily BTC/USD prices from 2013-04-28 to present from the CoinGecko free `/coins/bitcoin/market_chart/range` endpoint via a client in `web/src/lib/api/`.

#### Scenario: Successful fetch
- **WHEN** the API client fetches historic prices
- **THEN** it returns daily BTC/USD data points spanning 2013-04-28 to present

#### Scenario: API failure with cached data
- **WHEN** the API is unavailable and a cached price history exists
- **THEN** the app serves the stale cache and continues to work

### Requirement: LocalStorage cache with TTL
The system SHALL cache the full price history in localStorage with a 24-hour TTL, refreshing from the API only when the cache is older than the TTL.

#### Scenario: Fresh cache
- **WHEN** a cached price history younger than 24 hours exists
- **THEN** the app uses the cache without calling the API

#### Scenario: Expired cache
- **WHEN** the cache is older than 24 hours
- **THEN** the app fetches fresh data from the API and updates the cache

### Requirement: Price data hook
The system SHALL provide a `useHistoricPrices` React hook that manages loading, error, and data states for the price data pipeline.

#### Scenario: Loading state
- **WHEN** prices are being fetched
- **THEN** the hook reports a loading state

#### Scenario: Error state
- **WHEN** the fetch fails and no cache is available
- **THEN** the hook reports an error state

### Requirement: Interactive price chart
The system SHALL render an ECharts line chart with: log/linear Y-axis toggle, slider-based zoom for the time (X) axis, auto-scaling Y axis adapting to visible data, drag-to-pan when zoomed, crosshair tooltip, and a reset-zoom button. Mouse-wheel and pinch-to-zoom SHALL NOT be used.

#### Scenario: Zoom via time slider
- **WHEN** the user adjusts the time-axis zoom slider
- **THEN** the visible time window changes and the Y axis rescales to the visible data

#### Scenario: Pan when zoomed
- **WHEN** the chart is zoomed and the user drags on the chart area
- **THEN** the view pans across the time axis

#### Scenario: Reset zoom
- **WHEN** the user activates the reset-zoom control
- **THEN** the chart returns to the full historic range

### Requirement: Mobile-first chart layout
The system SHALL adapt the chart to screen width with simplified labels and touch-friendly controls, with no horizontal scrolling at 375px.

#### Scenario: Phone-sized chart
- **WHEN** the chart renders at 375px viewport width
- **THEN** labels are simplified and all controls remain usable without horizontal scrolling

### Requirement: Data pipeline tests
The system SHALL include Rust serde tests for `PricePoint` and Vitest tests for the API client, cache layer, hook, and chart component.

#### Scenario: All price data tests pass
- **WHEN** the test suites are run
- **THEN** all historic-price-data tests pass without failure
