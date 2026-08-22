import { run_withdrawal_wasm } from 'btcfire-wasm'
import { ensureWasm } from '@/lib/wasm'
import type { WithdrawalPolicy, YearResult } from '@/types/policy'
import type { SimulationParams } from '@/types/simulation'
import type { ModelOverlay, ModelPoint } from '@/types/models'

export type PathId =
  | 'median'
  | 'minus_1s'
  | 'plus_1s'
  | 'minus_2s'
  | 'plus_2s'
  | 'p10'
  | 'p90'
  | 'p25'
  | 'p75'

export interface BandPathRun {
  pathId: PathId
  name: string
  label: string
  results: YearResult[]
}

export interface WithdrawalRun {
  paths: BandPathRun[]
  coveredYears: number
  totalYears: number
}

/** Second-line band descriptor shown under the directional tile name. */
export const PATH_LABELS: Record<PathId, string> = {
  median: 'fair',
  minus_1s: '−1σ',
  plus_1s: '+1σ',
  minus_2s: '−2σ',
  plus_2s: '+2σ',
  p10: 'P10',
  p90: 'P90',
  p25: 'P25',
  p75: 'P75',
}

/** Friendly directional names for the path tiles. */
export const PATH_NAMES: Record<PathId, string> = {
  median: 'Medium',
  minus_1s: 'Bearish',
  plus_1s: 'Bullish',
  minus_2s: 'Deep bear',
  plus_2s: 'Deep bull',
  p10: 'Bearish',
  p90: 'Bullish',
  p25: 'Bearish',
  p75: 'Bullish',
}

interface PathSource {
  pathId: PathId
  values: [number, number][]
}

function bandPathsForOverlay(overlay: ModelOverlay): PathSource[] {
  const paths: PathSource[] = [
    { pathId: 'median', values: overlay.median },
  ]
  if (overlay.band1SigmaLow) {
    paths.push({ pathId: 'minus_1s', values: overlay.band1SigmaLow })
  }
  if (overlay.band1SigmaHigh) {
    paths.push({ pathId: 'plus_1s', values: overlay.band1SigmaHigh })
  }
  if (overlay.band2SigmaLow) {
    paths.push({ pathId: 'minus_2s', values: overlay.band2SigmaLow })
  }
  if (overlay.band2SigmaHigh) {
    paths.push({ pathId: 'plus_2s', values: overlay.band2SigmaHigh })
  }
  if (overlay.bandP10) {
    paths.push({ pathId: 'p10', values: overlay.bandP10 })
  }
  if (overlay.bandP90) {
    paths.push({ pathId: 'p90', values: overlay.bandP90 })
  }
  if (overlay.bandP25) {
    paths.push({ pathId: 'p25', values: overlay.bandP25 })
  }
  if (overlay.bandP75) {
    paths.push({ pathId: 'p75', values: overlay.bandP75 })
  }
  return paths
}

function overlayToModelPoints(overlay: ModelOverlay, path: PathSource): ModelPoint[] {
  return overlay.median.map(([timestamp], i) => ({
    year: new Date(timestamp).getUTCFullYear(),
    timestamp_ms: timestamp,
    median_price_usd: overlay.median[i][1],
    path_price_usd: path.values[i]?.[1] ?? null,
    band_1sigma_low: overlay.band1SigmaLow ? overlay.band1SigmaLow[i][1] : null,
    band_1sigma_high: overlay.band1SigmaHigh ? overlay.band1SigmaHigh[i][1] : null,
    band_2sigma_low: overlay.band2SigmaLow ? overlay.band2SigmaLow[i][1] : null,
    band_2sigma_high: overlay.band2SigmaHigh ? overlay.band2SigmaHigh[i][1] : null,
    band_p10: overlay.bandP10 ? overlay.bandP10[i][1] : null,
    band_p90: overlay.bandP90 ? overlay.bandP90[i][1] : null,
    band_p25: overlay.bandP25 ? overlay.bandP25[i][1] : null,
    band_p75: overlay.bandP75 ? overlay.bandP75[i][1] : null,
  }))
}

export async function runWithdrawal(
  policy: WithdrawalPolicy,
  params: SimulationParams,
  overlay: ModelOverlay,
): Promise<WithdrawalRun> {
  await ensureWasm()

  const medianPoints = overlayToModelPoints(overlay, { pathId: 'median', values: overlay.median })
  const totalYears = Math.max(0, params.lifespan - params.currentAge)
  const lastYear = medianPoints.length
    ? medianPoints[medianPoints.length - 1].year
    : params.retirementStartYear - 1
  const coveredYears = Math.min(
    totalYears,
    Math.max(0, lastYear - params.retirementStartYear + 1),
  )

  // The engine requires a price for every simulated year. When the model
  // projection ends before the retirement horizon, clamp the run to the
  // covered years and report the truncation to the UI.
  const effective: SimulationParams =
    coveredYears < totalYears
      ? { ...params, lifespan: params.currentAge + coveredYears }
      : params

  const sources = bandPathsForOverlay(overlay)
  const paths: BandPathRun[] = []
  for (const source of sources) {
    const points = overlayToModelPoints(overlay, source)
    const results = (await run_withdrawal_wasm(
      policy,
      effective,
      points,
    )) as YearResult[]
    paths.push({
      pathId: source.pathId,
      name: PATH_NAMES[source.pathId],
      label: PATH_LABELS[source.pathId],
      results,
    })
  }

  return { paths, coveredYears, totalYears }
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err.length > 0) return err
  return 'Simulation error'
}
