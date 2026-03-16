'use client'

import { Vowel } from '@vowel.to/client'
import type { Form, QuestionConfig } from '@/lib/database.types'

let vowelInstance: Vowel | null = null

type VowelChangeListener = (client: Vowel | null) => void
const vowelChangeListeners = new Set<VowelChangeListener>()

// Global state reference for form player
let currentFormPlayerState: {
  form: Form | null
  currentIndex: number
  totalQuestions: number
  currentQuestion: QuestionConfig | null
  answers: Record<string, unknown>
  isSubmitted: boolean
  isSubmitting: boolean
} = {
  form: null,
  currentIndex: 0,
  totalQuestions: 0,
  currentQuestion: null,
  answers: {},
  isSubmitted: false,
  isSubmitting: false,
}

// Callbacks for actions
let formPlayerCallbacks: {
  goToNext?: (skipValidation?: boolean) => void
  goToPrevious?: () => void
  submitForm?: () => void
  updateAnswer?: (questionId: string, value: unknown) => void
} = {}

/**
 * Updates the form player state that vowel uses for context
 */
export function updateFormPlayerState(state: Partial<typeof currentFormPlayerState>) {
  currentFormPlayerState = { ...currentFormPlayerState, ...state }
  if (vowelInstance) {
    vowelInstance.updateContext(buildFormPlayerContext())
  }
}

/**
 * Sets the callbacks for form player actions
 */
export function setFormPlayerCallbacks(callbacks: typeof formPlayerCallbacks) {
  formPlayerCallbacks = { ...formPlayerCallbacks, ...callbacks }
}

function buildFormPlayerContext() {
  const { form, currentIndex, totalQuestions, currentQuestion, answers, isSubmitted } = currentFormPlayerState

  const hasAnswer = currentQuestion
    ? answers[currentQuestion.id] !== undefined && answers[currentQuestion.id] !== null && answers[currentQuestion.id] !== ''
    : false

  return {
    form: form
      ? {
          id: form.id,
          title: form.title,
          description: form.description,
          status: form.status,
        }
      : null,
    progress: {
      currentQuestionIndex: currentIndex + 1, // 1-based for display
      totalQuestions,
      percentage: totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0,
      isComplete: isSubmitted,
    },
    currentQuestion: currentQuestion
      ? {
          id: currentQuestion.id,
          index: currentIndex + 1,
          type: currentQuestion.type,
          title: currentQuestion.title,
          description: currentQuestion.description,
          required: currentQuestion.required,
          hasAnswer,
          isAnswered: hasAnswer,
          answerRequiredButEmpty: currentQuestion.required && !hasAnswer,
        }
      : null,
    navigation: {
      canGoNext: currentIndex < totalQuestions - 1 && !isSubmitted,
      canGoPrevious: currentIndex > 0 && !isSubmitted,
      isLastQuestion: currentIndex === totalQuestions - 1,
      isFirstQuestion: currentIndex === 0,
    },
  }
}

/**
 * Initial greeting instructions for the AI
 * The AI knows what question it's on from the context - no need to ask for status
 */
const INITIAL_GREETING_INSTRUCTIONS = `<SYSTEM_MESSAGE>
You are on question +progress.currentQuestionIndex of +progress.totalQuestions.
Current question: +currentQuestion.title
Ask this question directly with no introduction, no "Hi I'm...", no preamble.
If +currentQuestion.description exists, include it.
</SYSTEM_MESSAGE>`


function createVowelFormPlayerClient(appId: string): Vowel {
  const vowel = new Vowel({
    appId,
    instructions: `You are a form survey voice interface. You speak as the form itself - asking questions directly without introducing yourself as an AI assistant.

## CRITICAL RULES:
1. NEVER say "Hi, I'm..." or "I'm here to help..." or explain what you can do
2. NEVER say "You can tell me your name or tell me to move to the next question"
3. Just ask the question directly, like a survey would
4. NO preamble, NO introduction, NO offering options

## CRITICAL: You ALWAYS Know What Question You're On
The context contains your current position - NEVER act like you don't know:
- \+progress.currentQuestionIndex / \+progress.totalQuestions: Your position
- \+currentQuestion.title: The exact question to ask now
- \+currentQuestion.required: true if mandatory
- \+currentQuestion.hasAnswer: true if already answered
- \+currentQuestion.answerRequiredButEmpty: true if required AND unanswered
- \+navigation.isLastQuestion: true if on final question

## CRITICAL: Required Questions Block Navigation
If \+currentQuestion.answerRequiredButEmpty is true:
- DO NOT call jumpToQuestion to move forward
- If user says "next" or "skip", say only: "This question is required."
- Only proceed after answerCurrentQuestion is called

## Your Behavior:
- ASK DIRECTLY: Just state the question. No "Would you like to...", no "I can help you..."
- EXTRACT ANSWERS: Parse natural speech ("My name is John Smith" → "John Smith")
- BE BRIEF: Short responses. Just the question or a brief confirmation.
- NO SELF-REFERENCE: Never refer to yourself as "I" or an assistant

## Examples:
BAD: "Hi! I'm ready to help with the vowel test form. You can tell me your name or tell me to move to the next question."
GOOD: "What is your name?"

BAD: "I can help you fill this out. What would you like to do?"
GOOD: "How satisfied are you with our service?"

BAD: "Great! I've recorded your answer. Would you like to continue to the next question?"
GOOD: "Thank you. Next question: What is your email address?"

## Available Tools (THREE ONLY):

### 1. answerCurrentQuestion
Record the answer AND automatically advance to the next question.
Parameter: value (string) - extracted from natural speech.

### 2. jumpToQuestion
Jump to any question by its 1-based number.
Parameter: questionNumber (number).

### 3. submitForm
Submit the form when all questions are answered.

## Question Types:
- short_text: Brief answers
- long_text: Paragraphs
- dropdown/checkboxes: Selections
- email/phone/number/date: Validated inputs
- rating: 1-5 stars
- opinion_scale: Number range
- yes_no: Binary choice
- file_upload: Not voice-answerable
- url: Website link`,

    floatingCursor: { enabled: false },

    borderGlow: {
      enabled: true,
      color: 'rgba(37, 99, 235, 0.4)',
      intensity: 25,
      pulse: true,
    },

    _caption: {
      enabled: true,
      position: 'top-center',
      maxWidth: '500px',
      showRole: true,
      showOnMobile: true,
    },

    voiceConfig: {
      // provider: 'grok',
      provider: 'vowel-prime',
      vowelPrimeConfig: { environment: 'staging' },
      // llmProvider: 'groq',
      llmProvider: 'openrouter',
      // model: 'openai/gpt-oss-120b',
      // model: 'nvidia/nemotron-3-nano-30b-a3b:free',
      // model: 'nvidia/nemotron-3-super-120b-a12b:free',
      // model: 'inception/mercury-2',
      // model: 'qwen/qwen3.5-35b-a3b:exacto',
      // model: 'arcee-ai/trinity-mini:free',
      // model: 'openrouter/free',
      // model: 'stepfun/step-3.5-flash:free',
      // model: 'qwen/qwen-turbo',
      model: 'google/gemini-3.1-flash-lite-preview',
      voice: 'Timothy',
      // voice: 'Leo',
      language: 'en-US',
      initialGreetingPrompt: INITIAL_GREETING_INSTRUCTIONS,
      turnDetection: {
        mode: 'server_vad',
        // serverVAD: {
        //   threshold: 0.5,
        //   silenceDurationMs: 550,
        //   prefixPaddingMs: 0,
        //   interruptResponse: true,
        // },
      },
      useServerVad: true,
    },

    onUserSpeakingChange: (isSpeaking) => {
      console.log(isSpeaking ? '🗣️ User started speaking' : '🔇 User stopped speaking')
    },
    onAIThinkingChange: (isThinking) => {
      console.log(isThinking ? '🧠 AI started thinking' : '💭 AI stopped thinking')
    },
    onAISpeakingChange: (isSpeaking) => {
      console.log(isSpeaking ? '🔊 AI started speaking' : '🔇 AI stopped speaking')
    },
  })

  registerFormPlayerActions(vowel)
  return vowel
}

function registerFormPlayerActions(vowel: Vowel) {
  /**
   * 1. answerCurrentQuestion - Records answer and auto-advances to next question
   */
  vowel.registerAction(
    'answerCurrentQuestion',
    {
      description: 'Provide an answer for the current question. Automatically advances to the next question after recording.',
      parameters: {
        value: {
          type: 'string',
          description: 'The answer value to set for the current question',
        },
      },
    },
    async ({ value }) => {
      const currentQuestion = currentFormPlayerState.currentQuestion
      if (!currentQuestion) {
        return { success: false, message: 'No question is currently active' }
      }
      if (currentFormPlayerState.isSubmitted) {
        return { success: false, message: 'Form has already been submitted' }
      }

      if (!formPlayerCallbacks.updateAnswer || !formPlayerCallbacks.goToNext) {
        return { success: false, message: 'Cannot process answer at this time' }
      }

      // Convert value based on question type
      let processedValue: unknown = value

      switch (currentQuestion.type) {
        case 'number':
        case 'opinion_scale':
        case 'rating':
          processedValue = parseFloat(value) || value
          break
        case 'yes_no':
          processedValue = value.toLowerCase().includes('yes') ? 'yes' : value.toLowerCase().includes('no') ? 'no' : value
          break
        case 'checkboxes':
          // If multiple values separated by commas or "and"
          if (value.includes(',') || value.toLowerCase().includes(' and ')) {
            processedValue = value.split(/,\s*|\s+and\s+/i).map((v: string) => v.trim())
          } else {
            processedValue = [value]
          }
          break
        default:
          processedValue = value
      }

      // Record the answer
      formPlayerCallbacks.updateAnswer(currentQuestion.id, processedValue)

      // Brief pause so the user can see their answer before advancing
      await new Promise((resolve) => setTimeout(resolve, 500))

      const isLastQuestion = currentFormPlayerState.currentIndex >= currentFormPlayerState.totalQuestions - 1

      // goToNext(true) advances to next question, or submits when on last question
      formPlayerCallbacks.goToNext(true)

      if (isLastQuestion) {
        return {
          success: true,
          message: `Answer recorded. Form submitted.`,
        }
      }

      const nextIndex = currentFormPlayerState.currentIndex + 1
      const nextQuestion = currentFormPlayerState.form?.questions?.[nextIndex] as QuestionConfig | undefined

      return {
        success: true,
        message: `Answer recorded. Moving to question ${nextIndex + 1}${nextQuestion?.title ? `: "${nextQuestion.title}"` : ''}`,
      }
    }
  )

  /**
   * 2. jumpToQuestion - Jump to any question by number
   */
  vowel.registerAction(
    'jumpToQuestion',
    {
      description: 'Jump to a specific question by its 1-based number',
      parameters: {
        questionNumber: {
          type: 'string',
          description: 'The question number to jump to (1-based)',
        },
      },
    },
    async ({ questionNumber }) => {
      if (currentFormPlayerState.isSubmitted) {
        return { success: false, message: 'Form has already been submitted' }
      }
      const targetIndex = parseInt(questionNumber, 10) - 1
      if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= currentFormPlayerState.totalQuestions) {
        return {
          success: false,
          message: `Invalid question number. Please specify a number between 1 and ${currentFormPlayerState.totalQuestions}`,
        }
      }

      // Jump by calling next/previous multiple times (simple approach)
      const currentIndex = currentFormPlayerState.currentIndex
      const diff = targetIndex - currentIndex

      if (diff > 0 && formPlayerCallbacks.goToNext) {
        for (let i = 0; i < diff; i++) {
          formPlayerCallbacks.goToNext(true) // Skip validation for intermediate jumps
        }
      } else if (diff < 0 && formPlayerCallbacks.goToPrevious) {
        for (let i = 0; i < Math.abs(diff); i++) {
          formPlayerCallbacks.goToPrevious()
        }
      }

      const targetQuestion = currentFormPlayerState.form?.questions?.[targetIndex] as QuestionConfig | undefined
      return {
        success: true,
        message: `Jumped to question ${targetIndex + 1}${targetQuestion?.title ? `: "${targetQuestion.title}"` : ''}`,
      }
    }
  )

  /**
   * 3. submitForm - Submit the form
   */
  vowel.registerAction(
    'submitForm',
    {
      description: 'Submit the completed form',
      parameters: {},
    },
    async () => {
      if (currentFormPlayerState.isSubmitted) {
        return { success: false, message: 'Form has already been submitted' }
      }
      if (formPlayerCallbacks.submitForm) {
        formPlayerCallbacks.submitForm()
        return { success: true, message: 'Form is being submitted' }
      }
      return { success: false, message: 'Form submission not available' }
    }
  )
}

export function initializeVowelFormPlayer(appId: string) {
  if (!appId) return
  vowelInstance = createVowelFormPlayerClient(appId)
  vowelInstance.updateContext(buildFormPlayerContext())
  console.log('✅ Vowel form player client initialized')
  vowelChangeListeners.forEach((listener) => listener(vowelInstance))
}

export function getVowelFormPlayer(): Vowel | null {
  return vowelInstance
}

export function subscribeToVowelFormPlayerChanges(listener: VowelChangeListener): () => void {
  vowelChangeListeners.add(listener)
  if (vowelInstance) {
    listener(vowelInstance)
  }
  return () => vowelChangeListeners.delete(listener)
}

export type VowelFormPlayerType = Vowel | null
