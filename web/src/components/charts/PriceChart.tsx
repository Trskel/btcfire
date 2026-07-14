import { useState, useMemo, useCallback, useRef } from 'react'
import ReactEChartsCore from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { LineChart, CustomChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { PricePoint } from '@/types/price'
import type { ModelOverlay } from '@/types/models'
import { MODEL_COLORS, MODEL_LABELS } from '@/types/models'
import { Button } from '@/components/ui/button'

echarts.use([
  LineChart,
  CustomChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  CanvasRenderer,
])

function logVal(v: number): number {
  return Math.log10(Math.max(v, 1e-6))
}

function toLogPair([t, v]: [number, number]): [number, number] {
  return [t, logVal(v)]
}

function formatLogLabel(logV: number): string {
  if (logV >= 9) return `$${Math.pow(10, logV - 9).toFixed(0)}B`
  if (logV >= 6) return `$${Math.pow(10, logV - 6).toFixed(0)}M`
  if (logV >= 3) return `$${Math.pow(10, logV - 3).toFixed(0)}k`
  if (logV >= 0) return `$${Math.pow(10, logV).toFixed(0)}`
  return `$${Math.pow(10, logV).toFixed(2)}`
}

function buildOverlaySeries(
  overlay: ModelOverlay,
  modelLabel: string,
  modelColor: string,
  logScale: boolean,
): Record<string, unknown>[] {
  const id = overlay.modelId
  const series: Record<string, unknown>[] = []
  const mapPair = logScale ? toLogPair : (p: [number, number]) => p

  series.push({
    type: 'line',
    data: overlay.median.map(mapPair),
    name: `${modelLabel} Median`,
    showSymbol: false,
    lineStyle: {
      width: 2,
      color: modelColor,
      type: 'dashed',
    },
    itemStyle: { color: modelColor },
  })

  if (overlay.band2SigmaLow && overlay.band2SigmaHigh) {
    const low = overlay.band2SigmaLow.map(mapPair)
    const high = overlay.band2SigmaHigh.map(mapPair)
    const diff: [number, number][] = high.map(([t, v], i) => [t, v - low[i][1]])
    series.push(
      {
        type: 'line', data: low, name: `${id}-2σ-low`, showSymbol: false,
        stack: `${id}-band-2sigma`, lineStyle: { opacity: 0, width: 0 }, areaStyle: { opacity: 0 },
      },
      {
        type: 'line', data: diff, name: `${modelLabel} ±2σ`, showSymbol: false,
        stack: `${id}-band-2sigma`, lineStyle: { opacity: 0, width: 0 },
        itemStyle: { color: '#64748b' }, areaStyle: { color: '#64748b1a' },
      },
      {
        type: 'line', data: low, name: `${id}-2σ-lower`, showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' }, itemStyle: { color: '#64748b' },
      },
      {
        type: 'line', data: high, name: `${id}-2σ-upper`, showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' }, itemStyle: { color: '#64748b' },
      },
    )
  }

  if (overlay.band1SigmaLow && overlay.band1SigmaHigh) {
    const low = overlay.band1SigmaLow.map(mapPair)
    const high = overlay.band1SigmaHigh.map(mapPair)
    const diff: [number, number][] = high.map(([t, v], i) => [t, v - low[i][1]])
    series.push(
      {
        type: 'line', data: low, name: `${id}-1σ-low`, showSymbol: false,
        stack: `${id}-band-1sigma`, lineStyle: { opacity: 0, width: 0 }, areaStyle: { opacity: 0 },
      },
      {
        type: 'line', data: diff, name: `${modelLabel} ±1σ`, showSymbol: false,
        stack: `${id}-band-1sigma`, lineStyle: { opacity: 0, width: 0 },
        itemStyle: { color: modelColor }, areaStyle: { color: modelColor + '33' },
      },
      {
        type: 'line', data: low, name: `${id}-1σ-lower`, showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' }, itemStyle: { color: modelColor },
      },
      {
        type: 'line', data: high, name: `${id}-1σ-upper`, showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' }, itemStyle: { color: modelColor },
      },
    )
  }

  if (overlay.bandP25 && overlay.bandP75) {
    const low = overlay.bandP25.map(mapPair)
    const high = overlay.bandP75.map(mapPair)
    const diff: [number, number][] = high.map(([t, v], i) => [t, v - low[i][1]])
    series.push(
      {
        type: 'line', data: low, name: `${id}-p25-low`, showSymbol: false,
        stack: `${id}-band-p25`, lineStyle: { opacity: 0, width: 0 }, areaStyle: { opacity: 0 },
      },
      {
        type: 'line', data: diff, name: `${modelLabel} P25-P75`, showSymbol: false,
        stack: `${id}-band-p25`, lineStyle: { opacity: 0, width: 0 },
        itemStyle: { color: '#22c55e' }, areaStyle: { color: '#22c55e33' },
      },
      {
        type: 'line', data: low, name: `${id}-p25`, showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' }, itemStyle: { color: '#22c55e' },
      },
      {
        type: 'line', data: high, name: `${id}-p75`, showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' }, itemStyle: { color: '#22c55e' },
      },
    )
  }

  if (overlay.bandP10 && overlay.bandP90) {
    const low = overlay.bandP10.map(mapPair)
    const high = overlay.bandP90.map(mapPair)
    const diff: [number, number][] = high.map(([t, v], i) => [t, v - low[i][1]])
    series.push(
      {
        type: 'line', data: low, name: `${id}-p10-low`, showSymbol: false,
        stack: `${id}-band-p10`, lineStyle: { opacity: 0, width: 0 }, areaStyle: { opacity: 0 },
      },
      {
        type: 'line', data: diff, name: `${modelLabel} P10-P90`, showSymbol: false,
        stack: `${id}-band-p10`, lineStyle: { opacity: 0, width: 0 },
        itemStyle: { color: '#94a3b8' }, areaStyle: { color: '#94a3b81a' },
      },
      {
        type: 'line', data: low, name: `${id}-p10`, showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' }, itemStyle: { color: '#94a3b8' },
      },
      {
        type: 'line', data: high, name: `${id}-p90`, showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' }, itemStyle: { color: '#94a3b8' },
      },
    )
  }

  return series
}

interface PriceChartProps {
  data: PricePoint[]
  modelOverlays?: ModelOverlay[]
}

export function PriceChart({ data, modelOverlays = [] }: PriceChartProps) {
  const [logScale, setLogScale] = useState(true)
  const [zoomed, setZoomed] = useState(false)
  const chartRef = useRef<ReactEChartsCore>(null)

  const chartData = useMemo(
    () => data.map((p) => [p.timestamp_ms, p.price_usd] as [number, number]),
    [data],
  )

  const option = useMemo(() => {
    const series: Record<string, unknown>[] = [
      {
        type: 'line',
        data: chartData.map(([t, v]: [number, number]) =>
          logScale ? ([t, logVal(v)] as [number, number]) : ([t, v] as [number, number]),
        ),
        name: 'BTC Price',
        showSymbol: false,
        lineStyle: { width: 1.5, color: '#f7931a' },
        itemStyle: { color: '#f7931a' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(247, 147, 26, 0.2)' },
            { offset: 1, color: 'rgba(247, 147, 26, 0.02)' },
          ]),
        },
      },
    ]

    const markLines: Record<string, unknown>[] = []

    if (modelOverlays.length > 0) {
      markLines.push({
        data: [
          {
            xAxis: modelOverlays[0].todayTimestamp,
            label: { formatter: 'Today' },
          },
        ],
        lineStyle: { type: 'dashed' as const, color: '#888', width: 1 },
        symbol: 'none',
      })
    }

    const legendData: string[] = ['BTC Price']

    for (const overlay of modelOverlays) {
      const modelLabel = MODEL_LABELS[overlay.modelId] || overlay.modelId
      const modelColor = MODEL_COLORS[overlay.modelId] || '#eab308'
      const overlaySeries = buildOverlaySeries(overlay, modelLabel, modelColor, logScale)
      series.push(...overlaySeries)
      for (const s of overlaySeries) {
        const name = s.name as string
        if (!legendData.includes(name)) {
          legendData.push(name)
        }
      }
    }

    const axisPointerSeries = series
      .filter((s) => typeof s.name === 'string' && (s.name as string).endsWith('±1σ'))
      .map((s) => s.name as string)

    return {
      grid: {
        left: 60,
        right: 20,
        top: 16,
        bottom: 80,
        containLabel: false,
      },
      xAxis: {
        type: 'time' as const,
        axisLabel: {
          fontSize: 11,
          hideOverlap: true,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: logScale ? ('value' as const) : ('value' as const),
        ...(logScale
          ? { min: -2 }
          : { min: 0 }),
        axisLabel: {
          fontSize: 11,
          formatter: logScale ? formatLogLabel : (value: number) => {
            if (value >= 1e12) return `$${(value / 1e12).toFixed(0)}T`
            if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`
            if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
            if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}k`
            return `$${value.toFixed(0)}`
          },
        },
        splitLine: {
          lineStyle: { type: 'dashed' as const, opacity: 0.3 },
        },
      },
      series,
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: { seriesName?: string; value: [number, number] }[]) => {
          if (!params || params.length === 0) return ''
          const items = params.filter(
            (p) => {
              const name = p.seriesName || ''
              return (
                name === 'BTC Price' ||
                name.endsWith(' Median') ||
                name.endsWith('±1σ') ||
                name.endsWith('±2σ')
              )
            },
          )
          if (items.length === 0) return ''
          const date = new Date(items[0].value[0]).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
          let html = `${date}<br/>`
          for (const item of items) {
            const [, v] = item.value
            const price = logScale ? Math.pow(10, v) : v
            html += `${item.seriesName}: <strong>$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><br/>`
          }
          return html
        },
        axisPointer: {
          type: 'cross' as const,
          ...(axisPointerSeries.length > 1 ? { link: [{ xAxisIndex: 'all' }] } : {}),
        },
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          bottom: 10,
          height: 30,
          borderColor: 'transparent',
          fillerColor: 'rgba(247, 147, 26, 0.15)',
          handleStyle: { borderColor: '#f7931a' },
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          zoomLock: true,
          zoomOnMouseWheel: false,
          moveOnMouseWheel: false,
        },
      ],
      legend: {
        show: modelOverlays.length > 0,
        type: 'scroll' as const,
        bottom: 40,
        left: 'center',
        textStyle: { fontSize: 11 },
        data: legendData,
      },
      animation: false,
    }
  }, [chartData, logScale, modelOverlays])

  const handleDataZoom = useCallback(() => {
    setZoomed(true)
  }, [])

  const resetZoom = useCallback(() => {
    const instance = chartRef.current?.getEchartsInstance()
    if (instance) {
      instance.dispatchAction({
        type: 'dataZoom',
        dataZoomIndex: 0,
        start: 0,
        end: 100,
      })
      setZoomed(false)
    }
  }, [])

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button
          variant={logScale ? 'default' : 'outline'}
          size="sm"
          className="min-h-[44px] min-w-[44px]"
          onClick={() => setLogScale(true)}
        >
          Log
        </Button>
        <Button
          variant={!logScale ? 'default' : 'outline'}
          size="sm"
          className="min-h-[44px] min-w-[44px]"
          onClick={() => setLogScale(false)}
        >
          Linear
        </Button>
        {zoomed && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto min-h-[44px]"
            onClick={resetZoom}
          >
            Reset Zoom
          </Button>
        )}
      </div>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ width: '100%', height: '400px' }}
        className="md:!h-[500px] lg:!h-[600px]"
        ref={chartRef}
        onEvents={{ datazoom: handleDataZoom }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}
