import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PriceChart } from '@/components/charts/PriceChart'
import type { PricePoint } from '@/types/price'

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

const sampleData: PricePoint[] = [
  { timestamp_ms: 1367107200000, price_usd: 135.3 },
  { timestamp_ms: 1700000000000, price_usd: 37500.0 },
]

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
})
