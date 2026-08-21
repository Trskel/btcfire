import { useState, useEffect, useCallback } from 'react'
import type { Bitcoin24Config, Bitcoin24Result } from '@/types/models'
import { toModelOverlay } from '@/types/models'
import type { ModelOverlay } from '@/types/models'
import type { PricePoint } from '@/types/price'
import { run_bitcoin24_wasm } from 'btcfire-wasm'
import { ensureWasm } from '@/lib/wasm'

interface Bitcoin24ControlsProps {
  historicData: PricePoint[]
  projectionYears: number
  onModelChange: (overlay: ModelOverlay | null) => void
}

export function Bitcoin24Controls({
  historicData,
  projectionYears,
  onModelChange,
}: Bitcoin24ControlsProps) {
  const [result, setResult] = useState<Bitcoin24Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runModel = useCallback(async () => {
    if (!historicData || historicData.length < 2) {
      setError('Not enough data points')
      return
    }

    try {
      await ensureWasm()

      const config: Bitcoin24Config = {
        projectionYears,
      }

      const rawResult = (await run_bitcoin24_wasm(config, historicData)) as Bitcoin24Result
      setResult(rawResult)
      setError(null)

      const overlay = toModelOverlay(rawResult, 'bitcoin24')
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
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            R² = {result.rSquared.toFixed(4)} | CAGR slope = {result.a.toFixed(6)} | intercept = {result.b.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground/60">
            R² measures fit to past data only — it does not predict future accuracy.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        The Bitcoin24 model (MicroStrategy's CAGR approach) fits log(price) = slope × years_since_genesis + intercept using linear regression on historic data. It assumes Bitcoin will continue to grow at its historical compound annual growth rate. This is the simplest long-term projection model — a pure exponential trend extrapolation.
      </p>
    </div>
  )
}
