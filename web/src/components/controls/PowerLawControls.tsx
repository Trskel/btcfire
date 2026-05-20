import { useState, useEffect, useCallback } from 'react'
import type { PowerLawConfig, PowerLawResult, Formulation, BandStyle } from '@/types/models'
import { toModelOverlay } from '@/types/models'
import type { ModelOverlay } from '@/types/models'
import type { PricePoint } from '@/types/price'
import init, { run_power_law_wasm } from 'btcfire-wasm'

let wasmReady = false

async function ensureWasm() {
  if (!wasmReady) {
    await init()
    wasmReady = true
  }
}

interface PowerLawControlsProps {
  historicData: PricePoint[]
  projectionYears: number
  onModelChange: (overlay: ModelOverlay | null) => void
}

export function PowerLawControls({
  historicData,
  projectionYears,
  onModelChange,
}: PowerLawControlsProps) {
  const [formulation, setFormulation] = useState<Formulation>('log_log')
  const [bandStyle, setBandStyle] = useState<BandStyle>('1sigma')
  const [customA, setCustomA] = useState('5.84')
  const [customB, setCustomB] = useState('-17.3')
  const [customP10, setCustomP10] = useState('10')
  const [customP90, setCustomP90] = useState('90')
  const [customP25, setCustomP25] = useState('25')
  const [customP75, setCustomP75] = useState('75')
  const [result, setResult] = useState<PowerLawResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runModel = useCallback(async () => {
    if (!historicData || historicData.length < 2) {
      setError('Not enough data points')
      return
    }

    try {
      await ensureWasm()

      const config: PowerLawConfig = {
        formulation,
        bandStyle,
        projectionYears,
      }

      if (formulation === 'custom') {
        config.customA = parseFloat(customA)
        config.customB = parseFloat(customB)
      }

      if (bandStyle === 'custom_percentiles') {
        config.customP10 = parseFloat(customP10)
        config.customP90 = parseFloat(customP90)
        config.customP25 = parseFloat(customP25)
        config.customP75 = parseFloat(customP75)
      }

      const rawResult = (await run_power_law_wasm(config, historicData)) as PowerLawResult
      setResult(rawResult)
      setError(null)

      const overlay = toModelOverlay(rawResult, 'power-law')
      onModelChange(overlay)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Model error')
      onModelChange(null)
    }
  }, [
    historicData,
    formulation,
    bandStyle,
    projectionYears,
    customA,
    customB,
    customP10,
    customP90,
    customP25,
    customP75,
    onModelChange,
  ])

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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-0">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Formulation
          </label>
          <select
            className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={formulation}
            onChange={(e) => setFormulation(e.target.value as Formulation)}
          >
            <option value="log_log">Log-log fit</option>
            <option value="power_fit">Power fit</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {formulation === 'custom' && (
          <>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                a
              </label>
              <input
                type="number"
                step="0.01"
                className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={customA}
                onChange={(e) => setCustomA(e.target.value)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                b
              </label>
              <input
                type="number"
                step="0.01"
                className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={customB}
                onChange={(e) => setCustomB(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="flex-1 min-w-0">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Confidence Band
          </label>
          <select
            className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={bandStyle}
            onChange={(e) => setBandStyle(e.target.value as BandStyle)}
          >
            <option value="1sigma">±1σ</option>
            <option value="1sigma_2sigma">±1σ &amp; ±2σ</option>
            <option value="custom_percentiles">Custom percentiles</option>
          </select>
        </div>

        {bandStyle === 'custom_percentiles' && (
          <>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                P{parseInt(customP10) || 10} / P{parseInt(customP90) || 90}
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min={0}
                  max={49}
                  className="min-h-[44px] w-full rounded-lg border border-border bg-background px-1 py-2 text-xs text-center"
                  value={customP10}
                  onChange={(e) => setCustomP10(e.target.value)}
                  placeholder="10"
                />
                <span className="flex items-center text-xs text-muted-foreground">/</span>
                <input
                  type="number"
                  min={51}
                  max={100}
                  className="min-h-[44px] w-full rounded-lg border border-border bg-background px-1 py-2 text-xs text-center"
                  value={customP90}
                  onChange={(e) => setCustomP90(e.target.value)}
                  placeholder="90"
                />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                P{parseInt(customP25) || 25} / P{parseInt(customP75) || 75}
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min={0}
                  max={49}
                  className="min-h-[44px] w-full rounded-lg border border-border bg-background px-1 py-2 text-xs text-center"
                  value={customP25}
                  onChange={(e) => setCustomP25(e.target.value)}
                  placeholder="25"
                />
                <span className="flex items-center text-xs text-muted-foreground">/</span>
                <input
                  type="number"
                  min={51}
                  max={100}
                  className="min-h-[44px] w-full rounded-lg border border-border bg-background px-1 py-2 text-xs text-center"
                  value={customP75}
                  onChange={(e) => setCustomP75(e.target.value)}
                  placeholder="75"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {result && (
        <p className="text-xs text-muted-foreground">
          R² = {result.rSquared.toFixed(4)} | a = {result.a.toFixed(2)} | b = {result.b.toFixed(2)}
        </p>
      )}
    </div>
  )
}
