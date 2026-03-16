'use client'

import { Vowel, DirectNavigationAdapter } from '@vowel.to/client'
import { useRouter as useNextRouter } from 'next/navigation'

let vowelInstance: Vowel | null = null

type VowelChangeListener = (client: Vowel | null) => void
const vowelChangeListeners = new Set<VowelChangeListener>()

function buildVowelContext(pathname: string) {
  return {
    route: {
      pathname,
      pathnameLabel: getPathnameLabel(pathname),
    },
  }
}

function getPathnameLabel(pathname: string): string {
  if (pathname === '/dashboard' || pathname === '/') return 'Dashboard - My Forms'
  if (pathname.startsWith('/forms/')) {
    if (pathname.endsWith('/edit')) return 'Form Editor'
    if (pathname.endsWith('/responses')) return 'Form Responses'
    if (pathname === '/forms/new') return 'Create New Form'
    return 'Form Details'
  }
  if (pathname === '/settings') return 'Settings'
  return pathname
}

export const routes = [
  { path: '/dashboard', description: 'View all your forms - My Forms' },
  { path: '/forms/new', description: 'Create a new form' },
  { path: '/settings', description: 'User settings and preferences' },
]

let currentPathname: string = ''
let routerInstance: ReturnType<typeof useNextRouter> | null = null

export function setRouter(router: ReturnType<typeof useNextRouter>) {
  routerInstance = router
}

export function setCurrentPathname(pathname: string) {
  currentPathname = pathname
}

function createVowelClient(appId: string, pathname: string): Vowel {
  const navigationAdapter = new DirectNavigationAdapter({
    navigate: (path: string) => {
      if (routerInstance) {
        routerInstance.push(path)
      }
    },
    getCurrentPath: () => pathname,
    routes,
  })

  const vowel = new Vowel({
    appId,
    instructions: `You are a helpful voice assistant for OpenForm, an open-source TypeForm alternative that lets users create beautiful forms.

## CRITICAL: Write to App Store, Not DOM
**MOST IMPORTANT RULE**: When performing actions, you MUST write to the application store/state management system, NOT manipulate the DOM directly. Always use registered actions that modify the app store. The UI will automatically update to reflect state changes.

## CRITICAL: Always Refer to Context for Information
Before answering ANY question or performing ANY action, ALWAYS check the <context> section for current information. The context contains the most up-to-date state of the application.

## Current Application State:
The current route and state is automatically provided in the <context> section.

## Available Routes:
- /dashboard (or /): View all your forms
- /forms/new: Create a new form
- /settings: User settings and preferences
- /forms/[id]/edit: Edit a specific form
- /forms/[id]/responses: View responses for a specific form

## Available Actions:
### Forms:
- navigateToCreateForm: Navigate to the create new form page
- navigateToDashboard: Navigate to the dashboard
- navigateToSettings: Navigate to settings
- navigateToFormEditor: Navigate to edit a specific form (requires formId)
- navigateToFormResponses: Navigate to view responses for a specific form (requires formId)

## How to Use:
- To navigate: Say "go to dashboard", "create a form", "open settings", etc.
- The navigation adapter handles all routing automatically
- **DO NOT use DOM manipulation** - always prefer state management

Help users navigate and manage their forms using voice commands.`,

    navigationAdapter,
    floatingCursor: { enabled: false },

    borderGlow: {
      enabled: true,
      color: 'rgba(37, 99, 235, 0.5)',
      intensity: 30,
      pulse: true,
    },

    _caption: {
      enabled: true,
      position: 'top-center',
      maxWidth: '600px',
      showRole: true,
      showOnMobile: false,
    },

    voiceConfig: {
      provider: 'vowel-prime',
      vowelPrimeConfig: { environment: 'staging' },
      llmProvider: 'groq',
      model: 'openai/gpt-oss-120b',
      voice: 'Timothy',
      language: 'en-US',
      initialGreetingPrompt: `Welcome to OpenForm! You're on the dashboard where you can view and manage your forms. You can say "create a new form" to start building beautiful TypeForm-style forms, "go to settings" to adjust your preferences, or ask me to help you navigate anywhere. What would you like to do?`,
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

  registerCustomActions(vowel)
  return vowel
}

export function initializeVowel(appId: string, pathname: string) {
  if (!appId) return
  vowelInstance = createVowelClient(appId, pathname)
  vowelInstance.updateContext(buildVowelContext(pathname))
  console.log('✅ Vowel client initialized with App ID:', appId)
  vowelChangeListeners.forEach((listener) => listener(vowelInstance))
}

export function getVowel(): Vowel | null {
  return vowelInstance
}

export function subscribeToVowelChanges(listener: VowelChangeListener): () => void {
  vowelChangeListeners.add(listener)
  if (vowelInstance) {
    listener(vowelInstance)
  }
  return () => vowelChangeListeners.delete(listener)
}

export function updateVowelContext(pathname: string) {
  if (vowelInstance) {
    vowelInstance.updateContext(buildVowelContext(pathname))
  }
}

function registerCustomActions(vowel: Vowel) {
  vowel.registerAction(
    'navigateToCreateForm',
    {
      description: 'Navigate to the create new form page',
      parameters: {},
    },
    async () => {
      if (routerInstance) {
        routerInstance.push('/forms/new')
      }
      return { success: true, message: 'Navigating to create form page' }
    }
  )

  vowel.registerAction(
    'navigateToDashboard',
    {
      description: 'Navigate to the dashboard (my forms)',
      parameters: {},
    },
    async () => {
      if (routerInstance) {
        routerInstance.push('/dashboard')
      }
      return { success: true, message: 'Navigating to dashboard' }
    }
  )

  vowel.registerAction(
    'navigateToSettings',
    {
      description: 'Navigate to user settings',
      parameters: {},
    },
    async () => {
      if (routerInstance) {
        routerInstance.push('/settings')
      }
      return { success: true, message: 'Navigating to settings' }
    }
  )

  vowel.registerAction(
    'navigateToFormEditor',
    {
      description: 'Navigate to edit a specific form by ID',
      parameters: {
        formId: { type: 'string', description: 'The ID of the form to edit' },
      },
    },
    async ({ formId }) => {
      if (!formId) {
        return { success: false, message: 'Form ID is required' }
      }
      if (routerInstance) {
        routerInstance.push(`/forms/${formId}/edit`)
      }
      return { success: true, message: `Navigating to form editor for ${formId}` }
    }
  )

  vowel.registerAction(
    'navigateToFormResponses',
    {
      description: 'Navigate to view responses for a specific form by ID',
      parameters: {
        formId: { type: 'string', description: 'The ID of the form to view responses for' },
      },
    },
    async ({ formId }) => {
      if (!formId) {
        return { success: false, message: 'Form ID is required' }
      }
      if (routerInstance) {
        routerInstance.push(`/forms/${formId}/responses`)
      }
      return { success: true, message: `Navigating to responses for ${formId}` }
    }
  )

  vowel.registerAction(
    'getAppState',
    {
      description:
        'Get current route and app state. CALL THIS FIRST when starting a new session - context may not be populated yet.',
      parameters: {},
    },
    async () => {
      return { success: true }
    }
  )
}

export type VowelClientType = Vowel | null
