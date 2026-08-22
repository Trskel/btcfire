import { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTab, TabsPanel } from '@/components/ui/tabs'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PriceChart } from '@/components/charts/PriceChart'
import { PowerLawControls } from '@/components/controls/PowerLawControls'
import { S2FControls } from '@/components/controls/S2FControls'
import { Bitcoin24Controls } from '@/components/controls/Bitcoin24Controls'
import { ModelSelector } from '@/components/controls/ModelSelector'
import type { ModelEntry } from '@/components/controls/ModelSelector'
import { ThemeToggle } from '@/components/controls/ThemeToggle'
import { ParameterPanel } from '@/components/controls/ParameterPanel'
import { WithdrawalTab } from '@/components/controls/WithdrawalTab'
import { WithdrawalResults } from '@/components/controls/WithdrawalResults'
import { Spinner } from '@/components/ui/spinner'
import { useHistoricPrices } from '@/hooks/useHistoricPrices'
import { useSimulationParams } from '@/hooks/useSimulationParams'
import { useWithdrawalPolicy } from '@/hooks/useWithdrawalPolicy'
import { runWithdrawal, errorMessage } from '@/lib/withdrawal'
import type { PathId } from '@/lib/withdrawal'
import type { WithdrawalRun } from '@/lib/withdrawal'
import type { ModelOverlay, ModelId } from '@/types/models'
import type { WithdrawalPolicy } from '@/types/policy'
import type { SimulationParams } from '@/types/simulation'
import { MODEL_LABELS } from '@/types/models'
import { MODEL_INFO } from '@/content/info'

type ControlTab = 'scenario' | 'price-model' | 'withdrawal'

const MODEL_ORDER: ModelId[] = ['power-law', 's2f', 'bitcoin24']

const PAINT_YIELD_MS = 50

function App() {
  const { data, isLoading, error, isStale, refresh } = useHistoricPrices()
  const { params: simParams, setParam: setSimParam } = useSimulationParams()
  const { policy, dirty, setPreset, updatePolicy } = useWithdrawalPolicy()
  const [controlsOpen, setControlsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<ControlTab>('scenario')
  const [modelOverlays, setModelOverlays] = useState<Record<ModelId, ModelOverlay | null>>({
    'power-law': null,
    's2f': null,
    'bitcoin24': null,
  })
  const [visibleModels, setVisibleModels] = useState<Set<ModelId>>(
    new Set<ModelId>(['power-law']),
  )
  const [expandedModel, setExpandedModel] = useState<ModelId | null>('power-law')
  const [projectionYears, setProjectionYears] = useState(30)
  const [withdrawalResult, setWithdrawalResult] = useState<{
    overlay: ModelOverlay
    policy: WithdrawalPolicy
    simParams: SimulationParams
    run: WithdrawalRun
  } | null>(null)
  const [withdrawalFailure, setWithdrawalFailure] = useState<{
    overlay: ModelOverlay
    policy: WithdrawalPolicy
    simParams: SimulationParams
    message: string
  } | null>(null)

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

  const visibleModelIds = useMemo(
    () => MODEL_ORDER.filter((id) => visibleModels.has(id)),
    [visibleModels],
  )
  const [planModelChoice, setPlanModelChoice] = useState<ModelId | null>(null)
  const planModelId =
    planModelChoice && visibleModelIds.includes(planModelChoice)
      ? planModelChoice
      : (visibleModelIds[0] ?? null)
  const engineOverlay = planModelId ? modelOverlays[planModelId] : null
  const [selectedPathId, setSelectedPathId] = useState<PathId>('median')

  useEffect(() => {
    if (!engineOverlay) return
    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      runWithdrawal(policy, simParams, engineOverlay)
        .then((run) => {
          if (cancelled) return
          setWithdrawalResult({ overlay: engineOverlay, policy, simParams, run })
          setWithdrawalFailure(null)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setWithdrawalResult(null)
          setWithdrawalFailure({
            overlay: engineOverlay,
            policy,
            simParams,
            message: errorMessage(err),
          })
        })
    }, PAINT_YIELD_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [engineOverlay, policy, simParams])
  const resultMatches =
    withdrawalResult !== null &&
    withdrawalResult.overlay === engineOverlay &&
    withdrawalResult.policy === policy &&
    withdrawalResult.simParams === simParams
  const failureMatches =
    withdrawalFailure !== null &&
    withdrawalFailure.overlay === engineOverlay &&
    withdrawalFailure.policy === policy &&
    withdrawalFailure.simParams === simParams

  const planRun = resultMatches ? withdrawalResult.run : null
  const planError = failureMatches ? withdrawalFailure.message : null
  const planLoading =
    engineOverlay !== null && !resultMatches && !failureMatches

  const modelEntries: ModelEntry[] = useMemo(() => {
    if (!data) return []
    return [
      {
        id: 'power-law' as ModelId,
        label: 'Power Law',
        shortLabel: 'Power Law',
        info: MODEL_INFO['power-law'],
        controls: (
          <PowerLawControls
            historicData={data}
            projectionYears={projectionYears}
            simParams={simParams}
            onModelChange={(overlay) => handleModelChange('power-law', overlay)}
          />
        ),
      },
      {
        id: 's2f' as ModelId,
        label: 'Stock-to-Flow (S2F)',
        shortLabel: 'S2F',
        info: MODEL_INFO.s2f,
        controls: (
          <S2FControls
            historicData={data}
            projectionYears={projectionYears}
            simParams={simParams}
            onModelChange={(overlay) => handleModelChange('s2f', overlay)}
          />
        ),
      },
      {
        id: 'bitcoin24' as ModelId,
        label: 'Bitcoin24 (CAGR)',
        shortLabel: 'Bitcoin24',
        info: MODEL_INFO.bitcoin24,
        controls: (
          <Bitcoin24Controls
            historicData={data}
            projectionYears={projectionYears}
            simParams={simParams}
            onModelChange={(overlay) => handleModelChange('bitcoin24', overlay)}
          />
        ),
      },
    ]
  }, [data, projectionYears, simParams, handleModelChange])

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

      <main className="flex flex-col gap-6">
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
                        ? `Using cached data (last updated ${data?.[data.length - 1]?.timestamp_ms ? new Date(data[data.length - 1].timestamp_ms).toLocaleDateString() : 'unknown'})`
                        : `${data?.length.toLocaleString()} days of data`}
                </CardDescription>
              </div>
              {isStale && (
                <Button
                  size="sm"
                  className="min-h-[36px] text-xs"
                  onClick={refresh}
                >
                  Refresh
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex h-[400px] items-center justify-center">
                <Spinner />
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
            <CardTitle>Plan Configuration</CardTitle>
            <CardDescription>
              Price model, scenario, and withdrawal policy
            </CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                aria-expanded={controlsOpen}
                aria-label={controlsOpen ? 'Collapse configuration' : 'Expand configuration'}
                onClick={() => setControlsOpen((open) => !open)}
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    controlsOpen && 'rotate-180',
                  )}
                />
              </Button>
            </CardAction>
          </CardHeader>
          {controlsOpen && (
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ControlTab)}>
                <TabsList>
                  <TabsTab value="price-model">Price model</TabsTab>
                  <TabsTab value="scenario">Scenario</TabsTab>
                  <TabsTab value="withdrawal">Withdrawal</TabsTab>
                </TabsList>

                <TabsPanel value="price-model" keepMounted={activeTab === 'scenario'}>
                  {data ? (
                    <ModelSelector
                      models={modelEntries}
                      visibleModels={visibleModels}
                      expandedModel={expandedModel}
                      onToggleVisibility={handleToggleVisibilityWithExpand}
                      onToggleExpand={handleToggleExpand}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Price data is required to fit the model.
                    </p>
                  )}
                </TabsPanel>

                <TabsPanel value="scenario">
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
                  <ParameterPanel
                    params={simParams}
                    onParamChange={setSimParam}
                    showInflation={policy.anchor !== 'percent_of_current'}
                  />
                </TabsPanel>

                <TabsPanel value="withdrawal">
                  <WithdrawalTab
                    policy={policy}
                    dirty={dirty}
                    onSelectPreset={setPreset}
                    onUpdatePolicy={updatePolicy}
                  />
                </TabsPanel>
              </Tabs>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Plan</CardTitle>
            <CardDescription>
              Year-by-year withdrawal simulation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {planModelId && visibleModelIds.length > 1 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label
                  htmlFor="plan-model"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Price model used:
                </label>
                <select
                  id="plan-model"
                  aria-label="Plan price model"
                  className="min-h-[44px] rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  value={planModelId}
                  onChange={(e) => setPlanModelChoice(e.target.value as ModelId)}
                >
                  {visibleModelIds.map((id) => (
                    <option key={id} value={id}>
                      {MODEL_LABELS[id]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <WithdrawalResults
              run={planRun}
              selectedPathId={selectedPathId}
              onSelectPath={setSelectedPathId}
              error={planError}
              loading={planLoading}
            />
          </CardContent>
        </Card>
      </main>

      {planLoading && (
        <div
          role="status"
          aria-label="Running simulation"
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="rounded-full bg-background/80 p-4 shadow-lg ring-1 ring-foreground/10 backdrop-blur-sm">
            <Spinner />
          </div>
        </div>
      )}

      <footer className="mt-8 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> BTCFire is a simulation tool for educational and planning purposes only. It is not financial advice. Past performance of any asset does not predict future results. All price models make assumptions that may prove wrong. Cryptocurrency is volatile — you could lose everything. Consult a qualified financial advisor before making retirement decisions.
        </p>
      </footer>
    </div>
  )
}

export default App
