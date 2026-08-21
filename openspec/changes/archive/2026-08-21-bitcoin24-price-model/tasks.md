## 1. Rust model implementation

- [X] 1.1 Create `wasm/src/models/bitcoin24.rs` with `Bitcoin24Config`, `Bitcoin24Result` structs, and `run_bitcoin24()` function implementing CAGR regression and ±1σ band projection
- [X] 1.2 Add `pub mod bitcoin24;` to `wasm/src/models/mod.rs`
- [X] 1.3 Add `run_bitcoin24_wasm` WASM export to `wasm/src/lib.rs` with `serde_wasm_bindgen` serialization

## 2. Rust unit tests

- [X] 2.1 Write tests in `bitcoin24.rs`: R² > 0.9 on reference data, positive slope, 2024 median near reference, band ordering, band widening over time, empty data error, single-point error, negative projection years error, zero projection years returns only historic range
- [X] 2.2 Run `wasm-pack test` and verify all tests pass

## 3. TypeScript types

- [X] 3.1 Add `'bitcoin24'` to `ModelId` union type in `web/src/types/models.ts`
- [X] 3.2 Add `Bitcoin24Config` and `Bitcoin24Result` interfaces
- [X] 3.3 Add `'bitcoin24': '#f97316'` to `MODEL_COLORS` and `'bitcoin24': 'Bitcoin24'` to `MODEL_LABELS`

## 4. React controls component

- [X] 4.1 Create `web/src/components/controls/Bitcoin24Controls.tsx` following the S2FControls pattern — calls `run_bitcoin24_wasm`, debounces 300ms, displays R² and coefficients
- [X] 4.2 Include model explanation text below the results

## 5. Wire into App.tsx

- [X ] 5.1 Import `Bitcoin24Controls` in `App.tsx`
- [X ] 5.2 Add `'bitcoin24': null` to initial `modelOverlays` state
- [X ] 5.3 Add Bitcoin24 `ModelEntry` to `modelEntries` array
- [X ] 5.4 Update `App.test.tsx` mock to handle 3-model `modelOverlays` state and include `bitcoin24` in mocked `run_bitcoin24_wasm`

## 6. Verification

- [X] 6.1 Run `npm run build` for the web app — confirm no TypeScript errors
- [X] 6.2 Run `npm test` — confirm all frontend tests pass
- [X] 6.3 Verify visually: all three models appear in selector, toggle on/off, show on chart
