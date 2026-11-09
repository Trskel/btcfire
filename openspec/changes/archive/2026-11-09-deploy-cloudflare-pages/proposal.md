# Proposal: Cloudflare Pages deployment

## Why

BTCFire is a fully static, client-side app — React, Rust/WASM, and localStorage — but it has never been hosted. Roadmap Phase 12 (promoted from Phase 17 on 2026-11-09) calls for a publicly accessible build. Deploying surfaced a production-only blocker: the Content-Security-Policy in `web/index.html` allow-lists the retired CryptoCompare host and omits `https://api.binance.com`, so the live price tail would be blocked in production.

## What Changes

- Add a **Cloudflare Pages project configuration** (`web/wrangler.toml`, project `btcfire`, output `dist`).
- Add an **`npm run deploy` script** that builds WASM + the Vite bundle, then uploads with Wrangler.
- Add a **GitHub Actions deploy workflow** that builds and deploys on pushes to `main` and manual dispatch.
- Add **static security/caching headers** (`web/public/_headers`).
- Fix the **CSP** to allow Binance's public klines API from the browser.
- Document the deployment flow in the README and record the phase reorder in the roadmap.

## Capabilities

### New Capabilities

- `deployment`: the production static build, Cloudflare Pages project configuration, local and CI deploy pipelines, and static security headers (including the browser CSP allow-list).

### Modified Capabilities

<!-- none: runtime simulation, UI, and data behavior are unchanged -->

## Impact

- New files: `web/wrangler.toml`, `web/public/_headers`, `.github/workflows/deploy.yml`.
- Changed files: `web/package.json` (deploy script + Wrangler devDependency), `web/index.html` (CSP), `README.md`, `CHANGELOG.md`, `specs/roadmap.md`, `openspec/config.yaml`.
- No WASM or UI behavior changes; no new runtime dependency (Wrangler is a build-time devDependency).
- Deployment requires Cloudflare credentials (`wrangler login` locally, or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in CI).
