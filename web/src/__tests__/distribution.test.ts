import { describe, it, expect } from 'vitest'
import { buildDistributionRows } from '@/lib/distribution'
import { formatSurvivalPct } from '@/lib/format'
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

function makeResult(percentiles: YearPercentiles[]): MonteCarloResult {
  return {
    runCount: 10000,
    seed: 42,
    summary: {
      runOutPct: 20,
      belowMinPct: 10,
      successPct: 70,
      desiredSpendPct: 80,
    },
    percentiles,
    forensics: {
      survivalByYear: [
        { year: 2030, survivalPct: 100 },
        { year: 2031, survivalPct: 90 },
        { year: 2033, survivalPct: 70 },
      ],
      failureHistogram: [],
      medianFailureYear: 2031,
      shortfallMedianUsd: null,
      shortfallP90Usd: null,
    },
    legacy: null,
    phaseTime: null,
  }
}

describe('buildDistributionRows', () => {
  it('builds one row per simulated year', () => {
    const rows = buildDistributionRows(makeResult(makePercentiles(12)))
    expect(rows).toHaveLength(12)
    expect(rows[0]?.year).toBe(2030)
    expect(rows[11]?.year).toBe(2041)
  })

  it('maps percentile values and survival shares per year', () => {
    const rows = buildDistributionRows(makeResult(makePercentiles(3)))
    expect(rows[1]).toEqual({
      year: 2031,
      btcP10: 2,
      btcP50: 4,
      btcP90: 6,
      spendP50: 3100,
      bufferP50: 3.5,
      survivalPct: 90,
    })
  })

  it('leaves survival null for years beyond the forensics horizon', () => {
    const rows = buildDistributionRows(makeResult(makePercentiles(4)))
    expect(rows[2]?.survivalPct).toBeNull()
    expect(formatSurvivalPct(rows[2]?.survivalPct ?? null)).toBe('—')
  })

  it('leaves survival null when forensics is missing', () => {
    const result = makeResult(makePercentiles(2))
    result.forensics = null
    const rows = buildDistributionRows(result)
    expect(rows.every((r) => r.survivalPct === null)).toBe(true)
  })
})
