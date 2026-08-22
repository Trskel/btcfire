import type { SimulationParams } from '@/types/simulation'
import { PARAM_BOUNDS } from '@/types/simulation'
import { PARAM_INFO } from '@/content/info'
import { ParameterInput } from './ParameterInput'

interface ParameterPanelProps {
  params: SimulationParams
  onParamChange: (key: keyof SimulationParams, value: number) => void
  showInflation?: boolean
}

interface FieldDef {
  key: keyof SimulationParams
  label: string
  format: (value: number) => string
  displayFormat: (value: number) => string
  info: string
}

function formatBtc(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, '')
}

const FIELDS: FieldDef[] = [
  {
    key: 'holdingsBtc',
    label: 'Initial BTC holdings',
    format: formatBtc,
    displayFormat: (v) => `${formatBtc(v)} BTC`,
    info: PARAM_INFO.holdingsBtc,
  },
  {
    key: 'retirementStartYear',
    label: 'Retirement start year',
    format: (v) => String(Math.round(v)),
    displayFormat: (v) => String(Math.round(v)),
    info: PARAM_INFO.retirementStartYear,
  },
  {
    key: 'currentAge',
    label: 'Current age',
    format: (v) => String(Math.round(v)),
    displayFormat: (v) => `${Math.round(v)} yrs`,
    info: PARAM_INFO.currentAge,
  },
  {
    key: 'lifespan',
    label: 'Expected lifespan',
    format: (v) => String(Math.round(v)),
    displayFormat: (v) => `${Math.round(v)} yrs`,
    info: PARAM_INFO.lifespan,
  },
  {
    key: 'minimumSpendUsd',
    label: 'Minimum annual spending',
    format: (v) => String(Math.round(v)),
    displayFormat: (v) => `$${Math.round(v).toLocaleString('en-US')}`,
    info: PARAM_INFO.minimumSpendUsd,
  },
  {
    key: 'annualSpendUsd',
    label: 'Desired annual spending',
    format: (v) => String(Math.round(v)),
    displayFormat: (v) => `$${Math.round(v).toLocaleString('en-US')}`,
    info: PARAM_INFO.annualSpendUsd,
  },
  {
    key: 'inflationRate',
    label: 'Annual inflation rate',
    format: (v) => String(Math.round(v * 10) / 10),
    displayFormat: (v) => `${(Math.round(v * 10) / 10).toFixed(1)}%`,
    info: PARAM_INFO.inflationRate,
  },
]

export function ParameterPanel({
  params,
  onParamChange,
  showInflation = true,
}: ParameterPanelProps) {
  const fields = FIELDS.filter((f) => f.key !== 'inflationRate' || showInflation)
  return (
    <div className="space-y-4">
      {fields.map(({ key, label, format, displayFormat, info }) => (
        <ParameterInput
          key={key}
          label={label}
          value={params[key]}
          displayValue={displayFormat(params[key])}
          min={PARAM_BOUNDS[key].min}
          max={PARAM_BOUNDS[key].max}
          formatValue={format}
          onChange={(value) => onParamChange(key, value)}
          info={info}
        />
      ))}
    </div>
  )
}
