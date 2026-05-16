# Phase 2 — Historic Price Data: Validation

## Merge criteria

All eight checks must pass before this phase can be merged to `main`.

### 1. Chart renders full BTC price history

- On first load, the app fetches BTC daily prices from CoinGecko (2013-04-28 to present).
- The ECharts line chart displays the full history with a time-based X axis and USD Y axis.
- The chart is visible and populated without manual user action beyond opening the page.

### 2. Data caches in localStorage

- After the first load, price data is stored in `localStorage` with a timestamp.
- Reloading the page within 24 hours loads data from cache without making an API request (verifiable in the Network tab).
- After 24 hours, a fresh fetch is triggered automatically.

### 3. Log/linear Y-axis toggle

- A toggle control switches the Y axis between linear and logarithmic scale.
- The toggle is visible and accessible without scrolling on both mobile and desktop.
- The chart re-renders correctly in both modes with appropriate tick labels.

### 4. Zoom and pan on both axes

- **Touch (mobile)**: pinch-to-zoom works on the chart area, compressing/expanding both X and Y axes.
- **Desktop**: dragging on the X-axis ruler zooms/pans the time range; dragging on the Y-axis ruler zooms/pans the price range.
- **Inside chart**: scroll wheel (desktop) or pinch (touch) zooms within the chart area.
- `dataZoom` slider handles are present on both axes for direct range manipulation.

### 5. Reset zoom restores full view

- A reset-zoom button is visible when the chart is zoomed in.
- Clicking/tapping it restores the full date range and auto-scaled Y axis.

### 6. Mobile-responsive at 375px

- The chart fills the available width with no horizontal scrolling.
- Axis labels are readable (abbreviated year format on small screens).
- The log/linear toggle and reset-zoom button have at least 44×44px touch targets.
- Tooltips appear near the touch point without being obscured by the user's finger.

### 7. Error and loading states

- While data is loading, a loading indicator is visible (spinner or skeleton).
- If the API call fails and no cache exists, an error message with a retry button is shown.
- If the API call fails but cached data exists, the chart renders with cached data and shows a subtle "using cached data" indicator.

### 8. Tests pass

- `cd wasm && wasm-pack test --node` passes — including `PricePoint` serde round-trip test.
- `cd web && npm test` passes — including tests for:
  - API client: correct URL, response parsing, error handling.
  - Cache layer: write/read, TTL expiry, stale fallback.
  - Hook: loading → success and loading → error state transitions.
  - Chart component: renders with data, toggle present, reset button present.

## How to test

```bash
# Build the WASM crate
cd wasm && wasm-pack build --target web && cd ..

# Run Rust tests
cd wasm && wasm-pack test --node && cd ..

# Install dependencies (including new echarts packages)
cd web && npm install && cd ..

# Run React tests
cd web && npm test

# Start dev server and verify manually
cd web && npm run dev
# → Chart loads with BTC price history
# → Toggle log/linear scale
# → Pinch-zoom on mobile, drag axis rulers on desktop
# → Hit reset-zoom to restore full view
# → Open DevTools → Application → localStorage to verify cache
# → Throttle network to offline, reload → cached data displayed
```

## What "done" looks like

The app shows an interactive BTC price chart spanning 2013 to present. Users can zoom into any time range and price range using touch gestures or axis ruler dragging, toggle between log and linear scale, and reset to the full view. Data loads fast from cache on repeat visits. The Rust crate has a `PricePoint` type ready for price model functions in the next phases.
