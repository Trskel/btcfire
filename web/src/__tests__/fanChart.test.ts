import { describe, it, expect } from 'vitest'
import { buildFanChartOption } from '@/lib/fanChart'
import type { YearPercentiles } from '@/types/simulation'

function makePercentiles(count: number): YearPercentiles[] {
  return Array.from({ length: count }, (_, i) => ({
    year: 2030 + i,
    p10: 1 + i,
    p25: 2 + i,
    p50: 3 + i,
    p75: 4 + i,
    p90: 5 + i,
    spendP10: 1000 + i * 100,
    spendP25: 2000 + i * 100,
    spendP50: 3000 + i * 100,
    spendP75: 4000 + i * 100,
    spendP90: 5000 + i * 100,
    bufferYearsP10: 0.5 + i,
    bufferYearsP25: 1.5 + i,
    bufferYearsP50: 2.5 + i,
    bufferYearsP75: 3.5 + i,
    bufferYearsP90: 4.5 + i,
  }))
}

describe('buildFanChartOption', () => {
  it('builds five series: two invisible lowers, two stacked bands, and a median line', () => {
    const option = buildFanChartOption('btc', makePercentiles(4), false, false)
    const series = option.series as Record<string, unknown>[]

    expect(series).toHaveLength(5)
    expect(series.map((s) => s.name)).toEqual([
      'P10',
      'P10–P90',
      'P25',
      'P25–P75',
      'Median',
    ])
    expect(series[0]?.stack).toBe('fan-outer')
    expect(series[1]?.stack).toBe('fan-outer')
    expect(series[2]?.stack).toBe('fan-inner')
    expect(series[3]?.stack).toBe('fan-inner')
    expect(series[4]?.stack).toBeUndefined()
  })

  it('keeps the invisible lower series fully transparent', () => {
    const option = buildFanChartOption('btc', makePercentiles(4), false, false)
    const series = option.series as Record<string, unknown>[]

    for (const index of [0, 2]) {
      const lineStyle = series[index]?.lineStyle as Record<string, unknown>
      const areaStyle = series[index]?.areaStyle as Record<string, unknown>
      expect(lineStyle.opacity).toBe(0)
      expect(lineStyle.width).toBe(0)
      expect(areaStyle.opacity).toBe(0)
    }
  })

  it('stacks each band as the difference between its high and low percentiles', () => {
    const percentiles = makePercentiles(4)
    const option = buildFanChartOption('btc', percentiles, false, false)
    const series = option.series as Record<string, unknown>[]

    const outer = series[1]?.data as number[]
    const inner = series[3]?.data as number[]
    expect(outer).toEqual(percentiles.map((p) => p.p90 - p.p10))
    expect(inner).toEqual(percentiles.map((p) => p.p75 - p.p25))
  })

  it('caps mobile axis label density at one label per ten horizon years', () => {
    const option = buildFanChartOption('btc', makePercentiles(55), false, false)
    const xAxis = option.xAxis as { axisLabel: { interval: number } }

    expect(xAxis.axisLabel.interval).toBeGreaterThanOrEqual(10)
  })

  it('uses auto interval on desktop', () => {
    const option = buildFanChartOption('btc', makePercentiles(30), false, true)
    const xAxis = option.xAxis as { axisLabel: { interval: string } }
    expect(xAxis.axisLabel.interval).toBe('auto')
  })

  it('formats the y-axis per metric', () => {
    const btc = buildFanChartOption('btc', makePercentiles(2), false, false)
    const spend = buildFanChartOption('spend', makePercentiles(2), false, false)
    const buffer = buildFanChartOption(
      'bufferYears',
      makePercentiles(2),
      false,
      false,
    )

    const btcFormatter = (btc.yAxis as { axisLabel: { formatter: (v: number) => string } })
      .axisLabel.formatter
    const spendFormatter = (
      spend.yAxis as { axisLabel: { formatter: (v: number) => string } }
    ).axisLabel.formatter
    const bufferFormatter = (
      buffer.yAxis as { axisLabel: { formatter: (v: number) => string } }
    ).axisLabel.formatter

    expect(btcFormatter(1.25)).toBe('1.25')
    expect(btcFormatter(1)).toBe('1')
    expect(spendFormatter(12000)).toBe('$12k')
    expect(spendFormatter(2100000)).toBe('$2M')
    expect(bufferFormatter(2.25)).toBe('2.3 y')
  })

  it('starts the BTC and spend axes at zero and lets buffer years auto-scale', () => {
    const btc = buildFanChartOption('btc', makePercentiles(2), false, false)
    const spend = buildFanChartOption('spend', makePercentiles(2), false, false)
    const buffer = buildFanChartOption(
      'bufferYears',
      makePercentiles(2),
      false,
      false,
    )

    expect((btc.yAxis as { min: number | null }).min).toBe(0)
    expect((spend.yAxis as { min: number | null }).min).toBe(0)
    expect((buffer.yAxis as { min: number | null }).min).toBeNull()
  })

  it('uses theme-derived colors for light and dark themes', () => {
    const light = buildFanChartOption('btc', makePercentiles(2), false, false)
    const dark = buildFanChartOption('btc', makePercentiles(2), true, false)

    const lightMedian = (light.series as Record<string, unknown>[])[4]?.lineStyle as {
      color: string
    }
    const darkMedian = (dark.series as Record<string, unknown>[])[4]?.lineStyle as {
      color: string
    }
    expect(lightMedian.color).toBe('#212121')
    expect(darkMedian.color).toBe('#e7e7e7')
  })

  it('puts the legend on top on mobile and to the right on desktop', () => {
    const mobile = buildFanChartOption('btc', makePercentiles(2), false, false)
    const desktop = buildFanChartOption('btc', makePercentiles(2), false, true)

    const mobileLegend = mobile.legend as {
      top: number
      left: string
      orient?: string
    }
    const desktopLegend = desktop.legend as {
      orient: string
      right: number
      top?: string
    }

    expect(mobileLegend.top).toBe(0)
    expect(mobileLegend.orient).toBeUndefined()
    expect(desktopLegend.orient).toBe('vertical')
    expect(desktopLegend.right).toBe(4)
  })

  it('builds a tooltip that reports every percentile for the hovered year', () => {
    const percentiles = makePercentiles(3)
    const option = buildFanChartOption('btc', percentiles, false, false)
    const formatter = option.tooltip.formatter as (params: unknown) => string

    const html = formatter([{ seriesName: 'Median', dataIndex: 1 }])
    expect(html).toContain('2031')
    expect(html).toContain('P10: <strong>2</strong>')
    expect(html).toContain('Median: <strong>4</strong>')
    expect(html).toContain('P90: <strong>6</strong>')
  })

  it('gives the legend grey swatches that match the band fills', () => {
    const light = buildFanChartOption('btc', makePercentiles(2), false, false)
    const dark = buildFanChartOption('btc', makePercentiles(2), true, false)

    const lightData = (light.legend as { data: { name: string; icon: string; itemStyle: { color: string } }[] }).data
    const darkData = (dark.legend as { data: { name: string; icon: string; itemStyle: { color: string } }[] }).data

    expect(lightData[0]).toEqual({
      name: 'P10–P90',
      icon: 'roundRect',
      itemStyle: { color: 'rgba(33, 33, 33, 0.16)' },
    })
    expect(lightData[1]).toEqual({
      name: 'P25–P75',
      icon: 'roundRect',
      itemStyle: { color: 'rgba(33, 33, 33, 0.36)' },
    })
    expect(lightData[2]).toEqual({
      name: 'Median',
      itemStyle: { color: '#212121' },
    })
    expect(darkData[0].itemStyle.color).toBe('rgba(231, 231, 231, 0.16)')
    expect(darkData[1].itemStyle.color).toBe('rgba(231, 231, 231, 0.36)')
    expect(darkData[2].itemStyle.color).toBe('#e7e7e7')
  })
})
