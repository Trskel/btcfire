# BTCFire — Roadmap

Each phase is roughly half a day of work and delivers a testable result. All UI work follows a mobile-first responsive approach — features are designed for phone screens first, then enhanced for larger viewports.

## Phase 1 — Project scaffold

Set up the monorepo structure: Rust/WASM crate with `wasm-pack`, React/Vite app with Tailwind and shadcn/ui, and the build pipeline that wires them together. The app uses mobile-first responsive layout from the start. Configure Vitest for the React app and `wasm-pack test` for Rust. Deliverable: a "Hello from WASM" message rendered in the React app with a responsive layout that works on phone-sized screens, plus passing test suites for both Rust and React (`npm test` runs both).

## Phase 2 — Historic price data

Fetch historic BTC price data from a free public API (CoinGecko). Cache in localStorage. Display the price history as a responsive interactive Recharts line chart (log/linear toggle) that adapts to screen width — simplified axis labels and touch-friendly tooltips on mobile. Deliverable: a chart showing BTC's full price history from the API, usable on both phone and desktop screens.

## Phase 3 — Power Law price model

Implement the Power Law model in Rust. Given a year, return median price and confidence bands. Expose via WASM. Overlay the model's projection onto the historic price chart. Include Rust unit tests validating model output against known reference values. Deliverable: chart shows historic prices + Power Law projection into the future, with passing tests.

## Phase 4 — S2F price model

Implement Stock-to-Flow model in Rust. Same interface as Power Law. Add a model selector to the UI so users can switch between Power Law and S2F. Include Rust unit tests for S2F calculations. Deliverable: users can toggle between two price models on the chart, with passing tests.

## Phase 5 — Bitcoin24 price model

Implement MicroStrategy's Bitcoin24 model in Rust. Add to model selector. Include Rust unit tests. Deliverable: three price models available, all comparable on the same chart, with passing tests.

## Phase 6 — User stack configuration

Build the parameter input panel: initial BTC holdings, retirement start year, current age, expected lifespan, annual spending (in fiat). Persist to localStorage. On mobile, the panel is full-width and stacks above the results; on desktop, it renders as a sidebar. All sliders and inputs have touch-friendly sizing (min 44px targets). Deliverable: a responsive parameter panel with sliders and inputs that save across sessions and work on all screen sizes.

## Phase 7 — Classic FIRE withdrawal strategy

Implement the classic FIRE withdrawal strategy in Rust: the user sets an initial annual spending amount in fiat, which increases each year with inflation (configurable inflation rate). BTC is sold each year to cover that year's spending. Wire to the UI. On mobile, the year-by-year results display as a scrollable card list rather than a wide table. Include Rust tests verifying withdrawal math (inflation compounding, balance depletion). Deliverable: given user stack + a price model, show year-by-year BTC and fiat balances in a responsive table/card layout, with passing tests.

## Phase 8 — Fixed percentage withdrawal strategy

Implement a separate withdrawal strategy: withdraw a fixed percentage of the current BTC stack each year (e.g., 4% of remaining holdings). Unlike classic FIRE, the withdrawal amount fluctuates with portfolio value — more in good years, less in bad years. Add to strategy selector. Include Rust tests for percentage withdrawal calculations. Deliverable: users can compare classic FIRE vs. fixed-percentage results, with passing tests.

## Phase 9 — Monte Carlo simulation engine

Build the Monte Carlo engine in Rust. Run 1000+ simulations per configuration, adding randomness around the selected price model's projections. Return percentile distributions. Include Rust tests: deterministic seed produces reproducible results, percentile calculations are correct, edge cases (zero holdings, single-year retirement) handled. Deliverable: results show success rate (% of simulations where funds last the full retirement) and percentile bands, with passing tests.

## Phase 10 — Results visualization

Display Monte Carlo results as fan charts (percentile bands over time), success rate indicators, and a detailed year-by-year table. Charts use responsive containers that adapt axis density and legend placement to screen width. Tables switch to a card layout on mobile. Add educational tooltips explaining what the numbers mean. Deliverable: a complete, mobile-friendly results dashboard for classic FIRE.

## Phase 11 — Guardrails withdrawal strategy

Implement the guardrails strategy in Rust: dynamic withdrawal rates that adjust based on portfolio performance (spend more in good years, cut in bad years). Add to strategy selector in UI. Include Rust tests verifying guardrail triggers and adjustment logic. Deliverable: users can compare classic FIRE vs. guardrails results, with passing tests.

## Phase 12 — Buy-Borrow-Die strategy

Implement buy-borrow-die in Rust: borrow against BTC holdings instead of selling, with configurable LTV ratios and interest rates. The user can configure the loan repayment mode: (a) **amortized loan** — the loan must be repaid over a configurable period (e.g., 5, 10, 20 years), with principal + interest payments deducted each year; or (b) **rolling line of credit** — interest-only payments, the principal rolls over indefinitely and is never repaid (or repaid from estate). Add to strategy selector. Include Rust tests for both loan modes (amortization schedule, interest accrual, LTV liquidation boundary). Deliverable: four withdrawal strategies available and comparable, with loan mode toggle in the BBD configuration panel, with passing tests.

## Phase 13 — Scenario comparison

Allow users to save and compare multiple scenarios side by side (different models, strategies, parameters). Visual overlay on charts with individual toggles. On mobile, scenarios are compared via a swipeable tab interface rather than side-by-side panels. Deliverable: users can run two or more scenarios and see them compared on any screen size.

## Phase 14 — Polish and education

Add onboarding flow for first-time users (optimized for mobile-first tap-through). Expand educational tooltips and explanations for each model and strategy. Add a disclaimer/about section. Final responsive QA pass across phone, tablet, and desktop breakpoints. Deliverable: the app is usable by someone with no prior BTC/FIRE knowledge on any device.

## Phase 15 — Deployment and optimization

Production build optimization (WASM size, code splitting). Set up deployment to Vercel or GitHub Pages. Add PWA support for offline use. Performance profiling of Monte Carlo runs. Deliverable: live, publicly accessible app with sub-second simulation times.
