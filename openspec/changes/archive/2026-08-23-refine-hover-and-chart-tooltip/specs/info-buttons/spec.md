## MODIFIED Requirements

### Requirement: Reusable info button component
The system SHALL provide a reusable info button component that renders a small icon button adjacent to a UI element's label and reveals an explanation panel when activated. On hover-capable (desktop) devices, the panel SHALL open when the pointer hovers over the button without a click; on touch devices, the panel SHALL open on tap. The button SHALL have a minimum 44px touch target, a programmatically accessible name identifying the associated element, and a visible info icon.

#### Scenario: Info button renders beside a label
- **WHEN** an info button is attached to a labeled UI element
- **THEN** the button appears immediately beside the element's label and exposes an accessible name that references that element (e.g., "About Initial BTC holdings")

#### Scenario: Touch target size
- **WHEN** the info button is rendered on any screen size
- **THEN** its interactive area is at least 44×44 CSS pixels

#### Scenario: Activation reveals explanation
- **WHEN** the user taps or clicks the info button
- **THEN** an explanation panel appears showing the element's description text and the button state reflects that it is open

#### Scenario: Hover reveals explanation on desktop
- **WHEN** the user hovers the pointer over the info button on a hover-capable device without clicking
- **THEN** the explanation panel appears showing the element's description text and the button state reflects that it is open

#### Scenario: Hover-opened panel closes when the pointer leaves
- **WHEN** the explanation panel was opened by hover and the pointer moves away from both the button and the panel
- **THEN** the panel closes

#### Scenario: Dismissal
- **WHEN** the explanation panel is open and the user taps the button again, taps outside the panel, or presses Escape
- **THEN** the panel closes, and when closed via Escape or the button, focus returns to the info button
