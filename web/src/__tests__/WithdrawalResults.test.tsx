import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WithdrawalResults } from '@/components/controls/WithdrawalResults'
import type { PathId, WithdrawalRun } from '@/lib/withdrawal'
import type { YearResult } from '@/types/policy'

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
  LegendComponent: {},
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

function yearResult(
  year: number,
  btc: number,
  spendUsd: number,
  phase: YearResult['phase'] = 'fair',
  soldBtc = 0.04,
): YearResult {
  return {
    year,
    btc,
    cashUsd: 0,
    bufferYears: 0,
    spendUsd,
    soldBtc,
    phase,
  }
}

function makePercentiles(count: number) {
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

function makeRun(): WithdrawalRun {
  return {
    paths: [
      {
        pathId: 'median',
        name: 'Medium',
        label: 'fair',
        finalPriceUsd: 223800,
        results: [yearResult(2030, 0.96, 4000), yearResult(2031, 0.92, 4120)],
      },
      {
        pathId: 'minus_1s',
        name: 'Bearish',
        label: '−1σ',
        finalPriceUsd: 100000,
        results: [
          yearResult(2030, 0.5, 3000, 'bear'),
          yearResult(2031, 0, 0, 'bear', 0),
        ],
      },
      {
        pathId: 'plus_2s',
        name: 'Deep bull',
        label: '+2σ',
        finalPriceUsd: 500000,
        results: [
          yearResult(2030, 1.4, 6000, 'euphoria'),
          yearResult(2031, 1.8, 6200, 'euphoria'),
        ],
      },
    ],
    coveredYears: 2,
    totalYears: 55,
    monteCarlo: {
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
        bearPct: 25,
        fairPct: 60,
        euphoriaPct: 15,
      },
    },
  }
}

function Harness({ run }: { run: WithdrawalRun }) {
  const [selectedPathId, setSelectedPathId] = useState<PathId>('median')
  return (
    <WithdrawalResults
      run={run}
      selectedPathId={selectedPathId}
      onSelectPath={setSelectedPathId}
      error={null}
      loading={false}
    />
  )
}

describe('WithdrawalResults', () => {
  it('renders the path summary strip with directional tiles', () => {
    render(<Harness run={makeRun()} />)
    expect(screen.getByRole('button', { name: /Medium/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bearish/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Deep bull/ })).toBeInTheDocument()
    expect(screen.getByText('fair')).toBeInTheDocument()
    expect(screen.getByText('−1σ')).toBeInTheDocument()
    expect(screen.getByText('+2σ')).toBeInTheDocument()
    expect(screen.getByText('0.92 BTC left · Fair')).toBeInTheDocument()
  })

  it('shows a depletion summary for a depleted path', () => {
    render(<Harness run={makeRun()} />)
    expect(screen.getByText('Depleted 2031 · Bear')).toBeInTheDocument()
  })

  it('shows the dollar value of the BTC left under the summary line', () => {
    render(<Harness run={makeRun()} />)
    expect(screen.getByText('≈ $205,896')).toBeInTheDocument()
    expect(screen.getByText('≈ $900,000')).toBeInTheDocument()
  })

  it('does not show a dollar value for depleted paths', () => {
    render(<Harness run={makeRun()} />)
    const dollarLines = screen
      .getAllByText(/^≈ \$/)
      .map((el) => el.textContent)
    expect(dollarLines).toHaveLength(2)
    expect(dollarLines).not.toContain('≈ $0')
  })

  it('renders the truncation note when the projection ends early', () => {
    render(<Harness run={makeRun()} />)
    expect(
      screen.getByText(/covers 2 of 55 retirement years/),
    ).toBeInTheDocument()
  })

  it('switches the year-by-year view to the selected path', () => {
    render(<Harness run={makeRun()} />)
    expect(screen.getAllByText('$4,000').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /Bearish/ }))
    expect(screen.getAllByText('$3,000').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('$4,000')).toHaveLength(0)
  })

  it('falls back to the median path when the selected id is missing', () => {
    render(
      <WithdrawalResults
        run={makeRun()}
        selectedPathId={'p75' as PathId}
        onSelectPath={vi.fn()}
        error={null}
        loading={false}
      />,
    )
    expect(screen.getAllByText('$4,000').length).toBeGreaterThan(0)
  })

  it('shows a placeholder when there are no runs', () => {
    render(
      <WithdrawalResults
        run={null}
        selectedPathId="median"
        onSelectPath={vi.fn()}
        error={null}
        loading={false}
      />,
    )
    expect(screen.getByText(/No results yet/)).toBeInTheDocument()
  })

  it('shows a loading message while calculating', () => {
    render(
      <WithdrawalResults
        run={null}
        selectedPathId="median"
        onSelectPath={vi.fn()}
        error={null}
        loading={true}
      />,
    )
    expect(screen.getByText('Running simulation…')).toBeInTheDocument()
  })

  it('shows the error state', () => {
    render(
      <WithdrawalResults
        run={null}
        selectedPathId="median"
        onSelectPath={vi.fn()}
        error="Model projection does not include retirement year 2030"
        loading={false}
      />,
    )
    expect(
      screen.getByText('Model projection does not include retirement year 2030'),
    ).toBeInTheDocument()
  })

  it('renders the Monte Carlo summary first with the four metrics', () => {
    render(<Harness run={makeRun()} />)
    const results = screen.getAllByText('70.0%')
    expect(results.length).toBeGreaterThan(0)

    expect(screen.getByText('Monte Carlo outcomes')).toBeInTheDocument()
    expect(screen.getByText('Ran out of money')).toBeInTheDocument()
    expect(screen.getByText('Below minimum spending')).toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Time at desired spend')).toBeInTheDocument()
    expect(screen.getByText('20.0%')).toBeInTheDocument()
    expect(screen.getByText('10.0%')).toBeInTheDocument()
    expect(screen.getByText('80.0%')).toBeInTheDocument()

    const summaryNode = screen.getByText('Monte Carlo outcomes').closest('div')
    const stripNode = screen.getByRole('group', { name: 'Price paths' })
    expect(
      summaryNode!.compareDocumentPosition(stripNode) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('shows an em dash for the desired-spend metric when it is null', () => {
    const run = makeRun()
    run.monteCarlo = {
      runCount: 10000,
      seed: 42,
      summary: {
        runOutPct: 100.0,
        belowMinPct: 0.0,
        successPct: 0.0,
        desiredSpendPct: null,
      },
      percentiles: [],
      forensics: {
        survivalByYear: [
          { year: 2030, survivalPct: 0 },
          { year: 2031, survivalPct: 0 },
        ],
        failureHistogram: [
          { year: 2030, depleted: 10000, belowMin: 0 },
          { year: 2031, depleted: 0, belowMin: 0 },
        ],
        medianFailureYear: 2030,
        shortfallMedianUsd: 20000,
        shortfallP90Usd: 20000,
      },
      legacy: {
        finalBtcP10: 0,
        finalBtcP50: 0,
        finalBtcP90: 0,
        successFinalBtcMedian: null,
      },
      phaseTime: null,
    }
    render(<Harness run={run} />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.queryByText('80.0%')).not.toBeInTheDocument()
  })

  it('hides the Monte Carlo summary when the horizon is zero', () => {
    const run = makeRun()
    run.totalYears = 0
    render(<Harness run={run} />)
    expect(screen.queryByText('Monte Carlo outcomes')).not.toBeInTheDocument()
  })

  it('shows info buttons for each Monte Carlo metric', async () => {
    const user = userEvent.setup()
    render(<Harness run={makeRun()} />)

    expect(
      screen.getByRole('button', { name: 'About Monte Carlo outcomes' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Ran out of money' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'About Ran out of money' }),
    )
    expect(screen.getByText(/stack hit zero/)).toBeInTheDocument()
  })

  it('shows info buttons for price paths and the phase column', async () => {
    const user = userEvent.setup()
    render(<Harness run={makeRun()} />)

    expect(
      screen.getByRole('button', { name: 'About Price paths' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Phase' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'About Price paths' }))
    expect(screen.getByText(/P10 is pessimistic/)).toBeInTheDocument()
  })

  it('opening an info popover does not change the selected path', async () => {
    const user = userEvent.setup()
    render(<Harness run={makeRun()} />)

    await user.click(screen.getByRole('button', { name: 'About Price paths' }))

    expect(screen.getByText('0.92 BTC left · Fair')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Medium/ }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  function makeNoFailuresRun(): WithdrawalRun {
    const run = makeRun()
    run.monteCarlo = {
      runCount: 10000,
      seed: 42,
      summary: {
        runOutPct: 0.0,
        belowMinPct: 0.0,
        successPct: 100.0,
        desiredSpendPct: 90.0,
      },
      percentiles: [],
      forensics: {
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
      },
      legacy: {
        finalBtcP10: 1.0,
        finalBtcP50: 2.0,
        finalBtcP90: 3.0,
        successFinalBtcMedian: 2.0,
      },
      phaseTime: {
        bearPct: 20,
        fairPct: 60,
        euphoriaPct: 20,
      },
    }
    return run
  }

  it('renders the forensics section below the summary and above the price paths', () => {
    render(<Harness run={makeRun()} />)
    expect(screen.getByText('Failure forensics')).toBeInTheDocument()

    const summaryNode = screen.getByText('Monte Carlo outcomes').closest('div')
    const forensicsNode = screen.getByText('Failure forensics').closest('div')
    const stripNode = screen.getByRole('group', { name: 'Price paths' })
    expect(
      summaryNode!.compareDocumentPosition(forensicsNode!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      forensicsNode!.compareDocumentPosition(stripNode) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders failure forensics tiles and legacy stats', () => {
    render(<Harness run={makeRun()} />)
    expect(screen.getByText('Survival rate')).toBeInTheDocument()
    expect(screen.getByText('Failure years')).toBeInTheDocument()
    expect(screen.getByText('Median failure year')).toBeInTheDocument()
    expect(screen.getAllByText('2031').length).toBeGreaterThan(0)
    expect(screen.getByText('$5,000')).toBeInTheDocument()
    expect(screen.getByText('$12,000')).toBeInTheDocument()
    expect(screen.getByText('Final BTC median')).toBeInTheDocument()
    expect(screen.getByText('Success median BTC')).toBeInTheDocument()
    expect(screen.getByText('Bear years')).toBeInTheDocument()
    expect(screen.getByText('25.0%')).toBeInTheDocument()
  })

  it('hides the failure parts when there are no failures', () => {
    render(<Harness run={makeNoFailuresRun()} />)
    expect(screen.getByText('Failure forensics')).toBeInTheDocument()
    expect(screen.queryByText('Survival rate')).not.toBeInTheDocument()
    expect(screen.queryByText('Failure years')).not.toBeInTheDocument()
    expect(screen.queryByText('Median failure year')).not.toBeInTheDocument()
    expect(screen.queryByText('Shortfall median')).not.toBeInTheDocument()
    expect(screen.getByText('Final BTC median')).toBeInTheDocument()
    expect(screen.getByText('Bear years')).toBeInTheDocument()
  })

  it('hides the forensics section when the horizon is zero', () => {
    const run = makeRun()
    run.totalYears = 0
    render(<Harness run={run} />)
    expect(screen.queryByText('Failure forensics')).not.toBeInTheDocument()
    expect(screen.queryByText('Final BTC median')).not.toBeInTheDocument()
  })

  it('shows info buttons for each forensics metric', async () => {
    const user = userEvent.setup()
    render(<Harness run={makeRun()} />)

    expect(
      screen.getByRole('button', { name: 'About Failure forensics' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Survival rate' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Failure years' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Median failure year' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Shortfall median' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Final BTC median' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Bear years' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'About Median failure year' }),
    )
    expect(screen.getByText(/middle failure year/)).toBeInTheDocument()
  })

  it('renders the Monte Carlo visualization between forensics and the price paths', () => {
    const run = makeRun()
    run.monteCarlo!.percentiles = makePercentiles(2)
    render(<Harness run={run} />)

    expect(screen.getByText('Year-by-year range')).toBeInTheDocument()
    expect(screen.getByText('Year-by-year distribution')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'BTC holdings' }),
    ).toBeInTheDocument()

    const forensicsNode = screen.getByText('Failure forensics').closest('div')
    const vizNode = screen.getByText('Year-by-year range').closest('div')
    const stripNode = screen.getByRole('group', { name: 'Price paths' })
    expect(
      forensicsNode!.compareDocumentPosition(vizNode!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      vizNode!.compareDocumentPosition(stripNode) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    const distributionTable = screen
      .getAllByRole('table')
      .find((t) => within(t).queryByText('Median BTC'))
    expect(distributionTable).toBeTruthy()
    expect(within(distributionTable!).getAllByRole('row')).toHaveLength(3)
  })

  it('hides the visualization section when the horizon is zero', () => {
    const run = makeRun()
    run.totalYears = 0
    run.monteCarlo!.percentiles = makePercentiles(2)
    render(<Harness run={run} />)
    expect(screen.queryByText('Year-by-year range')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Year-by-year distribution'),
    ).not.toBeInTheDocument()
  })

  it('hides the visualization section when there is no Monte Carlo run', () => {
    const run = makeRun()
    run.monteCarlo = null
    render(<Harness run={run} />)
    expect(screen.queryByText('Year-by-year range')).not.toBeInTheDocument()
  })
})
