## Why

The Scenario tab collects the retirement parameters and the projection horizon, but once a user edits values there is no way to get back to the baseline plan without manually re-entering every default.

## What Changes

- Add a Reset button to the Scenario tab that restores the full simulation parameter set and the projection horizon to their defaults.
- Reset clears the persisted simulation parameters from localStorage so a reload starts from defaults rather than resurrecting the customized values.
- Reset also clears any in-progress text draft in the parameter inputs so the fields immediately show the default values.

## Capabilities

### New Capabilities

- `sim-parameters`: The Scenario tab gains a reset action that restores the default parameter set and projection horizon, and clears persisted params.

### Modified Capabilities

No existing capability requirements change.

## Impact

- `web/src/App.tsx` — Scenario tab reset handler and button in the scenario panel.
- `web/src/hooks/useSimulationParams.ts` — `resetParams` restoring defaults and clearing storage.
- `web/src/components/controls/ParameterInput.tsx` — external value change clears the in-progress draft so fields re-render with the reset value.
- Tests: `useSimulationParams.test.ts`, `App.test.tsx`.
