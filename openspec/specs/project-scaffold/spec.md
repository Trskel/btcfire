# Project Scaffold Specification

## Purpose

The monorepo foundation and build pipeline: a Rust/WASM simulation crate, a React/TypeScript frontend, and the tooling that connects them.

## Requirements

### Requirement: Monorepo structure
The system SHALL be organized as two sibling top-level directories: `wasm/` (Rust crate) and `web/` (React app). `web/` SHALL import the WASM package via local file path.

#### Scenario: Repo layout
- **WHEN** the repository is inspected
- **THEN** `wasm/` and `web/` exist as sibling top-level directories with the structure documented in `specs/tech-stack.md`

### Requirement: Rust/WASM crate
The system SHALL include a Rust crate in `wasm/` built with `wasm-pack`, using `wasm-bindgen`, that exports at least one function callable from JavaScript.

#### Scenario: WASM function callable from browser
- **WHEN** the WASM package is built with `wasm-pack` and imported from the React app
- **THEN** an exported function executes in the browser and returns a value to JavaScript

### Requirement: React/Vite app
The system SHALL include a Vite-based React + TypeScript app in `web/` that imports and calls the WASM module, using `vite-plugin-wasm` and `vite-plugin-top-level-await`.

#### Scenario: HMR dev server
- **WHEN** `npm run dev` is started
- **THEN** the app serves with hot module reload and WASM code executes without manual glue code

### Requirement: Styling foundation
The system SHALL use Tailwind CSS for styling and shadcn/ui for base components (Button, Card), both configured in the React app.

#### Scenario: shadcn component renders
- **WHEN** a shadcn/ui component is used in the app
- **THEN** it renders with Tailwind-generated styles

### Requirement: Mobile-first responsive layout
The system SHALL use a single-column mobile layout by default that expands to multi-column at larger Tailwind breakpoints. The viewport meta tag SHALL be configured, interactive elements SHALL have touch-friendly sizing, and the layout SHALL not scroll horizontally at 375px width.

#### Scenario: Phone-sized rendering
- **WHEN** the app is rendered at 375px viewport width
- **THEN** the layout is single-column with no horizontal scrolling and interactive elements are usable by touch

### Requirement: Test setup
The system SHALL configure Vitest with Testing Library for the React app, `wasm-pack test --node` for Rust, and a root `npm test` script that runs both suites.

#### Scenario: Root test command
- **WHEN** `npm test` is run at the repo root
- **THEN** both the Rust test suite and the React test suite execute and report results

### Requirement: Build pipeline
The system SHALL support `npm run dev` for development with HMR and `npm run build` to produce a static bundle with WASM included.

#### Scenario: Production build
- **WHEN** `npm run build` is run
- **THEN** a static bundle containing the WASM module is produced without errors
