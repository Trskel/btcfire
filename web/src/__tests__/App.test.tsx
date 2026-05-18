import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
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

vi.mock('echarts/charts', () => ({ LineChart: {}, CustomChart: {} }))
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

  it('renders Power Law controls', () => {
    render(<App />)
    expect(screen.getByText('Power Law Model')).toBeInTheDocument()
  })
})
