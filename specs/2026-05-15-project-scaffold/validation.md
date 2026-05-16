# Phase 1 — Project Scaffold: Validation

## Merge criteria

All five checks must pass before this phase can be merged to `main`.

### 1. WASM function callable from React

- The React app imports a function from the Rust/WASM crate.
- Clicking a button in the UI calls the WASM function and displays its return value.
- The displayed value proves the Rust code executed (not a hardcoded string).

### 2. Dev server works with HMR

- `npm run dev` starts the Vite dev server without errors.
- The app loads in the browser and renders the landing page with styled shadcn/ui components.
- Changes to React/TypeScript files trigger hot reload.

### 3. Mobile-first responsive layout

- The page renders correctly at 375px viewport width with no horizontal scrolling.
- Interactive elements (buttons, links) have at least 44×44px touch targets.
- The layout scales gracefully to tablet (768px) and desktop (1024px+) widths.
- The viewport meta tag is present and configured correctly.

### 4. Test suites pass

- `cd web && npm test` runs Vitest and all React component tests pass.
- `cd wasm && wasm-pack test --node` runs Rust/WASM tests and all pass.
- At least one test exists per suite (React smoke test, Rust `greet` test).

### 5. Production build produces a working static bundle

- `npm run build` completes without errors.
- The `dist/` output contains the WASM binary bundled alongside the JS.
- Serving `dist/` with a static file server (e.g., `npx serve dist`) renders a fully functional app — identical behavior to dev mode.

## How to test

```bash
# Build the WASM crate
cd wasm && wasm-pack build --target web && cd ..

# Run Rust tests
cd wasm && wasm-pack test --node && cd ..

# Install and start dev server
cd web && npm install && npm run dev
# → Open browser, click the button, verify WASM output appears

# Run React tests
cd web && npm test

# Production build
cd web && npm run build
npx serve dist
# → Open browser, verify same behavior as dev
```

## What "done" looks like

A fresh clone of the repo can run the commands above and see a React page with styled components that calls a Rust function via WASM. No BTC logic yet — just the pipeline proven end to end.
