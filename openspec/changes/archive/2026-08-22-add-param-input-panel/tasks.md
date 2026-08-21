# Tasks: Parameter Input Panel

## 1. Types and bounds

- [x] 1.1 Add `SimulationParams` interface and per-field bounds/step/default table (holdingsBtc, retirementStartYear, currentAge, lifespan, minimumSpendUsd, annualSpendUsd) in `web/src/types/simulation.ts`

## 2. Persistence hook

- [x] 2.1 Implement `useSimulationParams` hook in `web/src/hooks/useSimulationParams.ts` with defaults, load-from-localStorage (key `btcfire.simParams.v1`, versioned), clamp/validate on load, and 300ms debounced save
- [x] 2.2 Add Vitest tests for the hook: defaults on missing storage, restore on valid storage, clamping on out-of-bounds storage, fallback on corrupt/unknown-version JSON

## 3. Parameter controls

- [x] 3.1 Create `ParameterSlider` control (`web/src/components/controls/ParameterSlider.tsx`) combining slider + synced numeric text input, with bounds validation on blur
- [x] 3.2 Build `ParameterPanel` (`web/src/components/controls/ParameterPanel.tsx`) rendering all six `ParameterSlider` fields with labels and value units
- [x] 3.3 Apply touch sizing: min 44px height targets for inputs/slider thumbs, oversized hit area on thumb, verify no horizontal scroll at 375px

## 4. Layout integration

- [x] 4.1 Wire `useSimulationParams` state into `App.tsx` and render `ParameterPanel`
- [x] 4.2 Make layout responsive: panel full-width stacked above results below `lg`, fixed-width sticky sidebar beside results at `lg` and up
- [x] 4.3 Pass parameters as props into existing model controls (no logic changes in the model controls themselves)

## 5. Verification

- [x] 5.1 Add Vitest tests for `ParameterPanel`/`ParameterSlider`: slider-input sync, bounds clamping, persistence round-trip
- [x] 5.2 Run `npm test` at repo root (Rust + React suites) and fix failures
- [x] 5.3 Manual check in dev server at 375px, 768px, and desktop widths: layout order, sidebar behavior, touch targets, persistence across reloads

## 6. Revision: number-only inputs

- [x] 6.1 Replace the slider + numeric input hybrid with number entry fields only (`ParameterInput`), removing `ParameterSlider`
- [x] 6.2 Raise BTC holdings max to 21,000,000 with up to 8 decimal places, cropping trailing zeroes on display
