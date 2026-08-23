# Simulation Parameters Specification (Delta)

## ADDED Requirements

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
