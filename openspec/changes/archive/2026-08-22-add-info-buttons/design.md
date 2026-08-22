# Design: Info Buttons for Existing Elements

## Context

BTCFire's UI exposes many financial knobs whose meaning is opaque to non-experts: simulation parameters (7 fields), three price models with model-specific controls, a unified withdrawal policy with ~25 knobs across guardrails/buffers/valuation sections, and result metrics. Today only one inline explanation exists (the R² caveat in `PowerLawControls`). The project principle "Educate, don't prescribe" and roadmap Phase 14 call for in-place educational explanations. This change is purely additive UI — no WASM, data, or simulation logic changes.

The web app uses React 19 + Vite + Tailwind v4 with shadcn-style components wrapped around **@base-ui/react** primitives (see `web/src/components/ui/button.tsx`), and `lucide-react` for icons.

## Goals / Non-Goals

**Goals:**
- A single reusable `InfoButton` component (icon button + accessible popover) usable next to any labeled element.
- Coverage: every labeled element in ParameterPanel, model controls (PowerLaw/S2F/Bitcoin24), ModelSelector rows, WithdrawalTab sections, and WithdrawalResults metrics.
- Mobile-first: tap to open, 44px touch target, no horizontal scroll or layout shift at 375px.
- Plain-language copy that discloses assumptions/uncertainty and never advises.

**Non-Goals:**
- A full onboarding flow or first-run tour (later Phase 14 work).
- Rich content in popovers (links, images, math rendering) — plain text only.
- Hover-only tooltips; no state, no persistence of open/closed state.
- Changing any existing label wording, control behavior, or simulation logic.

## Decisions

### 1. Build on Base UI Popover, not Radix or hand-rolled
The project already uses `@base-ui/react` (button, tabs, and the card/select internals follow this pattern). Base UI's `Popover` gives us: trigger anchoring, outside-click/Escape dismissal, focus return, portal rendering, and viewport collision handling for free, with the same shadcn wrapper pattern as `button.tsx`.
- **Alternative considered**: Radix UI — would add a second primitive library for one component. Rejected.
- **Alternative considered**: hand-rolled popover — reimplements focus trap/escape/portal and is error-prone. Rejected.

### 2. Tap/click to open (Popover), not hover (Tooltip)
Mobile is the primary target; hover-only tooltips are unusable on touch. A popover opened by tap works everywhere. Open state is also keyboard-accessible via the trigger button (Enter/Space).
- **Alternative considered**: hover tooltip on desktop + tap on mobile via pointer heuristics — more code, inconsistent behavior. Rejected for v1; can be layered later.

### 3. `InfoButton` API with optional passthrough props
New component in `web/src/components/ui/info-button.tsx`:

```
<InfoButton label="Initial BTC holdings" description="…" />
```

It renders a ghost icon button (`Info` icon from lucide-react, `size="icon-sm"`-like visual but padded to a 44px hit area) and wraps `label` in a visually consistent inline label row (`text-xs font-medium text-muted-foreground`). For call sites that already render their own label (e.g., `ParameterInput`, `WithdrawalTab`'s `SectionLabel`), those components gain an optional `info?: string` prop that renders `InfoButton` inline next to the existing label, so no markup duplication. Label row alignment: `flex items-center gap-1.5` with the button `-my-1`-style padding to hit 44px without inflating line height or shifting layout.

### 4. Copy centralized in one content module
All explanation text lives in `web/src/content/info.ts` as grouped, typed constants (`PARAM_INFO`, `MODEL_INFO`, `POWER_LAW_INFO`, `FIT_INFO`, `WITHDRAWAL_INFO`, `RESULTS_INFO`). Components keep their labels but reference descriptions by key. This makes bulk edits (tone passes, content-standards reviews, future i18n) single-file jobs; typing (`Record<keyof SimulationParams, string>`, `Record<ModelId, string>`) prevents orphaned or missing keys. Copy rules: ≤4 sentences, plain language, disclose assumptions and uncertainty, no advice.
- **Alternative considered**: colocating copy inside each component — keeps text next to its UI but splits bulk edits across many files. Rejected in review: the copy is static educational text with no per-component interpolation, so centralization loses nothing.

### 5. Coverage wiring
- `ParameterInput` + `ParameterPanel`: add `info` to `FieldDef` entries.
- `PowerLawControls` / `S2FControls` / `Bitcoin24Controls`: wrap each label; also explain the R² line by replacing the inline caveat with an InfoButton (keeping the text).
- `ModelSelector`: each model row gets an InfoButton describing the model.
- `WithdrawalTab`: `SectionLabel` and knob labels gain `info` props.
- `WithdrawalResults`: metric headings gain InfoButtons.

## Risks / Trade-offs

- [44px targets inflate row height on dense mobile layout] → Mitigation: small visual button (icon only) with padded hit area; verify no layout shift at 375px via test + manual QA.
- [Popover clipping inside scroll containers or overflowing viewport on tiny screens] → Mitigation: Base UI popover positioner with collision detection; on <640px prefer `center` placement; portal to body.
- [Copy drift: text added but stale/never updated] → Mitigation: tests assert every covered label has a non-empty description (coverage requirement), and the central typed module (`web/src/content/info.ts`) makes stale or missing entries visible at compile time.
- [Existing tests break due to extra buttons in labels] → Mitigation: use role/accessible-name queries in new tests; update existing queries minimally.
- [Popover opens unexpectedly while typing in inputs] → Mitigation: only trigger button opens; no auto-open on focus.

## Migration Plan

Pure additive UI change — no data migration. Deploy with the normal web build. Rollback is a revert of the web changes; no persisted state to clean up.

## Open Questions

- Whether hover should also open on desktop (nice-to-have, deferred).
- Exact copy wording — to be drafted per element during implementation and reviewed against the content standards requirement.
