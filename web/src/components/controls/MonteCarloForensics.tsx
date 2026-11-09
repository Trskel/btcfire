import { lazy, Suspense } from 'react'
import type { MonteCarloResult } from '@/types/simulation'
import { MetricTile } from '@/components/ui/metric-tile'
import { InfoButton } from '@/components/ui/info-button'
import { RESULTS_INFO } from '@/content/info'

const SurvivalChart = lazy(() =>
  import('./MonteCarloForensicsCharts').then((m) => ({
    default: m.SurvivalChart,
  })),
)
const FailureHistogramChart = lazy(() =>
  import('./MonteCarloForensicsCharts').then((m) => ({
    default: m.FailureHistogramChart,
  })),
)

function ChartFallback() {
  return <div aria-hidden="true" className="h-[200px]" />
}

interface MonteCarloForensicsProps {
  monteCarlo: MonteCarloResult | null | undefined
}

function formatPct(value: number | null | undefined): string | null {
  return value == null ? null : `${value.toFixed(1)}%`
}

function formatBtc(value: number | null | undefined): string | null {
  if (value == null) return null
  return value.toFixed(8).replace(/\.?0+$/, '')
}

function formatUsd(value: number | null | undefined): string | null {
  if (value == null) return null
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function formatYear(value: number | null | undefined): string | null {
  if (value == null) return null
  return String(value)
}

export function MonteCarloForensics({ monteCarlo }: MonteCarloForensicsProps) {
  const forensics = monteCarlo?.forensics
  if (!forensics) return null

  const failedPaths = forensics.failureHistogram.reduce(
    (n, h) => n + h.depleted + h.belowMin,
    0,
  )
  const hasFailures = failedPaths > 0

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        Failure forensics
        <InfoButton
          label="Failure forensics"
          description={RESULTS_INFO.forensics}
        />
      </p>

      {hasFailures && (
        <>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                Survival rate
                <InfoButton
                  label="Survival rate"
                  description={RESULTS_INFO.survival}
                />
              </p>
              <Suspense fallback={<ChartFallback />}>
                <SurvivalChart data={forensics.survivalByYear} />
              </Suspense>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                Failure years
                <InfoButton
                  label="Failure years"
                  description={RESULTS_INFO.failureYear}
                />
              </p>
              <Suspense fallback={<ChartFallback />}>
                <FailureHistogramChart data={forensics.failureHistogram} />
              </Suspense>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <MetricTile
              label="Median failure year"
              info={RESULTS_INFO.medianFailureYear}
              value={formatYear(forensics.medianFailureYear)}
            />
            <MetricTile
              label="Shortfall median"
              subLabel="Worst-year gap vs. minimum, failed futures"
              info={RESULTS_INFO.shortfall}
              value={formatUsd(forensics.shortfallMedianUsd)}
            />
            <MetricTile
              label="Shortfall p90"
              subLabel="Worst-year gap vs. minimum, failed futures"
              info={RESULTS_INFO.shortfall}
              value={formatUsd(forensics.shortfallP90Usd)}
            />
          </div>
        </>
      )}

      {monteCarlo?.legacy && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Final BTC p10"
            subLabel="All futures"
            info={RESULTS_INFO.finalBtc}
            value={formatBtc(monteCarlo.legacy.finalBtcP10)}
          />
          <MetricTile
            label="Final BTC median"
            subLabel="All futures"
            info={RESULTS_INFO.finalBtc}
            value={formatBtc(monteCarlo.legacy.finalBtcP50)}
          />
          <MetricTile
            label="Final BTC p90"
            subLabel="All futures"
            info={RESULTS_INFO.finalBtc}
            value={formatBtc(monteCarlo.legacy.finalBtcP90)}
          />
          <MetricTile
            label="Success median BTC"
            subLabel="Successful futures only"
            info={RESULTS_INFO.finalBtc}
            value={formatBtc(monteCarlo.legacy.successFinalBtcMedian)}
          />
        </div>
      )}

      {monteCarlo?.phaseTime && (
        <div className="grid grid-cols-3 gap-2">
          <MetricTile
            label="Bear years"
            info={RESULTS_INFO.phaseTime}
            value={formatPct(monteCarlo.phaseTime.bearPct)}
          />
          <MetricTile
            label="Fair years"
            info={RESULTS_INFO.phaseTime}
            value={formatPct(monteCarlo.phaseTime.fairPct)}
          />
          <MetricTile
            label="Euphoria years"
            info={RESULTS_INFO.phaseTime}
            value={formatPct(monteCarlo.phaseTime.euphoriaPct)}
          />
        </div>
      )}
    </div>
  )
}
