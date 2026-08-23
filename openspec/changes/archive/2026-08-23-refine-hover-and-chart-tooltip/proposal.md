## Why

Two interaction refinements from user feedback: on desktop, info buttons require an extra click to reveal their explanation when hovering should suffice; and the price projection chart's crosshair tooltip currently lists median plus ±1σ/±2σ rows, when users actually want the simple overall range — max, median, and min — without the ±1σ row.

## What Changes

- Info buttons open their explanation panel when the pointer hovers over them on hover-capable (desktop) devices, with a short delay, and close when the pointer leaves — while keeping the existing click/tap, Escape, and outside-click behavior intact.
- The price projection chart's axis tooltip shows, for each visible model overlay at the hovered year, the model's maximum, median, and minimum projected values, and no longer shows a ±1σ row.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `info-buttons`: requirement "Reusable info button component" changes — desktop hover activation is added alongside click/tap.
- `historic-price-data`: requirement "Interactive price chart" changes — the crosshair tooltip content for model overlays shows max/median/min and omits ±1σ.

## Impact

- `web/src/components/ui/info-button.tsx` — hover-open behavior on the Base UI popover.
- `web/src/components/charts/PriceChart.tsx` — tooltip formatter and axis-pointer series selection.
- Tests: `web/src/__tests__/InfoButton.test.tsx`, `web/src/__tests__/PriceChart.test.tsx`.
- No WASM, API, or data changes.
