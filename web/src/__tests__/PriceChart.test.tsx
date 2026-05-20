import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PriceChart } from '@/components/charts/PriceChart'
import type { PricePoint } from '@/types/price'
import type { ModelOverlay } from '@/types/models'

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

const sampleData: PricePoint[] = [
  { timestamp_ms: 1367107200000, price_usd: 135.3 },
  { timestamp_ms: 1700000000000, price_usd: 37500.0 },
]

const sampleOverlay: ModelOverlay = {
  modelId: 'power-law',
  median: [[1704067200000, 55000]],
  todayTimestamp: Date.now(),
  formulation: 'log_log',
  rSquared: 0.95,
}

describe('PriceChart', () => {
  it('renders the chart container', () => {
    render(<PriceChart data={sampleData} />)
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument()
  })

  it('renders log/linear toggle buttons', () => {
    render(<PriceChart data={sampleData} />)
    expect(screen.getByRole('button', { name: /log/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /linear/i })).toBeInTheDocument()
  })

  it('toggles between log and linear', async () => {
    const user = userEvent.setup()
    render(<PriceChart data={sampleData} />)

    const logBtn = screen.getByRole('button', { name: /^log$/i })
    const linearBtn = screen.getByRole('button', { name: /^linear$/i })

    await user.click(linearBtn)
    expect(linearBtn).toHaveClass('bg-primary')

    await user.click(logBtn)
    expect(logBtn).toHaveClass('bg-primary')
  })

  it('does not show reset zoom button initially', () => {
    render(<PriceChart data={sampleData} />)
    expect(screen.queryByRole('button', { name: /reset zoom/i })).not.toBeInTheDocument()
  })

  it('renders with one model overlay without error', () => {
    render(<PriceChart data={sampleData} modelOverlays={[sampleOverlay]} />)
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument()
  })

  it('renders with two model overlays without error', () => {
    const s2fOverlay: ModelOverlay = {
      modelId: 's2f',
      median: [[1704067200000, 40000]],
      todayTimestamp: Date.now(),
      formulation: 's2f',
      rSquared: 0.85,
    }
    render(<PriceChart data={sampleData} modelOverlays={[sampleOverlay, s2fOverlay]} />)
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument()
  })

  it('renders with zero overlays without error', () => {
    render(<PriceChart data={sampleData} modelOverlays={[]} />)
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument()
  })
})
