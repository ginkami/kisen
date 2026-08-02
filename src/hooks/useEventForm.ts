import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.tsx'
import type { LayoutOutletContext } from '../components/Layout.tsx'
import { eventService } from '../services/eventService.ts'
import type { Event, EventLocale } from '../domain/event.ts'
import { supportedLocales, type SupportedLocale } from '../domain/locale.ts'
import { normalizeSlug } from '../services/slugService.ts'

const EVENT_QUERY_KEY = 'event'

export interface EventFormState {
  slug: string
  locales: Record<SupportedLocale, EventLocale>
  hostAssociation: string
}

function createEmptyLocale(): EventLocale {
  return { title: '', description: '' }
}

function createEmptyFormState(): EventFormState {
  return {
    slug: '',
    locales: Object.fromEntries(
      supportedLocales.map((locale) => [locale, createEmptyLocale()])
    ) as Record<SupportedLocale, EventLocale>,
    hostAssociation: '',
  }
}

function eventToFormState(event: Event): EventFormState {
  const locales = Object.fromEntries(
    supportedLocales.map((locale) => {
      const src = event.locales[locale]
      return [
        locale,
        {
          title: src?.title ?? '',
          description: src?.description ?? '',
        },
      ]
    })
  ) as Record<SupportedLocale, EventLocale>

  return {
    slug: event.slug,
    locales,
    hostAssociation: event.hostAssociation ?? '',
  }
}

function filterLocalesForSave(locales: Record<SupportedLocale, EventLocale>) {
  return Object.fromEntries(
    supportedLocales
      .filter((locale) => locales[locale].title.trim() !== '')
      .map((locale) => {
        const src = locales[locale]
        const result: Record<string, string> = { title: src.title }
        if (src.description?.trim()) result.description = src.description
        return [locale, result]
      })
  ) as Record<SupportedLocale, EventLocale>
}

function validateEventForm(state: EventFormState): Record<string, string> {
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

export function useEventForm(eventId: string | undefined) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { firebaseUser } = useAuth()
  const { setHasUnsavedChanges } = useOutletContext<LayoutOutletContext>()

  const isNew = eventId === 'new'

  const {
    data: event,
    isLoading: isLoadingEvent,
    error: loadError,
  } = useQuery({
    queryKey: [EVENT_QUERY_KEY, eventId],
    queryFn: async () => {
      if (!eventId || isNew) return null
      return eventService.getById(eventId)
    },
    enabled: !!eventId && !isNew,
    staleTime: 30 * 1000,
  })

  const [formState, setFormState] = useState<EventFormState | null>(
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
    queryKey: ['event', 'slugExists', debouncedSlug],
    queryFn: () => eventService.slugExists(debouncedSlug, !isNew ? eventId : undefined),
    enabled: debouncedSlug.trim().length >= 3,
    staleTime: 10_000,
  })

  const slugTaken = slugExistsResult === true

  // Adjust state during render (React 19 pattern)
  if (event && initializedId !== event.id) {
    setInitializedId(event.id)
    const initial = eventToFormState(event)
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
    (updater: (state: EventFormState) => EventFormState) => {
      setFormState((prev) => (prev ? updater(prev) : prev))
      setValidationErrors({})
    },
    []
  )

  const updateLocale = useCallback(
    (locale: SupportedLocale, field: keyof EventLocale, value: string) => {
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
    <K extends keyof EventFormState>(field: K, value: EventFormState[K]) => {
      updateForm((state) => {
        if (field === 'slug') {
          return { ...state, slug: normalizeSlug(value as string) }
        }
        return { ...state, [field]: value }
      })
    },
    [updateForm]
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formState || !firebaseUser) throw new Error('Form not ready')
      if (isNew) {
        return eventService.create({
          createdBy: firebaseUser.uid,
          hostAssociation: formState.hostAssociation || '',
          // hostAssociation empty string will be converted to null in service
          locales: filterLocalesForSave(formState.locales),
          desiredSlug: formState.slug,
        })
      }
      return eventService.update({
        id: eventId!,
        desiredSlug: formState.slug,
        locales: filterLocalesForSave(formState.locales),
        hostAssociation: formState.hostAssociation || undefined,
      })
    },
    onSuccess: (saved) => {
      queryClient.setQueryData([EVENT_QUERY_KEY, saved.id], saved)
      queryClient.invalidateQueries({ queryKey: ['events'] })
      if (isNew) {
        navigate(`/events/${saved.id}/edit`, { replace: true })
      }
      const snapshot = eventToFormState(saved)
      setFormState(snapshot)
      setLastSavedSnapshot(JSON.stringify(snapshot))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!event) throw new Error('Event not loaded')
      await eventService.delete(event.id)
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [EVENT_QUERY_KEY, eventId] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate('/')
    },
  })

  const save = useCallback(() => {
    if (!formState) return
    const errors = validateEventForm(formState)
    if (slugTaken) {
      errors.slug = 'taken'
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(
        Object.fromEntries(
          Object.entries(errors).map(([key]) => {
            if (key === 'slug' && errors[key] === 'taken') return [key, t('event.edit.slugTaken')]
            return [key, t('common.fieldRequired')]
          })
        )
      )
      return
    }
    saveMutation.reset()
    saveMutation.mutate()
  }, [formState, saveMutation, t, slugTaken])

  const deleteEvent = useCallback(() => {
    deleteMutation.reset()
    deleteMutation.mutate()
  }, [deleteMutation])

  return {
    event,
    formState,
    isLoading: isLoadingEvent && !formState,
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
    save,
    deleteEvent,
    isNew,
    slugTaken,
  }
}