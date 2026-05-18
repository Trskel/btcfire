import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PriceChart } from '@/components/charts/PriceChart'
import { PowerLawControls } from '@/components/controls/PowerLawControls'
import { S2FControls } from '@/components/controls/S2FControls'
import { ModelSelector } from '@/components/controls/ModelSelector'
import { ThemeToggle } from '@/components/controls/ThemeToggle'
import { useHistoricPrices } from '@/hooks/useHistoricPrices'
import type { ModelOverlay, ModelId } from '@/types/models'

function App() {
  const { data, isLoading, error, isStale, refresh } = useHistoricPrices()
  const [modelOverlay, setModelOverlay] = useState<ModelOverlay | null>(null)
  const [activeModel, setActiveModel] = useState<ModelId>('power-law')

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
            {data && <PriceChart data={data} modelOverlay={modelOverlay} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price Models</CardTitle>
            <CardDescription>Choose a model to project future BTC prices</CardDescription>
          </CardHeader>
          <CardContent>
            {data && (
              <ModelSelector activeModel={activeModel} onModelChange={setActiveModel}>
                {activeModel === 'power-law' && (
                  <PowerLawControls
                    historicData={data}
                    onModelChange={setModelOverlay}
                  />
                )}
                {activeModel === 's2f' && (
                  <S2FControls
                    historicData={data}
                    onModelChange={setModelOverlay}
                  />
                )}
              </ModelSelector>
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
      </main>
    </div>
  )
}

export default App
