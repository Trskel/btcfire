# Phase 1 — Project Scaffold: Requirements

## Goal

Establish the full development pipeline: a Rust/WASM simulation crate, a React/TypeScript frontend, and the build tooling that connects them. By the end of this phase, a Rust function is callable from React in the browser.

## Scope

### In scope

- **Rust/WASM crate** (`wasm/`): a minimal crate using `wasm-pack` and `wasm-bindgen` that exports at least one function (e.g., `greet(name: &str) -> String`).
- **React/TypeScript app** (`web/`): a Vite-based React app that imports and calls the WASM module.
- **Tailwind CSS**: installed and configured in the React app.
- **shadcn/ui**: initialized with a few base components (Button, Card) to confirm the component pipeline works.
- **Build pipeline**: `npm run dev` serves the app with HMR; `npm run build` produces a static bundle with WASM included.
- **Project root files**: `.gitignore`, root-level scripts or docs as needed.

### Out of scope

- Any BTC-related logic (price models, strategies, simulations).
- API calls, localStorage, or data persistence.
- CI/CD workflows (deferred to Phase 15).
- Deployment configuration.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo structure | `wasm/` + `web/` as sibling top-level dirs | Simple, matches tech-stack.md, `web/` imports WASM via local file path |
| WASM build tool | `wasm-pack` | Generates JS/TS bindings and an npm-compatible `pkg/` output |
| Vite WASM integration | `vite-plugin-wasm` + `vite-plugin-top-level-await` | Enables native WASM ESM imports without manual glue |
| Component library | shadcn/ui (installed in this phase) | Foundation ready for Phase 2+; avoids re-setup later |

## Context

This is Phase 1 of the BTCFire roadmap. Everything built here is the foundation for all future phases. The key risk is the WASM-to-React integration — once that pipeline works, subsequent phases only add Rust logic and React UI on top of it.
