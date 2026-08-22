# Tasks: Add Info Buttons for Existing Elements

## 1. InfoButton component

- [x] 1.1 Create `web/src/components/ui/info-button.tsx` with Base UI Popover trigger + portal, lucide `Info` icon, ghost styling, 44px hit area, and `aria-label` "About {label}"
- [x] 1.2 Support inline label rendering (label + button row) and standalone button usage for call sites that keep their own label markup
- [x] 1.3 Add positioner with viewport collision detection; center placement on <640px, portal to document body
- [x] 1.4 Add `web/src/__tests__/InfoButton.test.tsx`: renders with accessible name, opens on click, closes on outside click/Escape/re-toggle, focus returns to trigger, control values untouched

## 2. Simulation parameter panel

- [x] 2.1 Add `info` field to `FieldDef` in `ParameterPanel.tsx` and pass through to `ParameterInput`
- [x] 2.2 Add `info?: string` prop to `ParameterInput.tsx` rendering InfoButton inline next to the label
- [x] 2.3 Write explanation copy for all 7 parameter fields (holdings, retirement year, age, lifespan, min/desired spend, inflation) honoring content standards
- [x] 2.4 Update/extend `ParameterPanel.test.tsx` to assert each field shows an info button with non-empty description

## 3. Price model controls

- [x] 3.1 `ModelSelector.tsx`: add `info?: string` to `ModelEntry` and render InfoButton per model row; add copy in `App.tsx` for Power Law, S2F, Bitcoin24
- [x] 3.2 `PowerLawControls.tsx`: attach info buttons to Formulation, Confidence Band, custom `a`/`b`, percentile inputs; replace inline R² caveat with InfoButton carrying the same text
- [x] 3.3 `S2FControls.tsx` and `Bitcoin24Controls.tsx`: attach info buttons to every labeled control with copy explaining each knob and its assumptions
- [x] 3.4 Extend `App.test.tsx` coverage: info buttons present on model rows and expanded model controls

## 4. Withdrawal policy tab

- [x] 4.1 `WithdrawalTab.tsx`: extend `SectionLabel` and labeled knobs with optional `info` prop; attach InfoButtons to anchor, rate/spend, payout frequency, review cadence, guardrails (floor/ceiling, adjustment size, prosperity rule), cash buffer, and valuation-based selling knobs (indicator, surplus levels, safety valve, onboarding)
- [x] 4.2 Write explanation copy for every withdrawal knob honoring content standards
- [x] 4.3 Extend `WithdrawalTab.test.tsx`: assert info buttons on sections/knobs with non-empty descriptions and that opening one does not change policy values

## 5. Results metrics

- [x] 5.1 `WithdrawalResults.tsx`: attach InfoButtons to metric headings (success probability, path statistics, phase labels) with copy
- [x] 5.2 Extend `WithdrawalResults.test.tsx`: assert info buttons render with non-empty descriptions

## 6. Verification

- [x] 6.1 Run `npm test` (Rust + Vitest) and `npm run lint`/typecheck for web; fix regressions
- [ ] 6.2 Manual QA at 375px: no horizontal scrolling, no layout shift, all buttons tappable, popovers open/close correctly in light and dark themes
- [x] 6.3 Verify content standards: every explanation ≤4 sentences, discloses assumptions, contains no financial advice
