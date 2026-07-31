import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.tsx'
import type { LayoutOutletContext } from '../components/Layout.tsx'
import { associationService } from '../services/associationService.ts'
import { getByIds, getUserById } from '../services/userService.ts'
import type { Association, AssociationLocale } from '../domain/association.ts'
import { supportedLocales, type SupportedLocale } from '../domain/locale.ts'
import type { User } from '../types/user.ts'
import { normalizeSlug } from '../services/slugService.ts'

const ASSOCIATION_QUERY_KEY = 'association'

export interface AssociationFormState {
  slug: string
  locales: Record<SupportedLocale, AssociationLocale>
  country: string
  managers: string[]
  pendingInvites: string[]
}

function createEmptyLocale(): AssociationLocale {
  return { title: '', description: '', location: '' }
}

function createEmptyFormState(): AssociationFormState {
  return {
    slug: '',
    locales: Object.fromEntries(
      supportedLocales.map((locale) => [locale, createEmptyLocale()])
    ) as Record<SupportedLocale, AssociationLocale>,
    country: '',
    managers: [],
    pendingInvites: [],
  }
}

function associationToFormState(association: Association): AssociationFormState {
  const locales = Object.fromEntries(
    supportedLocales.map((locale) => {
      const src = association.locales[locale]
      return [
        locale,
        {
          title: src?.title ?? '',
          description: src?.description ?? '',
          location: src?.location ?? '',
        },
      ]
    })
  ) as Record<SupportedLocale, AssociationLocale>

  return {
    slug: association.slug,
    locales,
    country: association.country ?? '',
    managers: [...association.managers],
    pendingInvites: [...association.pendingInvites],
  }
}

function filterLocalesForSave(locales: Record<SupportedLocale, AssociationLocale>) {
  return Object.fromEntries(
    supportedLocales
      .filter((locale) => locales[locale].title.trim() !== '')
      .map((locale) => {
        const src = locales[locale]
        const result: Record<string, string> = { title: src.title }
        if (src.description?.trim()) result.description = src.description
        if (src.location?.trim()) result.location = src.location
        return [locale, result]
      })
  ) as Record<SupportedLocale, AssociationLocale>
}

function validateAssociationForm(state: AssociationFormState): Record<string, string> {
  const errors: Record<string, string> = {}

  const hasTitle = supportedLocales.some(
    (locale) => state.locales[locale].title.trim() !== ''
  )
  if (!hasTitle) {
    errors.title = 'required'
  }

  if (!state.slug.trim()) {
    errors.slug = 'required'
  }

  return errors
}

export function useAssociationForm(associationId: string | undefined) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { firebaseUser } = useAuth()
  const { setHasUnsavedChanges } = useOutletContext<LayoutOutletContext>()

  const isNew = associationId === 'new'

  const {
    data: association,
    isLoading: isLoadingAssociation,
    error: loadError,
  } = useQuery({
    queryKey: [ASSOCIATION_QUERY_KEY, associationId],
    queryFn: async () => {
      if (!associationId || isNew) return null
      return associationService.getById(associationId)
    },
    enabled: !!associationId && !isNew,
    staleTime: 30 * 1000,
  })

  const [formState, setFormState] = useState<AssociationFormState | null>(
    isNew ? createEmptyFormState() : null
  )
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(
    isNew ? JSON.stringify(createEmptyFormState()) : null
  )
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [initializedId, setInitializedId] = useState<string | null>(null)

  // Debounced slug uniqueness check
  const [debouncedSlug, setDebouncedSlug] = useState('')
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formSlug = formState?.slug ?? ''

  useEffect(() => {
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
    slugTimerRef.current = setTimeout(() => {
      setDebouncedSlug(formSlug)
    }, 300)
    return () => {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
    }
  }, [formSlug])

  const { data: slugExistsResult } = useQuery({
    queryKey: ['association', 'slugExists', debouncedSlug],
    queryFn: () => associationService.slugExists(debouncedSlug, !isNew ? associationId : undefined),
    enabled: debouncedSlug.trim().length >= 3,
    staleTime: 10_000,
  })

  const slugTaken = slugExistsResult === true

  // Adjust state during render (React 19 pattern)
  if (association && initializedId !== association.id) {
    setInitializedId(association.id)
    const initial = associationToFormState(association)
    setFormState(initial)
    setLastSavedSnapshot(JSON.stringify(initial))
  }

  const isDirty = useMemo(() => {
    if (!formState || !lastSavedSnapshot) return false
    return JSON.stringify(formState) !== lastSavedSnapshot
  }, [formState, lastSavedSnapshot])

  useEffect(() => {
    setHasUnsavedChanges(isDirty)
  }, [isDirty, setHasUnsavedChanges])

  const updateForm = useCallback(
    (updater: (state: AssociationFormState) => AssociationFormState) => {
      setFormState((prev) => (prev ? updater(prev) : prev))
      setValidationErrors({})
    },
    []
  )

  const updateLocale = useCallback(
    (locale: SupportedLocale, field: keyof AssociationLocale, value: string) => {
      updateForm((state) => ({
        ...state,
        locales: {
          ...state.locales,
          [locale]: { ...state.locales[locale], [field]: value },
        },
      }))
    },
    [updateForm]
  )

  const updateBasic = useCallback(
    <K extends keyof AssociationFormState>(field: K, value: AssociationFormState[K]) => {
      updateForm((state) => {
        if (field === 'slug') {
          return { ...state, slug: normalizeSlug(value as string) }
        }
        return { ...state, [field]: value }
      })
    },
    [updateForm]
  )

  const addManager = useCallback(
    (userId: string) => {
      updateForm((state) => {
        if (state.managers.includes(userId)) return state
        return { ...state, managers: [...state.managers, userId] }
      })
    },
    [updateForm]
  )

  const removeManager = useCallback(
    (userId: string) => {
      updateForm((state) => ({
        ...state,
        managers: state.managers.filter((id) => id !== userId),
      }))
    },
    [updateForm]
  )

  const addPendingInvite = useCallback(
    (email: string) => {
      updateForm((state) => {
        if (state.pendingInvites.includes(email)) return state
        return { ...state, pendingInvites: [...state.pendingInvites, email] }
      })
    },
    [updateForm]
  )

  const removePendingInvite = useCallback(
    (email: string) => {
      updateForm((state) => ({
        ...state,
        pendingInvites: state.pendingInvites.filter((e) => e !== email),
      }))
    },
    [updateForm]
  )

  // Load manager profiles
  const managerIds = formState?.managers ?? []
  const { data: managerProfiles = [] } = useQuery<User[]>({
    queryKey: ['users', 'profiles', ...managerIds],
    queryFn: () => getByIds(managerIds),
    enabled: managerIds.length > 0,
    staleTime: 60_000,
  })

  const creatorId = association?.createdBy
  const { data: creatorProfile } = useQuery<User | null>({
    queryKey: ['users', 'profile', creatorId],
    queryFn: () => getUserById(creatorId!),
    enabled: !!creatorId,
    staleTime: 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formState || !firebaseUser) throw new Error('Form not ready')
      if (isNew) {
        return associationService.create({
          createdBy: firebaseUser.uid,
          locales: filterLocalesForSave(formState.locales),
          country: formState.country || undefined,
          managers: formState.managers,
          pendingInvites: formState.pendingInvites,
          desiredSlug: formState.slug,
        })
      }
      return associationService.update({
        id: associationId!,
        slug: formState.slug,
        locales: filterLocalesForSave(formState.locales),
        country: formState.country || undefined,
        managers: formState.managers,
        pendingInvites: formState.pendingInvites,
        existing: association!,
      })
    },
    onSuccess: (saved) => {
      queryClient.setQueryData([ASSOCIATION_QUERY_KEY, saved.id], saved)
      queryClient.invalidateQueries({ queryKey: ['associations'] })
      if (isNew) {
        navigate(`/assn/${saved.id}/edit`, { replace: true })
      }
      const snapshot = associationToFormState(saved)
      setFormState(snapshot)
      setLastSavedSnapshot(JSON.stringify(snapshot))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!association) throw new Error('Association not loaded')
      await associationService.delete(association.id)
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [ASSOCIATION_QUERY_KEY, associationId] })
      queryClient.invalidateQueries({ queryKey: ['associations'] })
      navigate('/')
    },
  })

  const save = useCallback(() => {
    if (!formState) return
    const errors = validateAssociationForm(formState)
    if (slugTaken) {
      errors.slug = 'taken'
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(
        Object.fromEntries(
          Object.entries(errors).map(([key]) => {
            if (key === 'slug' && errors[key] === 'taken') return [key, t('association.edit.slugTaken')]
            return [key, t('common.fieldRequired')]
          })
        )
      )
      return
    }
    saveMutation.reset()
    saveMutation.mutate()
  }, [formState, saveMutation, t, slugTaken])

  const deleteAssociation = useCallback(() => {
    deleteMutation.reset()
    deleteMutation.mutate()
  }, [deleteMutation])

  return {
    association,
    formState,
    isLoading: isLoadingAssociation && !formState,
    loadError,
    isDirty,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    saveError: saveMutation.error,
    deleteError: deleteMutation.error,
    validationErrors,
    clearSaveError: saveMutation.reset,
    clearDeleteError: deleteMutation.reset,
    updateLocale,
    updateBasic,
    addManager,
    removeManager,
    addPendingInvite,
    removePendingInvite,
    save,
    deleteAssociation,
    managerProfiles,
    creatorProfile,
    isNew,
    slugTaken,
  }
}