# Info Buttons Specification

## Purpose

In-place educational explanations for existing UI elements. A reusable info button (ⓘ) attached to the labels of simulation parameters, price-model controls, withdrawal-policy knobs, and result metrics, revealing plain-language explanations that state assumptions and uncertainty without prescribing financial advice.

## Requirements

### Requirement: Reusable info button component
The system SHALL provide a reusable info button component that renders a small icon button adjacent to a UI element's label and reveals an explanation panel when activated. The button SHALL have a minimum 44px touch target, a programmatically accessible name identifying the associated element, and a visible info icon.

#### Scenario: Info button renders beside a label
- **WHEN** an info button is attached to a labeled UI element
- **THEN** the button appears immediately beside the element's label and exposes an accessible name that references that element (e.g., "About Initial BTC holdings")

#### Scenario: Touch target size
- **WHEN** the info button is rendered on any screen size
- **THEN** its interactive area is at least 44×44 CSS pixels

#### Scenario: Activation reveals explanation
- **WHEN** the user taps or clicks the info button
- **THEN** an explanation panel appears showing the element's description text and the button state reflects that it is open

#### Scenario: Dismissal
- **WHEN** the explanation panel is open and the user taps the button again, taps outside the panel, or presses Escape
- **THEN** the panel closes, and when closed via Escape or the button, focus returns to the info button

### Requirement: Coverage of existing elements
The system SHALL attach info buttons with non-empty explanation text to every labeled element in the parameter panel, each price model's controls, the model selector entries, the withdrawal policy tab, and the withdrawal results summary.

#### Scenario: Parameter panel coverage
- **WHEN** the parameter panel renders any of its seven fields (initial BTC holdings, retirement start year, current age, expected lifespan, minimum annual spending, desired annual spending, annual inflation rate)
- **THEN** each field's label is accompanied by an info button with explanation text

#### Scenario: Price model control coverage
- **WHEN** the user expands Power Law, Stock-to-Flow, or Bitcoin24 controls in the model selector
- **THEN** every labeled control (e.g., formulation, confidence band, custom parameters, percentile inputs) is accompanied by an info button, and each model's selector row shows an info button describing the model itself

#### Scenario: Withdrawal policy coverage
- **WHEN** the withdrawal tab renders its sections (anchor, rate/spend, payout frequency, review cadence, guardrails, cash buffer, valuation-based selling)
- **THEN** every labeled knob (including thresholds, surplus levels, safety valve, and onboarding) is accompanied by an info button with explanation text

#### Scenario: Results coverage
- **WHEN** withdrawal results render (success probability, path statistics, phase labels)
- **THEN** each metric heading is accompanied by an info button with explanation text

### Requirement: Explanation content standards
Explanation text SHALL be written in plain language for a non-expert, SHALL state model assumptions and uncertainty where applicable, SHALL be no more than four sentences per element, and SHALL NOT present financial advice.

#### Scenario: Assumptions are disclosed
- **WHEN** an explanation describes a model-derived value (e.g., confidence band, R², surplus level)
- **THEN** the text names the assumption behind it and notes that past fit does not guarantee future accuracy where relevant

#### Scenario: No financial advice
- **WHEN** any explanation is displayed
- **THEN** the text contains no instruction to buy, sell, hold, or withdraw specific amounts, and includes no personalized recommendation

### Requirement: Interaction integrity
Info buttons SHALL NOT alter or block the underlying control's behavior, SHALL not trigger the control's change handlers, and SHALL not cause horizontal scrolling or layout shift at 375px viewport width.

#### Scenario: Opening an explanation does not change values
- **WHEN** the user opens or closes an explanation next to an input or select
- **THEN** the control's value is unchanged and no simulation or model recomputation is triggered by the button itself

#### Scenario: Mobile layout integrity
- **WHEN** the app renders at 375px viewport width with info buttons present
- **THEN** no horizontal scrolling occurs and all buttons remain aligned with their labels
