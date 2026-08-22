# Withdrawal Policy Delta

## MODIFIED Requirements

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
