## MODIFIED Requirements

### Requirement: Interactive price chart
The system SHALL render an ECharts line chart with: log/linear Y-axis toggle, slider-based zoom for the time (X) axis, auto-scaling Y axis adapting to visible data, drag-to-pan when zoomed, crosshair tooltip, and a reset-zoom button. Mouse-wheel and pinch-to-zoom SHALL NOT be used. When model overlays are visible, the crosshair tooltip SHALL list, for each visible overlay at the hovered time, the overlay's maximum, median, and minimum projected values — the maximum and minimum being the overlay's widest available band bounds (2σ when present, otherwise the percentile or 1σ bounds) — and SHALL NOT show a ±1σ row.

#### Scenario: Tooltip shows max, median, and min per overlay
- **WHEN** the user hovers over a projected year with one or more model overlays visible
- **THEN** the tooltip lists, for each visible overlay, its maximum, median, and minimum values at that year

#### Scenario: Tooltip omits ±1σ
- **WHEN** the user hovers over a projected year
- **THEN** no ±1σ row appears in the tooltip

#### Scenario: Zoom via time slider
- **WHEN** the user adjusts the time-axis zoom slider
- **THEN** the visible time window changes and the Y axis rescales to the visible data

#### Scenario: Pan when zoomed
- **WHEN** the chart is zoomed and the user drags on the chart area
- **THEN** the view pans across the time axis

#### Scenario: Reset zoom
- **WHEN** the user activates the reset-zoom control
- **THEN** the chart returns to the full historic range
