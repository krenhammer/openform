'use client'

import { useEffect, useRef, useState } from 'react'
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
  const initialPathnameRef = useRef(pathname)

  useEffect(() => {
    setRouter(router)
  }, [router])

  useEffect(() => {
    if (!appId) {
      return
    }

    try {
      initializeVowel(appId, initialPathnameRef.current)
    } catch (error) {
      console.error('❌ Failed to initialize Vowel:', error)
    }
  }, [])

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
  const shouldEnableVowel = Boolean(appId)
  const [vowel, setVowel] = useState<VowelClientType>(getVowel())
  const [isLoading, setIsLoading] = useState(shouldEnableVowel && getVowel() === null)
  const [initError, setInitError] = useState<string | null>(null)
  const hasClientRef = useRef(vowel !== null)

  useEffect(() => {
    hasClientRef.current = vowel !== null
  }, [vowel])

  useEffect(() => {
    if (!appId) {
      return
    }

    const unsubscribe = subscribeToVowelChanges((client) => {
      setVowel(client)
      setIsLoading(false)
      setInitError(null)
    })

    const timeout = setTimeout(() => {
      if (!hasClientRef.current) {
        setIsLoading(false)
        setInitError('Vowel initialization timed out')
      }
    }, 3000)

    return () => {
      unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  if (!shouldEnableVowel) {
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
          buttonColor="#2563eb"
          enableFloatingCursor={false}
        />
      )}
    </VowelProvider>
  )
}
