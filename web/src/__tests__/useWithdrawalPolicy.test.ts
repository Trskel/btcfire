import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWithdrawalPolicy, POLICY_STORAGE_KEY } from '@/hooks/useWithdrawalPolicy'
import {
  defaultPolicy,
  policyForPreset,
  sanitizePolicy,
  isPolicyDirty,
  POLICY_BOUNDS,
} from '@/types/policy'

describe('sanitizePolicy', () => {
  it('falls back to Classic FIRE on non-object input', () => {
    expect(sanitizePolicy(null)).toEqual(defaultPolicy())
    expect(sanitizePolicy('garbage')).toEqual(defaultPolicy())
    expect(sanitizePolicy(42)).toEqual(defaultPolicy())
  })

  it('falls back to Classic FIRE when the preset is missing or unknown', () => {
    expect(sanitizePolicy({})).toEqual(defaultPolicy())
    expect(sanitizePolicy({ preset: 'nonsense' })).toEqual(defaultPolicy())
  })

  it('clamps out-of-bounds knobs to bounds', () => {
    const p = sanitizePolicy({
      preset: 'guardrails',
      ratePct: 999,
      guardrails: { enabled: true, ceilingPct: -5, adjustPct: 500 },
    })
    expect(p.preset).toBe('guardrails')
    expect(p.ratePct).toBe(POLICY_BOUNDS.ratePct.max)
    expect(p.guardrails.ceilingPct).toBe(POLICY_BOUNDS.ceilingPct.min)
    expect(p.guardrails.adjustPct).toBe(POLICY_BOUNDS.adjustPct.max)
  })

  it('preserves valid stored values', () => {
    const p = sanitizePolicy({
      preset: 'fixed_pct',
      ratePct: 3.5,
      review: 'monthly',
    })
    expect(p.anchor).toBe('percent_of_current')
    expect(p.ratePct).toBe(3.5)
    expect(p.review).toBe('monthly')
  })

  it('round-trips the valuation preset', () => {
    const round = sanitizePolicy(JSON.parse(JSON.stringify(policyForPreset('valuation_based'))))
    expect(round).toEqual(policyForPreset('valuation_based'))
  })
})

describe('isPolicyDirty', () => {
  it('is clean right after selecting a preset', () => {
    for (const preset of ['classic_fire', 'fixed_pct', 'guardrails', 'valuation_based', 'custom'] as const) {
      expect(isPolicyDirty(policyForPreset(preset))).toBe(false)
    }
  })

  it('marks a policy dirty after a knob edit', () => {
    const p = policyForPreset('classic_fire')
    expect(isPolicyDirty({ ...p, ratePct: 5 })).toBe(true)
    expect(isPolicyDirty({ ...p, anchor: 'percent_of_current' })).toBe(true)
    expect(isPolicyDirty({ ...p, guardrails: { ...p.guardrails, enabled: true } })).toBe(true)
  })

  it('keeps the preset identity while dirty', () => {
    const p = { ...policyForPreset('guardrails'), ratePct: 6 }
    expect(isPolicyDirty(p)).toBe(true)
    expect(p.preset).toBe('guardrails')
  })
})

describe('useWithdrawalPolicy', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses Classic FIRE defaults when storage is missing', () => {
    const { result } = renderHook(() => useWithdrawalPolicy())
    expect(result.current.policy).toEqual(defaultPolicy())
    expect(result.current.dirty).toBe(false)
  })

  it('restores a saved policy across sessions', () => {
    localStorage.setItem(
      POLICY_STORAGE_KEY,
      JSON.stringify({ version: 1, policy: policyForPreset('guardrails') }),
    )

    const { result } = renderHook(() => useWithdrawalPolicy())
    expect(result.current.policy.preset).toBe('guardrails')
    expect(result.current.policy.guardrails.enabled).toBe(true)
  })

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem(POLICY_STORAGE_KEY, '{not valid json')
    const { result } = renderHook(() => useWithdrawalPolicy())
    expect(result.current.policy).toEqual(defaultPolicy())
  })

  it('falls back to defaults on unknown version', () => {
    localStorage.setItem(
      POLICY_STORAGE_KEY,
      JSON.stringify({ version: 99, policy: policyForPreset('guardrails') }),
    )
    const { result } = renderHook(() => useWithdrawalPolicy())
    expect(result.current.policy).toEqual(defaultPolicy())
  })

  it('selecting a preset prefills knobs and clears the dirty marker', () => {
    const { result } = renderHook(() => useWithdrawalPolicy())

    act(() => result.current.setPreset('guardrails'))
    expect(result.current.policy).toEqual(policyForPreset('guardrails'))
    expect(result.current.dirty).toBe(false)
  })

  it('marks the preset dirty after a knob edit', () => {
    const { result } = renderHook(() => useWithdrawalPolicy())

    act(() =>
      result.current.updatePolicy((prev) => ({ ...prev, ratePct: 5 })),
    )
    expect(result.current.dirty).toBe(true)
    expect(result.current.policy.preset).toBe('classic_fire')
  })

  it('debounces saves to localStorage', () => {
    const { result } = renderHook(() => useWithdrawalPolicy())

    act(() =>
      result.current.updatePolicy((prev) => ({ ...prev, ratePct: 3.5 })),
    )

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(localStorage.getItem(POLICY_STORAGE_KEY)).toBeNull()

    act(() => {
      vi.advanceTimersByTime(250)
    })
    const stored = JSON.parse(localStorage.getItem(POLICY_STORAGE_KEY)!)
    expect(stored.version).toBe(1)
    expect(stored.policy.ratePct).toBe(3.5)
    expect(stored.policy.preset).toBe('classic_fire')
  })
})
