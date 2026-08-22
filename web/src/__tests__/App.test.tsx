import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { run_monte_carlo_wasm } from 'btcfire-wasm'
import type { MonteCarloResult } from '@/types/simulation'
import App from '../App'

vi.mock('btcfire-wasm', () => ({
  default: () => Promise.resolve(),
  greet: (name: string) => `Hello from BTCFire WASM, ${name}!`,
  run_power_law_wasm: () =>
    Promise.resolve({
      points: [
        {
          year: 2024,
          timestamp_ms: 1704067200000,
          median_price_usd: 55000,
          band_1sigma_low: 10000,
          band_1sigma_high: 300000,
          band_2sigma_low: null,
          band_2sigma_high: null,
          band_p10: null,
          band_p90: null,
          band_p25: null,
          band_p75: null,
        },
        {
          year: 2025,
          timestamp_ms: 1735689600000,
          median_price_usd: 80000,
          band_1sigma_low: 15000,
          band_1sigma_high: 400000,
          band_2sigma_low: null,
          band_2sigma_high: null,
          band_p10: null,
          band_p90: null,
          band_p25: null,
          band_p75: null,
        },
      ],
      rSquared: 0.95,
      a: 5.84,
      b: -17.3,
      formulationUsed: 'log_log',
    }),
  run_s2f_wasm: () =>
    Promise.resolve({
      points: [
        {
          year: 2024,
          timestamp_ms: 1704067200000,
          median_price_usd: 55000,
          band_1sigma_low: 10000,
          band_1sigma_high: 300000,
          band_2sigma_low: null,
          band_2sigma_high: null,
          band_p10: null,
          band_p90: null,
          band_p25: null,
          band_p75: null,
        },
      ],
      rSquared: 0.85,
      a: 3.5,
      b: 1.2,
    }),
  run_bitcoin24_wasm: () =>
    Promise.resolve({
      points: [
        {
          year: 2024,
          timestamp_ms: 1704067200000,
          median_price_usd: 50000,
          band_1sigma_low: 8000,
          band_1sigma_high: 280000,
          band_2sigma_low: null,
          band_2sigma_high: null,
          band_p10: null,
          band_p90: null,
          band_p25: null,
          band_p75: null,
        },
      ],
      rSquared: 0.92,
      a: 0.35,
      b: 2.5,
    }),
  run_withdrawal_wasm: () =>
    Promise.resolve([
      {
        year: 2030,
        btc: 0.96,
        cashUsd: 0,
        bufferYears: 0,
        spendUsd: 4000,
        soldBtc: 0.04,
        phase: null,
      },
    ]),
  run_monte_carlo_wasm: vi.fn(() =>
    Promise.resolve({
      runCount: 10000,
      seed: 42,
      summary: {
        runOutPct: 20.0,
        belowMinPct: 10.0,
        successPct: 70.0,
        desiredSpendPct: 80.0,
      },
      percentiles: [],
      forensics: null,
      legacy: null,
      phaseTime: null,
    }),
  ),
}))

vi.mock('@/hooks/useHistoricPrices', () => ({
  useHistoricPrices: () => ({
    data: [
      { timestamp_ms: 1367107200000, price_usd: 135.3 },
      { timestamp_ms: 1700000000000, price_usd: 37500.0 },
    ],
    isLoading: false,
    error: null,
    isStale: false,
    refresh: vi.fn(),
  }),
}))

vi.mock('echarts/core', () => {
  class LinearGradient {}
  const graphic = { LinearGradient }
  return {
    use: vi.fn(),
    graphic,
    default: { use: vi.fn(), graphic },
  }
})

vi.mock('echarts/charts', () => ({ BarChart: {}, LineChart: {}, CustomChart: {} }))
vi.mock('echarts/components', () => ({
  GridComponent: {},
  TooltipComponent: {},
  DataZoomComponent: {},
  ToolboxComponent: {},
  MarkLineComponent: {},
}))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }))

vi.mock('echarts-for-react', async () => {
  const React = await import('react')
  return {
    default: React.forwardRef(function MockECharts() {
      return <div data-testid="echarts-mock" />
    }),
  }
})

function openTab(name: string) {
  fireEvent.click(screen.getByRole('tab', { name }))
}

describe('App', () => {
  it('renders the heading and price chart', () => {
    render(<App />)
    expect(screen.getByText('BTCFire')).toBeInTheDocument()
    expect(screen.getByText('BTC Price History')).toBeInTheDocument()
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument()
  })

  it('shows data count in description', () => {
    render(<App />)
    expect(screen.getByText('2 days of data')).toBeInTheDocument()
  })

  it('renders the tabbed control card with three tabs', () => {
    render(<App />)
    expect(screen.getByText('Plan Configuration')).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent)
    expect(tabs).toEqual(['Price model', 'Scenario', 'Withdrawal'])
  })

  it('renders the configuration card above the results card', () => {
    render(<App />)
    const config = screen.getByText('Plan Configuration')
    const plan = screen.getByText('Your Plan')
    expect(
      config.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('collapses and re-expands the configuration card', () => {
    render(<App />)
    expect(screen.getByText('Initial BTC holdings')).toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Collapse configuration' })
    fireEvent.click(toggle)
    expect(screen.queryByText('Initial BTC holdings')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.getByText('BTC Price History')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Expand configuration' }))
    expect(screen.getByText('Initial BTC holdings')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('keeps the active tab when the configuration collapses', () => {
    render(<App />)
    openTab('Withdrawal')
    expect(screen.getByRole('button', { name: /Classic FIRE/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse configuration' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expand configuration' }))
    expect(screen.getByRole('button', { name: /Classic FIRE/ })).toBeInTheDocument()
    expect(screen.queryByText('Initial BTC holdings')).not.toBeInTheDocument()
  })

  it('shows the scenario panel with the projection horizon by default', () => {
    render(<App />)
    expect(screen.getByText('Initial BTC holdings')).toBeInTheDocument()
    expect(screen.getByText('Annual inflation rate')).toBeInTheDocument()
    expect(screen.getByText('Projection Horizon: 30y')).toBeInTheDocument()
    expect(screen.queryByText('Your Scenario')).not.toBeInTheDocument()

    const slider = screen.getByRole('slider')
    const holdings = screen.getByText('Initial BTC holdings')
    expect(
      slider.compareDocumentPosition(holdings) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('switches to the Price model tab and shows model controls', () => {
    render(<App />)
    openTab('Price model')
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(checkboxes).toHaveLength(3)
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()
    expect(screen.getAllByText('Power Law').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('S2F').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Bitcoin24').length).toBeGreaterThanOrEqual(1)
  })

  it('shows info buttons on model rows and expanded model controls', async () => {
    const user = userEvent.setup()
    render(<App />)
    openTab('Price model')

    expect(
      screen.getByRole('button', { name: 'About Power Law' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Stock-to-Flow (S2F)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Bitcoin24 (CAGR)' }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: 'About Formulation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Confidence Band' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'About Power Law' }))
    expect(screen.getByText(/Fits a straight line/)).toBeInTheDocument()
  })

  it('unmounts the previous tab content when switching', () => {
    render(<App />)
    expect(screen.getByText('Initial BTC holdings')).toBeInTheDocument()
    expect(screen.getByText('Projection Horizon: 30y')).toBeInTheDocument()
    openTab('Price model')
    expect(screen.queryByText('Initial BTC holdings')).not.toBeInTheDocument()
    expect(screen.queryByText('Projection Horizon: 30y')).not.toBeInTheDocument()
    openTab('Withdrawal')
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('renders the Withdrawal tab with preset cards', () => {
    render(<App />)
    openTab('Withdrawal')
    expect(screen.getByRole('button', { name: /^Classic FIRE/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Fixed %/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Guardrails/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Valuation-based/ })).toBeInTheDocument()
  })

  it('renders the plan results card', () => {
    render(<App />)
    expect(screen.getByText('Your Plan')).toBeInTheDocument()
  })

  it('shows a plan model picker when several models are visible', async () => {
    vi.useFakeTimers()
    try {
      render(<App />)
      await act(async () => {
        vi.advanceTimersByTime(400)
        await Promise.resolve()
        await Promise.resolve()
      })

      fireEvent.click(screen.getByRole('tab', { name: 'Price model' }))
      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
      fireEvent.click(checkboxes[1])

      await act(async () => {
        vi.advanceTimersByTime(400)
        await Promise.resolve()
        await Promise.resolve()
      })

      const picker = screen.getByLabelText('Plan price model') as HTMLSelectElement
      expect(picker).toBeInTheDocument()
      expect(picker.value).toBe('power-law')
      expect(screen.getByText('Price model used:')).toBeInTheDocument()

      fireEvent.change(picker, { target: { value: 's2f' } })
      expect(picker.value).toBe('s2f')
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows the loading spinner while the plan recalculates', async () => {
    vi.useFakeTimers()
    let resolveMc!: (value: MonteCarloResult) => void
    try {
      render(<App />)
      await act(async () => {
        vi.advanceTimersByTime(400)
        await Promise.resolve()
        await Promise.resolve()
      })
      await act(async () => {
        vi.advanceTimersByTime(50)
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(screen.getByText('Monte Carlo outcomes')).toBeInTheDocument()

      vi.mocked(run_monte_carlo_wasm).mockImplementationOnce(
        () =>
          new Promise<MonteCarloResult>((resolve) => {
            resolveMc = resolve
          }),
      )

      fireEvent.change(screen.getByRole('slider'), { target: { value: '40' } })
      await act(async () => {
        vi.advanceTimersByTime(400)
        await Promise.resolve()
        await Promise.resolve()
      })
      await act(async () => {
        vi.advanceTimersByTime(50)
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(screen.getByRole('status', { name: 'Running simulation' })).toBeInTheDocument()
      expect(screen.getByText('Running simulation…')).toBeInTheDocument()

      await act(async () => {
        resolveMc({
          runCount: 10000,
          seed: 42,
          summary: {
            runOutPct: 20.0,
            belowMinPct: 10.0,
            successPct: 70.0,
            desiredSpendPct: 80.0,
          },
          percentiles: [],
          forensics: null,
          legacy: null,
          phaseTime: null,
        })
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(screen.queryByText('Running simulation…')).not.toBeInTheDocument()
      expect(screen.getByText('Monte Carlo outcomes')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
