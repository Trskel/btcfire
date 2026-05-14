# BTCFire — Tech Stack

## Architecture overview

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│                                              │
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │   React/TS UI    │  │   Rust/WASM      │  │
│  │                  │◄─┤                  │  │
│  │  - Charts        │  │  - Price models  │  │
│  │  - Controls      │  │  - Strategies    │  │
│  │  - Tables        │  │  - Monte Carlo   │  │
│  │  - Local Storage │  │  - Projections   │  │
│  └──────────────────┘  └──────────────────┘  │
│            │                                  │
│            ▼                                  │
│  ┌──────────────────┐                        │
│  │  Public BTC API  │ (historic prices only) │
│  └──────────────────┘                        │
└─────────────────────────────────────────────┘
```

Fully static. Deployable to Vercel, GitHub Pages, or any CDN.

## Frontend

| Choice      | What                | Why                                                       |
|-------------|---------------------|-----------------------------------------------------------|
| **Vite**    | Build tool          | Fast HMR, native WASM support via `vite-plugin-wasm`      |
| **React**   | UI framework        | TypeScript-first, large ecosystem                         |
| **shadcn/ui** | Component library | Accessible, Tailwind-based, copied into codebase (no dep) |
| **Tailwind CSS** | Styling         | Utility-first, pairs with shadcn/ui                       |
| **Recharts** | Charts             | React-native charting, composable, good for financial data |

## Simulation engine (Rust/WASM)

| Choice         | What              | Why                                                    |
|----------------|-------------------|--------------------------------------------------------|
| **Rust**       | Language           | Performance for Monte Carlo, compiles to WASM          |
| **wasm-pack**  | Build tool         | Generates JS bindings, npm-compatible output           |
| **wasm-bindgen** | JS interop      | Type-safe bridge between Rust and TypeScript           |
| **serde**      | Serialization      | Pass structured data (configs, results) across the boundary |
| **rand**       | RNG                | `rand` crate with `wasm` feature for in-browser randomness |

## Data flow

1. User adjusts parameters in React UI (sliders, dropdowns).
2. React serializes config and calls WASM function.
3. Rust runs Monte Carlo simulation (1000+ scenarios) and returns results.
4. React renders charts and tables from results.
5. User config is persisted to `localStorage`.

## Historic price data

- Fetched from a free public API (e.g., CoinGecko, Blockchain.com) on first load.
- Cached in `localStorage` with a TTL (refresh daily).
- Used as input for model calibration and chart display.

## Project structure

```
btcfire/
├── specs/                # This directory — project constitution
├── wasm/                 # Rust crate (simulation engine)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs        # WASM entry point
│       ├── models/       # Price estimation models
│       │   ├── mod.rs
│       │   ├── power_law.rs
│       │   ├── s2f.rs
│       │   └── bitcoin24.rs
│       ├── strategies/   # Withdrawal strategies
│       │   ├── mod.rs
│       │   ├── classic.rs
│       │   ├── guardrails.rs
│       │   └── bbd.rs
│       └── simulation/   # Monte Carlo engine
│           ├── mod.rs
│           └── engine.rs
├── web/                  # React application
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── ui/       # shadcn/ui components
│       │   ├── charts/   # Chart components
│       │   ├── controls/ # Parameter panels
│       │   └── tables/   # Results tables
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # WASM bindings, API client, utils
│       └── types/        # TypeScript type definitions
└── README.md
```

## Deployment

- Static build: `vite build` produces a `dist/` folder.
- WASM is bundled into the JS output by Vite.
- Deploy to Vercel (`vercel --prod`) or GitHub Pages.
- Zero runtime cost — no server, no database, no API keys.
