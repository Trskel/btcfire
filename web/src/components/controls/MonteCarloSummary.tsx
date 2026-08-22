import type { MonteCarloSummary as MonteCarloSummaryType } from '@/types/simulation'
import { MetricTile } from '@/components/ui/metric-tile'
import { InfoButton } from '@/components/ui/info-button'
import { RESULTS_INFO } from '@/content/info'

interface MonteCarloSummaryProps {
  summary: MonteCarloSummaryType | null | undefined
}

function formatPct(value: number | null | undefined): string | null {
  return value == null ? null : `${value.toFixed(1)}%`
}

export function MonteCarloSummary({ summary }: MonteCarloSummaryProps) {
  if (!summary) return null

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        Monte Carlo outcomes
        <InfoButton
          label="Monte Carlo outcomes"
          description={RESULTS_INFO.monteCarlo}
        />
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Ran out of money"
          info={RESULTS_INFO.runOut}
          value={formatPct(summary.runOutPct)}
          valueClassName="text-destructive"
        />
        <MetricTile
          label="Below minimum spending"
          info={RESULTS_INFO.belowMin}
          value={formatPct(summary.belowMinPct)}
        />
        <MetricTile
          label="Success"
          info={RESULTS_INFO.success}
          value={formatPct(summary.successPct)}
        />
        <MetricTile
          label="Time at desired spend"
          subLabel="Successful runs only"
          info={RESULTS_INFO.desiredSpend}
          value={formatPct(summary.desiredSpendPct)}
        />
      </div>
    </div>
  )
}
