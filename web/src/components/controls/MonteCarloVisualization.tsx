import { useMemo } from 'react'
import type { WithdrawalRun } from '@/lib/withdrawal'
import { buildDistributionRows } from '@/lib/distribution'
import { MonteCarloFanChart } from '@/components/charts/MonteCarloFanChart'
import { DistributionTable } from '@/components/tables/DistributionTable'
import { DistributionCards } from '@/components/tables/DistributionCards'

interface MonteCarloVisualizationProps {
  run: WithdrawalRun | null
}

export function MonteCarloVisualization({
  run,
}: MonteCarloVisualizationProps) {
  const monteCarlo = run?.monteCarlo ?? null
  const percentiles = monteCarlo?.percentiles ?? []

  const rows = useMemo(
    () => (monteCarlo ? buildDistributionRows(monteCarlo) : []),
    [monteCarlo],
  )

  if (!monteCarlo || (run?.totalYears ?? 0) <= 0 || percentiles.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <MonteCarloFanChart percentiles={percentiles} />
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Year-by-year distribution
        </p>
        <DistributionTable rows={rows} />
        <DistributionCards rows={rows} />
      </div>
    </div>
  )
}
