# Simulation Parameters Specification

## Purpose

The retirement scenario parameters a user provides — BTC holdings, retirement timing, lifespan, bare minimum annual fiat spending, desired annual fiat spending — and the responsive parameter panel that collects them, with persistence across sessions.

## ADDED Requirements

### Requirement: Parameter set
The system SHALL define a simulation parameter set with five fields: initial BTC holdings, retirement start year, current age, expected lifespan, and bare minimum and desired annual spending in fiat. Each field SHALL have a default value, a minimum and maximum bound. The BTC holdings field SHALL support up to 8 decimal places, displayed with trailing zeroes cropped, and a maximum of 21,000,000.

#### Scenario: Default parameter set
- **WHEN** the app loads with no saved parameters
- **THEN** the parameter panel shows defaults of 1 BTC holdings, retirement start year = current year + 10, current age 35, lifespan 90, and annual spending 50,000

#### Scenario: Out-of-bounds values rejected
- **WHEN** a value outside a field's bounds is supplied (via input or restored storage)
- **THEN** the value is clamped to the nearest valid bound and the panel displays the clamped value

#### Scenario: BTC amount precision
- **WHEN** a BTC holdings value is displayed
- **THEN** it shows at most 8 decimal places with trailing zeroes cropped

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

### Requirement: Responsive panel layout
The system SHALL render the parameter panel full-width and stacked above the results area on mobile viewports, and as a fixed-width sidebar beside the results on desktop viewports.

#### Scenario: Mobile layout
- **WHEN** the viewport is narrower than 1024px
- **THEN** the panel spans the content width and appears above the results area

#### Scenario: Desktop layout
- **WHEN** the viewport is 1024px or wider
- **THEN** the panel renders as a sidebar with a fixed width beside the results area and remains visible while results scroll

### Requirement: Touch-friendly controls
The system SHALL size all interactive elements in the parameter panel (text inputs, labels) with a minimum touch target of 44px in height and SHALL not scroll horizontally at 375px viewport width.

#### Scenario: Touch target sizing
- **WHEN** the panel is rendered on a touch device at 375px width
- **THEN** every input has a tappable area of at least 44px height and the page does not scroll horizontally
