import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSimulationParams, SIM_PARAMS_STORAGE_KEY } from '@/hooks/useSimulationParams'

describe('useSimulationParams', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses defaults when storage is missing', () => {
    const { result } = renderHook(() => useSimulationParams())

    expect(result.current.params).toEqual({
      holdingsBtc: 1,
      retirementStartYear: new Date().getFullYear() + 10,
      currentAge: 35,
      lifespan: 90,
      minimumSpendUsd: 20000,
      annualSpendUsd: 50000,
    })
  })

  it('restores valid stored values', () => {
    localStorage.setItem(
      SIM_PARAMS_STORAGE_KEY,
      JSON.stringify({ version: 1, params: { holdingsBtc: 2.5, currentAge: 42 } }),
    )

    const { result } = renderHook(() => useSimulationParams())

    expect(result.current.params.holdingsBtc).toBe(2.5)
    expect(result.current.params.currentAge).toBe(42)
    expect(result.current.params.lifespan).toBe(90)
  })

  it('clamps out-of-bounds stored values', () => {
    localStorage.setItem(
      SIM_PARAMS_STORAGE_KEY,
      JSON.stringify({ version: 1, params: { holdingsBtc: 999999999, currentAge: -5 } }),
    )

    const { result } = renderHook(() => useSimulationParams())

    expect(result.current.params.holdingsBtc).toBe(21000000)
    expect(result.current.params.currentAge).toBe(18)
  })

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem(SIM_PARAMS_STORAGE_KEY, '{not valid json')

    const { result } = renderHook(() => useSimulationParams())

    expect(result.current.params.holdingsBtc).toBe(1)
    expect(result.current.params.currentAge).toBe(35)
  })

  it('falls back to defaults on unknown version', () => {
    localStorage.setItem(
      SIM_PARAMS_STORAGE_KEY,
      JSON.stringify({ version: 99, params: { holdingsBtc: 5 } }),
    )

    const { result } = renderHook(() => useSimulationParams())

    expect(result.current.params.holdingsBtc).toBe(1)
  })

  it('clamps setParam values to bounds', () => {
    const { result } = renderHook(() => useSimulationParams())

    act(() => result.current.setParam('holdingsBtc', 999999999))
    expect(result.current.params.holdingsBtc).toBe(21000000)

    act(() => result.current.setParam('currentAge', -10))
    expect(result.current.params.currentAge).toBe(18)
  })

  it('debounces saves to localStorage', () => {
    const { result } = renderHook(() => useSimulationParams())

    act(() => result.current.setParam('holdingsBtc', 3))
    act(() => result.current.setParam('currentAge', 40))

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(localStorage.getItem(SIM_PARAMS_STORAGE_KEY)).toBeNull()

    act(() => {
      vi.advanceTimersByTime(250)
    })
    const stored = JSON.parse(localStorage.getItem(SIM_PARAMS_STORAGE_KEY)!)
    expect(stored.version).toBe(1)
    expect(stored.params.holdingsBtc).toBe(3)
    expect(stored.params.currentAge).toBe(40)
  })
})
