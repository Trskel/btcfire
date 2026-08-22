import { cn } from '@/lib/utils'

interface SpinnerProps {
  className?: string
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'h-8 w-8 rounded-full border-4 border-muted border-t-foreground motion-safe:animate-spin',
        className,
      )}
    />
  )
}
