import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Theme">
      <Button
        variant={theme === 'light' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setTheme('light')}
        className="min-h-[44px] gap-1.5 rounded-[7px]"
        role="radio"
        aria-checked={theme === 'light'}
      >
        <Sun className="size-4" />
        Light
      </Button>
      <Button
        variant={theme === 'dark' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setTheme('dark')}
        className="min-h-[44px] gap-1.5 rounded-[7px]"
        role="radio"
        aria-checked={theme === 'dark'}
      >
        <Moon className="size-4" />
        Dark
      </Button>
    </div>
  )
}
