## 1. Info button hover activation

- [ ] 1.1 Add `openOnHover` to the `Popover.Trigger` in `web/src/components/ui/info-button.tsx`
- [ ] 1.2 Add Vitest coverage in `web/src/__tests__/InfoButton.test.tsx` verifying the panel opens on hover (desktop pointer) and that click/tap, outside-click, and Escape dismissal still pass
- [ ] 1.3 Run `npm test` in `web/` and confirm all info-button tests pass

## 2. Chart tooltip max/median/min

- [ ] 2.1 Rework the tooltip formatter in `web/src/components/charts/PriceChart.tsx` to emit per-overlay Max, Median, and Min rows derived from the widest available band series (2σ, then percentiles, then 1σ) plus the BTC Price row, dropping ±1σ rows
- [ ] 2.2 Update the axis-pointer series selection in `PriceChart.tsx` so it no longer keys off ±1σ series names
- [ ] 2.3 Add/extend Vitest coverage in `web/src/__tests__/PriceChart.test.tsx` for the tooltip formatter output (max/median/min present, no ±1σ)
- [ ] 2.4 Run `npm test` and `npm run lint` in `web/` and confirm they pass
