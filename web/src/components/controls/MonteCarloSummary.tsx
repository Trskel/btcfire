import type { MonteCarloSummary as MonteCarloSummaryType } from '@/types/simulation'
import { cn } from '@/lib/utils'
import { InfoButton } from '@/components/ui/info-button'
import { RESULTS_INFO } from '@/content/info'

interface MonteCarloSummaryProps {
  summary: MonteCarloSummaryType | null | undefined
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`
}

interface MetricTileProps {
  label: string
  subLabel?: string
  info: string
  value: number | null | undefined
  valueClassName?: string
}

function MetricTile({
  label,
  subLabel,
  info,
  value,
  valueClassName,
}: MetricTileProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="flex items-start gap-1 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <InfoButton label={label} description={info} />
      </p>
      {subLabel && (
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/70">
          {subLabel}
        </p>
      )}
      <p
        className={cn(
          'mt-1 text-lg font-semibold tabular-nums',
          valueClassName ?? 'text-foreground',
        )}
      >
        {value == null ? '—' : formatPct(value)}
      </p>
    </div>
  )
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
          value={summary.runOutPct}
          valueClassName="text-destructive"
        />
        <MetricTile
          label="Below minimum spending"
          info={RESULTS_INFO.belowMin}
          value={summary.belowMinPct}
        />
        <MetricTile
          label="Success"
          info={RESULTS_INFO.success}
          value={summary.successPct}
        />
        <MetricTile
          label="Time at desired spend"
          subLabel="Successful runs only"
          info={RESULTS_INFO.desiredSpend}
          value={summary.desiredSpendPct}
        />
      </div>
    </div>
  )
}
