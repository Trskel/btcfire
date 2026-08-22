# Delta Spec: sim-parameters

## MODIFIED Requirements

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

### Requirement: Responsive panel layout
The system SHALL render the parameter panel inside a tabbed control card below the chart on all viewports. The card SHALL expose three tabs: Scenario (the parameter panel), Price model (model selection and controls), and Withdrawal (withdrawal policy). The chart SHALL render above the control card at every viewport width; there is no sidebar.

#### Scenario: Chart first on mobile
- **WHEN** the viewport is narrower than 1024px
- **THEN** the chart appears above the tabbed control card, and the panel is reachable without horizontal scrolling

#### Scenario: Same structure on desktop
- **WHEN** the viewport is 1024px or wider
- **THEN** the chart and the tabbed control card use the same vertical arrangement as mobile, with the Scenario tab hosting the parameter panel

#### Scenario: Tab switching
- **WHEN** the user selects a tab in the control card
- **THEN** only that tab's controls are rendered, and the previously selected tab's content is unmounted
