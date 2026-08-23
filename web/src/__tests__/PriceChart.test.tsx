import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PriceChart } from '@/components/charts/PriceChart'
import { formatTooltip } from '@/components/charts/tooltip'
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

const TS = 1704067200000

function overlay(id: ModelOverlay['modelId']): ModelOverlay {
  return {
    modelId: id,
    median: [[TS, 55000]],
    todayTimestamp: TS,
    formulation: 'log_log',
    rSquared: 0.95,
  }
}

describe('formatTooltip', () => {
  it('shows BTC price, max, median, and min and omits ±1σ rows', () => {
    const params = [
      { seriesName: 'BTC Price', value: [TS, 55000] as [number, number] },
      { seriesName: 'Power Law Median', value: [TS, 55000] as [number, number] },
      { seriesName: 'power-law-2σ-lower', value: [TS, 30000] as [number, number] },
      { seriesName: 'power-law-2σ-upper', value: [TS, 90000] as [number, number] },
      { seriesName: 'power-law-1σ-lower', value: [TS, 40000] as [number, number] },
      { seriesName: 'power-law-1σ-upper', value: [TS, 70000] as [number, number] },
      { seriesName: 'Power Law ±2σ', value: [TS, 60000] as [number, number] },
      { seriesName: 'Power Law ±1σ', value: [TS, 30000] as [number, number] },
    ]

    const html = formatTooltip(params, [overlay('power-law')], false)

    expect(html).toContain('BTC Price: <strong>$55,000.00</strong>')
    expect(html).toContain('Power Law Max: <strong>$90,000.00</strong>')
    expect(html).toContain('Power Law Median: <strong>$55,000.00</strong>')
    expect(html).toContain('Power Law Min: <strong>$30,000.00</strong>')
    expect(html).not.toContain('±')
  })

  it('falls back to 1σ bounds when no wider band exists', () => {
    const params = [
      { seriesName: 'S2F Median', value: [TS, 55000] as [number, number] },
      { seriesName: 's2f-1σ-lower', value: [TS, 40000] as [number, number] },
      { seriesName: 's2f-1σ-upper', value: [TS, 70000] as [number, number] },
    ]

    const html = formatTooltip(params, [overlay('s2f')], false)

    expect(html).toContain('S2F Max: <strong>$70,000.00</strong>')
    expect(html).toContain('S2F Min: <strong>$40,000.00</strong>')
  })

  it('falls back to percentile bounds when present', () => {
    const params = [
      { seriesName: 'Power Law Median', value: [TS, 55000] as [number, number] },
      { seriesName: 'power-law-p10', value: [TS, 20000] as [number, number] },
      { seriesName: 'power-law-p90', value: [TS, 120000] as [number, number] },
      { seriesName: 'power-law-p25', value: [TS, 40000] as [number, number] },
      { seriesName: 'power-law-p75', value: [TS, 80000] as [number, number] },
    ]

    const html = formatTooltip(params, [overlay('power-law')], false)

    expect(html).toContain('Power Law Max: <strong>$120,000.00</strong>')
    expect(html).toContain('Power Law Min: <strong>$20,000.00</strong>')
  })

  it('shows only the median row when an overlay has no bands', () => {
    const params = [
      { seriesName: 'Power Law Median', value: [TS, 55000] as [number, number] },
    ]

    const html = formatTooltip(params, [overlay('power-law')], false)

    expect(html).toContain('Power Law Median: <strong>$55,000.00</strong>')
    expect(html).not.toContain('Max:')
    expect(html).not.toContain('Min:')
  })

  it('converts log10 values back to prices in log scale', () => {
    const params = [
      { seriesName: 'Power Law Median', value: [TS, 5] as [number, number] },
      { seriesName: 'power-law-2σ-lower', value: [TS, 4] as [number, number] },
      { seriesName: 'power-law-2σ-upper', value: [TS, 6] as [number, number] },
    ]

    const html = formatTooltip(params, [overlay('power-law')], true)

    expect(html).toContain('Power Law Max: <strong>$1,000,000.00</strong>')
    expect(html).toContain('Power Law Median: <strong>$100,000.00</strong>')
    expect(html).toContain('Power Law Min: <strong>$10,000.00</strong>')
  })

  it('returns an empty string for empty params', () => {
    expect(formatTooltip([], [overlay('power-law')], false)).toBe('')
  })
})
