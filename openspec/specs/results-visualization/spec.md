# Results Visualization Specification

## Purpose

Visual presentation of the retirement-plan Monte Carlo results: fan charts for percentile bands, a year-by-year distribution table, and educational tooltips on the new result elements.

## Requirements

### Requirement: Monte Carlo fan charts
The system SHALL render the Monte Carlo percentile series as fan charts in the plan results, one chart at a time with a metric selector offering three metrics: BTC holdings, annual spend, and cash-buffer years. Each chart SHALL draw the p10–p90 band as the outermost filled band, the p25–p75 band as the inner filled band, and the p50 line, using the stacked-area technique already used for model bands. Every series SHALL be derived strictly from `MonteCarloResult.percentiles`. The fan-chart section SHALL render only when the Monte Carlo result is present and the retirement horizon is non-zero, and SHALL appear below the summary and forensics sections and above the price-path strip and single-path detail.

#### Scenario: Band structure per metric
- **WHEN** the user selects any of the three metrics
- **THEN** the chart renders p10–p90, p25–p75, and p50 series for that metric across all simulated years

#### Scenario: Series derived from the percentile series
- **WHEN** the fan chart renders
- **THEN** every plotted value comes from the corresponding field of `YearPercentiles` (p10/p25/p50/p75/p90, spendP10…, or bufferYearsP10…)

#### Scenario: Metric toggle switches series
- **WHEN** the user activates the BTC holdings, annual spend, or cash-buffer years option
- **THEN** the chart re-renders with that metric's bands, the active option is visibly selected, and the toggle is usable at 375px viewport width without horizontal scrolling

#### Scenario: Section order
- **WHEN** the plan results render with a valid Monte Carlo run
- **THEN** the fan-chart section appears after the summary and forensics sections and before the price-path strip

#### Scenario: Zero horizon hides fan charts
- **WHEN** the retirement horizon is zero years
- **THEN** the fan-chart section is not rendered

### Requirement: Fan chart responsiveness and theming
The system SHALL render fan charts in containers that adapt axis density and legend placement to the available width: on viewports below 640px the x-axis SHALL show fewer tick labels (no more than one label per 10 years of horizon) and the legend SHALL sit above the chart; at 640px and wider the x-axis MAY show denser labels and the legend SHALL sit above or to the side of the plot. Charts SHALL use the app's light/dark theme tokens and SHALL not cause horizontal scrolling at 375px.

#### Scenario: Mobile axis density
- **WHEN** the fan chart renders below 640px viewport width
- **THEN** no more than one x-axis tick label appears per 10 years of simulated horizon

#### Scenario: Legend placement
- **WHEN** the fan chart renders below 640px viewport width
- **THEN** the legend appears above the plot area

#### Scenario: Theme tokens
- **WHEN** the app theme is light or dark
- **THEN** the fan chart's axis text, grid lines, and band colors use the active theme's CSS custom properties or theme-derived values

#### Scenario: No horizontal scroll
- **WHEN** the fan chart renders at 375px viewport width
- **THEN** the chart fits the container without horizontal scrolling

### Requirement: Year-by-year distribution table
The system SHALL render a year-by-year table of the Monte Carlo distribution, with one row per simulated year and columns for the median BTC holdings, the p10–p90 BTC range, the median annual spend, the median cash-buffer years, and the survival share. All values SHALL come from `MonteCarloResult.percentiles` and `MonteCarloResult.forensics.survivalByYear`. On viewports below 640px the table SHALL render as a card layout (one card per year); at 640px and wider it SHALL render as a table. Both forms SHALL be usable at 375px without horizontal scrolling.

#### Scenario: Row count
- **WHEN** the distribution table renders with a valid run
- **THEN** it has one row (or card) per simulated year

#### Scenario: Column values come from the run
- **WHEN** a row for year Y renders
- **THEN** its median BTC, BTC range, median spend, and median buffer years come from `percentiles` for Y, and its survival share comes from `survivalByYear` for Y

#### Scenario: Card layout on mobile
- **WHEN** the viewport is below 640px
- **THEN** the distribution renders as per-year cards and the table element is hidden

#### Scenario: Table layout at desktop
- **WHEN** the viewport is 640px or wider
- **THEN** the distribution renders as a table with a column header row and the card layout is hidden

#### Scenario: Zero horizon hides the table
- **WHEN** the retirement horizon is zero years
- **THEN** the distribution table section is not rendered

### Requirement: Educational tooltips on new result elements
The system SHALL attach the reusable info button to the fan-chart metric toggle (explaining what percentile bands mean) and to every distribution-table column header (median BTC, p10–p90 range, median spend, median buffer years, survival share). Every tooltip SHALL carry non-empty explanation text from `content/info.ts`, an accessible name referencing its element, and a 44px minimum touch target, consistent with the existing `InfoButton` component.

#### Scenario: Fan chart toggle explanation
- **WHEN** the fan-chart section renders
- **THEN** the metric toggle carries an info button whose panel explains percentile bands in plain language

#### Scenario: Column header coverage
- **WHEN** the distribution table renders in table form
- **THEN** every column header has an info button with non-empty explanation text

#### Scenario: Card coverage
- **WHEN** the distribution renders as cards below 640px
- **THEN** each value label on a card carries or shares an info button with non-empty explanation text
