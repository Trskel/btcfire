import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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
        results: [yearResult(2030, 0.96, 4000), yearResult(2031, 0.92, 4120)],
      },
      {
        pathId: 'minus_1s',
        name: 'Bearish',
        label: '−1σ',
        results: [
          yearResult(2030, 0.5, 3000, 'bear'),
          yearResult(2031, 0, 0, 'bear', 0),
        ],
      },
      {
        pathId: 'plus_2s',
        name: 'Deep bull',
        label: '+2σ',
        results: [
          yearResult(2030, 1.4, 6000, 'euphoria'),
          yearResult(2031, 1.8, 6200, 'euphoria'),
        ],
      },
    ],
    coveredYears: 2,
    totalYears: 55,
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
})
