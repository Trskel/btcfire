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

#### Scenario: Forensics are reproducible
- **WHEN** the same policy, parameters, model points, and seed are simulated twice
- **THEN** the returned failure forensics, legacy stats, and phase-time stats are identical

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

### Requirement: Failure event model
The system SHALL track, per simulated path, a failure event consisting of a year and a mode. A path in the depleted mode SHALL fail in the first year it reports zero BTC remaining and zero BTC sold. A path in the below-minimum mode SHALL fail in the first year its spending falls below the inflation-adjusted minimum spend floor (within a relative tolerance of 1e-9). A path that never fails SHALL have no failure event. Failure-event modes SHALL be consistent with the existing outcome classification: any path that depletes in any year is depleted, otherwise a path that spends below the floor in any year is below-minimum, and all remaining paths are success.

#### Scenario: Depleted path fails at its depletion year
- **WHEN** a path depletes in year Y and never spent below the floor before Y
- **THEN** its failure event is year Y in the depleted mode

#### Scenario: Below-minimum path fails at its first below-floor year
- **WHEN** a path never depletes but first spends below the floor in year Y
- **THEN** its failure event is year Y in the below-minimum mode

#### Scenario: Success path has no failure event
- **WHEN** a path never depletes and never spends below the floor
- **THEN** the path records no failure event

#### Scenario: Failure modes match the outcome classification
- **WHEN** a Monte Carlo run completes
- **THEN** the number of depleted-mode failure events equals the run-out count, the number of below-minimum-mode events equals the below-minimum count, and paths without events equal the success count

#### Scenario: Zero floor limits failure to depletion
- **WHEN** the minimum spend floor is zero
- **THEN** every failure event is in the depleted mode

### Requirement: Failure forensics
The system SHALL aggregate per-path failure events into a forensics block: survival-by-year (the share of paths whose failure year is after that year, per simulated year), a failure-year histogram by mode, the median failure year across failing paths (null when no path fails), and shortfall statistics — for each failing path the maximum over all years of max(0, inflation-adjusted floor − spend), reported as the median and p90 across failing paths (null when no path fails).

#### Scenario: Survival curve bounds
- **WHEN** a Monte Carlo run completes with at least one failure
- **THEN** survival is 100% at the first simulated year and equals the success percentage at the last simulated year

#### Scenario: Survival stays full without failures
- **WHEN** every path is success
- **THEN** survival is 100% every year, the median failure year is null, and the shortfall statistics are null

#### Scenario: Immediate failure
- **WHEN** every path fails in the first simulated year
- **THEN** survival drops to 0 from the first year and the median failure year equals the first simulated year

#### Scenario: Histogram partitions failures by mode
- **WHEN** a Monte Carlo run completes
- **THEN** the sum of histogram counts equals the number of failing paths, split between the depleted and below-minimum modes

#### Scenario: Shortfall is non-negative
- **WHEN** a Monte Carlo run computes shortfall statistics
- **THEN** the median and p90 shortfall values are greater than or equal to zero

#### Scenario: Zero-year horizon
- **WHEN** the retirement horizon is zero years
- **THEN** survival and the histogram are empty, and the median failure year and shortfall statistics are null

### Requirement: Legacy outcome stats
The system SHALL return final-BTC statistics: the 10th, 50th, and 90th percentiles of the final-year BTC balance across all paths, plus the median final-year BTC across success paths only (null when there are no success paths).

#### Scenario: Ordered final percentiles
- **WHEN** a Monte Carlo run returns legacy stats
- **THEN** p10 ≤ p50 ≤ p90

#### Scenario: All depleted
- **WHEN** every path depletes
- **THEN** the final percentiles are zero and the success median is null

#### Scenario: Success median absent without successes
- **WHEN** no path is success
- **THEN** the success-path median is null

#### Scenario: Final stats match the percentile series tail
- **WHEN** a Monte Carlo run completes with a non-zero horizon
- **THEN** the all-path final percentiles equal the last year's BTC percentiles in the percentile series

### Requirement: Phase-time stats
The system SHALL return the share of simulated years whose year-end phase is bear, fair, or euphoria, across all paths. The phase-time block SHALL be present only when the withdrawal policy runs the monthly engine with valuation enabled (year-end phases are reported); otherwise it SHALL be null.

#### Scenario: Shares sum to 100
- **WHEN** the policy runs with valuation enabled
- **THEN** the bear, fair, and euphoria shares sum to 100.0

#### Scenario: Absent for yearly policies
- **WHEN** the policy runs without valuation
- **THEN** the phase-time block is null

#### Scenario: Zero-year horizon
- **WHEN** the retirement horizon is zero years
- **THEN** the phase-time block is null

### Requirement: Percentile series
The system SHALL return, per simulated year, the 10th, 25th, 50th, 75th, and 90th percentiles of remaining BTC holdings, annual spend, and cash-buffer years across all paths, for later visualization (Phase 10).

#### Scenario: Percentiles ordered
- **WHEN** a Monte Carlo run returns its percentile series
- **THEN** for every year, p10 ≤ p25 ≤ p50 ≤ p75 ≤ p90 for each of BTC, spend, and buffer years

#### Scenario: Percentiles track the median
- **WHEN** every sampled path equals the median path
- **THEN** all five percentiles equal the median path's BTC balance, spend, and buffer years each year

### Requirement: WASM boundary
The system SHALL expose a single `run_monte_carlo` WASM function taking the withdrawal policy, simulation parameters, model points, and a seed, returning the outcome summary, percentile series, failure forensics, legacy stats, and phase-time stats serialized in camelCase. The web app SHALL invoke it asynchronously and reuse the existing WASM loading path.

#### Scenario: Single call per run
- **WHEN** the web app runs the plan
- **THEN** one `run_monte_carlo` call produces the entire Monte Carlo result

#### Scenario: Type round-trip
- **WHEN** the result crosses the WASM boundary
- **THEN** every summary metric, percentile value, forensics value, legacy stat, and phase-time share round-trips losslessly to TypeScript

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

### Requirement: Failure forensics results section
The system SHALL render a "Failure forensics" section directly below the Monte Carlo summary tiles. The section SHALL show the survival curve and the failure-year histogram as charts plus the median failure year and the shortfall statistics as labeled values, each with an educational info button, and SHALL also show the legacy final-BTC statistics and the phase-time shares. The failure parts (charts, median failure year, shortfall) SHALL render only when at least one path failed; the legacy and phase-time parts SHALL render whenever the run is valid. The section SHALL not render when the retirement horizon is zero, and SHALL be usable at 375px viewport width without horizontal scrolling.

#### Scenario: Section order
- **WHEN** the plan results render with a valid Monte Carlo run
- **THEN** the forensics section appears below the summary tiles and above the price-path strip

#### Scenario: No failures
- **WHEN** the run has zero failing paths
- **THEN** the charts, median failure year, and shortfall are not rendered, while the legacy and phase-time parts render

#### Scenario: Zero horizon hides the section
- **WHEN** the retirement horizon is zero years
- **THEN** the forensics section is not rendered

#### Scenario: Info buttons
- **WHEN** the forensics section renders
- **THEN** every displayed metric carries an educational info button

#### Scenario: Mobile layout
- **WHEN** the forensics section renders at 375px viewport width
- **THEN** all charts and stats are visible without horizontal scrolling

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

#### Scenario: Zero-year horizon forensics
- **WHEN** the retirement horizon is zero years
- **THEN** the run returns a valid empty result with null forensics, null legacy, and null phase-time stats
