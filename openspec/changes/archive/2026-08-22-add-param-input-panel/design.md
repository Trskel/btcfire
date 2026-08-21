# Design: Parameter Input Panel

## Context

BTCFire currently renders price-model charts with hardcoded scenario assumptions (`projectionYears` state lives in `App.tsx`; no BTC holdings, retirement timing, or spending inputs exist anywhere). The retirement simulation is the product's core question, but users cannot yet describe their own situation. This change adds the parameter panel as a pure React layer — no WASM changes — so future simulation phases can consume the parameters.

## Goals / Non-Goals

**Goals:**
- Six personal parameters with sane defaults and validation bounds, editable via numeric entry fields.
- Persistence to localStorage with restore on load and validation of restored values.
- Responsive layout: stacked full-width above results on mobile (< 1024px), fixed sidebar on desktop (≥ 1024px).
- 44px minimum touch targets for every interactive element; no horizontal scroll at 375px.
- App-level parameter state so model controls can consume it later.

**Non-Goals:**
- No WASM simulation changes; parameters are not yet fed into Monte Carlo runs.
- No withdrawal strategy selection or fiat-currency conversion in this change.
- No accounts, sync, or server storage — localStorage only, per privacy principle.

## Decisions

1. **Parameter state lives in App.tsx, owned by a custom hook `useSimulationParams`** (in `web/src/hooks/`). Rationale: App is already the composition root; the panel is a controlled view over this state. The hook encapsulates defaults, localStorage read/write, and validation so components stay dumb.

2. **Single `SimulationParams` type in `web/src/types/simulation.ts`** with per-field bounds as a const table (e.g., `{ holdingsBtc: { min: 0, max: 100, step: 0.01, default: 1 } }`). Rationale: bounds live next to the type, reused by slider config, validation, and tests — one source of truth. Alternative considered: inline bounds per component — rejected for duplication across sliders, inputs, and validation.

3. **Numeric entry field per parameter** (text input with `inputMode="decimal"` and `role="spinbutton"`). Values are parsed and clamped on commit (change or blur); invalid text reverts to the last valid value on blur. Alternative considered: slider + numeric input hybrid — removed at review: sliders changed values on imprecise touch gestures, so precise number entry alone is preferred.

4. **Persistence via `useLocalStorage`-style logic inside `useSimulationParams`**, key `btcfire.simParams.v1`, JSON body with a `version` field. On load: parse, validate each field against bounds, clamp invalid values, fall back to defaults on garbage. Rationale: matches existing localStorage convention (price cache, theme) and gives a migration seam via the version field. Alternative: `zustand` persist middleware — rejected, adds a dependency for one small store.

5. **Debounced write (300ms) on change** to avoid writing localStorage on every slider tick; read once on mount. Theme persistence precedent in the app supports this pattern.

6. **Responsive structure in App.tsx**: a flex column at base sizes (panel first, results below) that becomes a row with a fixed-width (e.g., `w-80`/`w-96`, `lg:sticky lg:top-*`) sidebar at `lg:`. No new layout library. Alternative: CSS grid with `grid-cols-[...]` — rejected, flex with sticky is simpler for variable-height results.

7. **Touch targets**: inputs sized ≥ 44px via `min-h-11` classes. Rationale: 44px is the mobile-first principle already in `specs/tech-stack.md`.

8. **Parameter defaults and bounds**: holdings 1 BTC (0–21,000,000, 8 decimal places, trailing zeroes cropped on display), retirement start = current year + 10 (current year–current year + 40), current age 35 (18–100), lifespan 90 (50–120), minimum annual spending $20,000 (0–250,000), desired annual spending $50,000 (0–1,000,000). All editable; validation clamps into bounds rather than rejecting input.

## Risks / Trade-offs

- [localStorage JSON schema changes between sessions] → Mitigation: `version` field; unknown versions discard and reset to defaults.
- [Sticky sidebar overlaps results on short desktop windows] → Mitigation: `lg:` breakpoint and `top-4` offset; panel is not taller than viewport in practice (5 compact fields).
- [Invalid entry during typing] → Mitigation: single source of truth; input commits on change/blur, invalid text reverts to last valid value on blur.

## Open Questions

- Exact desktop sidebar width (w-80 vs w-96) — resolve at implementation with real content.
