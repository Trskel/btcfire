import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MonteCarloForensics } from '@/components/controls/MonteCarloForensics'
import type { MonteCarloResult } from '@/types/simulation'

vi.mock('echarts/core', () => {
  class LinearGradient {}
  const graphic = { LinearGradient }
  return {
    use: vi.fn(),
    graphic,
    default: { use: vi.fn(), graphic },
  }
})

vi.mock('echarts/charts', () => ({ BarChart: {}, LineChart: {} }))
vi.mock('echarts/components', () => ({
  GridComponent: {},
  TooltipComponent: {},
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

function makeResult(): MonteCarloResult {
  return {
    runCount: 10000,
    seed: 42,
    summary: {
      runOutPct: 20.0,
      belowMinPct: 10.0,
      successPct: 70.0,
      desiredSpendPct: 80.0,
    },
    percentiles: [],
    forensics: {
      survivalByYear: [
        { year: 2030, survivalPct: 100 },
        { year: 2031, survivalPct: 70 },
      ],
      failureHistogram: [
        { year: 2030, depleted: 0, belowMin: 0 },
        { year: 2031, depleted: 2000, belowMin: 1000 },
      ],
      medianFailureYear: 2031,
      shortfallMedianUsd: 5000,
      shortfallP90Usd: 12000,
    },
    legacy: {
      finalBtcP10: 0.5,
      finalBtcP50: 1.2,
      finalBtcP90: 2.5,
      successFinalBtcMedian: 1.5,
    },
    phaseTime: {
      bearPct: 30,
      fairPct: 50,
      euphoriaPct: 20,
    },
  }
}

describe('MonteCarloForensics', () => {
  it('renders both charts for a run with failures', () => {
    render(<MonteCarloForensics monteCarlo={makeResult()} />)
    expect(screen.getByText('Failure forensics')).toBeInTheDocument()
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(2)
  })

  it('renders null forensics as nothing', () => {
    const result = makeResult()
    result.forensics = null
    render(<MonteCarloForensics monteCarlo={result} />)
    expect(screen.queryByText('Failure forensics')).not.toBeInTheDocument()
  })

  it('renders legacy and phase-time tiles but no charts without failures', () => {
    const result = makeResult()
    result.forensics = {
      survivalByYear: [
        { year: 2030, survivalPct: 100 },
        { year: 2031, survivalPct: 100 },
      ],
      failureHistogram: [
        { year: 2030, depleted: 0, belowMin: 0 },
        { year: 2031, depleted: 0, belowMin: 0 },
      ],
      medianFailureYear: null,
      shortfallMedianUsd: null,
      shortfallP90Usd: null,
    }
    render(<MonteCarloForensics monteCarlo={result} />)
    expect(screen.queryAllByTestId('echarts-mock')).toHaveLength(0)
    expect(screen.getByText('Final BTC median')).toBeInTheDocument()
    expect(screen.getByText('Success median BTC')).toBeInTheDocument()
    expect(screen.getByText('Bear years')).toBeInTheDocument()
    expect(screen.getByText('Fair years')).toBeInTheDocument()
    expect(screen.getByText('Euphoria years')).toBeInTheDocument()
  })

  it('shows em dashes for null shortfall and success median', () => {
    const result = makeResult()
    result.forensics!.shortfallMedianUsd = null
    result.forensics!.shortfallP90Usd = null
    result.forensics!.medianFailureYear = null
    result.legacy!.successFinalBtcMedian = null
    render(<MonteCarloForensics monteCarlo={result} />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('renders nothing without a monte carlo result', () => {
    render(<MonteCarloForensics monteCarlo={null} />)
    expect(screen.queryByText('Failure forensics')).not.toBeInTheDocument()
  })
})
