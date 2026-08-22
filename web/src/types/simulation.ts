export interface SimulationParams {
  holdingsBtc: number
  retirementStartYear: number
  currentAge: number
  lifespan: number
  minimumSpendUsd: number
  annualSpendUsd: number
  inflationRate: number
}

export interface MonteCarloSummary {
  runOutPct: number
  belowMinPct: number
  successPct: number
  desiredSpendPct: number | null
}

export interface YearPercentiles {
  year: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  spendP10: number
  spendP25: number
  spendP50: number
  spendP75: number
  spendP90: number
  bufferYearsP10: number
  bufferYearsP25: number
  bufferYearsP50: number
  bufferYearsP75: number
  bufferYearsP90: number
}

export interface SurvivalPoint {
  year: number
  survivalPct: number
}

export interface FailureHistogramPoint {
  year: number
  depleted: number
  belowMin: number
}

export interface MonteCarloForensics {
  survivalByYear: SurvivalPoint[]
  failureHistogram: FailureHistogramPoint[]
  medianFailureYear: number | null
  shortfallMedianUsd: number | null
  shortfallP90Usd: number | null
}

export interface LegacyStats {
  finalBtcP10: number
  finalBtcP50: number
  finalBtcP90: number
  successFinalBtcMedian: number | null
}

export interface PhaseTimeStats {
  bearPct: number
  fairPct: number
  euphoriaPct: number
}

export interface MonteCarloResult {
  runCount: number
  seed: number
  summary: MonteCarloSummary
  percentiles: YearPercentiles[]
  forensics: MonteCarloForensics | null
  legacy: LegacyStats | null
  phaseTime: PhaseTimeStats | null
}

export interface ParamBounds {
  min: number
  max: number
  step: number
  default: number
}

const CURRENT_YEAR = new Date().getFullYear()

export const PARAM_BOUNDS: Record<keyof SimulationParams, ParamBounds> = {
  holdingsBtc: { min: 0, max: 21000000, step: 0.00000001, default: 1 },
  retirementStartYear: {
    min: CURRENT_YEAR,
    max: CURRENT_YEAR + 100,
    step: 1,
    default: CURRENT_YEAR,
  },
  currentAge: { min: 1, max: 100, step: 1, default: 35 },
  lifespan: { min: 50, max: 120, step: 1, default: 90 },
  minimumSpendUsd: { min: 0, max: 250000, step: 500, default: 20000 },
  annualSpendUsd: { min: 0, max: 10000000, step: 1000, default: 50000 },
  inflationRate: { min: 0, max: 10, step: 0.5, default: 3 },
}

export function defaultSimulationParams(): SimulationParams {
  return {
    holdingsBtc: PARAM_BOUNDS.holdingsBtc.default,
    retirementStartYear: PARAM_BOUNDS.retirementStartYear.default,
    currentAge: PARAM_BOUNDS.currentAge.default,
    lifespan: PARAM_BOUNDS.lifespan.default,
    minimumSpendUsd: PARAM_BOUNDS.minimumSpendUsd.default,
    annualSpendUsd: PARAM_BOUNDS.annualSpendUsd.default,
    inflationRate: PARAM_BOUNDS.inflationRate.default,
  }
}

export function clampParam<K extends keyof SimulationParams>(
  key: K,
  value: number,
): number {
  const { min, max, default: fallback } = PARAM_BOUNDS[key]
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

export function sanitizeSimulationParams(input: unknown): SimulationParams {
  const result = defaultSimulationParams()
  if (typeof input !== 'object' || input === null) return result
  const candidate = input as Record<string, unknown>
  for (const key of Object.keys(PARAM_BOUNDS) as Array<
    keyof SimulationParams
  >) {
    const raw = candidate[key]
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      result[key] = clampParam(key, raw)
    }
  }
  return result
}
