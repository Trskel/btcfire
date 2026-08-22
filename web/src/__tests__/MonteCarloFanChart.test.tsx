import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonteCarloFanChart } from '@/components/charts/MonteCarloFanChart'
import type { YearPercentiles } from '@/types/simulation'

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
  LegendComponent: {},
}))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }))

vi.mock('echarts-for-react', async () => {
  const React = await import('react')
  return {
    default: React.forwardRef(function MockECharts(props: { option?: unknown }) {
      return (
        <div
          data-testid="echarts-mock"
          data-option={JSON.stringify(props.option)}
        />
      )
    }),
  }
})

function makePercentiles(count: number): YearPercentiles[] {
  return Array.from({ length: count }, (_, i) => ({
    year: 2030 + i,
    p10: 1 + i,
    p25: 2 + i,
    p50: 3 + i,
    p75: 4 + i,
    p90: 5 + i,
    spendP10: 1000 + i * 100,
    spendP25: 2000 + i * 100,
    spendP50: 3000 + i * 100,
    spendP75: 4000 + i * 100,
    spendP90: 5000 + i * 100,
    bufferYearsP10: 0.5 + i,
    bufferYearsP25: 1.5 + i,
    bufferYearsP50: 2.5 + i,
    bufferYearsP75: 3.5 + i,
    bufferYearsP90: 4.5 + i,
  }))
}

function mockViewport(desktop: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: desktop && query === '(min-width: 640px)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function readOption(): Record<string, unknown> {
  const el = screen.getByTestId('echarts-mock')
  return JSON.parse(el.getAttribute('data-option') ?? '{}') as Record<
    string,
    unknown
  >
}

describe('MonteCarloFanChart', () => {
  it('renders p10–p90, p25–p75, and median series for the default BTC metric', () => {
    render(<MonteCarloFanChart percentiles={makePercentiles(3)} />)

    const option = readOption()
    const series = option.series as Record<string, unknown>[]
    expect(series.map((s) => s.name)).toEqual([
      'P10',
      'P10–P90',
      'P25',
      'P25–P75',
      'Median',
    ])
    expect(series[4]?.data).toEqual([3, 4, 5])
    expect(series[1]?.data).toEqual([4, 4, 4])
  })

  it('re-renders the bands when the metric switches', async () => {
    const user = userEvent.setup()
    render(<MonteCarloFanChart percentiles={makePercentiles(3)} />)

    const spendButton = screen.getByRole('button', { name: 'Annual spend' })
    await user.click(spendButton)

    expect(spendButton).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'BTC holdings' }),
    ).toHaveAttribute('aria-pressed', 'false')

    const series = readOption().series as Record<string, unknown>[]
    expect(series[4]?.data).toEqual([3000, 3100, 3200])
    expect(series[1]?.data).toEqual([4000, 4000, 4000])
  })

  it('puts the legend on top on mobile and to the right on desktop', () => {
    mockViewport(false)
    const { unmount } = render(
      <MonteCarloFanChart percentiles={makePercentiles(3)} />,
    )
    const mobileLegend = readOption().legend as { top: number; orient?: string }
    expect(mobileLegend.top).toBe(0)
    expect(mobileLegend.orient).toBeUndefined()
    unmount()

    mockViewport(true)
    render(<MonteCarloFanChart percentiles={makePercentiles(3)} />)
    const desktopLegend = readOption().legend as {
      orient: string
      right: number
    }
    expect(desktopLegend.orient).toBe('vertical')
    expect(desktopLegend.right).toBe(4)
  })

  it('renders nothing without percentile data', () => {
    render(<MonteCarloFanChart percentiles={[]} />)
    expect(screen.queryByTestId('echarts-mock')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'BTC holdings' }),
    ).not.toBeInTheDocument()
  })

  it('shows info buttons on the toggle explaining bands and each metric', async () => {
    const user = userEvent.setup()
    render(<MonteCarloFanChart percentiles={makePercentiles(3)} />)

    expect(
      screen.getByRole('button', { name: 'About Percentile bands' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About BTC holdings' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'About Percentile bands' }),
    )
    expect(screen.getByText(/10,000 simulated futures/)).toBeInTheDocument()
  })
})
