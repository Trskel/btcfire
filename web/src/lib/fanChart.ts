import type { YearPercentiles } from '@/types/simulation'
import {
  formatBtc8,
  formatBufferYears,
  formatCompactUsd,
} from '@/lib/format'

export type FanMetric = 'btc' | 'spend' | 'bufferYears'

export const FAN_METRIC_LABELS: Record<FanMetric, string> = {
  btc: 'BTC holdings',
  spend: 'Annual spend',
  bufferYears: 'Cash buffer years',
}

interface FanChartThemeColors {
  primary: string
  mutedForeground: string
}

export function fanChartThemeColors(isDark: boolean): FanChartThemeColors {
  return isDark
    ? { primary: '#e7e7e7', mutedForeground: '#9e9e9e' }
    : { primary: '#212121', mutedForeground: '#6b6b6b' }
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

interface MetricSelector {
  p10: (p: YearPercentiles) => number
  p25: (p: YearPercentiles) => number
  p50: (p: YearPercentiles) => number
  p75: (p: YearPercentiles) => number
  p90: (p: YearPercentiles) => number
  formatter: (value: number) => string
}

const METRIC_SELECTORS: Record<FanMetric, MetricSelector> = {
  btc: {
    p10: (p) => p.p10,
    p25: (p) => p.p25,
    p50: (p) => p.p50,
    p75: (p) => p.p75,
    p90: (p) => p.p90,
    formatter: formatBtc8,
  },
  spend: {
    p10: (p) => p.spendP10,
    p25: (p) => p.spendP25,
    p50: (p) => p.spendP50,
    p75: (p) => p.spendP75,
    p90: (p) => p.spendP90,
    formatter: formatCompactUsd,
  },
  bufferYears: {
    p10: (p) => p.bufferYearsP10,
    p25: (p) => p.bufferYearsP25,
    p50: (p) => p.bufferYearsP50,
    p75: (p) => p.bufferYearsP75,
    p90: (p) => p.bufferYearsP90,
    formatter: formatBufferYears,
  },
}

interface TooltipParam {
  seriesName?: string
  dataIndex?: number
}

export function buildFanChartOption(
  metric: FanMetric,
  percentiles: YearPercentiles[],
  isDark: boolean,
  isDesktop: boolean,
) {
  const colors = fanChartThemeColors(isDark)
  const select = METRIC_SELECTORS[metric]

  const years = percentiles.map((p) => p.year)
  const outerLow = percentiles.map((p) => select.p10(p))
  const outerHigh = percentiles.map((p) => select.p90(p))
  const innerLow = percentiles.map((p) => select.p25(p))
  const innerHigh = percentiles.map((p) => select.p75(p))
  const median = percentiles.map((p) => select.p50(p))

  const series = [
    {
      type: 'line',
      name: 'P10',
      stack: 'fan-outer',
      data: outerLow,
      showSymbol: false,
      lineStyle: { opacity: 0, width: 0 },
      areaStyle: { opacity: 0 },
    },
    {
      type: 'line',
      name: 'P10–P90',
      stack: 'fan-outer',
      data: outerHigh.map((v, i) => v - outerLow[i]),
      showSymbol: false,
      lineStyle: { opacity: 0, width: 0 },
      itemStyle: { color: colors.primary },
      areaStyle: { color: withAlpha(colors.primary, 0.16) },
    },
    {
      type: 'line',
      name: 'P25',
      stack: 'fan-inner',
      data: innerLow,
      showSymbol: false,
      lineStyle: { opacity: 0, width: 0 },
      areaStyle: { opacity: 0 },
    },
    {
      type: 'line',
      name: 'P25–P75',
      stack: 'fan-inner',
      data: innerHigh.map((v, i) => v - innerLow[i]),
      showSymbol: false,
      lineStyle: { opacity: 0, width: 0 },
      itemStyle: { color: colors.primary },
      areaStyle: { color: withAlpha(colors.primary, 0.36) },
    },
    {
      type: 'line',
      name: 'Median',
      data: median,
      showSymbol: false,
      lineStyle: { width: 2, color: colors.primary },
      itemStyle: { color: colors.primary },
    },
  ]

  const legendData = [
    {
      name: 'P10–P90',
      icon: 'roundRect' as const,
      itemStyle: { color: withAlpha(colors.primary, 0.16) },
    },
    {
      name: 'P25–P75',
      icon: 'roundRect' as const,
      itemStyle: { color: withAlpha(colors.primary, 0.36) },
    },
    {
      name: 'Median',
      itemStyle: { color: colors.primary },
    },
  ]

  return {
    grid: {
      left: 56,
      right: isDesktop ? 120 : 12,
      top: isDesktop ? 16 : 40,
      bottom: 24,
      containLabel: false,
    },
    xAxis: {
      type: 'category' as const,
      data: years,
      axisLabel: {
        fontSize: 11,
        color: colors.mutedForeground,
        interval: isDesktop ? 'auto' : 10,
        hideOverlap: true,
      },
      axisLine: {
        lineStyle: { color: withAlpha(colors.mutedForeground, 0.4) },
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      min: metric === 'bufferYears' ? null : 0,
      axisLabel: {
        fontSize: 11,
        color: colors.mutedForeground,
        formatter: select.formatter,
      },
      splitLine: {
        lineStyle: { type: 'dashed' as const, opacity: 0.3 },
      },
    },
    series,
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: TooltipParam | TooltipParam[]) => {
        const list = Array.isArray(params) ? params : [params]
        const item = list.find((p) => typeof p.dataIndex === 'number')
        if (!item || item.dataIndex == null) return ''
        const row = percentiles[item.dataIndex]
        if (!row) return ''
        const y = select.formatter
        return (
          `${row.year}<br/>` +
          `P10: <strong>${y(select.p10(row))}</strong><br/>` +
          `P25: <strong>${y(select.p25(row))}</strong><br/>` +
          `Median: <strong>${y(select.p50(row))}</strong><br/>` +
          `P75: <strong>${y(select.p75(row))}</strong><br/>` +
          `P90: <strong>${y(select.p90(row))}</strong>`
        )
      },
    },
    legend: isDesktop
      ? {
          orient: 'vertical' as const,
          right: 4,
          top: 'middle',
          data: legendData,
          textStyle: { fontSize: 11, color: colors.mutedForeground },
        }
      : {
          top: 0,
          left: 'center',
          data: legendData,
          textStyle: { fontSize: 11, color: colors.mutedForeground },
        },
    animation: false,
  }
}
