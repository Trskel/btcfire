import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WithdrawalResults } from '@/components/controls/WithdrawalResults'
import type { PathId, WithdrawalRun } from '@/lib/withdrawal'
import type { YearResult } from '@/types/policy'

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
})
