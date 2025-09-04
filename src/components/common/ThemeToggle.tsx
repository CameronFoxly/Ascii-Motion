import { useTheme } from '@/contexts/ThemeContext'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="theme-toggle" className="text-sm font-medium">
        Dark mode
      </Label>
      <Switch
        id="theme-toggle"
        checked={theme === 'dark'}
        onCheckedChange={toggleTheme}
      />
    </div>
  )
}
