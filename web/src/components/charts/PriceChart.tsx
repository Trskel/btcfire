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

function buildOverlaySeries(
  overlay: ModelOverlay,
  modelLabel: string,
  modelColor: string,
): Record<string, unknown>[] {
  const id = overlay.modelId
  const series: Record<string, unknown>[] = []

  series.push({
    type: 'line',
    data: overlay.median,
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
    series.push(
      {
        type: 'line',
        data: overlay.band2SigmaLow,
        name: `${id}-2σ-low`,
        showSymbol: false,
        stack: `${id}-band-2sigma`,
        lineStyle: { opacity: 0, width: 0 },
        areaStyle: { opacity: 0 },
      },
      {
        type: 'line',
        data: overlay.band2SigmaHigh,
        name: `${modelLabel} ±2σ`,
        showSymbol: false,
        stack: `${id}-band-2sigma`,
        lineStyle: { opacity: 0, width: 0 },
        itemStyle: { color: '#64748b' },
        areaStyle: { color: '#64748b1a' },
      },
      {
        type: 'line',
        data: overlay.band2SigmaLow,
        name: `${id}-2σ-lower`,
        showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' },
        itemStyle: { color: '#64748b' },
      },
      {
        type: 'line',
        data: overlay.band2SigmaHigh,
        name: `${id}-2σ-upper`,
        showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' },
        itemStyle: { color: '#64748b' },
      },
    )
  }

  if (overlay.band1SigmaLow && overlay.band1SigmaHigh) {
    series.push(
      {
        type: 'line',
        data: overlay.band1SigmaLow,
        name: `${id}-1σ-low`,
        showSymbol: false,
        stack: `${id}-band-1sigma`,
        lineStyle: { opacity: 0, width: 0 },
        areaStyle: { opacity: 0 },
      },
      {
        type: 'line',
        data: overlay.band1SigmaHigh,
        name: `${modelLabel} ±1σ`,
        showSymbol: false,
        stack: `${id}-band-1sigma`,
        lineStyle: { opacity: 0, width: 0 },
        itemStyle: { color: modelColor },
        areaStyle: { color: modelColor + '33' },
      },
      {
        type: 'line',
        data: overlay.band1SigmaLow,
        name: `${id}-1σ-lower`,
        showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' },
        itemStyle: { color: modelColor },
      },
      {
        type: 'line',
        data: overlay.band1SigmaHigh,
        name: `${id}-1σ-upper`,
        showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' },
        itemStyle: { color: modelColor },
      },
    )
  }

  if (overlay.bandP25 && overlay.bandP75) {
    series.push(
      {
        type: 'line',
        data: overlay.bandP25,
        name: `${id}-p25-low`,
        showSymbol: false,
        stack: `${id}-band-p25`,
        lineStyle: { opacity: 0, width: 0 },
        areaStyle: { opacity: 0 },
      },
      {
        type: 'line',
        data: overlay.bandP75,
        name: `${modelLabel} P25-P75`,
        showSymbol: false,
        stack: `${id}-band-p25`,
        lineStyle: { opacity: 0, width: 0 },
        itemStyle: { color: '#22c55e' },
        areaStyle: { color: '#22c55e33' },
      },
      {
        type: 'line',
        data: overlay.bandP25,
        name: `${id}-p25`,
        showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' },
        itemStyle: { color: '#22c55e' },
      },
      {
        type: 'line',
        data: overlay.bandP75,
        name: `${id}-p75`,
        showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' },
        itemStyle: { color: '#22c55e' },
      },
    )
  }

  if (overlay.bandP10 && overlay.bandP90) {
    series.push(
      {
        type: 'line',
        data: overlay.bandP10,
        name: `${id}-p10-low`,
        showSymbol: false,
        stack: `${id}-band-p10`,
        lineStyle: { opacity: 0, width: 0 },
        areaStyle: { opacity: 0 },
      },
      {
        type: 'line',
        data: overlay.bandP90,
        name: `${modelLabel} P10-P90`,
        showSymbol: false,
        stack: `${id}-band-p10`,
        lineStyle: { opacity: 0, width: 0 },
        itemStyle: { color: '#94a3b8' },
        areaStyle: { color: '#94a3b81a' },
      },
      {
        type: 'line',
        data: overlay.bandP10,
        name: `${id}-p10`,
        showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' },
        itemStyle: { color: '#94a3b8' },
      },
      {
        type: 'line',
        data: overlay.bandP90,
        name: `${id}-p90`,
        showSymbol: false,
        lineStyle: { width: 1, type: 'dashed' },
        itemStyle: { color: '#94a3b8' },
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
        data: chartData,
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

      for (const overlay of modelOverlays) {
        const modelLabel = MODEL_LABELS[overlay.modelId] || overlay.modelId
        const modelColor = MODEL_COLORS[overlay.modelId] || '#eab308'
        series.push(...buildOverlaySeries(overlay, modelLabel, modelColor))
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
        type: logScale ? ('log' as const) : ('value' as const),
        axisLabel: {
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
            return `$${value.toFixed(0)}`
          },
        },
        splitLine: {
          lineStyle: { type: 'dashed' as const, opacity: 0.3 },
        },
        min: logScale ? 1 : undefined,
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
          const [ts] = items[0].value
          const date = new Date(ts).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
          let html = `${date}<br/>`
          for (const item of items) {
            const [, price] = item.value
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
        bottom: 40,
        left: 'center',
        textStyle: { fontSize: 11 },
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
