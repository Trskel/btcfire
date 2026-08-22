import { useMemo, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { YearPercentiles } from '@/types/simulation'
import { FAN_METRIC_LABELS, buildFanChartOption } from '@/lib/fanChart'
import type { FanMetric } from '@/lib/fanChart'
import { Button } from '@/components/ui/button'
import { InfoButton } from '@/components/ui/info-button'
import { VISUALIZATION_INFO } from '@/content/info'
import { useIsDark } from '@/hooks/useIsDark'
import { useIsDesktop } from '@/hooks/useIsDesktop'

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
])

const METRIC_ORDER: FanMetric[] = ['btc', 'spend', 'bufferYears']

const METRIC_INFO: Record<FanMetric, string> = {
  btc: VISUALIZATION_INFO.metricBtc,
  spend: VISUALIZATION_INFO.metricSpend,
  bufferYears: VISUALIZATION_INFO.metricBuffer,
}

interface MonteCarloFanChartProps {
  percentiles: YearPercentiles[]
}

export function MonteCarloFanChart({ percentiles }: MonteCarloFanChartProps) {
  const [metric, setMetric] = useState<FanMetric>('btc')
  const isDark = useIsDark()
  const isDesktop = useIsDesktop()

  const option = useMemo(
    () => buildFanChartOption(metric, percentiles, isDark, isDesktop),
    [metric, percentiles, isDark, isDesktop],
  )

  if (percentiles.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        Year-by-year range
      </p>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Fan chart metric"
      >
        {METRIC_ORDER.map((id) => {
          const active = metric === id
          return (
            <span key={id} className="flex items-center gap-1">
              <Button
                variant={active ? 'default' : 'outline'}
                size="sm"
                aria-pressed={active}
                className="min-h-[44px]"
                onClick={() => setMetric(id)}
              >
                {FAN_METRIC_LABELS[id]}
              </Button>
              <InfoButton
                label={FAN_METRIC_LABELS[id]}
                description={METRIC_INFO[id]}
              />
            </span>
          )
        })}
        <InfoButton
          label="Percentile bands"
          description={VISUALIZATION_INFO.fanChartBands}
        />
      </div>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        replaceMerge={['series', 'legend']}
        style={{ width: '100%', height: '320px' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}
