import type { Phase, YearResult } from '@/types/policy'
import type { BandPathRun, PathId, WithdrawalRun } from '@/lib/withdrawal'
import { cn } from '@/lib/utils'
import { InfoButton } from '@/components/ui/info-button'
import { RESULTS_INFO } from '@/content/info'

interface WithdrawalResultsProps {
  run: WithdrawalRun | null
  selectedPathId: PathId
  onSelectPath: (id: PathId) => void
  error: string | null
  loading: boolean
}

interface PathSummary {
  path: BandPathRun
  finalBtc: number
  depletionYear: number | null
  lastPhase: Phase | null
}

function summarizePath(path: BandPathRun): PathSummary {
  const results = path.results
  let depletionYear: number | null = null
  for (const r of results) {
    if (r.btc <= 0 && r.soldBtc === 0) {
      depletionYear = r.year
      break
    }
  }
  const last = results[results.length - 1] ?? null
  return {
    path,
    finalBtc: last ? last.btc : 0,
    depletionYear,
    lastPhase: last ? last.phase : null,
  }
}

function formatBtc(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, '')
}

function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function phaseLabel(phase: Phase | null): string {
  switch (phase) {
    case 'bear':
      return 'Bear'
    case 'fair':
      return 'Fair'
    case 'euphoria':
      return 'Euphoria'
    default:
      return '—'
  }
}

function summaryLine(summary: PathSummary): string {
  const phase =
    summary.lastPhase !== null ? ` · ${phaseLabel(summary.lastPhase)}` : ''
  if (summary.depletionYear !== null) {
    return `Depleted ${summary.depletionYear}${phase}`
  }
  return `${formatBtc(summary.finalBtc)} BTC left${phase}`
}

function YearlyCards({ results }: { results: YearResult[] }) {
  return (
    <div className="grid gap-2 sm:hidden">
      {results.map((r) => (
        <div
          key={r.year}
          className="rounded-lg border border-border bg-background p-3"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">{r.year}</span>
            <span className="text-xs text-muted-foreground">
              {phaseLabel(r.phase)}
            </span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Spend</span>
            <span className="text-right tabular-nums">{formatUsd(r.spendUsd)}</span>
            <span className="text-muted-foreground">BTC left</span>
            <span className="text-right tabular-nums">{formatBtc(r.btc)}</span>
            <span className="text-muted-foreground">Cash buffer</span>
            <span className="text-right tabular-nums">
              {r.cashUsd > 0 ? `${formatUsd(r.cashUsd)} (${r.bufferYears.toFixed(1)}y)` : '—'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function YearlyTable({ results }: { results: YearResult[] }) {
  return (
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Year</th>
            <th className="py-2 pr-4 font-medium">Spend</th>
            <th className="py-2 pr-4 font-medium">BTC sold</th>
            <th className="py-2 pr-4 font-medium">BTC left</th>
            <th className="py-2 pr-4 font-medium">Cash buffer</th>
            <th className="py-2 font-medium">
              <span className="flex items-center gap-1">
                Phase
                <InfoButton
                  label="Phase"
                  description={RESULTS_INFO.phase}
                />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.year} className="border-b border-border/50">
              <td className="py-2 pr-4 tabular-nums">{r.year}</td>
              <td className="py-2 pr-4 tabular-nums">{formatUsd(r.spendUsd)}</td>
              <td className="py-2 pr-4 tabular-nums">{formatBtc(r.soldBtc)}</td>
              <td className="py-2 pr-4 tabular-nums">{formatBtc(r.btc)}</td>
              <td className="py-2 pr-4 tabular-nums">
                {r.cashUsd > 0 ? `${formatUsd(r.cashUsd)} (${r.bufferYears.toFixed(1)}y)` : '—'}
              </td>
              <td className="py-2">{phaseLabel(r.phase)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WithdrawalResults({
  run,
  selectedPathId,
  onSelectPath,
  error,
  loading,
}: WithdrawalResultsProps) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Running simulation…</p>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!run || run.paths.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No results yet — a price model must be visible to run the plan.
      </p>
    )
  }

  const truncated = run.coveredYears < run.totalYears
  const summaries = run.paths.map(summarizePath)
  const selected =
    summaries.find((s) => s.path.pathId === selectedPathId) ?? summaries[0]

  return (
    <div className="space-y-4">
      {truncated && (
        <p className="text-xs text-muted-foreground">
          The model projection covers {run.coveredYears} of {run.totalYears}{' '}
          retirement years. Extend the projection horizon in the Scenario tab
          to plan further.
        </p>
      )}

      <div className="space-y-1.5">
        <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          Price paths
          <InfoButton
            label="Price paths"
            description={RESULTS_INFO.pricePaths}
          />
        </p>
        <div
          className="grid grid-cols-3 gap-2 sm:grid-cols-5"
          role="group"
          aria-label="Price paths"
        >
          {summaries.map((s) => {
            const active = s.path.pathId === selected.path.pathId
            return (
              <button
                key={s.path.pathId}
                type="button"
                aria-pressed={active}
                className={cn(
                  'flex min-h-[44px] flex-col items-start justify-center rounded-lg border px-2 py-1.5 text-left transition-colors',
                  active
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:bg-muted',
                )}
                onClick={() => onSelectPath(s.path.pathId)}
              >
                <span className="text-xs font-medium">{s.path.name}</span>
                <span className="text-xs text-muted-foreground/70">{s.path.label}</span>
              <span
                className={cn(
                  'text-xs tabular-nums',
                  s.depletionYear !== null
                    ? 'text-destructive'
                    : 'text-muted-foreground',
                )}
              >
                {summaryLine(s)}
              </span>
              {s.depletionYear === null &&
                s.path.finalPriceUsd !== null &&
                s.finalBtc > 0 && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    ≈ {formatUsd(s.finalBtc * s.path.finalPriceUsd)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <YearlyCards results={selected.path.results} />
      <YearlyTable results={selected.path.results} />
    </div>
  )
}
