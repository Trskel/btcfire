export interface ModelPoint {
  year: number
  timestamp_ms: number
  median_price_usd: number
  path_price_usd?: number | null
  band_1sigma_low: number | null
  band_1sigma_high: number | null
  band_2sigma_low: number | null
  band_2sigma_high: number | null
  band_p10: number | null
  band_p90: number | null
  band_p25: number | null
  band_p75: number | null
}

export type Formulation = 'log_log' | 'power_fit' | 'custom'

export type BandStyle = '1sigma' | '1sigma_2sigma' | 'custom_percentiles'

export type ModelId = 'power-law' | 's2f' | 'bitcoin24'

export interface PowerLawConfig {
  formulation: Formulation
  bandStyle: BandStyle
  customA?: number | null
  customB?: number | null
  projectionYears: number
  customP10?: number | null
  customP90?: number | null
  customP25?: number | null
  customP75?: number | null
}

export interface PowerLawResult {
  points: ModelPoint[]
  rSquared: number
  a: number
  b: number
  formulationUsed: string
}

export interface S2FConfig {
  projectionYears: number
}

export interface S2FResult {
  points: ModelPoint[]
  rSquared: number
  a: number
  b: number
}

export interface Bitcoin24Config {
  projectionYears: number
}

export interface Bitcoin24Result {
  points: ModelPoint[]
  rSquared: number
  a: number
  b: number
}

export interface ModelOverlay {
  modelId: ModelId
  median: [number, number][]
  band1SigmaLow?: [number, number][]
  band1SigmaHigh?: [number, number][]
  band2SigmaLow?: [number, number][]
  band2SigmaHigh?: [number, number][]
  bandP10?: [number, number][]
  bandP90?: [number, number][]
  bandP25?: [number, number][]
  bandP75?: [number, number][]
  todayTimestamp: number
  formulation: string
  rSquared: number
}

export const MODEL_COLORS: Record<ModelId, string> = {
  'power-law': '#eab308',
  's2f': '#0694a2',
  'bitcoin24': '#f97316',
}

export const MODEL_LABELS: Record<ModelId, string> = {
  'power-law': 'Power Law',
  's2f': 'S2F',
  'bitcoin24': 'Bitcoin24',
}

export function toModelOverlay(result: PowerLawResult | S2FResult | Bitcoin24Result, modelId: ModelId): ModelOverlay {
  const today = Date.now()

  const median: [number, number][] = result.points.map((p) => [
    p.timestamp_ms,
    p.median_price_usd,
  ])

  const has1Sigma = result.points.some((p) => p.band_1sigma_low != null)
  const has2Sigma = result.points.some((p) => p.band_2sigma_low != null)
  const hasP10 = result.points.some((p) => p.band_p10 != null)
  const hasP25 = result.points.some((p) => p.band_p25 != null)

  const overlay: ModelOverlay = {
    modelId,
    median,
    todayTimestamp: today,
    formulation: 'formulationUsed' in result ? (result as PowerLawResult).formulationUsed : 'cagr',
    rSquared: result.rSquared,
  }

  if (has1Sigma) {
    overlay.band1SigmaHigh = result.points.map((p) => [
      p.timestamp_ms,
      p.band_1sigma_high!,
    ])
    overlay.band1SigmaLow = result.points.map((p) => [
      p.timestamp_ms,
      p.band_1sigma_low!,
    ])
  }

  if (has2Sigma) {
    overlay.band2SigmaHigh = result.points.map((p) => [
      p.timestamp_ms,
      p.band_2sigma_high!,
    ])
    overlay.band2SigmaLow = result.points.map((p) => [
      p.timestamp_ms,
      p.band_2sigma_low!,
    ])
  }

  if (hasP10) {
    overlay.bandP10 = result.points.map((p) => [
      p.timestamp_ms,
      p.band_p10!,
    ])
    overlay.bandP90 = result.points.map((p) => [
      p.timestamp_ms,
      p.band_p90!,
    ])
  }

  if (hasP25) {
    overlay.bandP25 = result.points.map((p) => [
      p.timestamp_ms,
      p.band_p25!,
    ])
    overlay.bandP75 = result.points.map((p) => [
      p.timestamp_ms,
      p.band_p75!,
    ])
  }

  return overlay
}
