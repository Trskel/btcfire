## Why

The app currently offers two BTC price projection models (Power Law and Stock-to-Flow). The Bitcoin24 model — MicroStrategy's compound annual growth rate (CAGR) methodology — is a widely referenced third perspective that fits an exponential trend through historical prices and projects forward using a constant annual growth rate. Adding it completes the planned Phase 5 milestone and gives users a full spectrum of model viewpoints.

## What Changes

- New Rust module `bitcoin24.rs` implementing the CAGR model: fits `log10(price) = a * years_since_genesis + b` via linear regression over historic data, projects median price and ±1σ confidence bands into the future
- New WASM export `run_bitcoin24_wasm` in `lib.rs`
- New TypeScript `Bitcoin24Config` / `Bitcoin24Result` types and `'bitcoin24'` entry in `ModelId`
- New `Bitcoin24Controls` React component wired into the model selector in `App.tsx`
- Rust unit tests covering regression accuracy, band ordering, edge cases, and projection range

## Capabilities

### New Capabilities
- `bitcoin24-price-model`: CAGR-based BTC price projection using exponential trend regression on historic data, with confidence bands and configurable projection horizon

### Modified Capabilities
<!-- None — existing models unchanged -->

## Impact

- `wasm/src/models/bitcoin24.rs` (new file)
- `wasm/src/models/mod.rs` (add `pub mod bitcoin24`)
- `wasm/src/lib.rs` (add WASM export)
- `web/src/types/models.ts` (extend `ModelId`, add config/result types, color, label)
- `web/src/components/controls/Bitcoin24Controls.tsx` (new file)
- `web/src/App.tsx` (add model entry)
- `web/src/__tests__/App.test.tsx` (update mock to reflect 3-model state)
