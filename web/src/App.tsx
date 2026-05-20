import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PriceChart } from '@/components/charts/PriceChart'
import { PowerLawControls } from '@/components/controls/PowerLawControls'
import { S2FControls } from '@/components/controls/S2FControls'
import { ModelSelector } from '@/components/controls/ModelSelector'
import type { ModelEntry } from '@/components/controls/ModelSelector'
import { ThemeToggle } from '@/components/controls/ThemeToggle'
import { useHistoricPrices } from '@/hooks/useHistoricPrices'
import type { ModelOverlay, ModelId } from '@/types/models'

function App() {
  const { data, isLoading, error, isStale, refresh } = useHistoricPrices()
  const [modelOverlays, setModelOverlays] = useState<Record<ModelId, ModelOverlay | null>>({
    'power-law': null,
    's2f': null,
  })
  const [visibleModels, setVisibleModels] = useState<Set<ModelId>>(
    new Set<ModelId>(['power-law']),
  )
  const [expandedModel, setExpandedModel] = useState<ModelId | null>('power-law')
  const [projectionYears, setProjectionYears] = useState(30)

  const handleModelChange = useCallback(
    (modelId: ModelId, overlay: ModelOverlay | null) => {
      setModelOverlays((prev) => ({ ...prev, [modelId]: overlay }))
    },
    [],
  )

  const handleToggleVisibilityWithExpand = useCallback(
    (modelId: ModelId) => {
      setVisibleModels((prev) => {
        const next = new Set(prev)
        if (next.has(modelId)) {
          next.delete(modelId)
        } else {
          next.add(modelId)
          setExpandedModel(modelId)
        }
        return next
      })
    },
    [],
  )

  const handleToggleExpand = useCallback((modelId: ModelId) => {
    setExpandedModel((prev) => (prev === modelId ? null : modelId))
  }, [])

  const visibleOverlays = useMemo(() => {
    return Object.entries(modelOverlays)
      .filter(([id]) => visibleModels.has(id as ModelId))
      .map(([, overlay]) => overlay)
      .filter((o): o is ModelOverlay => o !== null)
  }, [modelOverlays, visibleModels])

  const modelEntries: ModelEntry[] = useMemo(() => {
    if (!data) return []
    return [
      {
        id: 'power-law' as ModelId,
        label: 'Power Law',
        shortLabel: 'Power Law',
        controls: (
          <PowerLawControls
            historicData={data}
            projectionYears={projectionYears}
            onModelChange={(overlay) => handleModelChange('power-law', overlay)}
          />
        ),
      },
      {
        id: 's2f' as ModelId,
        label: 'Stock-to-Flow (S2F)',
        shortLabel: 'S2F',
        controls: (
          <S2FControls
            historicData={data}
            projectionYears={projectionYears}
            onModelChange={(overlay) => handleModelChange('s2f', overlay)}
          />
        ),
      },
    ]
  }, [data, projectionYears, handleModelChange])

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8 lg:px-16">
      <header className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">BTCFire</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Bitcoin retirement simulator
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>BTC Price History</CardTitle>
                <CardDescription>
                  {isLoading
                    ? 'Loading price data...'
                    : error
                      ? 'Failed to load'
                      : isStale
                        ? 'Using cached data (API unavailable)'
                        : `${data?.length.toLocaleString()} days of data`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex h-[400px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
              </div>
            )}
            {error && (
              <div className="flex h-[400px] flex-col items-center justify-center gap-4">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  className="min-h-[44px]"
                  onClick={refresh}
                >
                  Retry
                </Button>
              </div>
            )}
            {data && (
              <PriceChart data={data} modelOverlays={visibleOverlays} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price Models</CardTitle>
            <CardDescription>
              Choose which models to overlay on the chart
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data && (
              <>
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Projection Horizon: {projectionYears}y
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    value={projectionYears}
                    onChange={(e) => setProjectionYears(parseInt(e.target.value))}
                    className="min-h-[44px] w-full"
                  />
                </div>
                <ModelSelector
                  models={modelEntries}
                  visibleModels={visibleModels}
                  expandedModel={expandedModel}
                  onToggleVisibility={handleToggleVisibilityWithExpand}
                  onToggleExpand={handleToggleExpand}
                />
              </>
            )}
            {!data && !isLoading && (
              <p className="text-sm text-muted-foreground">Price data is required to fit the model.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strategies</CardTitle>
            <CardDescription>Coming in Phase 7</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Classic FIRE, fixed percentage, guardrails, and buy-borrow-die withdrawal strategies.
            </p>
          </CardContent>
        </Card>

        <footer className="mt-8 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Disclaimer:</strong> BTCFire is a simulation tool for educational and planning purposes only. It is not financial advice. Past performance of any asset does not predict future results. All price models make assumptions that may prove wrong. Cryptocurrency is volatile — you could lose everything. Consult a qualified financial advisor before making retirement decisions.
          </p>
        </footer>
      </main>
    </div>
  )
}

export default App
