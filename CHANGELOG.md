# Changelog

## 2026-08-23 — Monte Carlo outcome reports: failure forensics, legacy stats, phase time

- Failure event model: each simulated path records a (year, mode) failure event — depleted in the first zero-BTC year, below-minimum in the first below-floor year; precedence and summary numbers unchanged from the existing classification
- Failure forensics: survival-by-year curve, failure-year histogram by mode, median failure year (null when no path fails), and shortfall statistics (median + p90 of the worst below-floor gap, null when no path fails)
- Legacy outcome stats: final-year BTC percentiles (p10/p50/p90 across all paths) plus the median final BTC across success paths only
- Phase-time shares: % of simulated years ending in bear / fair / euphoria across all paths — present only for valuation-enabled monthly policies
- Percentile series expanded: per-year p10/p25/p50/p75/p90 now covers BTC, annual spend, and cash-buffer years (ready for the Phase 10 fan charts)
- New "Failure forensics" results section below the summary tiles: survival curve and failure-year histogram charts, median failure year and shortfall tiles, legacy and phase-time tiles — each metric with an educational info button; failure parts hidden when no path fails, whole section hidden on a zero-year horizon
- `MonteCarloResult` gains `forensics`, `legacy`, and `phaseTime` blocks (serde camelCase) behind the existing `run_monte_carlo_wasm` binding; TS types mirror the growth
- Shared `MetricTile` component extracted and reused by the summary and forensics sections; loading spinner added during plan runs
- 104 Rust/WASM tests + 131 frontend tests

## 2026-08-22 — Monte Carlo simulation with outcome summary (Phase 9)

- Monte Carlo engine in Rust (`wasm/src/simulation/monte_carlo.rs`): 10,000 price paths per run, sampled as a log-normal random walk around the model's median with the model's own band dispersion (`ChaCha8Rng`, fixed seed 42 → reproducible runs), each path run through the withdrawal engine
- Outcome classification: every path is exactly one of depleted / below-minimum / success (counts sum to the run count); desired-spend coverage measured across success paths only
- Four-part summary at the beginning of the plan results: % ran out of money, % below minimum spending, % success, % of years at desired spend (successful runs only, "—" when none) with educational info buttons
- Per-year percentile series (p10/p25/p50/p75/p90 of BTC) computed by the engine, ready for the Phase 10 fan charts
- The withdrawal engine now resumes from an arbitrary `RuntimeState` (`run_withdrawal_on_path_from_state`) — the foundation for the Phase 15 "Today" advisor
- New `run_monte_carlo_wasm` binding; `rand`/`rand_chacha`/`rand_distr` added to the wasm crate
- Also fixed: the engine test suite (33 tests) was silently skipped because plain `#[test]`s don't run under `wasm-pack test --node`; converted to `#[wasm_bindgen_test]`
- 90 Rust/WASM tests + 119 frontend tests

## 2026-08-22 — Unified withdrawal policy (Phase 7)

- Implement Phase 7: unified withdrawal policy engine in Rust/WASM — presets (Classic FIRE, Fixed %, Guardrails, Valuation-based, Custom) over a shared knob set: anchor (% of initial / % of current / fixed USD), rate or spend, payout frequency, review cadence, guardrails (ceiling/floor thresholds, adjustment size, prosperity rule), cash buffer, and valuation knobs
- Deterministic engine: yearly/monthly stepping with geometric interpolation between yearly model points; inflation referencing from `SimulationParams` (amount-based spend + spend floor; %-of-current unaffected); Guyton-Klinger guardrails; valuation state machine with bear/fair/euphoria phases from the model-band quantile, cash buffer (frozen/organic/recharge), safety valve, and deferred onboarding
- Band-path simulation: the plan runs the selected model's median, ±1σ, ±2σ, and percentile paths as separate deterministic runs; `ModelPoint` gains an optional path price; S2F and Bitcoin24 now emit ±2σ bands so euphoria is reachable on every model
- New `run_withdrawal_wasm` binding returning year-by-year results (year, BTC, cash, buffer years, spend, sold BTC, phase)
- New UI: collapsible Plan Configuration card with tabs (Price model · Scenario · Withdrawal), chart-first layout with the sidebar removed; projection horizon moved into the Scenario tab
- Withdrawal tab: preset cards with dirty marker (preset identity preserved), knob visibility rules, 44px touch targets
- Your Plan results: single plan-model selector ("Price model used"), directional path tiles (Medium/Bearish/Bullish, Deep bear/Deep bull) with band descriptor and per-path outcome (final BTC, depletion year, phase), year-by-year cards on mobile / table on desktop, projection-coverage note
- `SimulationParams` gains `inflationRate` (0–10%, default 3.0) with storage migration; withdrawal policy persists under `btcfire.withdrawalPolicy.v1`
- 42 Rust/WASM tests + 97 frontend tests

## 2026-08-22

- Bundle static BTC price history (Bitstamp daily candles back to 2011-08-18) as a shipped data file; runtime fetches now cover only the tail after the snapshot (`npm run snapshot:history` regenerates)
- Merge static + live series at runtime (dedupe by timestamp, live wins); fallback ladder is fresh cache → fetch → stale cache → static-only
- Make the price cache generation-aware so a newly shipped static file invalidates older cached data
- Call Binance klines directly (CORS confirmed) and remove the Vite dev proxy
- Rename the price API client `coingecko.ts` → `binance.ts`
- Note: model fits now use ~15 years of data (2011 →) instead of ~9 (2017 →)

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
