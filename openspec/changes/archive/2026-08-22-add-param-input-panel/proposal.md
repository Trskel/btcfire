# Add Parameter Input Panel

## Why

BTCFire's retirement simulation needs a personal scenario: how much BTC you hold, when you retire, how long you live, and what you spend (minimum for survival and desired comfortable living spending). Today the app has no way to enter these inputs, so results cannot be personalized. This change adds the parameter panel — the entry point for every retirement simulation.

## What Changes

- Add a parameter input panel with six inputs: initial BTC holdings, retirement start year, current age, expected lifespan, and minimum and desired annual spending (fiat).
- Inputs are sliders with editable numeric text fields; slider and text values stay in sync.
- Parameters persist to localStorage and are restored across sessions.
- Responsive layout: full-width panel stacked above results on mobile; fixed sidebar on desktop.
- All interactive elements meet 44px minimum touch-target sizing.
- Parameter state is owned at the app level and passed to model controls (initial wiring; deep integration with WASM simulation config comes later).

## Capabilities

### New Capabilities

- `sim-parameters`: The retirement scenario parameters (BTC holdings, retirement start year, current age, lifespan, minimum and desired annual fiat spending), their default values and validation bounds, persistence to localStorage, and the responsive panel UI that renders them.

### Modified Capabilities

<!-- none -->

## Impact

- New files under `web/src/components/controls/` (parameter panel + input controls), `web/src/hooks/` (persistence hook), `web/src/types/` (parameter types).
- `web/src/App.tsx`: app-level parameter state and layout changes (sidebar vs stacked).
- Existing model controls (`PowerLawControls`, `S2FControls`, `Bitcoin24Controls`) receive parameters via props once wiring lands; no changes to their own logic in this change.
- No WASM changes; no new dependencies (uses existing shadcn/ui Slider primitives or equivalent).
