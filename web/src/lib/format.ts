export function formatBtc8(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, '')
}

export function formatCompactUsd(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(0)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}k`
  return `$${value.toFixed(0)}`
}

export function formatBufferYears(value: number): string {
  return `${value.toFixed(1)} y`
}

export function formatSurvivalPct(value: number | null): string {
  return value == null ? '—' : `${value.toFixed(1)}%`
}
