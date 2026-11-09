# Deployment Specification (Delta)

## ADDED Requirements

### Requirement: Production static build

The project SHALL produce a fully static, self-contained bundle in `web/dist` with no server-side runtime. Running `npm run build` from `web/` SHALL compile the Rust crate to WebAssembly with `wasm-pack`, type-check and bundle with Vite, and emit `index.html` plus hashed `assets/` (including the WASM binary). The build SHALL NOT require a backend, database, or environment variable.

#### Scenario: Build produces a deployable bundle

- **WHEN** a clean checkout has Node.js, Rust with the `wasm32-unknown-unknown` target, and `wasm-pack` installed
- **THEN** `cd web && npm ci && npm run build` exits successfully and writes `web/dist/index.html`, `web/dist/assets/*.js`, and `web/dist/assets/*.wasm`

#### Scenario: No runtime configuration required

- **WHEN** the contents of `web/dist` are served by any static host
- **THEN** the app loads and runs without server routes, environment variables, or API keys

### Requirement: Cloudflare Pages configuration

The repository SHALL include a Wrangler configuration for Cloudflare Pages at `web/wrangler.toml` naming the Pages project `btcfire` and setting the output directory to `./dist`. `web/package.json` SHALL expose a `deploy` script that builds the app and uploads `dist` with Wrangler, and SHALL list Wrangler as a development dependency pinned in the lockfile.

#### Scenario: Deploy script exists and is wired

- **WHEN** a developer inspects `web/package.json`
- **THEN** a `deploy` script runs the production build before invoking `wrangler pages deploy`
- **AND** `wrangler` is declared under `devDependencies`

#### Scenario: Project name matches

- **WHEN** Wrangler reads `web/wrangler.toml`
- **THEN** the Pages project name is `btcfire` and `pages_build_output_dir` resolves to the Vite output directory

### Requirement: Automated deployment workflow

The repository SHALL include a GitHub Actions workflow that builds the WASM bundle and Vite app and deploys the result to Cloudflare Pages on every push to `main` and on manual dispatch. The workflow SHALL authenticate using `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets and SHALL NOT print their values.

#### Scenario: Deploy on main

- **WHEN** a commit is pushed to `main` and both Cloudflare secrets are configured
- **THEN** the workflow builds `web/dist` and deploys it to the `btcfire` Pages project

#### Scenario: Manual deploy

- **WHEN** a maintainer triggers the workflow manually
- **THEN** the same build-and-deploy job runs for the selected ref

### Requirement: Static security and caching headers

The deployment SHALL ship `web/public/_headers`, which Vite copies into `web/dist`. The headers SHALL set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy`, and SHALL mark hashed `/assets/*` responses as immutable with a one-year max age.

#### Scenario: Headers present in the bundle

- **WHEN** the production build completes
- **THEN** `web/dist/_headers` exists and contains the documented security and caching rules

#### Scenario: Hashed assets cached

- **WHEN** a browser requests a file under `/assets/`
- **THEN** the response carries `Cache-Control: public, max-age=31536000, immutable`

### Requirement: Browser CSP allows live price data

The Content-Security-Policy delivered with the app SHALL allow scripts, styles, fonts, and images needed by the bundle and SHALL allow `connect-src` to `'self'` and `https://api.binance.com`, so the live BTC price tail can be fetched in production. It SHALL NOT allow the retired CryptoCompare origin.

#### Scenario: Binance allowed

- **WHEN** the app runs under the production CSP and fetches `https://api.binance.com/api/v3/klines`
- **THEN** the request is not blocked by the policy

#### Scenario: No legacy host

- **WHEN** the CSP is inspected in `web/index.html`
- **THEN** `connect-src` does not include CryptoCompare and does include the Binance origin

#### Scenario: WASM executes

- **WHEN** the app instantiates the bundled WebAssembly module under the production CSP
- **THEN** the policy permits it via `'wasm-unsafe-eval'`
