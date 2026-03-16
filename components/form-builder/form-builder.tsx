'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Form, QuestionConfig, ThemePreset, FormStatus } from '@/lib/database.types'
import { questionTypes, createDefaultQuestion } from '@/lib/questions'
import { themes, themeList } from '@/lib/themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Save,
  Globe,
  X,
  ExternalLink,
  Copy,
  Settings,
  Palette,
  FileText,
  Pencil,
} from 'lucide-react'
import Link from 'next/link'
import { QuestionEditor } from './question-editor'
import { FormPreview } from './form-preview'
import { updateVowelContext } from '@/lib/vowel/vowel.client'

interface FormBuilderProps {
  form: Form
}

export function FormBuilder({ form: initialForm }: FormBuilderProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [form, setForm] = useState(initialForm)
  const [questions, setQuestions] = useState<QuestionConfig[]>(
    (initialForm.questions as QuestionConfig[]) || []
  )
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null)
  const [questionToDeleteTitle, setQuestionToDeleteTitle] = useState('')
  const [activeTab, setActiveTab] = useState('questions')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId)

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    const updateData = {
      title: form.title,
      description: form.description,
      slug: form.slug,
      theme: form.theme,
      questions: questions,
      thank_you_message: form.thank_you_message,
    }
    const { error } = await supabase
      .from('forms')
      .update(updateData as never)
      .eq('id', form.id)

    if (error) {
      toast.error('Failed to save form')
    } else {
      toast.success('Form saved')
      setHasUnsavedChanges(false)
    }
    setIsSaving(false)
  }, [supabase, form, questions])

  const handlePublish = async () => {
    if (questions.length === 0) {
      toast.error('Add at least one question before publishing')
      return
    }

    setIsSaving(true)
    const newStatus: FormStatus = form.status === 'published' ? 'closed' : 'published'
    
    const updateData = {
      status: newStatus,
      questions: questions,
      title: form.title,
      description: form.description,
      slug: form.slug,
      theme: form.theme,
      thank_you_message: form.thank_you_message,
    }
    const { error } = await supabase
      .from('forms')
      .update(updateData as never)
      .eq('id', form.id)

    if (error) {
      toast.error('Failed to update form status')
    } else {
      setForm({ ...form, status: newStatus })
      toast.success(newStatus === 'published' ? 'Form published!' : 'Form unpublished')
      setShowPublishDialog(false)
      setHasUnsavedChanges(false)
    }
    setIsSaving(false)
  }

  const addQuestion = useCallback((type: QuestionConfig['type']) => {
    const newQuestion = createDefaultQuestion(type)
    setQuestions((prev) => [...prev, newQuestion])
    setSelectedQuestionId(newQuestion.id)
    setShowAddQuestion(false)
    setHasUnsavedChanges(true)
  }, [])

  const updateQuestion = useCallback((id: string, updates: Partial<QuestionConfig>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    )
    setHasUnsavedChanges(true)
  }, [])

  /** Expose form builder state for Vowel voice actions (editQuestion). */
  useEffect(() => {
    if (typeof window === 'undefined') return
    ;(
      window as unknown as {
        __openform?: {
          selectedQuestionId: string | null
          selectedQuestionIndex: number | null
          questions: { id: string; type: string; title: string }[]
        }
      }
    ).__openform = {
      selectedQuestionId,
      selectedQuestionIndex: selectedQuestionId
        ? questions.findIndex((q) => q.id === selectedQuestionId) + 1 || null
        : null,
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        title: q.title || '',
      })),
    }
    updateVowelContext(window.location.pathname)
    return () => {
      delete (window as unknown as { __openform?: unknown }).__openform
    }
  }, [selectedQuestionId, questions])

  /** Listen for Vowel voice commands: "add a question" opens dialog, "add [type]" adds and closes, "edit question" updates fields, "delete question" opens confirm dialog. */
  useEffect(() => {
    const onOpenDialog = () => setShowAddQuestion(true)
    const onAddByType = (e: Event) => {
      const { type, title, description, placeholder, required } = (
        e as CustomEvent<{
          type: string | null
          title?: string
          description?: string
          placeholder?: string
          required?: boolean
        }>
      ).detail
      if (type) {
        const newQuestion = createDefaultQuestion(type as QuestionConfig['type'])
        // Apply optional fields if provided
        if (title !== undefined) newQuestion.title = title
        if (description !== undefined) newQuestion.description = description
        if (placeholder !== undefined) newQuestion.placeholder = placeholder
        if (required !== undefined) newQuestion.required = required
        setQuestions((prev) => [...prev, newQuestion])
        setSelectedQuestionId(newQuestion.id)
        setShowAddQuestion(false)
        setHasUnsavedChanges(true)
      }
    }
    const onEditQuestion = (e: Event) => {
      const { questionId, title, description, placeholder, required } = (
        e as CustomEvent<{
          questionId: string
          title?: string
          description?: string
          placeholder?: string
          required?: boolean
        }>
      ).detail
      if (!questionId) return
      const updates: Partial<QuestionConfig> = {}
      if (title !== undefined) updates.title = title
      if (description !== undefined) updates.description = description
      if (placeholder !== undefined) updates.placeholder = placeholder
      if (required !== undefined) updates.required = required
      if (Object.keys(updates).length > 0) {
        updateQuestion(questionId, updates)
        setSelectedQuestionId(questionId)
      }
    }
    const onRequestDelete = (e: Event) => {
      const { questionId, questionTitle } = (
        e as CustomEvent<{
          questionId: string
          questionTitle: string
          questionIndex: number
        }>
      ).detail
      if (questionId) {
        setQuestionToDelete(questionId)
        setQuestionToDeleteTitle(questionTitle || 'Untitled question')
        setShowDeleteConfirm(true)
      }
    }
    const onConfirmDelete = () => {
      if (questionToDelete) {
        deleteQuestion(questionToDelete)
        setShowDeleteConfirm(false)
        setQuestionToDelete(null)
        toast.success('Question deleted')
      }
    }
    const onCancelDelete = () => {
      setShowDeleteConfirm(false)
      setQuestionToDelete(null)
      toast.info('Delete cancelled')
    }
    window.addEventListener('openform:openAddQuestionDialog', onOpenDialog)
    window.addEventListener('openform:addQuestionByType', onAddByType as EventListener)
    window.addEventListener('openform:editQuestion', onEditQuestion as EventListener)
    window.addEventListener('openform:requestDeleteQuestion', onRequestDelete as EventListener)
    window.addEventListener('openform:confirmDeleteQuestion', onConfirmDelete)
    window.addEventListener('openform:cancelDeleteQuestion', onCancelDelete)
    return () => {
      window.removeEventListener('openform:openAddQuestionDialog', onOpenDialog)
      window.removeEventListener('openform:addQuestionByType', onAddByType as EventListener)
      window.removeEventListener('openform:editQuestion', onEditQuestion as EventListener)
      window.removeEventListener('openform:requestDeleteQuestion', onRequestDelete as EventListener)
      window.removeEventListener('openform:confirmDeleteQuestion', onConfirmDelete)
      window.removeEventListener('openform:cancelDeleteQuestion', onCancelDelete)
    }
  }, [addQuestion, updateQuestion, questionToDelete])

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
    if (selectedQuestionId === id) {
      setSelectedQuestionId(null)
    }
    setHasUnsavedChanges(true)
  }

  const handleReorder = (newOrder: QuestionConfig[]) => {
    setQuestions(newOrder)
    setHasUnsavedChanges(true)
  }

  const copyFormLink = () => {
    const link = `${window.location.origin}/f/${form.slug}`
    navigator.clipboard.writeText(link)
    toast.success('Link copied to clipboard')
  }

  const currentTheme = themes[form.theme as ThemePreset] || themes.minimal

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div className="group relative flex items-center">
            <Input
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value })
                setHasUnsavedChanges(true)
              }}
              className="text-lg font-semibold border-0 border-b-2 border-transparent bg-transparent rounded-none focus-visible:ring-0 focus-visible:border-blue-500 hover:border-slate-300 px-1 pr-7 max-w-xs transition-colors"
              placeholder="Untitled Form"
            />
            <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-0 transition-opacity pointer-events-none" />
          </div>
          {form.status === 'published' && (
            <Badge className="bg-emerald-100 text-emerald-700">Published</Badge>
          )}
          {form.status === 'draft' && (
            <Badge variant="secondary">Draft</Badge>
          )}
          {form.status === 'closed' && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">Closed</Badge>
          )}
          {hasUnsavedChanges && (
            <span className="text-sm text-slate-500">Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {form.status === 'published' && (
            <>
              <Button variant="outline" size="sm" onClick={copyFormLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copy link
              </Button>
              <Link href={`/f/${form.slug}`} target="_blank">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View
                </Button>
              </Link>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            size="sm"
            onClick={() => setShowPublishDialog(true)}
            className={form.status === 'published' 
              ? 'bg-amber-500 hover:bg-amber-600' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'
            }
          >
            <Globe className="w-4 h-4 mr-2" />
            {form.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col overflow-hidden">
            <div className="shrink-0 p-2 border-b border-slate-100">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="questions" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  Questions
                </TabsTrigger>
                <TabsTrigger value="design" className="text-xs">
                  <Palette className="w-3 h-3 mr-1" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="questions" className="flex-1 flex flex-col mt-0 overflow-hidden data-[state=inactive]:hidden">
              <div className="shrink-0 p-4 border-b border-slate-100">
                <Button 
                  onClick={() => setShowAddQuestion(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {questions.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">No questions yet</p>
                      <p className="text-xs text-slate-400 mt-1">Add your first question to get started</p>
                    </div>
                  ) : (
                    <Reorder.Group axis="y" values={questions} onReorder={handleReorder}>
                      <AnimatePresence>
                        {questions.map((question, index) => (
                          <Reorder.Item key={question.id} value={question}>
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={`
                                group p-3 rounded-lg cursor-pointer mb-2 border transition-all
                                ${selectedQuestionId === question.id 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'bg-white border-slate-100 hover:border-slate-200'
                                }
                              `}
                              onClick={() => setSelectedQuestionId(question.id)}
                            >
                              <div className="flex items-start gap-2">
                                <div className="mt-1 cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-4 h-4 text-slate-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-slate-400">
                                      {index + 1}
                                    </span>
                                    <span className="text-xs text-slate-400 capitalize">
                                      {question.type.replace('_', ' ')}
                                    </span>
                                    {question.required && (
                                      <span className="text-xs text-red-500">*</span>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-slate-900 truncate">
                                    {question.title || 'Untitled question'}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteQuestion(question.id)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                                </Button>
                              </div>
                            </motion.div>
                          </Reorder.Item>
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="design" className="flex-1 mt-0 overflow-auto data-[state=inactive]:hidden">
              <div className="p-4 space-y-6">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Theme</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {themeList.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setForm({ ...form, theme: theme.id })
                          setHasUnsavedChanges(true)
                        }}
                        className={`
                          p-3 rounded-lg border-2 transition-all text-left
                          ${form.theme === theme.id 
                            ? 'border-blue-500 ring-2 ring-blue-200' 
                            : 'border-slate-200 hover:border-slate-300'
                          }
                        `}
                      >
                        <div 
                          className="w-full h-8 rounded mb-2"
                          style={{ backgroundColor: theme.backgroundColor }}
                        >
                          <div 
                            className="w-1/2 h-full rounded-l flex items-center justify-center"
                            style={{ backgroundColor: theme.primaryColor }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 mt-0 overflow-auto data-[state=inactive]:hidden">
              <div className="p-4 space-y-6">
                <div>
                  <Label htmlFor="slug" className="text-sm font-medium">Form URL</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-slate-500">/f/</span>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => {
                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                        setForm({ ...form, slug })
                        setHasUnsavedChanges(true)
                      }}
                      className="flex-1"
                      placeholder="my-form"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description || ''}
                    onChange={(e) => {
                      setForm({ ...form, description: e.target.value })
                      setHasUnsavedChanges(true)
                    }}
                    className="mt-2"
                    placeholder="Optional form description..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="thank_you" className="text-sm font-medium">Thank You Message</Label>
                  <Textarea
                    id="thank_you"
                    value={form.thank_you_message}
                    onChange={(e) => {
                      setForm({ ...form, thank_you_message: e.target.value })
                      setHasUnsavedChanges(true)
                    }}
                    className="mt-2"
                    placeholder="Thank you for your response!"
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Preview / Editor area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Question Editor */}
          {selectedQuestion && (
            <div className="w-96 bg-white border-r border-slate-200 overflow-auto">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-medium">Edit Question</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedQuestionId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <QuestionEditor
                question={selectedQuestion}
                onUpdate={(updates) => updateQuestion(selectedQuestion.id, updates)}
                onDelete={() => deleteQuestion(selectedQuestion.id)}
              />
            </div>
          )}

          {/* Preview */}
          <div className="flex-1 overflow-auto bg-slate-100 p-8">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600">Preview</span>
                </div>
                <div 
                  className="min-h-[500px]"
                  style={{ 
                    backgroundColor: currentTheme.backgroundColor,
                    fontFamily: currentTheme.fontFamily 
                  }}
                >
                  <FormPreview 
                    questions={questions}
                    theme={currentTheme}
                    selectedQuestionId={selectedQuestionId}
                    onSelectQuestion={setSelectedQuestionId}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Question Dialog */}
      <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>
              Choose a question type to add to your form
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-4">
            {questionTypes.map((qt) => (
              <button
                key={qt.type}
                onClick={() => addQuestion(qt.type)}
                className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
              >
                <qt.icon className="w-6 h-6 text-slate-400 group-hover:text-blue-600 mb-2" />
                <p className="font-medium text-sm text-slate-900">{qt.label}</p>
                <p className="text-xs text-slate-500 mt-1">{qt.description}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.status === 'published' ? 'Unpublish form?' : 'Publish form?'}
            </DialogTitle>
            <DialogDescription>
              {form.status === 'published'
                ? 'This will make your form inaccessible to respondents. Existing responses will be kept.'
                : 'Your form will be accessible at:'
              }
            </DialogDescription>
          </DialogHeader>
          {form.status !== 'published' && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <code className="text-sm text-blue-600">
                {typeof window !== 'undefined' ? window.location.origin : ''}/f/{form.slug}
              </code>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isSaving}
              className={form.status === 'published'
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'
              }
            >
              {isSaving ? 'Saving...' : form.status === 'published' ? 'Unpublish' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Question Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Question?
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete this question?
              <p className="font-medium text-slate-900 mt-2 bg-slate-50 p-2 rounded">
                &ldquo;{questionToDeleteTitle}&rdquo;
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false)
                setQuestionToDelete(null)
                // Also trigger the cancel event for Vowel
                window.dispatchEvent(new CustomEvent('openform:cancelDeleteQuestion'))
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (questionToDelete) {
                  deleteQuestion(questionToDelete)
                  setShowDeleteConfirm(false)
                  setQuestionToDelete(null)
                  toast.success('Question deleted')
                }
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
          <p className="text-xs text-slate-500 text-center pt-2 border-t">
            Say &ldquo;yes&rdquo; or &ldquo;confirm&rdquo; to delete, or &ldquo;no&rdquo; / &ldquo;cancel&rdquo; to keep it.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
