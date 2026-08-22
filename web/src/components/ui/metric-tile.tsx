import { cn } from '@/lib/utils'
import { InfoButton } from '@/components/ui/info-button'

interface MetricTileProps {
  label: string
  subLabel?: string
  info: string
  value: string | null | undefined
  valueClassName?: string
}

export function MetricTile({
  label,
  subLabel,
  info,
  value,
  valueClassName,
}: MetricTileProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="flex items-start gap-1 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <InfoButton label={label} description={info} />
      </p>
      {subLabel && (
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/70">
          {subLabel}
        </p>
      )}
      <p
        className={cn(
          'mt-1 text-lg font-semibold tabular-nums',
          valueClassName ?? 'text-foreground',
        )}
      >
        {value == null ? '—' : value}
      </p>
    </div>
  )
}
