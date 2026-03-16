'use client'

import { VowelWrapper } from '@/lib/vowel/vowel-wrapper'

export function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <VowelWrapper>{children}</VowelWrapper>
}
