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

interface PriceChartProps {
  data: PricePoint[]
  modelOverlay?: ModelOverlay | null
}

export function PriceChart({ data, modelOverlay }: PriceChartProps) {
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

    if (modelOverlay) {
      markLines.push({
        data: [
          {
            xAxis: modelOverlay.todayTimestamp,
            label: { formatter: 'Today' },
          },
        ],
        lineStyle: { type: 'dashed' as const, color: '#888', width: 1 },
        symbol: 'none',
      })

      const colors: Record<string, string> = {
        log_log: '#eab308',
        power_fit: '#a855f7',
        custom: '#06b6d4',
      }
      const modelColor =
        colors[modelOverlay.formulation as keyof typeof colors] || '#eab308'

      const bandColors = {
        sigma1: modelColor,
        sigma2: '#64748b',
        pctInner: '#22c55e',
        pctOuter: '#94a3b8',
      }

      series.push({
        type: 'line',
        data: modelOverlay.median,
        name: 'Model Median',
        showSymbol: false,
        lineStyle: {
          width: 2,
          color: modelColor,
          type: 'dashed',
        },
        itemStyle: { color: modelColor },
      })

      if (modelOverlay.band2SigmaLow && modelOverlay.band2SigmaHigh) {
        series.push(
          {
            type: 'line',
            data: modelOverlay.band2SigmaLow,
            name: '2σ Band Low',
            showSymbol: false,
            stack: 'band-2sigma',
            lineStyle: { opacity: 0, width: 0 },
            areaStyle: { opacity: 0 },
          },
          {
            type: 'line',
            data: modelOverlay.band2SigmaHigh,
            name: '±2σ',
            showSymbol: false,
            stack: 'band-2sigma',
            lineStyle: { opacity: 0, width: 0 },
            itemStyle: { color: bandColors.sigma2 },
            areaStyle: {
              color: bandColors.sigma2 + '1a',
            },
          },
          {
            type: 'line',
            data: modelOverlay.band2SigmaLow,
            name: '2σ Lower',
            showSymbol: false,
            lineStyle: {
              width: 1,
              type: 'dashed',
            },
            itemStyle: { color: bandColors.sigma2 },
          },
          {
            type: 'line',
            data: modelOverlay.band2SigmaHigh,
            name: '2σ Upper',
            showSymbol: false,
            lineStyle: {
              width: 1,
              type: 'dashed',
            },
            itemStyle: { color: bandColors.sigma2 },
          },
        )
      }

      if (modelOverlay.band1SigmaLow && modelOverlay.band1SigmaHigh) {
        series.push(
          {
            type: 'line',
            data: modelOverlay.band1SigmaLow,
            name: '1σ Band Low',
            showSymbol: false,
            stack: 'band-1sigma',
            lineStyle: { opacity: 0, width: 0 },
            areaStyle: { opacity: 0 },
          },
          {
            type: 'line',
            data: modelOverlay.band1SigmaHigh,
            name: '±1σ',
            showSymbol: false,
            stack: 'band-1sigma',
            lineStyle: { opacity: 0, width: 0 },
            itemStyle: { color: bandColors.sigma1 },
            areaStyle: {
              color: bandColors.sigma1 + '33',
            },
          },
          {
            type: 'line',
            data: modelOverlay.band1SigmaLow,
            name: '1σ Lower',
            showSymbol: false,
            lineStyle: {
              width: 1,
              type: 'dashed',
            },
            itemStyle: { color: bandColors.sigma1 },
          },
          {
            type: 'line',
            data: modelOverlay.band1SigmaHigh,
            name: '1σ Upper',
            showSymbol: false,
            lineStyle: {
              width: 1,
              type: 'dashed',
            },
            itemStyle: { color: bandColors.sigma1 },
          },
        )
      }

      if (modelOverlay.bandP25 && modelOverlay.bandP75) {
        series.push(
          {
            type: 'line',
            data: modelOverlay.bandP25,
            name: 'P25 Low',
            showSymbol: false,
            stack: 'band-p25',
            lineStyle: { opacity: 0, width: 0 },
            areaStyle: { opacity: 0 },
          },
          {
            type: 'line',
            data: modelOverlay.bandP75,
            name: 'P25-P75',
            showSymbol: false,
            stack: 'band-p25',
            lineStyle: { opacity: 0, width: 0 },
            itemStyle: { color: bandColors.pctInner },
            areaStyle: {
              color: bandColors.pctInner + '33',
            },
          },
          {
            type: 'line',
            data: modelOverlay.bandP25,
            name: 'P25',
            showSymbol: false,
            lineStyle: {
              width: 1,
              type: 'dashed',
            },
            itemStyle: { color: bandColors.pctInner },
          },
          {
            type: 'line',
            data: modelOverlay.bandP75,
            name: 'P75',
            showSymbol: false,
            lineStyle: {
              width: 1,
              type: 'dashed',
            },
            itemStyle: { color: bandColors.pctInner },
          },
        )
      }

      if (modelOverlay.bandP10 && modelOverlay.bandP90) {
        series.push(
          {
            type: 'line',
            data: modelOverlay.bandP10,
            name: 'P10 Low',
            showSymbol: false,
            stack: 'band-p10',
            lineStyle: { opacity: 0, width: 0 },
            areaStyle: { opacity: 0 },
          },
          {
            type: 'line',
            data: modelOverlay.bandP90,
            name: 'P10-P90',
            showSymbol: false,
            stack: 'band-p10',
            lineStyle: { opacity: 0, width: 0 },
            itemStyle: { color: bandColors.pctOuter },
            areaStyle: {
              color: bandColors.pctOuter + '1a',
            },
          },
          {
            type: 'line',
            data: modelOverlay.bandP10,
            name: 'P10',
            showSymbol: false,
            lineStyle: {
              width: 1,
              type: 'dashed',
            },
            itemStyle: { color: bandColors.pctOuter },
          },
          {
            type: 'line',
            data: modelOverlay.bandP90,
            name: 'P90',
            showSymbol: false,
            lineStyle: {
              width: 1,
              type: 'dashed',
            },
            itemStyle: { color: bandColors.pctOuter },
          },
        )
      }
    }

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
            (p) =>
              p.seriesName === 'BTC Price' ||
              p.seriesName === 'Model Median' ||
              p.seriesName === '±1σ' ||
              p.seriesName === '±2σ',
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
        axisPointer: { type: 'cross' as const },
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
        show: !!modelOverlay,
        bottom: 40,
        left: 'center',
        textStyle: { fontSize: 11 },
      },
      animation: false,
    }
  }, [chartData, logScale, modelOverlay])

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
