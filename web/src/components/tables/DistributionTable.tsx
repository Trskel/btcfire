import type { DistributionRow } from '@/lib/distribution'
import {
  formatBtc8,
  formatBufferYears,
  formatCompactUsd,
  formatSurvivalPct,
} from '@/lib/format'
import { InfoButton } from '@/components/ui/info-button'
import { VISUALIZATION_INFO } from '@/content/info'

interface DistributionTableProps {
  rows: DistributionRow[]
}

function HeaderCell({ label, info }: { label: string; info: string }) {
  return (
    <th className="py-2 pr-4 font-medium">
      <span className="flex items-center gap-1">
        {label}
        <InfoButton label={label} description={info} />
      </span>
    </th>
  )
}

export function DistributionTable({ rows }: DistributionTableProps) {
  return (
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Year</th>
            <HeaderCell
              label="Median BTC"
              info={VISUALIZATION_INFO.colMedianBtc}
            />
            <HeaderCell
              label="P10–P90 BTC"
              info={VISUALIZATION_INFO.colBtcRange}
            />
            <HeaderCell
              label="Median spend"
              info={VISUALIZATION_INFO.colMedianSpend}
            />
            <HeaderCell
              label="Median buffer"
              info={VISUALIZATION_INFO.colMedianBuffer}
            />
            <HeaderCell
              label="Survival"
              info={VISUALIZATION_INFO.colSurvival}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year} className="border-b border-border/50">
              <td className="py-2 pr-4 tabular-nums">{r.year}</td>
              <td className="py-2 pr-4 tabular-nums">{formatBtc8(r.btcP50)}</td>
              <td className="py-2 pr-4 tabular-nums">
                {formatBtc8(r.btcP10)}–{formatBtc8(r.btcP90)}
              </td>
              <td className="py-2 pr-4 tabular-nums">
                {formatCompactUsd(r.spendP50)}
              </td>
              <td className="py-2 pr-4 tabular-nums">
                {formatBufferYears(r.bufferP50)}
              </td>
              <td className="py-2 tabular-nums">
                {formatSurvivalPct(r.survivalPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
