'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter as useNextRouter } from 'next/navigation'
import { VowelProvider, VowelAgent } from '@vowel.to/client/react'
import {
  initializeVowel,
  getVowel,
  subscribeToVowelChanges,
  updateVowelContext,
  setRouter,
  type VowelClientType,
} from './vowel.client'

const appId = process.env.NEXT_PUBLIC_VOWEL_APP_ID

function VowelInit({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useNextRouter()

  useEffect(() => {
    setRouter(router)
  }, [router])

  useEffect(() => {
    if (!appId) {
      return
    }

    try {
      initializeVowel(appId, pathname)
    } catch (error) {
      console.error('❌ Failed to initialize Vowel:', error)
    }
  }, [pathname])

  useEffect(() => {
    updateVowelContext(pathname)
  }, [pathname])

  return <>{children}</>
}

function VowelLoading() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="h-12 w-12 rounded-full bg-blue-600/20 animate-pulse" />
    </div>
  )
}

export function VowelWrapper({ children }: { children: React.ReactNode }) {
  const [vowel, setVowel] = useState<VowelClientType>(getVowel())
  const [isLoading, setIsLoading] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    if (!appId) {
      setIsLoading(false)
      return
    }

    const unsubscribe = subscribeToVowelChanges((client) => {
      setVowel(client)
      setIsLoading(false)
    })

    const timeout = setTimeout(() => {
      setIsLoading(false)
      if (!vowel) {
        setInitError('Vowel initialization timed out')
      }
    }, 3000)

    return () => {
      unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  if (!appId) {
    return <>{children}</>
  }

  if (initError) {
    console.warn('⚠️ Vowel failed to initialize:', initError)
    return <>{children}</>
  }

  const vowelReady = vowel !== null

  return (
    <VowelProvider client={vowel}>
      <VowelInit>{children}</VowelInit>
      {isLoading && !vowelReady && <VowelLoading />}
      {vowelReady && (
        <VowelAgent
          position="bottom-right"
          enableFloatingCursor={false}
        />
      )}
    </VowelProvider>
  )
}
