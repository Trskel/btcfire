# BTCFire — Mission

## What it is

BTCFire is a client-side Bitcoin retirement simulator. It helps people answer: **"If I hold X bitcoin and retire in year Y, will I be okay?"**

It runs thousands of Monte Carlo simulations across different price models and withdrawal strategies, then presents the results as clear probabilities and visualizations.

## Who it's for

A broad audience — from bitcoin holders curious about retirement math to experienced FIRE planners who want to model BTC-denominated portfolios.

- **Newcomers** get educational tooltips, plain-language explanations of each price model and withdrawal strategy, and sensible defaults that work out of the box.
- **Power users** get full control over model parameters, strategy tuning, and the ability to compare multiple scenarios side by side.

Progressive disclosure: simple by default, deep when you want it.

## Core principles

1. **Privacy first.** Everything runs in the browser. No server, no accounts, no telemetry. Your financial data never leaves your machine.
2. **Honest uncertainty.** Bitcoin's future price is unknowable. BTCFire shows distributions and probabilities, never single-point predictions. The UI makes uncertainty visible, not hidden.
3. **Speed.** Monte Carlo simulations run in Rust/WASM so results update in real time as you drag sliders. No loading spinners, no "run simulation" buttons.
4. **Mobile first.** The UI is designed for phones first, then scales up to tablets and desktops. Every feature must be fully usable on a 375px-wide screen. Layouts, charts, tables, and controls are all responsive — no horizontal scrolling, no hidden-on-mobile functionality.
5. **Educate, don't prescribe.** The app explains what each model assumes and where it breaks down. It helps users think clearly, not sell them a narrative.

## What it is not

- Not financial advice.
- Not a trading tool or price prediction service.
- Not a portfolio tracker.
