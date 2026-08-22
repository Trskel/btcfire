import type { DistributionRow } from '@/lib/distribution'
import {
  formatBtc8,
  formatBufferYears,
  formatCompactUsd,
  formatSurvivalPct,
} from '@/lib/format'
import { InfoButton } from '@/components/ui/info-button'
import { VISUALIZATION_INFO } from '@/content/info'

interface DistributionCardsProps {
  rows: DistributionRow[]
}

function CardLabel({ label, info }: { label: string; info: string }) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      {label}
      <InfoButton label={label} description={info} />
    </span>
  )
}

export function DistributionCards({ rows }: DistributionCardsProps) {
  return (
    <div className="grid gap-2 sm:hidden">
      {rows.map((r) => (
        <div
          key={r.year}
          className="rounded-lg border border-border bg-background p-3"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">{r.year}</span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <CardLabel
              label="Median BTC"
              info={VISUALIZATION_INFO.colMedianBtc}
            />
            <span className="text-right tabular-nums">
              {formatBtc8(r.btcP50)}
            </span>
            <CardLabel
              label="P10–P90 BTC"
              info={VISUALIZATION_INFO.colBtcRange}
            />
            <span className="text-right tabular-nums">
              {formatBtc8(r.btcP10)}–{formatBtc8(r.btcP90)}
            </span>
            <CardLabel
              label="Median spend"
              info={VISUALIZATION_INFO.colMedianSpend}
            />
            <span className="text-right tabular-nums">
              {formatCompactUsd(r.spendP50)}
            </span>
            <CardLabel
              label="Median buffer"
              info={VISUALIZATION_INFO.colMedianBuffer}
            />
            <span className="text-right tabular-nums">
              {formatBufferYears(r.bufferP50)}
            </span>
            <CardLabel label="Survival" info={VISUALIZATION_INFO.colSurvival} />
            <span className="text-right tabular-nums">
              {formatSurvivalPct(r.survivalPct)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
