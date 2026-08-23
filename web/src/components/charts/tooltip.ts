import { MODEL_LABELS } from '@/types/models'
import type { ModelOverlay } from '@/types/models'

export interface TooltipParam {
  seriesName?: string
  value: [number, number]
}

export function formatTooltip(
  params: TooltipParam[],
  modelOverlays: ModelOverlay[],
  logScale: boolean,
): string {
  if (!params || params.length === 0) return ''
  const byName = new Map(
    params.filter((p) => p.seriesName).map((p) => [p.seriesName as string, p]),
  )
  const fmt = (v: number) => {
    const price = logScale ? Math.pow(10, v) : v
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  const date = new Date(params[0].value[0]).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  let html = `${date}<br/>`

  const btc = byName.get('BTC Price')
  if (btc) {
    html += `BTC Price: <strong>${fmt(btc.value[1])}</strong><br/>`
  }

  for (const overlay of modelOverlays) {
    const id = overlay.modelId
    const modelLabel = MODEL_LABELS[id] || id
    const median = byName.get(`${modelLabel} Median`)
    if (!median) continue
    const max =
      byName.get(`${id}-2σ-upper`) ??
      byName.get(`${id}-p90`) ??
      byName.get(`${id}-1σ-upper`)
    const min =
      byName.get(`${id}-2σ-lower`) ??
      byName.get(`${id}-p10`) ??
      byName.get(`${id}-1σ-lower`)
    if (max && min) {
      html += `${modelLabel} Max: <strong>${fmt(max.value[1])}</strong><br/>`
    }
    html += `${modelLabel} Median: <strong>${fmt(median.value[1])}</strong><br/>`
    if (max && min) {
      html += `${modelLabel} Min: <strong>${fmt(min.value[1])}</strong><br/>`
    }
  }
  return html
}
