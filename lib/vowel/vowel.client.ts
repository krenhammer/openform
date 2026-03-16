'use client'

import { Vowel, DirectNavigationAdapter } from '@vowel.to/client'
import { useRouter as useNextRouter } from 'next/navigation'

let vowelInstance: Vowel | null = null

type VowelChangeListener = (client: Vowel | null) => void
const vowelChangeListeners = new Set<VowelChangeListener>()

function buildVowelContext(pathname: string) {
  const editorState =
    typeof window !== 'undefined'
      ? (
          window as unknown as {
            __openform?: {
              selectedQuestionId: string | null
              selectedQuestionIndex: number | null
              questions: { id: string; type?: string; title?: string }[]
            }
          }
        ).__openform
      : undefined

  return {
    route: {
      pathname,
      pathnameLabel: getPathnameLabel(pathname),
    },
    formEditor:
      pathname.includes('/edit') && editorState
        ? {
            selectedQuestionId: editorState.selectedQuestionId,
            selectedQuestionIndex: editorState.selectedQuestionIndex,
            questionCount: editorState.questions.length,
            editableFields: ['title', 'description', 'placeholder', 'required'],
            questions: editorState.questions.map((question, index) => ({
              index: index + 1,
              id: question.id,
              type: question.type ?? 'unknown',
              title: question.title?.trim() || `Untitled question ${index + 1}`,
            })),
          }
        : null,
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

## CRITICAL: Using "none" for Omitted Fields
All tools require ALL parameters to be provided. When a field should be omitted or left unchanged, pass the string "none" (without quotes). Do not omit parameters - always include them with "none" if they don't apply.

## Available Routes:
- /dashboard (or /): View all your forms
- /forms/new: Create a new form
- /settings: User settings and preferences
- /forms/[id]/edit: Edit a specific form
- /forms/[id]/responses: View responses for a specific form

## Available Tools and When to Use Them:

### Navigation Tools (Use these when the user wants to move between pages):

1. **navigateToCreateForm** - Navigate to the create new form page
   - When to use: User says "create a form", "new form", "I want to create a form", "make a new form"
   - No parameters needed

2. **navigateToDashboard** - Navigate to the dashboard (My Forms page)
   - When to use: User says "go to dashboard", "view my forms", "show my forms", "back to dashboard", "home"
   - No parameters needed

3. **navigateToSettings** - Navigate to user settings page
   - When to use: User says "open settings", "go to settings", "show preferences"
   - No parameters needed

4. **navigateToFormEditor** - Navigate to edit a specific form
   - When to use: User says "edit form [name or id]", "open form editor", "I want to edit a form"
   - Required parameter: formId (string) - the ID of the form to edit

5. **navigateToFormResponses** - Navigate to view responses for a specific form
   - When to use: User says "view responses", "show responses for [form]", "see form submissions"
   - Required parameter: formId (string) - the ID of the form to view responses for

### Form Editor Tools (Only available when on the form editor page at /forms/[id]/edit):

6. **openAddQuestionDialog** - Opens the "Add Question" type picker dialog
   - When to use: User says "add a question", "add a new question", "I want to add a question", "new question"
   - No parameters needed
   - This is the FIRST step in adding a question - opens a dialog for the user to pick the question type

7. **addQuestionByType** - Adds a question of the specified type and closes the dialog
   - When to use: User specifies a question type (e.g. "short text", "dropdown", "email") either after opening the dialog or in the same sentence as "add a question"
   - ALL parameters must be provided (use "none" for any you want to omit):
     - type (string): The question type. Valid types: short_text, long_text, dropdown, checkboxes, email, phone, number, date, rating, opinion_scale, yes_no, file_upload, url
     - title (string): The question text. Use "none" to omit.
     - description (string): Help text shown below the question. Use "none" to omit.
     - placeholder (string): Hint text inside the input field. Use "none" to omit.
     - required (string): "true" for required, "false" for optional, "none" to use default (false)
   - Examples:
     - "Add a short text question" → type: "short_text", title: "none", description: "none", placeholder: "none", required: "none"
     - "Add an email question called 'What is your email?' and make it required" → type: "email", title: "What is your email?", description: "none", placeholder: "none", required: "true"

8. **editQuestion** - Edits an existing question's properties
   - When to use: User wants to change a question's text, description, placeholder, or required status
   - ALL parameters must be provided (use "none" for any you want to leave unchanged):
     - questionIndex (string): 1-based index (e.g. "2" for "question 2"). Use "none" to edit the currently selected question.
     - title (string): The new question text. Use "none" to leave unchanged.
     - description (string): The new description. Use "none" to leave unchanged.
     - placeholder (string): The new placeholder. Use "none" to leave unchanged.
     - required (string): "true" for required, "false" for optional, "none" to leave unchanged.
   - Examples:
     - "Change this question to 'What is your name?'" → questionIndex: "none", title: "What is your name?", description: "none", placeholder: "none", required: "none"
     - "Make question 2 required" → questionIndex: "2", title: "none", description: "none", placeholder: "none", required: "true"
     - "Add description 'Enter your full name' to question 3" → questionIndex: "3", title: "none", description: "Enter your full name", placeholder: "none", required: "none"

9. **requestDeleteQuestion** - Opens a confirmation dialog to delete a question
   - When to use: User says "delete question", "remove question", "delete question 3", "delete the current question", "I want to delete this question"
   - Required parameter:
     - questionIndex (string): 1-based index of which question to delete (e.g. "2"). Use "none" to delete the currently selected question.
   - IMPORTANT: This only OPENS a confirmation dialog. The user must verbally confirm with "yes" or "confirm" before you call confirmDeleteQuestion.

10. **confirmDeleteQuestion** - Confirms and executes the deletion after user approval
    - When to use: User says "yes", "confirm", "delete it", "proceed", "yes delete it" in response to a delete confirmation dialog
    - No parameters needed

11. **cancelDeleteQuestion** - Cancels the delete operation without deleting
    - When to use: User says "no", "cancel", "keep it", "don't delete", "no keep it" in response to a delete confirmation dialog
    - No parameters needed

### Utility Tools:

12. **getAppState** - Gets the current route and application state
    - When to use: Call this FIRST when starting a new session if the context section appears empty or incomplete. This ensures you have the most up-to-date state.
    - No parameters needed
    - Returns: current route, selected question info, list of all questions with their indices and types

## How to Use These Tools:

### Navigation:
- Listen for navigation intent keywords like "go to", "open", "show", "navigate to", "take me to"
- The navigation adapter handles all routing automatically
- **DO NOT use DOM manipulation** - always prefer these state management tools

### Adding Questions (Two-Step Flow):
When user says "add a question":
1. Call **openAddQuestionDialog** first to open the type picker
2. When user specifies the type (e.g. "short text", "dropdown"), call **addQuestionByType** with that type
3. If user includes the type in the original command ("add a short text question"), you can skip step 1 and directly call **addQuestionByType**
4. ALWAYS include ALL parameters for addQuestionByType - use "none" for any fields the user doesn't specify

### Editing Questions:
- When user wants to modify a question, use **editQuestion**
- ALWAYS include ALL parameters - use "none" for any fields that shouldn't change
- If they mention a specific question number, set questionIndex to that number (as a string); otherwise use "none"

### Deleting Questions (Two-Step Flow with Confirmation):
When user says "delete question":
1. Call **requestDeleteQuestion** with questionIndex (e.g. "3" for question 3, or "none" for current) - this opens a confirmation dialog
2. Wait for user's response:
   - If they say "yes", "confirm", "delete it", "proceed" → call **confirmDeleteQuestion**
   - If they say "no", "cancel", "keep it", "don't delete" → call **cancelDeleteQuestion**

## Question Type Reference:
- **short_text**: Single line text input for brief answers (names, addresses)
- **long_text**: Multi-line textarea for longer responses (feedback, descriptions)
- **dropdown**: Single-select dropdown menu with predefined options
- **checkboxes**: Multiple-select checkboxes for choosing multiple options
- **email**: Email input with validation
- **phone**: Phone number input with validation
- **number**: Numeric input for quantities, ages, etc.
- **date**: Date picker for selecting dates
- **rating**: Star rating (1-5 stars)
- **opinion_scale**: Number scale (e.g., 0-10 satisfaction scale)
- **yes_no**: Binary yes/no choice
- **file_upload**: File upload field for documents, images
- **url**: Website URL input with validation

Help users navigate and manage their forms using these voice commands.`,


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
      turnDetection: {
        mode: 'server_vad',
        serverVAD: {
          threshold: 0.5,
          silenceDurationMs: 550,
          prefixPaddingMs: 0,
          interruptResponse: true,
        },
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

  /** Opens the Add Question type picker dialog. Use when user says "add a question". */
  vowel.registerAction(
    'openAddQuestionDialog',
    {
      description: 'Opens the Add Question type picker dialog. Call when user says "add a question", "add a new question", etc. Only relevant when on the form editor page.',
      parameters: {},
    },
    async () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('openform:openAddQuestionDialog'))
      }
      return { success: true, message: 'Opened add question dialog' }
    }
  )

  /** Maps user-friendly type names to QuestionType. */
  const typeAliases: Record<string, string> = {
    'short text': 'short_text',
    'long text': 'long_text',
    'short_text': 'short_text',
    'long_text': 'long_text',
    dropdown: 'dropdown',
    checkboxes: 'checkboxes',
    'multiple choice': 'checkboxes',
    email: 'email',
    phone: 'phone',
    number: 'number',
    date: 'date',
    rating: 'rating',
    'opinion scale': 'opinion_scale',
    'opinion_scale': 'opinion_scale',
    'yes no': 'yes_no',
    'yes_no': 'yes_no',
    'file upload': 'file_upload',
    'file_upload': 'file_upload',
    url: 'url',
    'website url': 'url',
    'website': 'url',
  }

  /** Adds a question of the specified type and closes the dialog. */
  vowel.registerAction(
    'addQuestionByType',
    {
      description:
        'Adds a question of the specified type to the form and closes the add-question dialog. Call when user specifies a type (e.g. "short text", "dropdown", "email"). Set title, description, placeholder, and required status in the same command. Valid types: short_text, long_text, dropdown, checkboxes, email, phone, number, date, rating, opinion_scale, yes_no, file_upload, url. Use "none" for any field that should be omitted or left empty.',
      parameters: {
        type: {
          type: 'string',
          description:
            'Question type: short_text, long_text, dropdown, checkboxes, email, phone, number, date, rating, opinion_scale, yes_no, file_upload, or url. User may say "short text" (→ short_text), "yes no" (→ yes_no), etc.',
        },
        title: {
          type: 'string',
          description: 'The question text/title (e.g. "What is your name?"). Use "none" to omit.',
        },
        description: {
          type: 'string',
          description: 'Description shown below the question. Use "none" to omit.',
        },
        placeholder: {
          type: 'string',
          description: 'Placeholder text for text inputs. Use "none" to omit.',
        },
        required: {
          type: 'string',
          description: 'Whether the question is required. Use "true" for required, "false" for optional, or "none" to use default (false).',
        },
      },
    },
    async ({ type: typeParam, title, description, placeholder, required }) => {
      const normalized = typeParam?.toLowerCase().trim()
      const questionType = normalized ? typeAliases[normalized] ?? normalized.replace(/\s+/g, '_') : null
      const validTypes = [
        'short_text', 'long_text', 'dropdown', 'checkboxes', 'email', 'phone',
        'number', 'date', 'rating', 'opinion_scale', 'yes_no', 'file_upload', 'url',
      ]
      const resolvedType = questionType && validTypes.includes(questionType) ? questionType : null
      if (typeof window !== 'undefined') {
        const detail: Record<string, unknown> = { type: resolvedType }
        if (title !== undefined && title !== 'none') detail.title = title
        if (description !== undefined && description !== 'none') detail.description = description
        if (placeholder !== undefined && placeholder !== 'none') detail.placeholder = placeholder
        if (required !== undefined && required !== 'none') detail.required = required === 'true'
        window.dispatchEvent(
          new CustomEvent('openform:addQuestionByType', { detail })
        )
      }
      return resolvedType
        ? { success: true, message: `Added ${resolvedType} question` }
        : { success: false, message: `Unknown question type: ${typeParam}` }
    }
  )

  /**
   * Edits a question's title, description, placeholder, and/or required status.
   * User can specify all at once or one at a time. questionIndex is 1-based (e.g. 2 = second question).
   */
  vowel.registerAction(
    'editQuestion',
    {
      description:
        'Edits the current or specified question. Use when user wants to change the question text, description, placeholder, or required status. Pass questionIndex (1-based) if they say "question 2" or "the second question"; otherwise edits apply to the currently selected question. Use "none" for any field that should not be changed.',
      parameters: {
        questionIndex: {
          type: 'string',
          description:
            '1-based index of the question to edit (e.g. "2" for "question 2"). Use "none" to edit the currently selected question.',
        },
        title: {
          type: 'string',
          description: 'The question text (e.g. "What is your email address?"). Use "none" to leave unchanged.',
        },
        description: {
          type: 'string',
          description: 'Description shown below the question. Use "none" to leave unchanged.',
        },
        placeholder: {
          type: 'string',
          description: 'Placeholder text for text inputs (short_text, long_text, email, etc.). Use "none" to leave unchanged.',
        },
        required: {
          type: 'string',
          description: 'Whether the question is required. Use "true" for required, "false" for optional, or "none" to leave unchanged.',
        },
      },
    },
    async ({ questionIndex, title, description, placeholder, required }) => {
      if (typeof window === 'undefined') {
        return { success: false, message: 'Form editor not available' }
      }
      const state = (
        window as unknown as {
          __openform?: {
            selectedQuestionId: string | null
            selectedQuestionIndex: number | null
            questions: { id: string; type?: string; title?: string }[]
          }
        }
      ).__openform
      if (!state?.questions?.length) {
        return { success: false, message: 'No form editor open. Open a form to edit first.' }
      }
      let targetId: string | null = null
      const indexNum = questionIndex !== 'none' ? parseInt(questionIndex, 10) : null
      if (indexNum != null && indexNum >= 1 && indexNum <= state.questions.length) {
        targetId = state.questions[indexNum - 1]?.id ?? null
      }
      if (!targetId) {
        targetId = state.selectedQuestionId ?? state.questions[0]?.id ?? null
      }
      if (!targetId) {
        return { success: false, message: 'Please select a question to edit first.' }
      }
      const updates: Record<string, unknown> = {}
      if (title !== undefined && title !== 'none') updates.title = title
      if (description !== undefined && description !== 'none') updates.description = description
      if (placeholder !== undefined && placeholder !== 'none') updates.placeholder = placeholder
      if (required !== undefined && required !== 'none') updates.required = required === 'true'
      if (Object.keys(updates).length === 0) {
        return { success: false, message: 'Specify at least one field to update (title, description, placeholder, or required).' }
      }
      window.dispatchEvent(
        new CustomEvent('openform:editQuestion', {
          detail: { questionId: targetId, ...updates },
        })
      )
      const fields = Object.keys(updates).join(', ')
      return { success: true, message: `Updated ${fields} for question` }
    }
  )

  /**
   * Requests deletion of a question - opens a confirmation dialog for oral approval.
   * Use when user says "delete question", "remove question", "delete the current question", etc.
   */
  vowel.registerAction(
    'requestDeleteQuestion',
    {
      description:
        'Opens a confirmation dialog to delete a question. Use when user says "delete question", "remove question", "delete question 3", "delete the current question", etc. This opens a dialog that the user can confirm verbally with "yes" or "confirm".',
      parameters: {
        questionIndex: {
          type: 'string',
          description:
            '1-based index of the question to delete (e.g. "2" for "question 2"). Use "none" to delete the currently selected question.',
        },
      },
    },
    async ({ questionIndex }) => {
      if (typeof window === 'undefined') {
        return { success: false, message: 'Form editor not available' }
      }
      const state = (
        window as unknown as {
          __openform?: {
            selectedQuestionId: string | null
            selectedQuestionIndex: number | null
            questions: { id: string; type?: string; title?: string }[]
          }
        }
      ).__openform
      if (!state?.questions?.length) {
        return { success: false, message: 'No form editor open. Open a form to edit first.' }
      }
      let targetId: string | null = null
      let targetTitle: string = ''
      let targetIndex: number = -1

      const indexNum = questionIndex !== 'none' ? parseInt(questionIndex, 10) : null
      if (indexNum != null && indexNum >= 1 && indexNum <= state.questions.length) {
        const question = state.questions[indexNum - 1]
        targetId = question?.id ?? null
        targetTitle = question?.title?.trim() || `Untitled question ${indexNum}`
        targetIndex = indexNum
      } else {
        const selectedIndex = state.selectedQuestionIndex ?? 0
        const question = state.questions[selectedIndex > 0 ? selectedIndex - 1 : 0]
        targetId = state.selectedQuestionId ?? question?.id ?? null
        targetTitle = question?.title?.trim() || 'Untitled question'
        targetIndex = state.selectedQuestionIndex ?? 1
      }

      if (!targetId) {
        return { success: false, message: 'No question selected. Please select a question to delete.' }
      }

      window.dispatchEvent(
        new CustomEvent('openform:requestDeleteQuestion', {
          detail: { questionId: targetId, questionTitle: targetTitle, questionIndex: targetIndex },
        })
      )
      return {
        success: true,
        message: `Delete confirmation requested for question ${targetIndex}: "${targetTitle}". Waiting for user confirmation.`,
        awaitingConfirmation: true,
        questionIndex: targetIndex,
        questionTitle: targetTitle,
      }
    }
  )

  /**
   * Confirms deletion of a question after oral approval.
   * Use when user responds "yes", "confirm", "delete it", etc. to the confirmation dialog.
   */
  vowel.registerAction(
    'confirmDeleteQuestion',
    {
      description:
        'Confirms and executes the deletion of a question after the user has approved it verbally. Use when user says "yes", "confirm", "delete it", "proceed", etc. in response to a delete confirmation dialog.',
      parameters: {},
    },
    async () => {
      if (typeof window === 'undefined') {
        return { success: false, message: 'Form editor not available' }
      }
      window.dispatchEvent(new CustomEvent('openform:confirmDeleteQuestion'))
      return { success: true, message: 'Question deletion confirmed and executed' }
    }
  )

  /**
   * Cancels the delete confirmation dialog.
   * Use when user responds "no", "cancel", "keep it", etc.
   */
  vowel.registerAction(
    'cancelDeleteQuestion',
    {
      description:
        'Cancels the delete confirmation dialog without deleting. Use when user says "no", "cancel", "keep it", "don\'t delete", etc. in response to a delete confirmation dialog.',
      parameters: {},
    },
    async () => {
      if (typeof window === 'undefined') {
        return { success: false, message: 'Form editor not available' }
      }
      window.dispatchEvent(new CustomEvent('openform:cancelDeleteQuestion'))
      return { success: true, message: 'Delete cancelled' }
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
      const state =
        typeof window !== 'undefined'
          ? (
              window as unknown as {
                __openform?: {
                  selectedQuestionId: string | null
                  selectedQuestionIndex: number | null
                  questions: { id: string; type?: string; title?: string }[]
                }
              }
            ).__openform
          : undefined

      return {
        success: true,
        route: currentPathname || (typeof window !== 'undefined' ? window.location.pathname : ''),
        formEditor: state
          ? {
              selectedQuestionId: state.selectedQuestionId,
              selectedQuestionIndex: state.selectedQuestionIndex,
              questionCount: state.questions.length,
              questions: state.questions.map((question, index) => ({
                index: index + 1,
                id: question.id,
                type: question.type ?? 'unknown',
                title: question.title?.trim() || `Untitled question ${index + 1}`,
              })),
            }
          : null,
      }
    }
  )
}

export type VowelClientType = Vowel | null
