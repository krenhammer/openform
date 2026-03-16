'use client'

import { useEffect, useRef, useState } from 'react'
import { VowelProvider, VowelAgent } from '@vowel.to/client/react'
import {
  initializeVowelFormPlayer,
  getVowelFormPlayer,
  subscribeToVowelFormPlayerChanges,
  updateFormPlayerState,
  setFormPlayerCallbacks,
  type VowelFormPlayerType,
} from '@/lib/vowel/vowel-form-player.client'
import type { Form, QuestionConfig } from '@/lib/database.types'

const appId = process.env.NEXT_PUBLIC_VOWEL_APP_ID

interface VowelFormPlayerWrapperProps {
  form: Form
  children: React.ReactNode
  currentIndex: number
  totalQuestions: number
  currentQuestion: QuestionConfig | null
  answers: Record<string, unknown>
  isSubmitted: boolean
  isSubmitting: boolean
  onGoToNext: (skipValidation?: boolean) => void
  onGoToPrevious: () => void
  onSubmit: () => void
  onUpdateAnswer: (questionId: string, value: unknown) => void
}

function VowelInit({ children, formPlayerProps }: { children: React.ReactNode; formPlayerProps: VowelFormPlayerWrapperProps }) {
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!appId || initializedRef.current) {
      return
    }

    try {
      initializeVowelFormPlayer(appId)
      initializedRef.current = true
    } catch (error) {
      console.error('❌ Failed to initialize Vowel form player:', error)
    }
  }, [])

  // Update state when props change
  useEffect(() => {
    if (!appId) return

    updateFormPlayerState({
      form: formPlayerProps.form,
      currentIndex: formPlayerProps.currentIndex,
      totalQuestions: formPlayerProps.totalQuestions,
      currentQuestion: formPlayerProps.currentQuestion,
      answers: formPlayerProps.answers,
      isSubmitted: formPlayerProps.isSubmitted,
      isSubmitting: formPlayerProps.isSubmitting,
    })
  }, [
    formPlayerProps.form,
    formPlayerProps.currentIndex,
    formPlayerProps.totalQuestions,
    formPlayerProps.currentQuestion,
    formPlayerProps.answers,
    formPlayerProps.isSubmitted,
    formPlayerProps.isSubmitting,
  ])

  // Set callbacks
  useEffect(() => {
    if (!appId) return

    setFormPlayerCallbacks({
      goToNext: formPlayerProps.onGoToNext,
      goToPrevious: formPlayerProps.onGoToPrevious,
      submitForm: formPlayerProps.onSubmit,
      updateAnswer: formPlayerProps.onUpdateAnswer,
    })
  }, [
    formPlayerProps.onGoToNext,
    formPlayerProps.onGoToPrevious,
    formPlayerProps.onSubmit,
    formPlayerProps.onUpdateAnswer,
  ])

  return <>{children}</>
}

function VowelLoading() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="h-12 w-12 rounded-full bg-blue-600/20 animate-pulse" />
    </div>
  )
}

export function VowelFormPlayerWrapper(props: VowelFormPlayerWrapperProps) {
  const { children, ...formPlayerProps } = props
  const shouldEnableVowel = Boolean(appId)
  const [vowel, setVowel] = useState<VowelFormPlayerType>(getVowelFormPlayer())
  const [isLoading, setIsLoading] = useState(shouldEnableVowel && getVowelFormPlayer() === null)
  const [initError, setInitError] = useState<string | null>(null)
  const hasClientRef = useRef(vowel !== null)

  useEffect(() => {
    hasClientRef.current = vowel !== null
  }, [vowel])

  useEffect(() => {
    if (!appId) {
      return
    }

    const unsubscribe = subscribeToVowelFormPlayerChanges((client) => {
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
    console.warn('⚠️ Vowel form player failed to initialize:', initError)
    return <>{children}</>
  }

  const vowelReady = vowel !== null

  return (
    <VowelProvider client={vowel}>
      <VowelInit formPlayerProps={formPlayerProps}>{children}</VowelInit>
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
