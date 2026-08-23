import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clampParam,
  defaultSimulationParams,
  sanitizeSimulationParams,
  type SimulationParams,
} from '@/types/simulation'

export const SIM_PARAMS_STORAGE_KEY = 'btcfire.simParams.v1'

const STORAGE_VERSION = 1
const SAVE_DEBOUNCE_MS = 300

interface StoredSimParams {
  version: number
  params: unknown
}

function loadStoredParams(): SimulationParams | null {
  try {
    const raw = localStorage.getItem(SIM_PARAMS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSimParams
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      parsed.version !== STORAGE_VERSION
    ) {
      return null
    }
    return sanitizeSimulationParams(parsed.params)
  } catch {
    return null
  }
}

export function useSimulationParams() {
  const [params, setParams] = useState<SimulationParams>(
    () => loadStoredParams() ?? defaultSimulationParams(),
  )
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
    }
    saveTimer.current = window.setTimeout(() => {
      try {
        const payload: StoredSimParams = { version: STORAGE_VERSION, params }
        localStorage.setItem(SIM_PARAMS_STORAGE_KEY, JSON.stringify(payload))
      } catch {
        // localStorage unavailable
      }
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
    }
  }, [params])

  const setParam = useCallback(
    <K extends keyof SimulationParams>(key: K, value: number) => {
      setParams((prev) => {
        const next = clampParam(key, value)
        return prev[key] === next ? prev : { ...prev, [key]: next }
      })
    },
    [],
  )

  const resetParams = useCallback(() => {
    try {
      localStorage.removeItem(SIM_PARAMS_STORAGE_KEY)
    } catch {
      // localStorage unavailable
    }
    setParams(defaultSimulationParams())
  }, [])

  return { params, setParam, resetParams }
}
