# Changelog

## 2026-05-16

- Add mobile-first responsive design as a core principle across all specs
- Update roadmap phases with responsive UI requirements per feature
- Add responsive design section to tech stack (breakpoints, touch targets, layout rules)
- Add mobile-first validation criteria to Phase 1 scaffold
- Implement mobile-first responsive landing page layout (single-col → 2-col → 3-col grid)
- Fix eslint react-refresh warning for shadcn/ui buttonVariants export
- Add `/changelog` command for pre-merge changelog updates
- Add testing strategy to tech stack spec (Vitest + wasm-pack test)
- Add test requirements to roadmap phases 1, 3–5, 7–9, 11–12
- Set up Vitest with Testing Library and jsdom for React component tests
- Add wasm-bindgen-test for Rust WASM unit tests
- Write App smoke tests and greet() Rust tests

## 2026-05-15

- Initial commit: project README and specs
- Add Phase 1 specs (requirements, plan, validation)
- Phase 1 implementation: Rust/WASM crate, React/Vite app, Tailwind, shadcn/ui, WASM integration, production build
