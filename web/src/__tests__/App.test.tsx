import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'

vi.mock('btcfire-wasm', () => ({
  default: () => Promise.resolve(),
  greet: (name: string) => `Hello from BTCFire WASM, ${name}!`,
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

vi.mock('echarts/charts', () => ({ LineChart: {} }))
vi.mock('echarts/components', () => ({
  GridComponent: {},
  TooltipComponent: {},
  DataZoomComponent: {},
  ToolboxComponent: {},
}))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }))

vi.mock('echarts-for-react', async () => {
  const React = await import('react')
  return {
    default: React.forwardRef(function MockECharts(_props: unknown, _ref: unknown) {
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
})
