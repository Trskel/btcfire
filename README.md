# BTCFire — Bitcoin Retirement Simulator

**Your Bitcoin. Your retirement. Your privacy.** BTCFire runs thousands of Monte Carlo simulations in your browser so you can model whether a BTC-denominated portfolio can sustain you through retirement. No servers, no accounts, no data leaves your machine.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Rust](https://img.shields.io/badge/Rust-WASM-DEA584?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

---

## Why BTCFire?

Traditional retirement calculators work for fiat portfolios — stocks, bonds, 401(k)s. They don't understand Bitcoin's asymmetric volatility, its historically exponential growth profile, or the implications of holding a supply-capped asset through decades of inflation. At the same time, Bitcoin-native tools tend to be trading dashboards or price prediction engines, not retirement planning platforms.

BTCFire bridges that gap.

It models the future using **multiple price models** (Power Law, Stock-to-Flow, Bitcoin24), runs **thousands of Monte Carlo scenarios** to capture uncertainty, and tests your holdings against **different withdrawal strategies** (Classic FIRE, Guardrails, Buy-Borrow-Die). The output isn't a single number — it's a distribution of outcomes and a success probability.

## How It Works

<p align="center">
  <strong>Historic BTC price</strong> → <strong>Price model projection</strong> → <strong>Monte Carlo simulation</strong> → <strong>Retirement outcome probability</strong>
</p>

1. **Fetch historic data** — BTC daily price history from Binance's public API (daily klines fetched in batches back to genesis), cached locally with stale-cache detection.
2. **Fit a price model** — Power Law regression, Stock-to-Flow, or configurable custom parameters, extended decades into the future with statistical confidence bands.
3. **Define your stack** — BTC holdings, annual spending, inflation rate, retirement timeline.
4. **Choose a withdrawal strategy** — Classic FIRE (fixed real spending), Guardrails (adaptive spending), Buy-Borrow-Die (leverage instead of selling).
5. **Run the simulation** — Rust/WASM Monte Carlo engine runs 1,000+ scenarios in milliseconds, right in your browser.
6. **Explore results** — fan charts, percentile bands, success rates, and year-by-year breakdowns.

## ✨ Features (so far)

| Done | Feature |
|------|---------|
| ✅ | Interactive BTC price history chart (ECharts, log/linear, pan/zoom) |
| ✅ | Power Law price model (log-log fit, power fit, custom parameters) |
| ✅ | Stock-to-Flow (S2F) price model (log price ~ log S2F regression) |
| ✅ | Bitcoin24 price model (CAGR regression, ±1σ confidence bands) |
| ✅ | Checkbox visibility controls — show multiple model overlays on the chart simultaneously |
| ✅ | Shared projection horizon slider — one control for all models |
| ✅ | Expandable controls panels per model with auto-expand on check |
| ✅ | Configurable confidence bands (±1σ, ±2σ, custom percentiles) |
| ✅ | Binance historic price data (batched fetch, stale-cache detection, manual refresh) |
| ✅ | WASM-powered model fitting — sub-millisecond recomputation |
| ✅ | Full Power Law controls: formulation, band style, projection horizon slider |
| ✅ | Reactive model overlay on the chart — no "Run" button needed |
| ✅ | Light / dark theme with system preference detection |
| ✅ | Mobile-first responsive design (usable at 375px) |
| ✅ | Full test suite: Rust unit tests + React component tests + integration |
| 🚧 | Withdrawal strategies (Phase 7–12) |
| 🚧 | Monte Carlo engine and results dashboard (Phase 9–10) |
| 🚧 | Scenario comparison (Phase 13) |

## 🔒 Privacy by Design

- **Everything runs client-side.** Your financial data — holdings, spending, age — never leaves your browser.
- **No accounts, no servers, no telemetry, no analytics.** The site sends exactly two network requests: fetching historic BTC prices from Binance's public API, and loading the static app bundle. That's it.
- **Local storage only.** Your configuration parameters are saved to `localStorage` for convenience across sessions. You can clear them anytime.
- **Verifiable privacy.** The entire application is static HTML/CSS/JS/WASM. You can audit the network tab in DevTools and see there's nothing phoning home.

This isn't just a nice-to-have. Bitcoin retirement planning involves sensitive financial projections. Your employer, your bank, and your government have no business knowing when you plan to retire or how much bitcoin you hold.

## 🧠 Tech Stack

### Why Rust + WASM?

Monte Carlo retirement modeling requires running thousands of simulations with compound interest calculations, price model projections, and withdrawal logic across 30–50 year time horizons. Doing this in JavaScript would create a laggy UX. Rust compiled to WebAssembly delivers **native-level performance in the browser** — results update in real time as you drag sliders.

<div align="center">

| Layer | Technology | Why |
|-------|-----------|-----|
| **UI** | React 19 + TypeScript | Type-safe, component-based, enormous ecosystem |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Utility-first, accessible, theme-able out of the box |
| **Charts** | ECharts | High-performance canvas rendering for financial data |
| **Simulation** | Rust → WASM | Near-native speed for Monte Carlo, strong type safety |
| **WASM bridge** | wasm-bindgen + serde | Type-safe JS ↔ Rust interop, zero-cost serialization |
| **Build** | Vite + wasm-pack | Fast HMR, native WASM bundling |
| **Testing** | Vitest + wasm-pack test | ESM-first testing for both JS and Rust |
| **Deploy** | Static HTML/CSS/JS/WASM | Vercel or GitHub Pages, zero server cost |

</div>

### Architecture

```
┌──────────────────────────────────────────┐
│               Browser                     │
│                                           │
│  ┌───────────────┐   ┌─────────────────┐  │
│  │   React UI    │   │   Rust / WASM   │  │
│  │               │   │                 │  │
│  │ • ECharts     │◄──│ • Power Law     │  │
│  │ • shadcn/ui   │   │ • S2F           │  │
│  │ • Tailwind    │   │ • Withdrawals   │  │
│  │ • localStorage│   │ • Monte Carlo   │  │
│  └───────────────┘   └─────────────────┘  │
│           │                               │
│           ▼                               │
│  ┌───────────────────┐                    │
│  │  Public BTC API   │ (historic prices)  │
│  └───────────────────┘                    │
└──────────────────────────────────────────┘
```

**Zero backend. Fully static. Deployable anywhere.**

## 🚀 Running Locally

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [Rust](https://www.rust-lang.org/) (stable) with `wasm32-unknown-unknown` target
- [wasm-pack](https://rustwasm.github.io/wasm-pack/) ≥ 0.12

```bash
# Install the Rust WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
cargo install wasm-pack
```

### Development

```bash
# Clone and enter the project
git clone https://github.com/YOUR_USERNAME/btcfire.git
cd btcfire

# Build the WASM module
cd wasm && wasm-pack build --target web && cd ..

# Install frontend dependencies
cd web && npm install

# Start the dev server
npm run dev
```

The app opens at `http://localhost:5173`. Hot Module Replacement is enabled — changes to React/TypeScript code reload instantly. For Rust changes, rebuild with `wasm-pack build --target web` from the `wasm/` directory.

### Testing

```bash
# Rust/WASM tests
cd wasm && wasm-pack test --node && cd ..

# Frontend tests
cd web && npm test

# Lint
cd web && npm run lint
```

### Production build

```bash
cd wasm && wasm-pack build --target web && cd ..
cd web && npm run build
# Output in web/dist/ — deploy to Vercel, Netlify, or GitHub Pages
```

## 📁 Project Structure

```
btcfire/
├── specs/                 # Project spec documents (mission, roadmap, tech stack)
├── openspec/              # OpenSpec change proposals (design, delta specs, tasks)
├── .claude/               # Claude Code commands and skills for the OpenSpec workflow
├── wasm/                  # Rust/WASM simulation engine
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs         # WASM entry point + bindings
│       ├── data/          # Price data types and parsing
│       ├── models/        # Price models (power_law, s2f, bitcoin24)
│       ├── strategies/    # Withdrawal strategies
│       └── simulation/    # Monte Carlo engine
└── web/                   # React/TypeScript frontend
    ├── src/
    │   ├── components/    # UI components
    │   │   ├── ui/        # shadcn/ui primitives
    │   │   ├── charts/    # ECharts components
    │   │   └── controls/  # Parameter panels
    │   ├── hooks/         # Custom React hooks
    │   ├── lib/           # API client, cache layer, utilities
    │   └── types/         # TypeScript type definitions
    └── vite.config.ts
```

## 🧭 Spec-Driven Development

BTCFire is built using **spec-driven development** — a methodology where each feature is fully specified before a single line of code is written. Every phase of the roadmap is documented as a trio of living spec files stored alongside the code:

```
specs/YYYY-MM-DD-feature-name/
├── requirements.md   # What we're building, in scope / out of scope, decisions, and rationale
├── plan.md           # Task groups, acceptance tests, and implementation order
└── validation.md     # Merge criteria — every check that must pass before the phase ships
```

**Why this matters:**

- **Decisions are explicit.** Every design choice lives in `requirements.md` with a clear rationale. There's no "why did we do it this way?" — the answer is in the repo.
- **Scope is bounded.** Each phase has an explicit "in scope / out of scope" section. Features don't creep — future ideas go into later phases, not the current one.
- **Merge criteria are objective.** `validation.md` lists concrete, verifiable checks (test pass, build succeeds, chart renders, mobile works at 375px). A phase either merges or it doesn't — no ambiguity.
- **Context survives.** Anyone can pick up the project months later and understand exactly what Phase 3 was supposed to deliver, what was deliberately excluded, and what tests prove it works.

This practice eliminates the most common cause of project failure: building the wrong thing because nobody wrote down what "done" looks like. The specs are the contract between intent and implementation.

New changes are managed with the **OpenSpec** workflow: each change lives in `openspec/changes/<change-id>/` with a proposal, design notes, delta specs, and a task list, and is driven by Claude Code commands and skills in `.claude/` (`/opsx:propose`, `/opsx:apply`, `/opsx:archive`).

## 🎯 Design Philosophy

- **Honesty over hype.** Bitcoin's future is unknowable. BTCFire shows probability distributions, not confident single-point predictions buried in fine print.
- **Education over prescription.** Every model and strategy comes with plain-language explanations of its assumptions and limitations. Users make informed choices.
- **Simplicity by default, depth on demand.** Sensible defaults work out of the box. Power users get full parameter control.
- **Real-time feedback.** No "Run Simulation" button. Results update as you drag sliders.

## 📋 Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project scaffold (Rust/WASM + React/Vite) | ✅ Done |
| 2 | Historic BTC price data + interactive chart | ✅ Done |
| 3 | Power Law price model + chart overlay | ✅ Done |
| 4 | Stock-to-Flow price model | ✅ Done |
| 5 | Bitcoin24 price model | ✅ Done |
| 6 | User stack configuration | 🚧 Planned |
| 7–8 | Withdrawal strategies (Classic FIRE, Fixed %) | 🚧 Planned |
| 9–10 | Monte Carlo engine + Results dashboard | 🚧 Planned |
| 11–12 | Guardrails + Buy-Borrow-Die strategies | 🚧 Planned |
| 13 | Scenario comparison | 🚧 Planned |
| 14–15 | Polish, education, deployment, PWA | 🚧 Planned |

## ⚠️ Disclaimer

BTCFire is a simulation tool for educational and planning purposes. It is **not financial advice**. Past performance of any asset does not predict future results. All price models make assumptions that may prove wrong. Cryptocurrency is volatile — you could lose everything. Consult a qualified financial advisor before making retirement decisions.

## 📄 License

MIT © [Your Name]

---

<p align="center">
  <em>Built with Rust, React, and a healthy skepticism of financial models.</em>
</p>
