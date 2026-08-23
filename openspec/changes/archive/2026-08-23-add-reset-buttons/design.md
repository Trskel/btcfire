# Add Scenario Tab Reset — Design

## Context

The Scenario tab in `web/src/App.tsx` hosts the projection horizon slider and the `ParameterPanel`, whose values live in `useSimulationParams` and persist to localStorage (debounced 300ms). `ParameterInput` keeps an internal text `draft` state while the user types, which is not automatically cleared when the value prop changes externally.

## Goals / Non-Goals

**Goals:**
- One Reset button on the Scenario tab restoring parameters + projection horizon to defaults.
- Persisted params cleared so a reload does not resurrect customized values.
- Parameter inputs immediately re-render defaults even with an in-progress draft.

**Non-Goals:**
- Reset buttons on the Price model or Withdrawal tabs.
- Per-field reset, confirmation dialogs, or undo.

## Decisions

### D1: `resetParams` added to `useSimulationParams`
`resetParams()` sets state to the existing `defaultSimulationParams()` factory and calls `localStorage.removeItem(SIM_PARAMS_STORAGE_KEY)` synchronously.
- Rationale: the factory is the single source of truth for defaults; removing the key synchronously avoids the 300ms debounced-save race where a fast reload could restore the customized values.
- Alternative considered: letting the debounced save write the defaults back. Rejected — a reload within the debounce window restores customized values.

### D2: Draft sync in `ParameterInput` via render-phase adjustment
When the `value` prop changes and no longer matches what the in-progress draft would commit, the draft is discarded during render (the React-documented "adjusting state when a prop changes" pattern: `if (value !== lastValue) { setLastValue(value); if (mismatch) setDraft(null) }`).
- Rationale: reset must visibly restore default values even if the user typed a value without blurring the field. An effect-based sync was rejected because the `react-hooks/set-state-in-effect` lint rule forbids it and the render-phase pattern is the documented approach.
- The comparison against the draft's committed value (`clamp(parseFloat(draft)) === value`) keeps the draft intact during normal typing, where draft and committed value always agree.

### D3: Reset handler and button live in App
`resetScenarioTab` (in `App`) calls `resetSimParams()` and `setProjectionYears(30)`. The button is a right-aligned outline button with a `RotateCcw` icon and an `aria-label` identifying the action.
- Rationale: both pieces of state (params, horizon) are owned by `App`/the hook; the tab panel already lives in `App`.

## Risks / Trade-offs

- [Debounced save racing the reset] → The key is removed synchronously; the subsequent state change schedules a save of the defaults, so storage converges to defaults shortly after reset.
- [Draft cleared on every keystroke] → The commit-compare only clears the draft when the committed value differs from the prop value, which never happens during valid typing.

## Open Questions

None.
