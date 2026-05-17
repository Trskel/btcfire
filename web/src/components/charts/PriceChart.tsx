import { useState, useMemo, useCallback, useRef } from 'react'
import ReactEChartsCore from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  ToolboxComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { PricePoint } from '@/types/price'
import { Button } from '@/components/ui/button'

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  ToolboxComponent,
  CanvasRenderer,
])

interface PriceChartProps {
  data: PricePoint[]
}

export function PriceChart({ data }: PriceChartProps) {
  const [logScale, setLogScale] = useState(true)
  const [zoomed, setZoomed] = useState(false)
  const chartRef = useRef<ReactEChartsCore>(null)

  const chartData = useMemo(
    () => data.map((p) => [p.timestamp_ms, p.price_usd] as [number, number]),
    [data],
  )

  const option = useMemo(
    () => ({
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
      series: [
        {
          type: 'line',
          data: chartData,
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
      ],
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: { value: [number, number] }[]) => {
          const [ts, price] = params[0].value
          const date = new Date(ts).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
          return `${date}<br/><strong>$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>`
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
      animation: false,
    }),
    [chartData, logScale],
  )

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
