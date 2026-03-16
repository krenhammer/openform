'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Wraps the app with next-themes ThemeProvider.
 * Uses the `class` attribute so Tailwind dark-mode variants work correctly.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      forcedTheme="light"
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
