# Withdrawal Policy Specification

## Purpose

The unified withdrawal policy — one serializable policy definition (preset id + knob values) that expresses Classic FIRE, Fixed %, Guardrails, and Valuation-based withdrawal strategies as presets over a shared knob set, a deterministic engine that steps the policy year by year (or month by month) against a price projection, and the Withdrawal tab UI that collects it. The policy is the core evaluated by both the planner and the future "Today" advisor.

## Requirements

### Requirement: Policy definition
The system SHALL define a withdrawal policy as a preset identifier plus a set of knobs: anchor (`% of initial`, `% of current`, or fixed USD per year), rate percentage or annual spend, payout frequency (monthly, quarterly, yearly), review cadence (once, yearly, monthly), guardrails (off or on with ceiling threshold, floor threshold, adjustment size, and prosperity rule), cash buffer (off or on with target years), and valuation (off or on with indicator, phase thresholds, per-phase surplus rates, buffer target range, safety-valve threshold, and onboarding mode). Every knob SHALL have a default value and minimum/maximum bounds.

#### Scenario: Knob bounds
- **WHEN** a knob value is committed (via UI or restored storage)
- **THEN** it is clamped to the bounds: rate 0–20%, adjustment size 1–50%, guardrail thresholds 0–100%, buffer target 0–10 years

#### Scenario: Complete policy serializes
- **WHEN** a policy is serialized to storage or sent across the WASM boundary
- **THEN** it round-trips with every knob value preserved

### Requirement: Presets as named starting points
The system SHALL provide five presets — Classic FIRE, Fixed %, Guardrails, Valuation-based, and Custom — each constructed from the knob set with documented defaults. Selecting a preset SHALL prefill all knobs. Editing any knob after selection SHALL mark the preset label as modified without changing its identity.

#### Scenario: Preset defaults
- **WHEN** Classic FIRE is selected
- **THEN** knobs are anchor `% of initial`, rate 4.0%, payout yearly, review once, guardrails off, buffer off, valuation off

#### Scenario: Fixed % preset excludes inflation
- **WHEN** Fixed % is selected
- **THEN** anchor is `% of current`, rate 4.0%, review yearly, and the inflation-referencing behavior does not apply to the withdrawal amount

#### Scenario: Guardrails preset
- **WHEN** Guardrails is selected
- **THEN** knobs are anchor `% of initial`, rate 4.0%, review yearly, guardrails on with ceiling +20%, floor −20%, adjustment 10%, prosperity rule on

#### Scenario: Valuation-based preset
- **WHEN** Valuation-based is selected
- **THEN** knobs are anchor fixed spend (the desired annual spend), payout monthly, valuation on with Power Law quantile indicator, fair phase between 50th and 85th percentile, euphoria surplus 8% annualized, buffer target 2–4 years, safety valve above the median, onboarding deferred to first euphoria

#### Scenario: Dirty preset marker
- **WHEN** the user edits a knob after selecting a preset
- **THEN** the preset label shows a modification marker and the stored policy keeps the preset identifier

### Requirement: Anchor math
The system SHALL compute the base withdrawal amount from the anchor. For `% of initial`, the amount SHALL be the rate times the portfolio value at retirement, set once and re-derived only by inflation or guardrails. For `% of current`, the amount SHALL be the rate times the portfolio value at the start of each review period. For fixed USD, the amount SHALL be the configured spend, and the engine SHALL derive an effective initial rate from the retirement-day price for guardrail comparisons.

#### Scenario: Initial anchor set once
- **WHEN** the anchor is `% of initial` at 4% on a 100,000 USD stack at retirement
- **THEN** the base spend is 4,000 USD in the first year regardless of later price moves (before inflation or guardrails)

#### Scenario: Current anchor re-derives
- **WHEN** the anchor is `% of current` at 4% and the stack halves then doubles across two reviews
- **THEN** the spend follows the stack value at each review, not the initial value

#### Scenario: Fixed USD derives rate per path
- **WHEN** the anchor is a fixed 24,000 USD spend and the retirement-day price differs between simulation paths
- **THEN** each path derives its own effective initial rate used for guardrail comparisons

### Requirement: Inflation referencing
The system SHALL apply the simulation-level inflation rate to amount-based spending (any anchor other than `% of current`) and to the absolute spend floor, compounding yearly. `% of current` spending SHALL be computed purely in BTC terms without inflation.

#### Scenario: Amount-based spend rises with inflation
- **WHEN** base spend is 24,000 USD and inflation is 3%
- **THEN** year-2 spend is 24,720 USD before any guardrail adjustment

#### Scenario: Spend floor rises with inflation
- **WHEN** the absolute spend floor is 20,000 USD and inflation is 3%
- **THEN** the enforced floor in year 2 is 20,600 USD

#### Scenario: Percentage-of-current ignores inflation
- **WHEN** the anchor is `% of current` and inflation is set to 3%
- **THEN** the sold amount equals the rate times the current stack in BTC, unaffected by the inflation parameter

### Requirement: Payout and review cadence
The system SHALL distinguish payout frequency (how often value is withdrawn) from review cadence (how often policy rules re-run). Payouts SHALL quantize onto the engine's step grid, splitting the period amount evenly when the payout frequency is finer than the step. A review cadence of once SHALL disable all periodic rule re-runs.

#### Scenario: Monthly payout on a yearly step
- **WHEN** payout is monthly and the engine steps yearly
- **THEN** each year's spend is split into twelve equal monthly amounts for reporting purposes

#### Scenario: Review once disables guardrails
- **WHEN** review cadence is once and guardrails are on
- **THEN** no guardrail adjustment ever fires after the initial amount is set

### Requirement: Guardrails
The system SHALL implement Guyton-Klinger-style guardrails at each review: when the current withdrawal rate exceeds the effective initial rate multiplied by (1 + ceiling threshold), spending SHALL be cut by the adjustment size; when it falls below the initial rate multiplied by (1 − floor threshold), spending SHALL be raised by the adjustment size, only if the prosperity rule is off or the portfolio value exceeds its inflation-adjusted starting value. No cut SHALL take spending below the inflation-adjusted absolute spend floor.

#### Scenario: Ceiling cut triggers
- **WHEN** the effective initial rate is 4%, ceiling threshold 20%, adjustment 10%, and the current rate exceeds 4.8%
- **THEN** the next year's spend is reduced by 10%

#### Scenario: Floor raise blocked by prosperity rule
- **WHEN** the current rate falls below 3.2% but the portfolio is below its inflation-adjusted starting value and the prosperity rule is on
- **THEN** no raise occurs

#### Scenario: Cut respects the spend floor
- **WHEN** a 10% cut would bring spending below the inflation-adjusted floor
- **THEN** spending is set to the floor instead

### Requirement: Valuation state machine
The system SHALL support a valuation-driven policy: each month, a phase (bear, fair, euphoria) is computed from the chosen indicator. The base drip SHALL always be sold. An additional surplus sale equal to the phase's surplus rate SHALL occur in fair and euphoria phases. Buffer behavior SHALL follow the phase: frozen in bear, refilled with surplus in fair, recharged toward the upper buffer target in euphoria. A safety valve SHALL recharge one year of expenses when the buffer is below one year and the indicator is above its safety threshold.

#### Scenario: Phase determination by Power Law quantile
- **WHEN** the indicator is Power Law quantile and the price is above the 85th percentile
- **THEN** the phase is euphoria

#### Scenario: Bear phase freezes the buffer
- **WHEN** the phase is bear
- **THEN** no surplus BTC is sold to refill the buffer

#### Scenario: Euphoria recharges the buffer
- **WHEN** the phase is euphoria and the buffer is below the upper target
- **THEN** surplus sales occur until the buffer reaches the upper target

#### Scenario: Safety valve fires
- **WHEN** the buffer falls below one year of expenses and the indicator is above its safety threshold in a non-euphoria phase
- **THEN** a sale sufficient for one year of expenses recharges the buffer

### Requirement: Deferred buffer onboarding
The system SHALL support an onboarding mode in which, at retirement, the buffer is not pre-filled by a lump-sum sale; instead the base drip is sold monthly until the first euphoria phase, at which point the buffer is built.

#### Scenario: Bear-phase retirement start
- **WHEN** onboarding is deferred and retirement starts in a bear phase
- **THEN** only the monthly drip is sold until the first euphoria phase, and no lump-sum buffer sale occurs at day one

### Requirement: Deterministic engine and results
The system SHALL provide a deterministic engine that steps a policy across the retirement horizon against a price projection and returns year-by-year results including year, BTC balance, cash or buffer, spend, and sold BTC. The engine SHALL accept an optional starting `RuntimeState` (year, BTC, cash, buffer years, deferred-buffer flag) and, when provided, begin the simulation from that state instead of the retirement-day default. When stepping monthly under a yearly price projection, prices SHALL be interpolated geometrically between adjacent yearly points.

#### Scenario: Deterministic output
- **WHEN** the same policy, parameters, and price projection are simulated twice
- **THEN** the returned year-by-year results are identical

#### Scenario: Depletion
- **WHEN** the stack reaches zero before the end of the horizon
- **THEN** subsequent years report zero spend and zero balances without error

#### Scenario: Interpolation between yearly points
- **WHEN** the engine steps monthly under yearly model points
- **THEN** month prices lie geometrically between the enclosing yearly prices

#### Scenario: Default start state
- **WHEN** no starting state is provided
- **THEN** the simulation initializes from the configured holdings, zero cash, and the retirement year

#### Scenario: Resume from arbitrary state
- **WHEN** a starting state of 0.5 BTC, 20,000 USD cash, and a deferred buffer at a given year is provided
- **THEN** the first simulated year reflects that BTC, cash, and buffer configuration

#### Scenario: Resume from arbitrary state is deterministic
- **WHEN** the same starting state, policy, parameters, and price projection are simulated twice
- **THEN** the returned year-by-year results are identical

### Requirement: Band-path simulation
The system SHALL run the withdrawal policy over a selected model's band paths — median, ±1σ, ±2σ, and percentile bands where the model emits them — as separate deterministic runs. Each run SHALL compute the market phase from the path price's quantile inside the model's distribution. Every model SHALL emit at least 1σ and 2σ bands so that bear, fair, and euphoria phases are reachable at the default thresholds. A band path SHALL be identified by a stable id and label.

#### Scenario: Band-path phases differ from the median
- **WHEN** the plan simulates the +2σ path of any model
- **THEN** the path's phases include euphoria, while the median path reports fair throughout

#### Scenario: Bear phase on the low band
- **WHEN** the plan simulates the −1σ path
- **THEN** the path's phases include bear

#### Scenario: Band-path enumeration is deterministic
- **WHEN** the same policy, parameters, and model points are simulated twice
- **THEN** the set of band-path runs and their results are identical

#### Scenario: Path tiles are named by direction
- **WHEN** the path strip renders
- **THEN** the tiles use directional names — Medium, Bearish, Bullish (Deep bear and Deep bull for 2σ) — with the band descriptor (fair, −1σ, +1σ, −2σ, +2σ) on the second line and the path outcome on the third

#### Scenario: Missing path price falls back to the median
- **WHEN** a model point carries no path price
- **THEN** the run uses the model median as the path price

### Requirement: Single plan model
The system SHALL drive the withdrawal plan from exactly one selected price model at a time. The plan results SHALL label the driving model ("Price model used") and offer the selection there, among the currently visible models, defaulting to the first visible one and falling back to the first visible when the selected model is hidden. The chart MAY overlay multiple models independently of the plan model.

#### Scenario: Default plan model
- **WHEN** models become visible and none is selected
- **THEN** the plan runs against the first visible model

#### Scenario: Model selector labeled in the results
- **WHEN** the plan renders with more than one visible model
- **THEN** the results section shows a "Price model used" selector listing the visible models

#### Scenario: Selected model hidden
- **WHEN** the plan model is hidden in the price model tab
- **THEN** the plan falls back to the first remaining visible model

#### Scenario: Path selection
- **WHEN** the user picks a band path in the Plan card
- **THEN** the year-by-year results for that path are rendered, and a summary strip shows each path's outcome

### Requirement: Policy persistence
The system SHALL persist the withdrawal policy to localStorage under a versioned key and restore it on load, clamping invalid values and falling back to the Classic FIRE preset on corrupt or unknown-version data.

#### Scenario: Policy restored across sessions
- **WHEN** the user changes the policy, closes the tab, and reopens the app
- **THEN** the Withdrawal tab displays the previously saved policy

#### Scenario: Corrupt policy data
- **WHEN** the stored policy JSON is missing, unparsable, or has an unknown version
- **THEN** the app falls back to the Classic FIRE preset without crashing

### Requirement: Withdrawal tab UI
The system SHALL render a Withdrawal tab in the tabbed control card showing the preset selector and the knobs applicable to the current policy. Knobs that do not apply SHALL be hidden: inflation-referencing knobs for `% of current`, guardrail knobs when guardrails are off, valuation knobs when valuation is off, buffer refill knobs when the buffer is off. The tab SHALL remain usable at 375px viewport width with minimum 44px touch targets.

#### Scenario: Preset selection prefills knobs
- **WHEN** the user selects the Guardrails preset
- **THEN** the visible knobs update to the Guardrails defaults and the guardrail knobs become visible

#### Scenario: Inapplicable knobs hidden
- **WHEN** guardrails are off
- **THEN** ceiling, floor, adjustment, and prosperity knobs are not rendered

#### Scenario: Mobile usability
- **WHEN** the Withdrawal tab renders at 375px width
- **THEN** all controls fit without horizontal scrolling and every interactive element has at least a 44px touch target
