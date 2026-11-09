# Deployment Specification (Delta)

## ADDED Requirements

### Requirement: Vendor code splitting

The production build SHALL emit separate JavaScript chunks for the ECharts/ZRender stack and the React stack, rather than one application bundle. The build SHALL use Rolldown's `codeSplitting` groups (not the deprecated `manualChunks` option) to define these chunks.

#### Scenario: Vendor chunks exist

- **WHEN** the production build completes
- **THEN** `web/dist/assets` contains an `echarts-*.js` chunk and a `react-*.js` chunk in addition to the entry chunk

#### Scenario: Chunks are cacheable independently

- **WHEN** only application code changes and the dependency versions are unchanged
- **THEN** the vendor chunk filenames stay stable and the entry chunk hash changes

### Requirement: ECharts is off the critical path

The system SHALL dynamically import every component that renders an ECharts instance, and the initial `index.html` SHALL NOT module-preload the ECharts chunk. Chart sections SHALL provide a fixed-size fallback while their chunk loads, so that no layout shift occurs.

#### Scenario: Initial document omits ECharts

- **WHEN** `web/dist/index.html` is generated
- **THEN** its `script` and `modulepreload` links reference the entry, runtime, React, and CSS assets only — not the `echarts-*.js` chunk

#### Scenario: Chart chunk loads on use

- **WHEN** the price chart, forensics charts, or fan chart render
- **THEN** the ECharts chunk is fetched on demand and a fixed-height fallback is shown until the chart mounts

#### Scenario: No layout shift

- **WHEN** a lazy chart replaces its fallback
- **THEN** the fallback height matches the chart height (400 px price chart, 320 px fan chart, 200 px forensics charts)

### Requirement: Modular ECharts imports

The system SHALL import ECharts through its modular core (`echarts/core` plus specific charts, components, and the canvas renderer) and SHALL import the React binding from `echarts-for-react/lib/core`. It SHALL NOT import the full `echarts` package or the `echarts-for-react` root entry.

#### Scenario: No full ECharts package

- **WHEN** the dependency graph is built
- **THEN** no module resolves to the full `echarts` package entry through `echarts-for-react`

#### Scenario: Registered components cover the charts

- **WHEN** the price chart renders with model overlays
- **THEN** its legend is visible, proving `LegendComponent` is registered alongside `LineChart`, `GridComponent`, `TooltipComponent`, `DataZoomComponent`, `ToolboxComponent`, `MarkLineComponent`, and `CanvasRenderer`

### Requirement: Measured bundle budget

The production build SHALL keep the ECharts chunk below 700 kB minified and SHALL keep the initial entry plus React chunks below 700 kB minified combined. These budgets are compared against the pre-change baseline (one 1.80 MB chunk, ECharts 1.12 MB after vendor extraction).

#### Scenario: ECharts budget

- **WHEN** the production build completes
- **THEN** the `echarts-*.js` chunk is below 700 kB minified

#### Scenario: First-load budget

- **WHEN** the initial document loads
- **THEN** the entry plus React chunks total below 700 kB minified, excluding the on-demand ECharts chunk
