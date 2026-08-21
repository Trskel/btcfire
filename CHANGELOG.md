# Changelog

## 2026-08-21

- Fix custom percentile bands bug: stop double-dividing percentiles by 100 in TS, use `percentile()` lookup in Rust
- Extract duplicated Power Law / S2F regression code into shared `stats.rs` module
- Debounce WASM initialization and scope the Vite fs allow list to `wasm/pkg`
- Add UI disclaimer and hardened API response validation (response shape + price point checks)
- Add Content-Security-Policy meta header
- Migrate historic price data source from CryptoCompare to Binance daily klines (batched fetch back to genesis)
- Add stale-cache detection with last-updated date and a manual Refresh button
- Implement Phase 5: Bitcoin24 (MSTR CAGR) price model in Rust — `log10 price ~ years since genesis` regression with ±1σ confidence bands
- Export the model via WASM bindings (`run_bitcoin24_wasm`) and wire Bitcoin24Controls into the model selector with an orange overlay
- Update tests for the three-model state and the new API client
- Adopt the OpenSpec workflow (`openspec/` config + change proposals, `.claude/` commands and skills)

## 2026-05-18

- Add Phase 4 specs: S2F price model requirements, plan, and validation
- Implement Phase 4: classic PlanB Stock-to-Flow model in Rust (log price ~ log S2F regression)
- Hardcode Bitcoin halving schedule for S2F computation and future projection
- Export model via WASM bindings (`run_s2f_wasm`)
- Add ModelSelector with checkbox visibility controls and expand/collapse accordion panels
- Auto-expand a model's controls panel when its visibility checkbox is checked
- Shared projection horizon slider (5–50y, default 30) controls all models simultaneously
- Multi-overlay PriceChart refactor: accept ModelOverlay[], render all visible models at once
- Distinct per-model colors: Power Law (amber), S2F (teal); model-prefixed ECharts stack names
- Add S2FControls component with fitted parameter display (R², a, b)
- Wire model list into App.tsx: visibility toggles add/remove overlays without recomputation
- Reusable toModelOverlay adapter supports both PowerLawResult and S2FResult
- Add modelId field to ModelOverlay; MODEL_COLORS and MODEL_LABELS maps for extensibility
- Add 13 Rust unit tests for S2F epoch lookup, S2F doubling, regression, and edge cases

- Simplify chart zoom: replace mouse-wheel/pinch zoom with slider-only time axis control
- Add drag-to-pan on chart area when zoomed in
- Y axis auto-scales to fit visible data range when panning/zooming
- Remove Y-axis zoom slider in favor of automatic scaling
- Update Phase 2 specs to reflect new zoom/pan behavior
- Add Phase 3 specs: Power Law price model requirements, plan, and validation
- Implement Phase 3: Rust Power Law model with log-log fit, power fit, and custom parameter presets
- Add confidence bands: ±1σ, ±1σ+±2σ, and custom percentiles (P10/P90, P25/P75)
- Export model via WASM bindings (`run_power_law_wasm`)
- Extend PriceChart with `modelOverlay` prop: median line, area-filled confidence bands, "Today" reference line
- Add PowerLawControls component with formulation selector, confidence band selector, and projection horizon slider
- Wire controls into App.tsx with reactive model recomputation on every parameter change
- Add light/dark theme toggle with localStorage persistence and system preference detection
- Document theme system in tech stack spec

## 2026-05-16

- Add mobile-first responsive design as a core principle across all specs
- Update roadmap phases with responsive UI requirements per feature
- Add responsive design section to tech stack (breakpoints, touch targets, layout rules)
- Add mobile-first validation criteria to Phase 1 scaffold
- Implement mobile-first responsive landing page layout (single-col → 2-col → 3-col grid)
- Fix eslint react-refresh warning for shadcn/ui buttonVariants export
- Add `/changelog` command for pre-merge changelog updates
- Add testing strategy to tech stack spec (Vitest + wasm-pack test)
- Add test requirements to roadmap phases 1, 3–5, 7–9, 11–12
- Set up Vitest with Testing Library and jsdom for React component tests
- Add wasm-bindgen-test for Rust WASM unit tests
- Write App smoke tests and greet() Rust tests

## 2026-05-15

- Initial commit: project README and specs
- Add Phase 1 specs (requirements, plan, validation)
- Phase 1 implementation: Rust/WASM crate, React/Vite app, Tailwind, shadcn/ui, WASM integration, production build
