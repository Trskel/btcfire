# Phase 1 — Project Scaffold: Plan

## Task Group 1: Rust/WASM crate

1. Create `wasm/` directory with `Cargo.toml` configured for `cdylib` + `rlib` targets.
2. Add dependencies: `wasm-bindgen`, `serde`, `serde-wasm-bindgen`.
3. Write `src/lib.rs` with a `#[wasm_bindgen]` exported function (e.g., `greet`).
4. Create module stubs for future work: `src/models/mod.rs`, `src/strategies/mod.rs`, `src/simulation/mod.rs`.
5. Verify `wasm-pack build --target web` succeeds and produces `pkg/`.

## Task Group 2: React/Vite app

1. Scaffold `web/` with `npm create vite@latest` (React + TypeScript template).
2. Install Vite plugins: `vite-plugin-wasm`, `vite-plugin-top-level-await`.
3. Configure `vite.config.ts` to use the WASM plugins.
4. Add a local file dependency or path reference to `wasm/pkg/` in `package.json`.
5. Verify `npm run dev` starts the dev server.

## Task Group 3: Tailwind + shadcn/ui + responsive layout

1. Install and configure Tailwind CSS (v4 or latest stable) in the Vite app.
2. Initialize shadcn/ui (`npx shadcn@latest init`).
3. Add base components: Button, Card.
4. Confirm viewport meta tag is set (`<meta name="viewport" content="width=device-width, initial-scale=1">`).
5. Create a mobile-first landing page layout: single-column stack at default width, expanding at `md`+ breakpoints. Card and Button must have touch-friendly sizing (min 44px tap targets). No horizontal overflow at 375px width.

## Task Group 4: WASM integration

1. Import the WASM module in React (`import init, { greet } from 'btcfire-wasm'`).
2. Call `greet()` on button click and display the result in the UI.
3. Verify HMR works: change the Rust function, rebuild WASM, see the update in the browser.

## Task Group 5: Test infrastructure

1. Install Vitest, `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` in `web/`.
2. Configure Vitest in `vite.config.ts` (or `vitest.config.ts`) with `jsdom` environment.
3. Write a smoke test for `App.tsx`: renders without crashing, displays the WASM button.
4. Write a Rust unit test in `src/lib.rs` (`#[cfg(test)]` module) verifying `greet()` output.
5. Add `wasm-pack test --node` support: add `wasm-bindgen-test` dev-dependency to `Cargo.toml`.
6. Add `"test"` script to `web/package.json` that runs `vitest run`.
7. Add a root-level script or document that runs both: `cd wasm && wasm-pack test --node && cd ../web && npm test`.

## Task Group 6: Production build

1. Run `npm run build` and confirm it succeeds with WASM bundled.
2. Serve the `dist/` output with a static server (`npx serve dist`) and verify it works.
3. Add root `.gitignore` covering `node_modules/`, `dist/`, `target/`, `wasm/pkg/`.
