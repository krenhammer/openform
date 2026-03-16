'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Toggles between light and dark mode.
 * Renders Sun icon in dark mode (click to switch to light), Moon in light mode (click to switch to dark).
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  const isDark = resolvedTheme === 'dark'

  const toggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 rounded-full"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-muted-foreground hover:text-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-muted-foreground hover:text-foreground" />
      )}
    </Button>
  )
}
