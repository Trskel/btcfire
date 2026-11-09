# Design: Cloudflare Pages deployment

## Context

The repo is a two-package monorepo: `wasm/` (Rust crate built with `wasm-pack --target web`) and `web/` (React/Vite). `web/package.json` already chains the WASM build through `prebuild` (`npm run build:wasm` → `scripts/build-wasm.mjs`). `wasm/pkg` is gitignored, so every production build must compile Rust first. The bundle is fully static: no server, no SSR, no client-side router.

Cloudflare Pages' build image v3 ships Node, Python, Go, Ruby, and Bun but **not Rust or wasm-pack**. A Pages Git-integration build would therefore need to install a Rust toolchain inside the build container (~5–10 minutes, with cache uncertainty). The project already runs its tests on GitHub Actions with a working Rust setup.

## Goals / Non-Goals

**Goals**
- Deploy the existing production bundle to Cloudflare Pages under project `btcfire`.
- Make deployment repeatable locally and from CI.
- Ship sane static security/caching headers and unblock the Binance API in the CSP.

**Non-Goals**
- WASM size optimization, code splitting, PWA/offline support, and Monte Carlo profiling (the rest of Phase 12).
- Cloudflare Workers migration, custom domains, or analytics.
- Committing build artifacts or `wasm/pkg`.

## Decisions

1. **Direct upload + GitHub Actions instead of Pages Git integration.** Pages cannot build the Rust crate out of the box. Local `wrangler pages deploy` gives an immediate deploy today; the GitHub Action builds on `ubuntu-latest` with the same `dtolnay/rust-toolchain` + `wasm-pack` setup as CI and uploads with Wrangler. If Git integration is ever preferred, the build command would be `npm --prefix web ci && npm --prefix web run build` plus a toolchain bootstrap step.

2. **`web/wrangler.toml` next to the app.** `pages_build_output_dir = "./dist"` keeps the deploy command runnable from `web/`, alongside the existing scripts and lockfile. Project name is pinned to `btcfire`.

3. **Deploy script composition.** `npm run deploy` = `npm run build && wrangler pages deploy`. `npm run build` already triggers `prebuild` → WASM compile → `tsc -b && vite build`, so there is a single entry point and no duplicated build logic.

4. **CSP in the document, not only `_headers`.** The existing `<meta http-equiv="Content-Security-Policy">` is kept (it also protects `vite preview`) and corrected to `connect-src 'self' https://api.binance.com`. `_headers` adds non-CSP hardening (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) plus immutable caching for hashed `assets/`.

5. **Single-page routing needs no `_redirects`.** The app has no client-side router; every URL is served by `index.html` at `/`. Adding a catch-all rewrite would only mask missing assets.

## Risks / Trade-offs

- **[CI secrets missing]** → the deploy job fails on push until `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are added; documented in README. Local `npm run deploy` remains the escape hatch.
- **[Wrangler major-version drift]** → pinned as a devDependency and locked in `package-lock.json`.
- **[Binance CORS from browsers]** → already relied on by the app and confirmed in earlier phases; the CSP change makes the existing behavior legal in production.
- **[Pages build minutes]** → avoided entirely by building outside Pages.

## Migration Plan

1. Create/confirm the `btcfire` Pages project (`wrangler pages project create btcfire` dedupes or errors if it exists).
2. Authenticate locally (`wrangler login`) and run `npm run deploy`.
3. Add the two CI secrets to enable automatic deploys; verify the live URL, CSP network calls, and asset caching.

Rollback: Cloudflare Pages keeps every deployment, so the dashboard can instantly re-point or roll back to the previous deployment; the repo changes are additive.
