import { useMemo } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { FailureHistogramPoint, SurvivalPoint } from '@/types/simulation'

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
])

export function SurvivalChart({ data }: { data: SurvivalPoint[] }) {
  const option = useMemo(
    () => ({
      grid: { left: 42, right: 12, top: 12, bottom: 24, containLabel: false },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.year),
        axisLabel: { fontSize: 10, hideOverlap: true },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { type: 'dashed' as const, opacity: 0.3 } },
      },
      series: [
        {
          type: 'line',
          data: data.map((d) => d.survivalPct),
          showSymbol: false,
          lineStyle: { width: 2, color: '#22c55e' },
          itemStyle: { color: '#22c55e' },
          areaStyle: { color: 'rgba(34, 197, 94, 0.12)' },
        },
      ],
      tooltip: {
        trigger: 'axis' as const,
        valueFormatter: (v: number) => `${v.toFixed(1)}%`,
      },
      animation: false,
    }),
    [data],
  )

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      replaceMerge={['series']}
      style={{ width: '100%', height: '200px' }}
      opts={{ renderer: 'canvas' }}
    />
  )
}

export function FailureHistogramChart({
  data,
}: {
  data: FailureHistogramPoint[]
}) {
  const option = useMemo(
    () => ({
      grid: { left: 42, right: 12, top: 12, bottom: 24, containLabel: false },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.year),
        axisLabel: { fontSize: 10, hideOverlap: true },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { type: 'dashed' as const, opacity: 0.3 } },
      },
      series: [
        {
          type: 'bar',
          name: 'Ran out',
          stack: 'failures',
          data: data.map((d) => d.depleted),
          itemStyle: { color: '#ef4444' },
        },
        {
          type: 'bar',
          name: 'Below minimum',
          stack: 'failures',
          data: data.map((d) => d.belowMin),
          itemStyle: { color: '#f59e0b' },
        },
      ],
      tooltip: {
        trigger: 'axis' as const,
      },
      animation: false,
    }),
    [data],
  )

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      replaceMerge={['series']}
      style={{ width: '100%', height: '200px' }}
      opts={{ renderer: 'canvas' }}
    />
  )
}
