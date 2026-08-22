# Monte Carlo Simulation Specification

## Purpose

The Monte Carlo simulation engine: thousands of randomly sampled price paths around the selected price model's projection, each run through the withdrawal engine, classified into retirement outcomes, and aggregated into a four-part outcome summary shown at the beginning of the plan results — % ran out of money, % below minimum spending without running out, % success, and % of years at the desired spending level across successful paths only. All computation is deterministic given its seed and runs client-side in WASM.

## Requirements

### Requirement: Path sampling
The system SHALL sample 10,000 price paths around the selected price model's projection. Each path SHALL start from the retirement year's model point and step yearly: each year's price SHALL be derived from the previous year's price by the model's median log-growth between that year's adjacent model points plus a random normal innovation scaled by the model's dispersion at that year (the same dispersion chain the withdrawal engine uses: 1σ bands, then symmetric percentile bands, then absent). Where a year carries no dispersion, the path price SHALL equal the model median with no randomness. Every sampled price SHALL be strictly positive.

#### Scenario: Run count
- **WHEN** a Monte Carlo run executes
- **THEN** exactly 10,000 paths are simulated

#### Scenario: Randomness only around dispersion
- **WHEN** every projected year lacks band data
- **THEN** all sampled paths equal the model's median path

#### Scenario: Prices stay positive
- **WHEN** a Monte Carlo run executes with any policy and parameters
- **THEN** every sampled path price is greater than zero

### Requirement: Seeded reproducibility
The system SHALL use a fixed seed for its random number generator, producing identical aggregate results for identical policy, parameters, and model points.

#### Scenario: Identical inputs, identical results
- **WHEN** the same policy, parameters, model points, and seed are simulated twice
- **THEN** the returned outcome summary and percentile series are identical

### Requirement: Outcome classification
The system SHALL classify every simulated path into exactly one of three outcomes. A path SHALL be **depleted** when any year reports zero BTC remaining and zero BTC sold. A non-depleted path SHALL be **below-minimum** when any year's spending falls below the inflation-adjusted minimum spend floor (within a relative tolerance of 1e-9). All other paths SHALL be **success** — never depleted and never below the floor. The three counts SHALL sum to the run count.

#### Scenario: Classification partitions the run
- **WHEN** a Monte Carlo run completes
- **THEN** depleted paths + below-minimum paths + success paths equal 10,000

#### Scenario: Depletion takes precedence
- **WHEN** a path depletes after spending below the floor
- **THEN** the path is counted as depleted, not below-minimum

#### Scenario: Below-minimum without depletion
- **WHEN** a path never depletes but spends below the floor in some year
- **THEN** the path is counted as below-minimum

#### Scenario: Success
- **WHEN** a path never depletes and never spends below the floor
- **THEN** the path is counted as success

#### Scenario: Zero minimum spend
- **WHEN** the minimum spend floor is zero
- **THEN** no path is classified below-minimum; every non-depleted path is success

### Requirement: Outcome summary
The system SHALL aggregate each run into four summary metrics: the percentage of paths that ran out of money, the percentage of paths that did not run out but spent below the minimum, the percentage of success paths, and the percentage of year-instances across success paths only in which spending met or exceeded the inflation-adjusted desired annual spend. The first three SHALL sum to 100%. The desired-spend metric SHALL be absent (null) when there are no success paths.

#### Scenario: Percentages sum to 100
- **WHEN** a Monte Carlo run completes with at least one path
- **THEN** run-out % + below-minimum % + success % equals 100.0

#### Scenario: Desired-spend coverage over success paths only
- **WHEN** the summary computes desired-spend coverage
- **THEN** only year-instances from success paths contribute to the fraction

#### Scenario: No success paths
- **WHEN** zero paths are classified success
- **THEN** the desired-spend metric is null and success % is 0.0

#### Scenario: Zero-year horizon
- **WHEN** the retirement horizon is zero years
- **THEN** the run returns a valid empty result (zero paths) without error

### Requirement: Percentile series
The system SHALL return, per simulated year, the 10th, 25th, 50th, 75th, and 90th percentiles of remaining BTC holdings across all paths, for later visualization (Phase 10).

#### Scenario: Percentiles ordered
- **WHEN** a Monte Carlo run returns its percentile series
- **THEN** for every year, p10 ≤ p25 ≤ p50 ≤ p75 ≤ p90

#### Scenario: Percentiles track the median
- **WHEN** every sampled path equals the median path
- **THEN** all five percentiles equal the median path's BTC balance each year

### Requirement: WASM boundary
The system SHALL expose a single `run_monte_carlo` WASM function taking the withdrawal policy, simulation parameters, model points, and a seed, returning the outcome summary and percentile series serialized in camelCase. The web app SHALL invoke it asynchronously and reuse the existing WASM loading path.

#### Scenario: Single call per run
- **WHEN** the web app runs the plan
- **THEN** one `run_monte_carlo` call produces the entire Monte Carlo result

#### Scenario: Type round-trip
- **WHEN** the result crosses the WASM boundary
- **THEN** every summary metric and percentile value round-trips losslessly to TypeScript

### Requirement: Summary at the beginning of results
The system SHALL render the Monte Carlo summary as the first section of the plan results, above the price-path strip and year-by-year detail. It SHALL show the four metrics as labeled percentages — run-out, below-minimum, success, and time at desired spend — with an educational info button per metric, and SHALL display "—" where the desired-spend metric is null. The summary SHALL re-render whenever the plan re-runs, and SHALL not render when the retirement horizon is zero.

#### Scenario: Summary order
- **WHEN** the plan results render with a valid Monte Carlo run
- **THEN** the summary section appears before the band-path strip and yearly detail

#### Scenario: No success paths display
- **WHEN** the run has zero success paths
- **THEN** the desired-spend row shows "—" and the other three rows show their percentages

#### Scenario: Zero horizon hides the summary
- **WHEN** the retirement horizon is zero years
- **THEN** the summary section is not rendered

#### Scenario: Mobile layout
- **WHEN** the summary renders at 375px viewport width
- **THEN** all four rows are visible without horizontal scrolling

### Requirement: Deterministic engine resume from state
The system SHALL allow a Monte Carlo run to start from an arbitrary runtime state (BTC, cash, buffer years, deferred-buffer flag, year) via the withdrawal engine's starting-state parameter. When no starting state is provided, the run SHALL initialize from retirement day as today.

#### Scenario: Default start state
- **WHEN** no starting state is provided
- **THEN** paths begin with the configured holdings, zero cash, and no buffer at the retirement year

#### Scenario: Custom start state
- **WHEN** a starting state of 0.5 BTC and 20,000 USD cash at a given year is provided
- **THEN** each sampled path's first year reflects that BTC and cash balance

### Requirement: Edge-case robustness
The system SHALL handle zero holdings, a single-year horizon, and models without dispersion without error.

#### Scenario: Zero holdings
- **WHEN** holdings are zero
- **THEN** every path is classified depleted and the run completes without error

#### Scenario: Single-year horizon
- **WHEN** the retirement horizon is one year
- **THEN** the run samples 10,000 one-year paths and returns a valid summary and percentile series
