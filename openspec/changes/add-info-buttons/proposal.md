## Why

BTCFire exposes a dense set of knobs — simulation parameters, three price models with their own controls, and a unified withdrawal policy with guardrails, buffers, and valuation-based selling. Labels alone don't explain what these mean (e.g., "Prosperity rule", "P25/P75", "R² measures fit to past data only"). The "Educate, don't prescribe" principle demands in-place explanations, but today only one text note exists (the R² caveat). This change adds info buttons to existing UI elements so users can understand each input without leaving the app — the first slice of roadmap Phase 14 (Polish and education).

## What Changes

- Add a reusable `InfoButton` UI component: a small ⓘ icon button that reveals an explanatory tooltip/popover on tap/click/hover, with 44px touch target and accessible labeling.
- Attach info buttons to existing UI element labels across the app:
  - **Simulation parameters** (`ParameterPanel`): initial BTC holdings, retirement start year, current age, expected lifespan, minimum and desired annual spending, inflation rate.
  - **Model controls** (`PowerLawControls`, `S2FControls`, `Bitcoin24Controls`): formulation, confidence band / percentiles, custom `a`/`b`, and each model's specific knobs; also the model selector entries in `ModelSelector`.
  - **Withdrawal policy** (`WithdrawalTab`): anchor, rate/spend, payout frequency, review cadence, guardrails (floor/ceiling, adjustment size, prosperity rule), cash buffer, valuation-based selling knobs (indicator, surplus levels, safety valve, onboarding).
  - **Results** (`WithdrawalResults`): success probability, path statistics, and phase labels.
- Write concise, plain-language explanation copy for every covered element, noting assumptions and uncertainty (never financial advice).
- Add tests: info buttons render on covered elements, toggle open/close, and expose correct accessible names.

## Capabilities

### New Capabilities
- `info-buttons`: reusable info-button component with educational tooltip content for all existing UI elements (parameters, model controls, withdrawal knobs, results).

### Modified Capabilities
<!-- None: existing specs keep their requirements; this adds a UI layer on top without changing model, data, or simulation behavior. -->

## Impact

- **Affected code**: `web/src/components/ui/` (new `InfoButton`, likely a small popover primitive), `web/src/components/controls/` (ParameterPanel, ParameterInput, PowerLawControls, S2FControls, Bitcoin24Controls, ModelSelector, WithdrawalTab, WithdrawalResults), possibly `web/src/App.tsx` for top-level controls.
- **Dependencies**: `lucide-react` already provides an info icon; Radix popover/tooltip may be added (shadcn pattern) or a dependency-free custom popover.
- **No changes** to WASM/Rust, data fetching, or simulation logic.
- **Testing**: new Vitest + Testing Library coverage; no Rust changes.
