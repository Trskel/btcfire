import { cn } from '@/lib/utils'
import type { ModelId } from '@/types/models'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { InfoButton } from '@/components/ui/info-button'

export interface ModelEntry {
  id: ModelId
  label: string
  shortLabel: string
  controls: ReactNode
  info?: string
}

interface ModelSelectorProps {
  models: ModelEntry[]
  visibleModels: Set<ModelId>
  expandedModel: ModelId | null
  onToggleVisibility: (id: ModelId) => void
  onToggleExpand: (id: ModelId) => void
}

export function ModelSelector({
  models,
  visibleModels,
  expandedModel,
  onToggleVisibility,
  onToggleExpand,
}: ModelSelectorProps) {
  return (
    <div className="space-y-3">
      {models.map((model) => {
        const isVisible = visibleModels.has(model.id)
        const isExpanded = expandedModel === model.id

        return (
          <div
            key={model.id}
            className={cn(
              'rounded-lg border transition-colors',
              isVisible ? 'border-border bg-card' : 'border-border/50 bg-muted/30',
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={isVisible}
                  onChange={() => onToggleVisibility(model.id)}
                />
                <span className="text-sm font-medium">
                  <span className="sm:hidden">{model.shortLabel}</span>
                  <span className="hidden sm:inline">{model.label}</span>
                </span>
              </label>
              {model.info && (
                <InfoButton label={model.label} description={model.info} />
              )}
              <button
                className={cn(
                  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-transform',
                  'hover:bg-muted',
                )}
                onClick={() => onToggleExpand(model.id)}
                aria-label={isExpanded ? `Collapse ${model.label}` : `Expand ${model.label}`}
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-180',
                  )}
                />
              </button>
            </div>
            {isExpanded && (
              <div className="border-t border-border px-3 py-3">
                {model.controls}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
