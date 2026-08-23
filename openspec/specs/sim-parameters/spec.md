# Simulation Parameters Specification

## Purpose

The retirement scenario parameters a user provides — BTC holdings, retirement timing, lifespan, bare minimum annual fiat spending, desired annual fiat spending — and the responsive parameter panel that collects them, with persistence across sessions.

## Requirements

### Requirement: Parameter set
The system SHALL define a simulation parameter set with seven fields: initial BTC holdings, retirement start year, current age, expected lifespan, bare minimum and desired annual spending in fiat, and an annual inflation rate. Each field SHALL have a default value, a minimum and maximum bound. The BTC holdings field SHALL support up to 8 decimal places, displayed with trailing zeroes cropped, and a maximum of 21,000,000.

#### Scenario: Default parameter set
- **WHEN** the app loads with no saved parameters
- **THEN** the parameter panel shows defaults of 1 BTC holdings, retirement start year = current year, current age 35, lifespan 90, minimum annual spending 20,000, desired annual spending 50,000, and inflation rate 3.0%

#### Scenario: Parameter bounds
- **WHEN** any parameter value is committed
- **THEN** values are constrained to the bounds: BTC holdings 0–21,000,000, retirement start year current year–current year + 100, current age 1–100, lifespan 50–120, minimum annual spending 0–250,000, desired annual spending 0–10,000,000, inflation rate 0–10%

#### Scenario: Out-of-bounds values rejected
- **WHEN** a value outside a field's bounds is supplied (via input or restored storage)
- **THEN** the value is clamped to the nearest valid bound and the panel displays the clamped value

#### Scenario: BTC amount precision
- **WHEN** a BTC holdings value is displayed
- **THEN** it shows at most 8 decimal places with trailing zeroes cropped

#### Scenario: Stored parameters missing inflation rate
- **WHEN** previously stored parameters lack an inflation rate field (pre-existing storage)
- **THEN** the app restores the default 3.0% without discarding the other stored values

### Requirement: Parameter input panel UI
The system SHALL render a panel with one numeric input per parameter. Committed values SHALL be validated against each field's bounds.

#### Scenario: Number entry commits value
- **WHEN** the user types a value into a numeric input and commits it (change or blur)
- **THEN** the value is validated against bounds; invalid text reverts to the last valid value on blur

### Requirement: Persistence to localStorage
The system SHALL persist the parameter set to localStorage under a versioned key and restore it when the app loads.

#### Scenario: Parameters restored across sessions
- **WHEN** the user changes parameters, closes the tab, and reopens the app
- **THEN** the panel displays the previously saved values

#### Scenario: Corrupt or missing storage
- **WHEN** the stored JSON is missing, unparsable, or has an unknown version
- **THEN** the app falls back to default parameter values without crashing

### Requirement: Scenario tab reset
The Scenario tab SHALL render a Reset button that restores the full parameter set to its documented defaults (1 BTC holdings, retirement start year = current year, current age 35, lifespan 90, minimum annual spending 20,000, desired annual spending 50,000, inflation rate 3.0%) and the projection horizon to 30 years. It SHALL also clear the persisted parameter set from localStorage so a reload starts from defaults.

#### Scenario: Reset restores default parameters and horizon
- **WHEN** the user edits simulation parameters and the projection horizon, then clicks Reset in the Scenario tab
- **THEN** every parameter field shows its default value and the projection horizon shows 30 years

#### Scenario: Reset discards in-progress text edits
- **WHEN** the user has typed a value into a parameter field without blurring it, then clicks Reset in the Scenario tab
- **THEN** the field shows the default value rather than the uncommitted text

#### Scenario: Reset clears persisted parameters
- **WHEN** the user clicks Reset in the Scenario tab and reloads the app
- **THEN** the parameter panel shows the default parameter set rather than the previously customized values

### Requirement: Responsive panel layout
The system SHALL render the parameter panel inside a collapsible tabbed control card below the chart on all viewports. The card SHALL expose three tabs: Price model (model selection and controls), Scenario (the parameter panel and the projection horizon), and Withdrawal (withdrawal policy). The chart SHALL render above the control card at every viewport width; there is no sidebar. The plan results SHALL render below the control card.

#### Scenario: Chart first on mobile
- **WHEN** the viewport is narrower than 1024px
- **THEN** the chart appears above the tabbed control card, and the panel is reachable without horizontal scrolling

#### Scenario: Projection horizon in the Scenario tab
- **WHEN** the Scenario tab renders
- **THEN** the projection horizon control is the first control in the tab, above the parameter panel

#### Scenario: Same structure on desktop
- **WHEN** the viewport is 1024px or wider
- **THEN** the chart and the tabbed control card use the same vertical arrangement as mobile, with the Scenario tab hosting the parameter panel

#### Scenario: Tab switching
- **WHEN** the user selects a tab in the control card
- **THEN** only that tab's controls are rendered, and the previously selected tab's content is unmounted

#### Scenario: Results below the configuration
- **WHEN** the plan has results
- **THEN** the results card renders below the control card at every viewport width

### Requirement: Collapsible control card
The control card SHALL collapse and expand via a toggle in its header. When collapsed, no tab panel content SHALL render; when expanded, the previously active tab SHALL be shown again.

#### Scenario: Collapse hides the controls
- **WHEN** the user clicks the collapse toggle
- **THEN** the tab panels disappear and the chart remains visible

#### Scenario: Expand restores the active tab
- **WHEN** the user re-expands the control card
- **THEN** the previously active tab's content is rendered again

### Requirement: Touch-friendly controls
The system SHALL size all interactive elements in the parameter panel (text inputs, labels) with a minimum touch target of 44px in height and SHALL not scroll horizontally at 375px viewport width.

#### Scenario: Touch target sizing
- **WHEN** the panel is rendered on a touch device at 375px width
- **THEN** every input has a tappable area of at least 44px height and the page does not scroll horizontally
