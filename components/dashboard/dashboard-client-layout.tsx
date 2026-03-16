'use client'

import dynamic from 'next/dynamic'

/**
 * VowelWrapper (and @vowel.to/client) uses browser APIs (HTMLElement, etc.)
 * that are not available during SSR. Load it only on the client to avoid
 * "HTMLElement is not defined" errors.
 */
const VowelWrapper = dynamic(
  () => import('@/lib/vowel/vowel-wrapper').then((m) => m.VowelWrapper),
  { ssr: false }
)

export function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <VowelWrapper>{children}</VowelWrapper>
}
