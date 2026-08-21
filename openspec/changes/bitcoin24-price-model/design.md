## Context

The codebase has two BTC price models (Power Law, S2F) implemented in Rust compiled to WASM, with matching React controls and a shared `ModelPoint` output type. The Bitcoin24 model — MicroStrategy's compound annual growth rate (CAGR) approach — fits `log10(price) = a * years_since_genesis + b` via linear regression and projects forward. Unlike Power Law (log-log time) and S2F (scarcity-based), Bitcoin24 assumes a constant annual growth rate extrapolated from history.

The architecture convention is: Rust model module → WASM export → TypeScript types → React controls component → `App.tsx` model entry. This change follows that exact pattern.

## Goals / Non-Goals

**Goals:**
- Implement `run_bitcoin24()` in Rust that fits CAGR regression and returns `ModelPoint[]` with ±1σ bands
- Expose via `run_bitcoin24_wasm()` WASM export with `serde_wasm_bindgen` serialization
- Wire into the React frontend as a third selectable model with its own controls panel
- Include Rust unit tests covering regression correctness, band ordering, and edge cases

**Non-Goals:**
- No changes to existing Power Law or S2F model code
- No changes to `ModelPoint` struct or `toModelOverlay()` converter
- No new UI framework patterns — follows existing controls component template
- No parameter controls beyond the shared projection horizon slider (model has no config beyond projection_years)

## Decisions

1. **Regression variable: `years_since_genesis`** over `days_since_genesis`. CAGR is conceptually annual, and using years keeps coefficients at human-readable scale (a ≈ 0.4, not 0.001). Computed as `days_since_genesis / 365.25`.

2. **Single formulation** (no log-log/power-fit/custom variants). The CAGR model is definitionally `log10(price) = a * years + b`. Adding formulation variants would be scope creep and inconsistent with how the model is described in the roadmap.

3. **±1σ bands only** (no 2σ, no custom percentiles). Follows S2F's simpler band approach. Keeps the model focused on median + 1σ uncertainty, which is the standard CAGR band representation.

4. **Config struct follows `S2FConfig` pattern** — a single `projection_years` field with no additional parameters. Keeps the controls component minimal.

5. **WASM export follows existing `serde_wasm_bindgen` pattern** — deserialize JS config/data, call Rust function, reserialize result. Identical structure to `run_power_law_wasm` and `run_s2f_wasm`.

6. **Color: `#f97316` (orange)** — visually distinct from Power Law's yellow (`#eab308`) and S2F's cyan (`#0694a2`).

## Risks / Trade-offs

- **CAGR assumption:** Projecting a constant growth rate indefinitely is mathematically simpler but may overfit to recent bull runs. Users must understand this is a naive extrapolation. → Mitigation: UI text in controls panel explains the model's assumptions.
- **Negative growth:** If historical prices show a net decline, `a` could be negative, producing a downward projection. → Mitigation: The model is mathematically correct in this edge case; tests cover it.

## Open Questions

None — the model definition, implementation pattern, and frontend wiring are all clear from the existing codebase conventions.
