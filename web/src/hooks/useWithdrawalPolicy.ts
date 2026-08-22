import { useCallback, useEffect, useRef, useState } from 'react'
import {
  defaultPolicy,
  isPolicyDirty,
  policyForPreset,
  sanitizePolicy,
  type PresetId,
  type WithdrawalPolicy,
} from '@/types/policy'

export const POLICY_STORAGE_KEY = 'btcfire.withdrawalPolicy.v1'

const STORAGE_VERSION = 1
const SAVE_DEBOUNCE_MS = 300

interface StoredPolicy {
  version: number
  policy: unknown
}

function loadStoredPolicy(): WithdrawalPolicy | null {
  try {
    const raw = localStorage.getItem(POLICY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPolicy
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      parsed.version !== STORAGE_VERSION
    ) {
      return null
    }
    return sanitizePolicy(parsed.policy)
  } catch {
    return null
  }
}

export function useWithdrawalPolicy() {
  const [policy, setPolicy] = useState<WithdrawalPolicy>(
    () => loadStoredPolicy() ?? defaultPolicy(),
  )
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
    }
    saveTimer.current = window.setTimeout(() => {
      try {
        const payload: StoredPolicy = { version: STORAGE_VERSION, policy }
        localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(payload))
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
  }, [policy])

  const setPreset = useCallback((preset: PresetId) => {
    setPolicy(policyForPreset(preset))
  }, [])

  const updatePolicy = useCallback((updater: (prev: WithdrawalPolicy) => WithdrawalPolicy) => {
    setPolicy((prev) => updater(prev))
  }, [])

  const dirty = isPolicyDirty(policy)

  return { policy, dirty, setPreset, updatePolicy }
}
