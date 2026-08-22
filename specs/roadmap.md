# BTCFire — Roadmap

Each phase is roughly half a day of work and delivers a testable result. All UI work follows a mobile-first responsive approach — features are designed for phone screens first, then enhanced for larger viewports.

**Status legend:** phases 1–6 are done with requirement specs in `openspec/specs/` (1–4 also have manual specs in `specs/`); phases 7–17 are the backlog (18 is a candidate).

> **Product vision (2026-08-22):** BTCFire has two faces over one core — a **planner** (define a withdrawal policy, simulate survival) and an **advisor** ("Today": what does my policy prescribe this month, and what would deviating cost?). Both run on the same policy struct; the simulator clones its runtime state across 10,000 paths, the advisor holds exactly one real path in localStorage. Two top-level sections — **Plan** (three tabs: Scenario · Price model · Withdrawal, results live under the chart) and **Today** (the advisor). See mission.md "The two faces".

## Phase 1 — Project scaffold

Set up the monorepo structure: Rust/WASM crate with `wasm-pack`, React/Vite app with Tailwind and shadcn/ui, and the build pipeline that wires them together. The app uses mobile-first responsive layout from the start. Configure Vitest for the React app and `wasm-pack test` for Rust. Deliverable: a "Hello from WASM" message rendered in the React app with a responsive layout that works on phone-sized screens, plus passing test suites for both Rust and React (`npm test` runs both).

**Status:** ✅ done — `openspec/specs/project-scaffold`, `specs/2026-05-15-project-scaffold`

## Phase 2 — Historic price data

Fetch historic BTC price data from Binance's public klines API (batched daily candles back to genesis). Cache in localStorage. Display the price history as a responsive interactive ECharts line chart (log/linear toggle) that adapts to screen width — simplified axis labels and touch-friendly tooltips on mobile. Deliverable: a chart showing BTC's full price history from the API, usable on both phone and desktop screens.

> Note: the original CoinGecko source was dropped because its free tier became rate-capped. The Binance client lives in `web/src/lib/api/coingecko.ts` (filename not yet renamed). Binance data starts 2017-08-17.

**Status:** ✅ done — `openspec/specs/historic-price-data`, `specs/2026-05-16-historic-price-data`

## Phase 3 — Power Law price model

Implement the Power Law model in Rust. Given a year, return median price and confidence bands. Expose via WASM. Overlay the model's projection onto the historic price chart. Include Rust unit tests validating model output against known reference values. Deliverable: chart shows historic prices + Power Law projection into the future, with passing tests.

**Status:** ✅ done — `openspec/specs/power-law-price-model`, `specs/2026-05-18-power-law-price-model`

## Phase 4 — S2F price model

Implement Stock-to-Flow model in Rust. Same interface as Power Law. Add a model selector to the UI so users can switch between Power Law and S2F. Include Rust unit tests for S2F calculations. Deliverable: users can toggle between two price models on the chart, with passing tests.

**Status:** ✅ done — `openspec/specs/s2f-price-model`, `specs/2026-05-18-s2f-price-model`

## Phase 5 — Bitcoin24 price model

Implement MicroStrategy's Bitcoin24 model in Rust. Add to model selector. Include Rust unit tests. Deliverable: three price models available, all comparable on the same chart, with passing tests.

**Status:** ✅ done — `openspec/specs/bitcoin24-price-model` (built 2026-08-21, spec'd via archived change)

## Phase 6 — User stack configuration

Build the parameter input panel: initial BTC holdings, retirement start year, current age, expected lifespan, annual spending (in fiat). Persist to localStorage. On mobile, the panel is full-width and stacks above the results; on desktop, it renders as a sidebar. All sliders and inputs have touch-friendly sizing (min 44px targets). Deliverable: a responsive parameter panel with sliders and inputs that save across sessions and work on all screen sizes.

**Status:** ✅ done — `openspec/specs/sim-parameters` (built 2026-08-22 via archived change `2026-08-22-add-param-input-panel`). Note: implementation added `minimumSpendUsd` alongside `annualSpendUsd` (floor + desired spend, for future Guardrails support).

## Phase 7 — Unified withdrawal policy engine

> **Revision (2026-08-22):** phases 7, 8 and 11 collapse into ONE phase — a unified withdrawal policy with **presets** (Classic FIRE, Fixed %, Guardrails, Valuation-based, Custom) over a shared knob set: anchor (% of initial / % of current / $ per year), rate or spend, payout frequency (monthly/quarterly/yearly), review cadence (once/yearly/monthly), guardrails (floor/ceiling thresholds, adjustment size, prosperity rule), cash buffer (target range, refill rules), and absolute spend floor. Inflation moves to the simulation level (it references amount-based withdrawals and the floor, but not %-of-current math). Presets prefill knobs; editing a knob marks the preset dirty. **Status:** ✅ done — implemented 2026-08-22 via OpenSpec change `unified-withdrawal-policy`.

Implement the classic FIRE withdrawal strategy in Rust: the user sets an initial annual spending amount in fiat, which increases each year with inflation (configurable inflation rate). BTC is sold each year to cover that year's spending. Wire to the UI. On mobile, the year-by-year results display as a scrollable card list rather than a wide table. Include Rust tests verifying withdrawal math (inflation compounding, balance depletion). Deliverable: given user stack + a price model, show year-by-year BTC and fiat balances in a responsive table/card layout, with passing tests.

## Phase 8 — Fixed percentage withdrawal strategy

> Merged into Phase 7 (see revision note).

## Phase 9 — Monte Carlo simulation engine

Build the Monte Carlo engine in Rust. Run 1000+ simulations per configuration, adding randomness around the selected price model's projections. Return percentile distributions. Include Rust tests: deterministic seed produces reproducible results, percentile calculations are correct, edge cases (zero holdings, single-year retirement) handled. Deliverable: results show success rate (% of simulations where funds last the full retirement) and percentile bands, with passing tests.

> Note (2026-08-22): the engine SHALL support resuming simulation from an arbitrary `RuntimeState` (BTC, cash, year, buffer flags) — the "Today" advisor (Phase 15) conditions Monte Carlo runs on the user's real present state. The same `RuntimeState` struct serves simulator paths and the advisor's single real path.

## Phase 10 — Results visualization

Display Monte Carlo results as fan charts (percentile bands over time), success rate indicators, and a detailed year-by-year table. Charts use responsive containers that adapt axis density and legend placement to screen width. Tables switch to a card layout on mobile. Add educational tooltips explaining what the numbers mean. Deliverable: a complete, mobile-friendly results dashboard for classic FIRE.

## Phase 11 — Guardrails withdrawal strategy

> Merged into Phase 7 (see revision note). Guardrails become knobs (floor/ceiling thresholds, adjustment size, prosperity rule) within the unified policy.

## Phase 12 — Buy-Borrow-Die strategy

> Note (2026-08-22): BBD does not fit the shared knob set — it adds liability state (loan balance, LTV, interest, repayment mode) alongside asset state. It becomes a 4th preset with its own knob schema in the same tabs UI.

Implement buy-borrow-die in Rust: borrow against BTC holdings instead of selling, with configurable LTV ratios and interest rates. The user can configure the loan repayment mode: (a) **amortized loan** — the loan must be repaid over a configurable period (e.g., 5, 10, 20 years), with principal + interest payments deducted each year; or (b) **rolling line of credit** — interest-only payments, the principal rolls over indefinitely and is never repaid (or repaid from estate). Add to strategy selector. Include Rust tests for both loan modes (amortization schedule, interest accrual, LTV liquidation boundary). Deliverable: four withdrawal strategies available and comparable, with loan mode toggle in the BBD configuration panel, with passing tests.

## Phase 13 — Scenario comparison

Allow users to save and compare multiple scenarios side by side (different models, strategies, parameters). Visual overlay on charts with individual toggles. On mobile, scenarios are compared via a swipeable tab interface rather than side-by-side panels. Deliverable: users can run two or more scenarios and see them compared on any screen size.

## Phase 14 — Polish and education

Add onboarding flow for first-time users (optimized for mobile-first tap-through). Expand educational tooltips and explanations for each model and strategy. Add a disclaimer/about section. Final responsive QA pass across phone, tablet, and desktop breakpoints. Deliverable: the app is usable by someone with no prior BTC/FIRE knowledge on any device.

> Tooltip design decisions (captured 2026-08-22 during withdrawal-policy exploration):
> - Info buttons on every parameter (knobs, presets, and section headers), **tap-or-hover** — hover doesn't exist on touch, so the icon is a real button; Base UI tooltip/popover + `lucide-react` Info icon, keyboard focusable, no new dependencies (`@base-ui/react` already in stack).
> - **Two-layer content**: plain-language definition + a worked example **computed from the user's live parameter values** (e.g., "your rate starts at 4%; if it rises above 4.8%, spending is cut by 10%").
> - **Single content registry** `web/src/lib/education.ts` keyed by parameter id (title, blurb, why-it-matters, dynamic example fn), with a test asserting every knob in the parameter inventory has an entry.
> - Icons **always visible but muted** (discoverability on touch; no hover-reveal on mobile).
> - Small ~16px glyph with an invisible **44px hit area** to satisfy the touch-target requirement without visual bulk.

## Phase 15 — Today: the advisor (in-retirement mode)

The "Today" top-level section. Monthly check-in ritual (no server, no push — "N days since last check-in" nudge instead). The user manually enters their current state (BTC balance, cash buffer, years in retirement, current base expense); the app computes market state from live data it already has (current price, Mayer Multiple via 200-day SMA from cached history + live tail, Power Law quantile from model bands). The advisor evaluates the active policy against the measured state: prescribed monthly action (drip, buffer action, extra sales) plus "what if" deviation scoring — mini Monte Carlo runs conditioned on today's state, reporting Δ survival rate and Δ worst case. Engine resumes from `RuntimeState` (see Phase 9 note). Deliverable: a retiree opens the app once a month and knows what their plan says to do, in the plan's own language.

## Phase 16 — Steer: conditional planning and ratchet

Conditional decision trees around the present ("if M crosses 2.4, your action is full buffer recharge"). Lifestyle ratchet events: re-simulate conditioned on today's state with a proposed new base expense (per the valuation-based strategy's ratchet rule). Regime-aware Monte Carlo: condition future price draws on the current valuation quantile (v2 of the advisor's scoring fidelity). Deliverable: users can plan around near-term market conditions, not only unconditional long-run distributions.

## Phase 17 — Deployment and optimization

Production build optimization (WASM size, code splitting). Set up deployment to Vercel or GitHub Pages. Add PWA support for offline use. Performance profiling of Monte Carlo runs. Deliverable: live, publicly accessible app with sub-second simulation times.

## Phase 18 (candidate, unscheduled) — Taxes

FIFO lot accounting, capital-gains brackets per sale, wealth-tax thresholds. Not scheduled: it mutates every strategy's output (net-of-tax spending, BBD comparison) and needs acquisition history as new state. Revisit after the advisor ships.
