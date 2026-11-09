# Tasks: Cloudflare Pages deployment

## 1. Production blockers

- [x] 1.1 Fix `web/index.html` CSP: `connect-src 'self' https://api.binance.com` (remove CryptoCompare)

## 2. Cloudflare Pages configuration

- [x] 2.1 Add `web/wrangler.toml` with `name = "btcfire"`, `pages_build_output_dir = "./dist"`, and `compatibility_date`
- [x] 2.2 Add `deploy` script to `web/package.json` (`npm run build && wrangler pages deploy`) and Wrangler under `devDependencies`
- [x] 2.3 Add `web/public/_headers` with security headers and immutable caching for `/assets/*`

## 3. Automated deployment

- [x] 3.1 Add `.github/workflows/deploy.yml` — build WASM + Vite on Node 24 and deploy to Cloudflare Pages on `main` and `workflow_dispatch`, using `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`

## 4. Docs and roadmap

- [x] 4.1 Reorder `specs/roadmap.md`: deployment becomes Phase 12; Buy-Borrow-Die/Scenario/Polish/Today/Steer become 13–17; Taxes stays 18; update cross-references
- [x] 4.2 Update `README.md` (roadmap table, features, Cloudflare deployment instructions) and `openspec/config.yaml` spec history
- [x] 4.3 Add a `CHANGELOG.md` entry

## 5. Verification

- [x] 5.1 `cd web && npm ci && npm run build` succeeds and emits `dist/index.html`, JS, WASM, and `_headers`
- [x] 5.2 `npx wrangler pages deploy` uploads successfully and the live URL serves the app
- [x] 5.3 Confirm live price data loads under the deployed CSP (no console CSP violations) and assets are cached
