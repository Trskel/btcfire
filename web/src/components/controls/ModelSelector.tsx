import { cn } from '@/lib/utils'
import type { ModelId } from '@/types/models'
import type { ReactNode } from 'react'

interface ModelSelectorProps {
  activeModel: ModelId
  onModelChange: (model: ModelId) => void
  children: ReactNode
}

const tabs: { id: ModelId; label: string }[] = [
  { id: 'power-law', label: 'Power Law' },
  { id: 's2f', label: 'Stock-to-Flow (S2F)' },
]

export function ModelSelector({ activeModel, onModelChange, children }: ModelSelectorProps) {
  return (
    <div className="space-y-4">
      <div
        role="tablist"
        className="flex w-full rounded-lg border border-border bg-muted/50 p-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeModel === tab.id}
            className={cn(
              'min-h-[44px] flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              activeModel === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onModelChange(tab.id)}
          >
            <span className="sm:hidden">
              {tab.id === 'power-law' ? 'Power Law' : 'S2F'}
            </span>
            <span className="hidden sm:inline">
              {tab.label}
            </span>
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}
