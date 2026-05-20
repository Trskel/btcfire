import { useState, useEffect, useCallback } from 'react'
import type { S2FConfig, S2FResult } from '@/types/models'
import { toModelOverlay } from '@/types/models'
import type { ModelOverlay } from '@/types/models'
import type { PricePoint } from '@/types/price'
import init, { run_s2f_wasm } from 'btcfire-wasm'

let wasmReady = false

async function ensureWasm() {
  if (!wasmReady) {
    await init()
    wasmReady = true
  }
}

interface S2FControlsProps {
  historicData: PricePoint[]
  projectionYears: number
  onModelChange: (overlay: ModelOverlay | null) => void
}

export function S2FControls({
  historicData,
  projectionYears,
  onModelChange,
}: S2FControlsProps) {
  const [result, setResult] = useState<S2FResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runModel = useCallback(async () => {
    if (!historicData || historicData.length < 2) {
      setError('Not enough data points')
      return
    }

    try {
      await ensureWasm()

      const config: S2FConfig = {
        projectionYears,
      }

      const rawResult = (await run_s2f_wasm(config, historicData)) as S2FResult
      setResult(rawResult)
      setError(null)

      const overlay = toModelOverlay(rawResult, 's2f')
      onModelChange(overlay)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Model error')
      onModelChange(null)
    }
  }, [historicData, projectionYears, onModelChange])

  const hasEnoughData = historicData.length >= 2

  useEffect(() => {
    if (hasEnoughData) {
      const id = setTimeout(() => {
        runModel()
      }, 300)
      return () => clearTimeout(id)
    }
  }, [hasEnoughData, runModel])

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {result && (
        <p className="text-xs text-muted-foreground">
          R² = {result.rSquared.toFixed(4)} | a = {result.a.toFixed(2)} | b = {result.b.toFixed(2)}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        The Stock-to-Flow model relates BTC price to its scarcity ratio. S2F = total supply / annual issuance. The model fits log(price) ~ log(S2F) using historic data and projects forward based on Bitcoin's halving schedule.
      </p>
    </div>
  )
}
