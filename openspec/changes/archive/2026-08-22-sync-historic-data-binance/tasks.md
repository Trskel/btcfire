# Tasks — Sync historic-price-data spec to Binance reality

## 1. Spec sync

- [ ] 1.1 Merge the delta spec into `openspec/specs/historic-price-data/spec.md` (API client requirement → Binance klines; cache requirement → stale-serve + manual refresh)
- [ ] 1.2 Validate: `openspec validate sync-historic-data-binance`

## 2. File rename (optional cleanup)

- [ ] 2.1 Rename `web/src/lib/api/coingecko.ts` → `binance.ts`
- [ ] 2.2 Update imports in `web/src/hooks/useHistoricPrices.ts`, `web/src/__tests__/coingecko.test.ts`, `web/src/__tests__/useHistoricPrices.test.ts`
- [ ] 2.3 Rename `web/src/__tests__/coingecko.test.ts` → `binance.test.ts`

## 3. Verification

- [ ] 3.1 `npm test` passes (Vitest + wasm-pack)
- [ ] 3.2 `npm run build` succeeds
