import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DistributionTable } from '@/components/tables/DistributionTable'
import { DistributionCards } from '@/components/tables/DistributionCards'
import { buildDistributionRows } from '@/lib/distribution'
import type { MonteCarloResult, YearPercentiles } from '@/types/simulation'

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

function makeResult(): MonteCarloResult {
  return {
    runCount: 10000,
    seed: 42,
    summary: {
      runOutPct: 20,
      belowMinPct: 10,
      successPct: 70,
      desiredSpendPct: 80,
    },
    percentiles: makePercentiles(3),
    forensics: {
      survivalByYear: [
        { year: 2030, survivalPct: 100 },
        { year: 2031, survivalPct: 90 },
      ],
      failureHistogram: [],
      medianFailureYear: 2032,
      shortfallMedianUsd: null,
      shortfallP90Usd: null,
    },
    legacy: null,
    phaseTime: null,
  }
}

describe('DistributionTable', () => {
  it('renders one row per simulated year with values from the run', () => {
    const rows = buildDistributionRows(makeResult())
    const { container } = render(<DistributionTable rows={rows} />)

    const table = screen.getByRole('table')
    const bodyRows = within(table).getAllByRole('row').slice(1)
    expect(bodyRows).toHaveLength(3)

    const firstRow = within(bodyRows[0]!)
    expect(firstRow.getByText('2030')).toBeInTheDocument()
    expect(firstRow.getByText('3')).toBeInTheDocument()
    expect(firstRow.getByText('1–5')).toBeInTheDocument()
    expect(firstRow.getByText('$3k')).toBeInTheDocument()
    expect(firstRow.getByText('2.5 y')).toBeInTheDocument()
    expect(firstRow.getByText('100.0%')).toBeInTheDocument()

    expect(container.firstElementChild).toHaveClass('hidden', 'sm:block')
  })

  it('shows an em dash when a year has no survival share', () => {
    const rows = buildDistributionRows(makeResult())
    render(<DistributionTable rows={rows} />)
    const table = screen.getByRole('table')
    const lastRow = within(table).getAllByRole('row')[3]!
    expect(within(lastRow).getByText('—')).toBeInTheDocument()
  })

  it('attaches an info button with explanation to every column header', async () => {
    const user = userEvent.setup()
    const rows = buildDistributionRows(makeResult())
    render(<DistributionTable rows={rows} />)

    for (const label of [
      'Median BTC',
      'P10–P90 BTC',
      'Median spend',
      'Median buffer',
      'Survival',
    ]) {
      expect(
        screen.getByRole('button', { name: `About ${label}` }),
      ).toBeInTheDocument()
    }

    await user.click(
      screen.getByRole('button', { name: 'About P10–P90 BTC' }),
    )
    expect(screen.getByText(/middle 80% range/)).toBeInTheDocument()
  })
})

describe('DistributionCards', () => {
  it('renders one card per simulated year below the sm breakpoint', () => {
    const rows = buildDistributionRows(makeResult())
    const { container } = render(<DistributionCards rows={rows} />)

    expect(container.firstElementChild).toHaveClass('grid', 'sm:hidden')
    expect(screen.getAllByText('2030').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Median BTC').length).toBeGreaterThan(0)

    expect(screen.getAllByText('2031').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$3k')).toHaveLength(3)
    expect(screen.getAllByText('90.0%').length).toBeGreaterThan(0)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('attaches an info button to every value label on each card', () => {
    const rows = buildDistributionRows(makeResult())
    render(<DistributionCards rows={rows} />)

    expect(
      screen.getAllByRole('button', { name: 'About Median BTC' }),
    ).toHaveLength(3)
    expect(
      screen.getAllByRole('button', { name: 'About Survival' }),
    ).toHaveLength(3)
  })
})
