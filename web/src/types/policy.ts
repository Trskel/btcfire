export type Anchor = 'percent_of_initial' | 'percent_of_current' | 'fixed_usd'
export type Payout = 'monthly' | 'quarterly' | 'yearly'
export type Review = 'once' | 'yearly' | 'monthly'
export type Indicator = 'power_law_quantile' | 'mayer_multiple'
export type Onboarding = 'immediate' | 'deferred_to_euphoria'
export type PresetId =
  | 'classic_fire'
  | 'fixed_pct'
  | 'guardrails'
  | 'valuation_based'
  | 'custom'
export type Phase = 'bear' | 'fair' | 'euphoria'

export interface GuardrailsKnobs {
  enabled: boolean
  ceilingPct: number
  floorPct: number
  adjustPct: number
  prosperity: boolean
}

export interface BufferKnobs {
  enabled: boolean
  years: number
}

export interface ValuationKnobs {
  enabled: boolean
  indicator: Indicator
  fairLow: number
  fairHigh: number
  bearSurplusPct: number
  fairSurplusPct: number
  euphoriaSurplusPct: number
  bufferTargetLowYears: number
  bufferTargetHighYears: number
  safetyValve: number
  onboarding: Onboarding
}

export interface WithdrawalPolicy {
  preset: PresetId
  anchor: Anchor
  ratePct: number
  spendUsd: number
  payout: Payout
  review: Review
  guardrails: GuardrailsKnobs
  buffer: BufferKnobs
  valuation: ValuationKnobs
}

export interface YearResult {
  year: number
  btc: number
  cashUsd: number
  bufferYears: number
  spendUsd: number
  soldBtc: number
  phase: Phase | null
}

export interface PolicyKnobBounds {
  min: number
  max: number
  step: number
  default: number
}

export type PolicyKnobKey =
  | 'ratePct'
  | 'spendUsd'
  | 'ceilingPct'
  | 'floorPct'
  | 'adjustPct'
  | 'bufferYears'
  | 'fairLow'
  | 'fairHigh'
  | 'bearSurplusPct'
  | 'fairSurplusPct'
  | 'euphoriaSurplusPct'
  | 'bufferTargetLowYears'
  | 'bufferTargetHighYears'
  | 'safetyValve'

export const POLICY_BOUNDS: Record<PolicyKnobKey, PolicyKnobBounds> = {
  ratePct: { min: 0, max: 20, step: 0.25, default: 4 },
  spendUsd: { min: 0, max: 10000000, step: 1000, default: 50000 },
  ceilingPct: { min: 0, max: 100, step: 1, default: 20 },
  floorPct: { min: 0, max: 100, step: 1, default: 20 },
  adjustPct: { min: 1, max: 50, step: 1, default: 10 },
  bufferYears: { min: 0, max: 10, step: 0.5, default: 3 },
  fairLow: { min: 0, max: 100, step: 1, default: 50 },
  fairHigh: { min: 0, max: 100, step: 1, default: 85 },
  bearSurplusPct: { min: 0, max: 100, step: 1, default: 0 },
  fairSurplusPct: { min: 0, max: 100, step: 1, default: 0 },
  euphoriaSurplusPct: { min: 0, max: 100, step: 1, default: 8 },
  bufferTargetLowYears: { min: 0, max: 10, step: 0.5, default: 2 },
  bufferTargetHighYears: { min: 0, max: 10, step: 0.5, default: 4 },
  safetyValve: { min: 0, max: 100, step: 1, default: 50 },
}

export const PRESET_LABELS: Record<PresetId, string> = {
  classic_fire: 'Classic FIRE',
  fixed_pct: 'Fixed %',
  guardrails: 'Guardrails',
  valuation_based: 'Valuation-based',
  custom: 'Custom',
}

export const PRESET_DESCRIPTIONS: Record<PresetId, string> = {
  classic_fire: '4% of the initial stack, set once',
  fixed_pct: '4% of the current stack each year',
  guardrails: 'Guyton-Klinger guardrails with prosperity rule',
  valuation_based: 'Phase-aware selling with a cash buffer',
  custom: 'Tune every knob yourself',
}

function baseGuardrails(): GuardrailsKnobs {
  return {
    enabled: false,
    ceilingPct: POLICY_BOUNDS.ceilingPct.default,
    floorPct: POLICY_BOUNDS.floorPct.default,
    adjustPct: POLICY_BOUNDS.adjustPct.default,
    prosperity: true,
  }
}

function baseBuffer(): BufferKnobs {
  return {
    enabled: false,
    years: POLICY_BOUNDS.bufferYears.default,
  }
}

function baseValuation(): ValuationKnobs {
  return {
    enabled: false,
    indicator: 'power_law_quantile',
    fairLow: POLICY_BOUNDS.fairLow.default,
    fairHigh: POLICY_BOUNDS.fairHigh.default,
    bearSurplusPct: POLICY_BOUNDS.bearSurplusPct.default,
    fairSurplusPct: POLICY_BOUNDS.fairSurplusPct.default,
    euphoriaSurplusPct: POLICY_BOUNDS.euphoriaSurplusPct.default,
    bufferTargetLowYears: POLICY_BOUNDS.bufferTargetLowYears.default,
    bufferTargetHighYears: POLICY_BOUNDS.bufferTargetHighYears.default,
    safetyValve: POLICY_BOUNDS.safetyValve.default,
    onboarding: 'deferred_to_euphoria',
  }
}

export function defaultPolicy(): WithdrawalPolicy {
  return policyForPreset('classic_fire')
}

export function policyForPreset(preset: PresetId): WithdrawalPolicy {
  const common = {
    preset,
    anchor: 'percent_of_initial' as Anchor,
    ratePct: POLICY_BOUNDS.ratePct.default,
    spendUsd: POLICY_BOUNDS.spendUsd.default,
    payout: 'yearly' as Payout,
    review: 'once' as Review,
    guardrails: baseGuardrails(),
    buffer: baseBuffer(),
    valuation: baseValuation(),
  }

  switch (preset) {
    case 'classic_fire':
      return common
    case 'fixed_pct':
      return { ...common, anchor: 'percent_of_current', review: 'yearly' }
    case 'guardrails':
      return {
        ...common,
        review: 'yearly',
        guardrails: { ...baseGuardrails(), enabled: true },
      }
    case 'valuation_based':
      return {
        ...common,
        anchor: 'fixed_usd',
        payout: 'monthly',
        review: 'monthly',
        buffer: {
          enabled: true,
          years: POLICY_BOUNDS.bufferTargetHighYears.default,
        },
        valuation: { ...baseValuation(), enabled: true },
      }
    case 'custom':
      return { ...common, review: 'yearly' }
  }
}

export function clampKnobValue(key: PolicyKnobKey, value: number): number {
  const { min, max, default: fallback } = POLICY_BOUNDS[key]
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

export function sanitizePolicy(input: unknown): WithdrawalPolicy {
  const result = defaultPolicy()
  if (typeof input !== 'object' || input === null) return result

  const candidate = input as Record<string, unknown>
  if (candidate.preset === undefined) return result

  const preset = candidate.preset
  if (typeof preset !== 'string' || !(preset in PRESET_LABELS)) {
    return result
  }
  const base = policyForPreset(preset as PresetId)

  const anchor = candidate.anchor
  if (anchor === 'percent_of_initial' || anchor === 'percent_of_current' || anchor === 'fixed_usd') {
    base.anchor = anchor
  }

  const num = (raw: unknown): number | null =>
    typeof raw === 'number' && Number.isFinite(raw) ? raw : null

  const ratePct = num(candidate.ratePct)
  if (ratePct !== null) base.ratePct = clampKnobValue('ratePct', ratePct)
  const spendUsd = num(candidate.spendUsd)
  if (spendUsd !== null) base.spendUsd = clampKnobValue('spendUsd', spendUsd)

  const payout = candidate.payout
  if (payout === 'monthly' || payout === 'quarterly' || payout === 'yearly') {
    base.payout = payout
  }
  const review = candidate.review
  if (review === 'once' || review === 'yearly' || review === 'monthly') {
    base.review = review
  }

  const enumLike = (raw: unknown): string | null =>
    typeof raw === 'string' ? raw : null
  const toggle = (raw: unknown, fallback: boolean): boolean =>
    typeof raw === 'boolean' ? raw : fallback

  if (typeof candidate.guardrails === 'object' && candidate.guardrails !== null) {
    const g = candidate.guardrails as Record<string, unknown>
    base.guardrails.enabled = toggle(g.enabled, base.guardrails.enabled)
    const ceilingPct = num(g.ceilingPct)
    if (ceilingPct !== null) base.guardrails.ceilingPct = clampKnobValue('ceilingPct', ceilingPct)
    const floorPct = num(g.floorPct)
    if (floorPct !== null) base.guardrails.floorPct = clampKnobValue('floorPct', floorPct)
    const adjustPct = num(g.adjustPct)
    if (adjustPct !== null) base.guardrails.adjustPct = clampKnobValue('adjustPct', adjustPct)
    base.guardrails.prosperity = toggle(g.prosperity, base.guardrails.prosperity)
  }

  if (typeof candidate.buffer === 'object' && candidate.buffer !== null) {
    const b = candidate.buffer as Record<string, unknown>
    base.buffer.enabled = toggle(b.enabled, base.buffer.enabled)
    const years = num(b.years)
    if (years !== null) base.buffer.years = clampKnobValue('bufferYears', years)
  }

  if (typeof candidate.valuation === 'object' && candidate.valuation !== null) {
    const v = candidate.valuation as Record<string, unknown>
    base.valuation.enabled = toggle(v.enabled, base.valuation.enabled)
    const indicator = enumLike(v.indicator)
    if (indicator === 'power_law_quantile' || indicator === 'mayer_multiple') {
      base.valuation.indicator = indicator
    }
    const fairLow = num(v.fairLow)
    if (fairLow !== null) base.valuation.fairLow = clampKnobValue('fairLow', fairLow)
    const fairHigh = num(v.fairHigh)
    if (fairHigh !== null) base.valuation.fairHigh = clampKnobValue('fairHigh', fairHigh)
    const bearSurplusPct = num(v.bearSurplusPct)
    if (bearSurplusPct !== null) {
      base.valuation.bearSurplusPct = clampKnobValue('bearSurplusPct', bearSurplusPct)
    }
    const fairSurplusPct = num(v.fairSurplusPct)
    if (fairSurplusPct !== null) {
      base.valuation.fairSurplusPct = clampKnobValue('fairSurplusPct', fairSurplusPct)
    }
    const euphoriaSurplusPct = num(v.euphoriaSurplusPct)
    if (euphoriaSurplusPct !== null) {
      base.valuation.euphoriaSurplusPct = clampKnobValue('euphoriaSurplusPct', euphoriaSurplusPct)
    }
    const bufferTargetLowYears = num(v.bufferTargetLowYears)
    if (bufferTargetLowYears !== null) {
      base.valuation.bufferTargetLowYears = clampKnobValue(
        'bufferTargetLowYears',
        bufferTargetLowYears,
      )
    }
    const bufferTargetHighYears = num(v.bufferTargetHighYears)
    if (bufferTargetHighYears !== null) {
      base.valuation.bufferTargetHighYears = clampKnobValue(
        'bufferTargetHighYears',
        bufferTargetHighYears,
      )
    }
    const safetyValve = num(v.safetyValve)
    if (safetyValve !== null) base.valuation.safetyValve = clampKnobValue('safetyValve', safetyValve)
    const onboarding = enumLike(v.onboarding)
    if (onboarding === 'immediate' || onboarding === 'deferred_to_euphoria') {
      base.valuation.onboarding = onboarding
    }
  }

  return base
}

/** True when the policy's knobs differ from its preset's defaults. */
export function isPolicyDirty(policy: WithdrawalPolicy): boolean {
  return JSON.stringify(policy) !== JSON.stringify(policyForPreset(policy.preset))
}
