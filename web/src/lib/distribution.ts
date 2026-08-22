import type { MonteCarloResult } from '@/types/simulation'

export interface DistributionRow {
  year: number
  btcP10: number
  btcP50: number
  btcP90: number
  spendP50: number
  bufferP50: number
  survivalPct: number | null
}

export function buildDistributionRows(
  result: MonteCarloResult,
): DistributionRow[] {
  const survivalByYear = new Map<number, number>(
    (result.forensics?.survivalByYear ?? []).map((s) => [s.year, s.survivalPct]),
  )

  return result.percentiles.map((p) => ({
    year: p.year,
    btcP10: p.p10,
    btcP50: p.p50,
    btcP90: p.p90,
    spendP50: p.spendP50,
    bufferP50: p.bufferYearsP50,
    survivalPct: survivalByYear.get(p.year) ?? null,
  }))
}
