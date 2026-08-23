## 1. Hook reset capability

- [x] 1.1 Add `resetParams()` to `useSimulationParams`: sets params to `defaultSimulationParams()` and synchronously removes `SIM_PARAMS_STORAGE_KEY` from localStorage; return it from the hook

## 2. Parameter input draft sync

- [x] 2.1 In `ParameterInput`, discard the in-progress text draft during render when the `value` prop changes to a value that no longer matches the draft (render-phase `lastValue` adjustment, no effect)

## 3. Reset button in the Scenario tab

- [x] 3.1 Add `resetScenarioTab` handler in `App` (`resetSimParams()` + `setProjectionYears(30)`)
- [x] 3.2 Render a right-aligned Reset button (outline variant, RotateCcw icon, aria-label "Reset scenario tab") at the top of the Scenario tab panel

## 4. Tests

- [x] 4.1 Add tests for `resetParams` in `useSimulationParams.test.ts` (defaults restored, storage cleared)
- [x] 4.2 Add an App-level test: Reset in the Scenario tab restores default parameters and the 30y horizon

## 5. Verification

- [x] 5.1 Run web tests (`npm test` in `web/`), lint, and typecheck
