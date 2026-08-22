import type { Anchor, Onboarding, Payout, PresetId, Review, WithdrawalPolicy } from '@/types/policy'
import { POLICY_BOUNDS, PRESET_DESCRIPTIONS, PRESET_LABELS } from '@/types/policy'
import { ParameterInput } from './ParameterInput'
import { cn } from '@/lib/utils'

interface WithdrawalTabProps {
  policy: WithdrawalPolicy
  dirty: boolean
  onSelectPreset: (preset: PresetId) => void
  onUpdatePolicy: (updater: (prev: WithdrawalPolicy) => WithdrawalPolicy) => void
}

const PRESETS: PresetId[] = [
  'classic_fire',
  'fixed_pct',
  'guardrails',
  'valuation_based',
  'custom',
]

const ANCHOR_OPTIONS: { value: Anchor; label: string }[] = [
  { value: 'percent_of_initial', label: '% of initial' },
  { value: 'percent_of_current', label: '% of current' },
  { value: 'fixed_usd', label: 'Fixed USD / year' },
]

const PAYOUT_OPTIONS: { value: Payout; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

const REVIEW_OPTIONS: { value: Review; label: string }[] = [
  { value: 'once', label: 'Once' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
]

const ONBOARDING_OPTIONS: { value: Onboarding; label: string }[] = [
  { value: 'deferred_to_euphoria', label: 'Deferred to first euphoria' },
  { value: 'immediate', label: 'Immediate' },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 select-none">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        className="h-4 w-4 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  )
}

export function WithdrawalTab({
  policy,
  dirty,
  onSelectPreset,
  onUpdatePolicy,
}: WithdrawalTabProps) {
  const set = (updater: (prev: WithdrawalPolicy) => WithdrawalPolicy) =>
    onUpdatePolicy(updater)

  const setGuardrail = <K extends 'ceilingPct' | 'floorPct' | 'adjustPct'>(
    key: K,
    value: number,
  ) =>
    set((p) => ({
      ...p,
      guardrails: { ...p.guardrails, [key]: value },
    }))

  const setValuation = <
    K extends
      | 'fairLow'
      | 'fairHigh'
      | 'bearSurplusPct'
      | 'fairSurplusPct'
      | 'euphoriaSurplusPct'
      | 'bufferTargetLowYears'
      | 'bufferTargetHighYears'
      | 'safetyValve',
  >(
    key: K,
    value: number,
  ) =>
    set((p) => ({
      ...p,
      valuation: { ...p.valuation, [key]: value },
    }))

  const pct = (v: number) => `${v}%`
  const years = (v: number) => `${v}y`
  const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {PRESETS.map((id) => {
          const selected = policy.preset === id
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              className={cn(
                'flex min-h-[44px] flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors',
                selected
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background hover:bg-muted',
              )}
              onClick={() => onSelectPreset(id)}
            >
              <span className="text-sm font-medium">
                {PRESET_LABELS[id]}
                {selected && dirty && (
                  <span className="text-primary" aria-label="modified">
                    {' '}
                    *
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {PRESET_DESCRIPTIONS[id]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        <SectionLabel>Anchor</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Anchor
            </label>
            <select
              aria-label="Anchor"
              className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={policy.anchor}
              onChange={(e) =>
                set((p) => ({ ...p, anchor: e.target.value as Anchor }))
              }
            >
              {ANCHOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {policy.anchor !== 'fixed_usd' ? (
            <ParameterInput
              label="Withdrawal rate"
              value={policy.ratePct}
              displayValue={pct(policy.ratePct)}
              min={POLICY_BOUNDS.ratePct.min}
              max={POLICY_BOUNDS.ratePct.max}
              formatValue={(v) => String(v)}
              onChange={(value) => set((p) => ({ ...p, ratePct: value }))}
            />
          ) : (
            <ParameterInput
              label="Annual spend"
              value={policy.spendUsd}
              displayValue={usd(policy.spendUsd)}
              min={POLICY_BOUNDS.spendUsd.min}
              max={POLICY_BOUNDS.spendUsd.max}
              formatValue={(v) => String(Math.round(v))}
              onChange={(value) => set((p) => ({ ...p, spendUsd: value }))}
            />
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Payout frequency
            </label>
            <select
              aria-label="Payout frequency"
              className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={policy.payout}
              onChange={(e) =>
                set((p) => ({ ...p, payout: e.target.value as Payout }))
              }
            >
              {PAYOUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Review cadence
            </label>
            <select
              aria-label="Review cadence"
              className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={policy.review}
              onChange={(e) =>
                set((p) => ({ ...p, review: e.target.value as Review }))
              }
            >
              {REVIEW_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <ToggleRow
          label="Guardrails"
          checked={policy.guardrails.enabled}
          onChange={(enabled) =>
            set((p) => ({ ...p, guardrails: { ...p.guardrails, enabled } }))
          }
        />
        {policy.guardrails.enabled && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ParameterInput
              label="Ceiling threshold"
              value={policy.guardrails.ceilingPct}
              displayValue={`+${pct(policy.guardrails.ceilingPct)}`}
              min={POLICY_BOUNDS.ceilingPct.min}
              max={POLICY_BOUNDS.ceilingPct.max}
              formatValue={(v) => String(v)}
              onChange={(value) => setGuardrail('ceilingPct', value)}
            />
            <ParameterInput
              label="Floor threshold"
              value={policy.guardrails.floorPct}
              displayValue={`−${pct(policy.guardrails.floorPct)}`}
              min={POLICY_BOUNDS.floorPct.min}
              max={POLICY_BOUNDS.floorPct.max}
              formatValue={(v) => String(v)}
              onChange={(value) => setGuardrail('floorPct', value)}
            />
            <ParameterInput
              label="Adjustment size"
              value={policy.guardrails.adjustPct}
              displayValue={pct(policy.guardrails.adjustPct)}
              min={POLICY_BOUNDS.adjustPct.min}
              max={POLICY_BOUNDS.adjustPct.max}
              formatValue={(v) => String(v)}
              onChange={(value) => setGuardrail('adjustPct', value)}
            />
            <ToggleRow
              label="Prosperity rule"
              checked={policy.guardrails.prosperity}
              onChange={(prosperity) =>
                set((p) => ({
                  ...p,
                  guardrails: { ...p.guardrails, prosperity },
                }))
              }
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <ToggleRow
          label="Cash buffer"
          checked={policy.buffer.enabled}
          onChange={(enabled) =>
            set((p) => ({ ...p, buffer: { ...p.buffer, enabled } }))
          }
        />
        {policy.buffer.enabled && !policy.valuation.enabled && (
          <div className="max-w-xs">
            <ParameterInput
              label="Buffer target"
              value={policy.buffer.years}
              displayValue={years(policy.buffer.years)}
              min={POLICY_BOUNDS.bufferYears.min}
              max={POLICY_BOUNDS.bufferYears.max}
              formatValue={(v) => String(v)}
              onChange={(value) =>
                set((p) => ({ ...p, buffer: { ...p.buffer, years: value } }))
              }
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <ToggleRow
          label="Valuation-based selling"
          checked={policy.valuation.enabled}
          onChange={(enabled) =>
            set((p) => ({ ...p, valuation: { ...p.valuation, enabled } }))
          }
        />
        {policy.valuation.enabled && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Indicator
                </label>
                <select
                  aria-label="Indicator"
                  className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={policy.valuation.indicator}
                  onChange={(e) =>
                    set((p) => ({
                      ...p,
                      valuation: {
                        ...p.valuation,
                        indicator: e.target.value as typeof policy.valuation.indicator,
                      },
                    }))
                  }
                >
                  <option value="power_law_quantile">Power Law quantile</option>
                  <option value="mayer_multiple" disabled>
                    Mayer Multiple (coming soon)
                  </option>
                </select>
              </div>

              <ParameterInput
                label="Fair phase low"
                value={policy.valuation.fairLow}
                displayValue={pct(policy.valuation.fairLow)}
                min={POLICY_BOUNDS.fairLow.min}
                max={POLICY_BOUNDS.fairLow.max}
                formatValue={(v) => String(v)}
                onChange={(value) => setValuation('fairLow', value)}
              />
              <ParameterInput
                label="Fair phase high"
                value={policy.valuation.fairHigh}
                displayValue={pct(policy.valuation.fairHigh)}
                min={POLICY_BOUNDS.fairHigh.min}
                max={POLICY_BOUNDS.fairHigh.max}
                formatValue={(v) => String(v)}
                onChange={(value) => setValuation('fairHigh', value)}
              />
              <ParameterInput
                label="Bear surplus"
                value={policy.valuation.bearSurplusPct}
                displayValue={`${pct(policy.valuation.bearSurplusPct)}/yr`}
                min={POLICY_BOUNDS.bearSurplusPct.min}
                max={POLICY_BOUNDS.bearSurplusPct.max}
                formatValue={(v) => String(v)}
                onChange={(value) => setValuation('bearSurplusPct', value)}
              />
              <ParameterInput
                label="Fair surplus"
                value={policy.valuation.fairSurplusPct}
                displayValue={`${pct(policy.valuation.fairSurplusPct)}/yr`}
                min={POLICY_BOUNDS.fairSurplusPct.min}
                max={POLICY_BOUNDS.fairSurplusPct.max}
                formatValue={(v) => String(v)}
                onChange={(value) => setValuation('fairSurplusPct', value)}
              />
              <ParameterInput
                label="Euphoria surplus"
                value={policy.valuation.euphoriaSurplusPct}
                displayValue={`${pct(policy.valuation.euphoriaSurplusPct)}/yr`}
                min={POLICY_BOUNDS.euphoriaSurplusPct.min}
                max={POLICY_BOUNDS.euphoriaSurplusPct.max}
                formatValue={(v) => String(v)}
                onChange={(value) => setValuation('euphoriaSurplusPct', value)}
              />
              {policy.buffer.enabled && (
                <>
                  <ParameterInput
                    label="Buffer target low"
                    value={policy.valuation.bufferTargetLowYears}
                    displayValue={years(policy.valuation.bufferTargetLowYears)}
                    min={POLICY_BOUNDS.bufferTargetLowYears.min}
                    max={POLICY_BOUNDS.bufferTargetLowYears.max}
                    formatValue={(v) => String(v)}
                    onChange={(value) => setValuation('bufferTargetLowYears', value)}
                  />
                  <ParameterInput
                    label="Buffer target high"
                    value={policy.valuation.bufferTargetHighYears}
                    displayValue={years(policy.valuation.bufferTargetHighYears)}
                    min={POLICY_BOUNDS.bufferTargetHighYears.min}
                    max={POLICY_BOUNDS.bufferTargetHighYears.max}
                    formatValue={(v) => String(v)}
                    onChange={(value) => setValuation('bufferTargetHighYears', value)}
                  />
                </>
              )}
              <ParameterInput
                label="Safety valve"
                value={policy.valuation.safetyValve}
                displayValue={pct(policy.valuation.safetyValve)}
                min={POLICY_BOUNDS.safetyValve.min}
                max={POLICY_BOUNDS.safetyValve.max}
                formatValue={(v) => String(v)}
                onChange={(value) => setValuation('safetyValve', value)}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Buffer onboarding
                </label>
                <select
                  aria-label="Buffer onboarding"
                  className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={policy.valuation.onboarding}
                  onChange={(e) =>
                    set((p) => ({
                      ...p,
                      valuation: {
                        ...p.valuation,
                        onboarding: e.target.value as Onboarding,
                      },
                    }))
                  }
                >
                  {ONBOARDING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
