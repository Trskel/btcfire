import { useRef } from 'react'
import { Popover } from '@base-ui/react/popover'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface InfoButtonProps {
  label: string
  description: string
  className?: string
  showLabel?: boolean
}

export function InfoButton({
  label,
  description,
  className,
  showLabel = false,
}: InfoButtonProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)

  const trigger = (
    <Popover.Trigger
      ref={triggerRef}
      type="button"
      openOnHover
      aria-label={`About ${label}`}
      className={cn(
        'relative inline-flex size-[26px] shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground/70 transition-colors outline-none',
        'hover:bg-muted hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
        'data-[popup-open]:bg-muted data-[popup-open]:text-muted-foreground',
        'after:absolute after:-inset-[9px] after:content-[""]',
      )}
    >
      <Info className="size-3.5" aria-hidden="true" />
    </Popover.Trigger>
  )

  return (
    <Popover.Root>
      {showLabel ? (
        <span className={cn('flex items-center gap-1', className)}>
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
          {trigger}
        </span>
      ) : (
        trigger
      )}
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 outline-none"
        >
          <Popover.Popup
            finalFocus={triggerRef}
            className="w-max max-w-[min(calc(100vw-2rem),20rem)] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md"
          >
            <Popover.Title className="text-xs font-semibold">{label}</Popover.Title>
            <Popover.Description className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
