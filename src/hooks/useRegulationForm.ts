import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.tsx'
import type { LayoutOutletContext } from '../components/Layout.tsx'
import { regulationService } from '../services/regulationService.ts'
import type { Regulation, RegulationLocale } from '../domain/regulation.ts'
import { supportedLocales, type SupportedLocale } from '../domain/locale.ts'

const REGULATION_QUERY_KEY = 'regulation'

export interface RegulationFormState {
  association: string
  locales: Record<SupportedLocale, RegulationLocale>
}

function createEmptyLocale(): RegulationLocale {
  return { title: '', description: '' }
}

function createEmptyFormState(): RegulationFormState {
  return {
    association: '',
    locales: Object.fromEntries(
      supportedLocales.map((locale) => [locale, createEmptyLocale()])
    ) as Record<SupportedLocale, RegulationLocale>,
  }
}

function regulationToFormState(regulation: Regulation): RegulationFormState {
  const locales = Object.fromEntries(
    supportedLocales.map((locale) => {
      const src = regulation.locales[locale]
      return [locale, { title: src?.title ?? '', description: src?.description ?? '' }]
    })
  ) as Record<SupportedLocale, RegulationLocale>
  return { association: regulation.association ?? '', locales }
}

function filterLocalesForSave(locales: Record<SupportedLocale, RegulationLocale>) {
  return Object.fromEntries(
    supportedLocales
      .filter((locale) => locales[locale].title.trim() !== '')
      .map((locale) => {
        const src = locales[locale]
        const result: Record<string, string> = { title: src.title }
        if (src.description?.trim()) result.description = src.description
        return [locale, result]
      })
  ) as Record<SupportedLocale, RegulationLocale>
}

function validateRegulationForm(state: RegulationFormState): Record<string, string> {
  const errors: Record<string, string> = {}
  const hasTitle = supportedLocales.some((locale) => state.locales[locale].title.trim() !== '')
  if (!hasTitle) errors.title = 'required'
  return errors
}
export function useRegulationForm(regulationId: string | undefined) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { firebaseUser } = useAuth()
  const { setHasUnsavedChanges } = useOutletContext<LayoutOutletContext>()

  const isNew = regulationId === 'new'

  const { data: regulation, isLoading: isLoadingRegulation, error: loadError } = useQuery({
    queryKey: [REGULATION_QUERY_KEY, regulationId],
    queryFn: async () => {
      if (!regulationId || isNew) return null
      return regulationService.getById(regulationId)
    },
    enabled: !!regulationId && !isNew,
    staleTime: 30 * 1000,
  })

  const [formState, setFormState] = useState<RegulationFormState | null>(isNew ? createEmptyFormState() : null)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(isNew ? JSON.stringify(createEmptyFormState()) : null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (regulation && !formState) {
      const state = regulationToFormState(regulation)
      setFormState(state)
      setLastSavedSnapshot(JSON.stringify(state))
    }
  }, [regulation, formState])

  const isDirty = useMemo(() => {
    if (!formState || !lastSavedSnapshot) return false
    return JSON.stringify(formState) !== lastSavedSnapshot
  }, [formState, lastSavedSnapshot])

  useEffect(() => { setHasUnsavedChanges(isDirty) }, [isDirty, setHasUnsavedChanges])

  const updateForm = useCallback((updater: (prev: RegulationFormState) => RegulationFormState) => {
    setFormState((prev) => (prev ? updater(prev) : prev))
    setValidationErrors({})
  }, [])

  const updateLocale = useCallback((locale: SupportedLocale, field: keyof RegulationLocale, value: string) => {
    updateForm((state) => ({ ...state, locales: { ...state.locales, [locale]: { ...state.locales[locale], [field]: value } } }))
  }, [updateForm])

  const updateBasic = useCallback(<K extends keyof RegulationFormState>(field: K, value: RegulationFormState[K]) => {
    updateForm((state) => ({ ...state, [field]: value }))
  }, [updateForm])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formState || !firebaseUser) throw new Error('Form not ready')
      if (isNew) {
        return regulationService.create({ createdBy: firebaseUser.uid, association: formState.association || null, locales: filterLocalesForSave(formState.locales) })
      }
      return regulationService.update({ id: regulationId!, locales: filterLocalesForSave(formState.locales), association: formState.association || null })
    },
    onSuccess: (saved) => {
      queryClient.setQueryData([REGULATION_QUERY_KEY, saved.id], saved)
      queryClient.invalidateQueries({ queryKey: ['regulations'] })
      if (isNew) navigate(`/regulations/${saved.id}/edit`, { replace: true })
      const snapshot = regulationToFormState(saved)
      setFormState(snapshot)
      setLastSavedSnapshot(JSON.stringify(snapshot))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!regulation) throw new Error('Regulation not loaded')
      await regulationService.delete(regulation.id)
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [REGULATION_QUERY_KEY, regulationId] })
      queryClient.invalidateQueries({ queryKey: ['regulations'] })
      navigate('/')
    },
  })

  const save = useCallback(() => {
    if (!formState) return
    const errors = validateRegulationForm(formState)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(Object.fromEntries(Object.entries(errors).map(([key]) => [key, t('common.fieldRequired')])))
      return
    }
    saveMutation.reset()
    saveMutation.mutate()
  }, [formState, saveMutation, t])

  const deleteRegulation = useCallback(() => { deleteMutation.reset(); deleteMutation.mutate() }, [deleteMutation])

  return {
    regulation, formState,
    isLoading: isLoadingRegulation && !formState, loadError, isDirty,
    isSaving: saveMutation.isPending, isDeleting: deleteMutation.isPending,
    saveError: saveMutation.error, deleteError: deleteMutation.error,
    validationErrors,
    clearSaveError: saveMutation.reset, clearDeleteError: deleteMutation.reset,
    updateLocale, updateBasic, save, deleteRegulation, isNew,
  }
}