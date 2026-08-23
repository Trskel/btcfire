import { useCallback, useId, useState } from 'react'
import { InfoButton } from '@/components/ui/info-button'

interface ParameterInputProps {
  label: string
  value: number
  displayValue: string
  min: number
  max: number
  formatValue: (value: number) => string
  onChange: (value: number) => void
  info?: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function ParameterInput({
  label,
  value,
  displayValue,
  min,
  max,
  formatValue,
  onChange,
  info,
}: ParameterInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const [lastValue, setLastValue] = useState(value)
  const id = useId()

  if (value !== lastValue) {
    setLastValue(value)
    if (draft !== null) {
      const parsed = parseFloat(draft)
      if (!Number.isFinite(parsed) || clamp(parsed, min, max) !== value) {
        setDraft(null)
      }
    }
  }

  const commitDraft = useCallback(
    (raw: string) => {
      const parsed = parseFloat(raw)
      setDraft(null)
      if (!Number.isFinite(parsed)) return
      onChange(clamp(parsed, min, max))
    },
    [min, max, onChange],
  )

  const handleTextChange = (raw: string) => {
    setDraft(raw)
    const parsed = parseFloat(raw)
    if (Number.isFinite(parsed)) {
      onChange(clamp(parsed, min, max))
    }
  }

  const handleTextBlur = () => {
    if (draft !== null) {
      commitDraft(draft)
    }
  }

  const textValue = draft !== null ? draft : formatValue(value)

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1">
          <label
            htmlFor={id}
            className="text-xs font-medium text-muted-foreground"
          >
            {label}
          </label>
          {info && <InfoButton label={label} description={info} />}
        </span>
        <span
          className="text-xs tabular-nums text-muted-foreground/60"
          aria-hidden="true"
        >
          {displayValue}
        </span>
      </div>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        role="spinbutton"
        aria-label={`${label} value`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums"
        value={textValue}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleTextBlur}
      />
    </div>
  )
}
