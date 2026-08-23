## Context

Two small UI refinements on top of the existing Base UI popover and ECharts chart:

- `web/src/components/ui/info-button.tsx` renders a Base UI `Popover` whose trigger is a 26px icon button with a 44px hit area (`after:-inset-[9px]`). It opens only on click/tap today.
- `web/src/components/charts/PriceChart.tsx` builds one ECharts series group per model overlay (median line, stacked band areas, and named low/upper boundary lines) and an axis-triggered tooltip whose formatter currently keeps rows for `BTC Price`, ` Median`, `±1σ`, and `±2σ`.

The chart's band boundary series already carry the exact max/min values in their data: `${id}-2σ-lower`/`${id}-2σ-upper` for 2σ bands, `${id}-p10`/`${id}-p90` for percentile bands, and `${id}-1σ-lower`/`${id}-1σ-upper` for 1σ bands.

## Goals / Non-Goals

**Goals:**

- Desktop hover opens info-button explanations without a click; touch behavior unchanged.
- Chart tooltip shows per-overlay max, median, and min rows and never a ±1σ row.

**Non-Goals:**

- No changes to chart rendering, legend, zoom, or band visuals.
- No changes to WASM, data models, or other components using `InfoButton`.
- No removal of ±1σ from the legend or from band rendering (it remains a chart visual).

## Decisions

- **Use Base UI's built-in `openOnHover` on `Popover.Trigger`** with its default open delay instead of hand-rolling mouseenter/mouseleave timers. Base UI already handles the safe-polygon between trigger and popup (moving the pointer from the button into the panel keeps it open), hover vs. touch pointer types, and close-on-leave. Alternative considered: wrapping the trigger in manual `onMouseEnter`/`onMouseLeave` state — rejected as more code and worse edge-case handling.
- **Derive max/min from the widest band boundary series in the tooltip formatter.** The formatter already receives every series' nearest value in `params`; it will select, per overlay id, the widest available band among `-2σ-*`, `-p10`/`-p90`, then `-1σ-*`, and render `${modelLabel} Max / Median / Min` rows. This avoids adding invisible tooltip-only series and keeps the series definitions unchanged. The `BTC Price` row stays.
- **Keep the tooltip axis trigger and date row unchanged**; only the row selection and formatting inside the formatter changes.

## Risks / Trade-offs

- [Hover-open on desktop means a click on an already hover-opened button toggles it closed] → Accepted; standard for hover+click popovers, and the click-to-open path still works on touch.
- [Hover-open delay may feel slow or too eager] → Base UI defaults (300ms open delay, 0ms close delay) match common tooltip behavior; trivially tunable via `delay`/`closeDelay` props.
- [Overlay hovered beyond its projection end returns the nearest point rather than nothing] → Pre-existing ECharts behavior, unchanged by this design.
