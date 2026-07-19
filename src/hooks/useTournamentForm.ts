import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext.tsx'
import type { LayoutOutletContext } from '../components/Layout.tsx'
import { tournamentService } from '../services/tournamentService.ts'
import type {
  Tournament,
  TournamentLocale,
  TournamentSchedule,
  TournamentSettings,
} from '../domain/tournament.ts'
import { publishedTournamentSchema } from '../domain/tournament.ts'
import { normalizeSlug } from '../services/slugService.ts'
import { supportedLocales, type SupportedLocale } from '../domain/locale.ts'
import type { TimeControlFormat } from '../domain/timeControl.ts'
import type { TieBreak, TieBreakType } from '../domain/tieBreak.ts'

export interface TournamentFormState {
  slug: string
  parentEvent: string | null
  hostAssociation: string | null
  locales: Record<SupportedLocale, TournamentLocale>
  country: string
  arbiter: Record<SupportedLocale, { givenName: string; familyName: string }>
  settings: TournamentSettings
  schedule: TournamentSchedule
}

function createEmptyLocale(): TournamentLocale {
  return { title: '', description: '', location: '', venue: '' }
}

function createEmptyArbiter(): TournamentFormState['arbiter'] {
  return Object.fromEntries(
    supportedLocales.map((locale) => [locale, { givenName: '', familyName: '' }])
  ) as TournamentFormState['arbiter']
}

function tournamentToFormState(tournament: Tournament): TournamentFormState {
  const locales = Object.fromEntries(
    supportedLocales.map((locale) => [locale, createEmptyLocale()])
  ) as Record<SupportedLocale, TournamentLocale>

  for (const locale of supportedLocales) {
    const source = tournament.locales[locale]
    if (source) {
      locales[locale] = {
        ...createEmptyLocale(),
        ...source,
      }
    }
  }

  return {
    slug: tournament.slug,
    parentEvent: tournament.parentEvent,
    hostAssociation: tournament.hostAssociation,
    locales,
    country: tournament.country,
    arbiter: (() => {
      const arbiter = tournament.arbiter
      if (!arbiter) return createEmptyArbiter()
      return Object.fromEntries(
        supportedLocales.map((locale) => [
          locale,
          {
            givenName: arbiter.locales[locale]?.givenName ?? '',
            familyName: arbiter.locales[locale]?.familyName ?? '',
          },
        ])
      ) as TournamentFormState['arbiter']
    })(),
    settings: tournament.settings,
    schedule: {
      events: tournament.schedule.events,
      rounds: [...tournament.schedule.rounds].sort(
        (a, b) => a.number - b.number
      ),
    },
  }
}

function formStateToUpdateInput(
  tournament: Tournament,
  state: TournamentFormState
) {
  const input: {
    id: string
    locales: Tournament['locales']
    country: string
    settings: TournamentSettings
    schedule: TournamentSchedule
    parentEvent: string | null
    hostAssociation: string | null
    arbiter?: Tournament['arbiter']
    desiredSlug?: string
  } = {
    id: tournament.id,
    locales: state.locales as Tournament['locales'],
    country: state.country,
    settings: state.settings,
    schedule: state.schedule,
    parentEvent: state.parentEvent,
    hostAssociation: state.hostAssociation,
  }

  if (state.slug !== tournament.slug) {
    input.desiredSlug = state.slug
  }

  const hasArbiter = supportedLocales.some(
    (locale) =>
      state.arbiter[locale].givenName.trim() ||
      state.arbiter[locale].familyName.trim()
  )
  if (hasArbiter) {
    input.arbiter = {
      locales: Object.fromEntries(
        supportedLocales.map((locale) => [
          locale,
          {
            givenName: state.arbiter[locale].givenName,
            familyName: state.arbiter[locale].familyName,
          },
        ])
      ) as NonNullable<Tournament['arbiter']>['locales'],
    }
  }

  return input
}

function normalizeState(state: TournamentFormState): TournamentFormState {
  return {
    ...state,
    schedule: {
      ...state.schedule,
      rounds: [...state.schedule.rounds].sort((a, b) => a.number - b.number),
    },
  }
}

const TOURNAMENT_QUERY_KEY = 'tournament'

export function useTournamentForm(tournamentId: string | undefined) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { firebaseUser, user } = useAuth()
  const { setHasUnsavedChanges } = useOutletContext<LayoutOutletContext>()

  const creatingDraftRef = useRef(false)

  const {
    data: tournament,
    isLoading: isLoadingTournament,
    error: loadError,
  } = useQuery({
    queryKey: [TOURNAMENT_QUERY_KEY, tournamentId],
    queryFn: async () => {
      if (!tournamentId || tournamentId === 'new') return null
      return tournamentService.getById(tournamentId)
    },
    enabled: !!tournamentId && tournamentId !== 'new',
    staleTime: 30 * 1000,
  })

  const [formState, setFormState] = useState<TournamentFormState | null>(null)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null)
  const [createError, setCreateError] = useState<Error | null>(null)
  const [createDraftRetryCount, setCreateDraftRetryCount] = useState(0)

  useEffect(() => {
    if (
      tournamentId === 'new' &&
      firebaseUser &&
      user !== undefined &&
      !creatingDraftRef.current
    ) {
      creatingDraftRef.current = true
      setCreateError(null)

      const arbiter = user?.locales
        ? {
            locales: Object.fromEntries(
              supportedLocales.map((locale) => [
                locale,
                {
                  givenName: user.locales[locale].givenName ?? '',
                  familyName: user.locales[locale].familyName ?? '',
                },
              ])
            ) as NonNullable<Tournament['arbiter']>['locales'],
          }
        : undefined

      tournamentService
        .createDraft({
          createdBy: firebaseUser.uid,
          initialLocale: i18n.language,
          arbiter,
        })
        .then((created) => {
          queryClient.invalidateQueries({ queryKey: ['adminTournaments'] })
          navigate(`/tournaments/${created.id}/edit`, { replace: true })
        })
        .catch((err) => {
          creatingDraftRef.current = false
          setCreateError(
            err instanceof Error ? err : new Error(String(err))
          )
        })
    }
  }, [tournamentId, firebaseUser, user, i18n.language, navigate, createDraftRetryCount])

  useEffect(() => {
    setCreateError(null)
  }, [tournamentId])

  useEffect(() => {
    if (tournament) {
      const initial = tournamentToFormState(tournament)
      setFormState(initial)
      setLastSavedSnapshot(JSON.stringify(initial))
    }
  }, [tournament])

  const isDirty = useMemo(() => {
    if (!formState || !lastSavedSnapshot) return false
    return JSON.stringify(formState) !== lastSavedSnapshot
  }, [formState, lastSavedSnapshot])

  useEffect(() => {
    setHasUnsavedChanges(isDirty)
  }, [isDirty, setHasUnsavedChanges])

  const clearCreateError = useCallback(() => setCreateError(null), [])

  const retryCreateDraft = useCallback(() => {
    creatingDraftRef.current = false
    setCreateError(null)
    setCreateDraftRetryCount((c) => c + 1)
  }, [])

  const updateForm = useCallback(
    (updater: (state: TournamentFormState) => TournamentFormState) => {
      setFormState((prev) => (prev ? normalizeState(updater(prev)) : prev))
    },
    []
  )

  const updateLocale = useCallback(
    (
      locale: SupportedLocale,
      field: keyof TournamentLocale,
      value: string
    ) => {
      updateForm((state) => {
        const next: TournamentFormState = {
          ...state,
          locales: {
            ...state.locales,
            [locale]: { ...state.locales[locale], [field]: value },
          },
        }
        return next
      })
    },
    [updateForm]
  )

  const updateBasic = useCallback(
    <K extends keyof TournamentFormState>(
      field: K,
      value: TournamentFormState[K]
    ) => {
      updateForm((state) => {
        if (field === 'slug') {
          return { ...state, slug: normalizeSlug(value as string) }
        }
        return { ...state, [field]: value }
      })
    },
    [updateForm]
  )

  const updateArbiter = useCallback(
    (
      locale: SupportedLocale,
      field: 'givenName' | 'familyName',
      value: string
    ) => {
      updateForm((state) => {
        const next: TournamentFormState = {
          ...state,
          arbiter: {
            ...state.arbiter,
            [locale]: { ...state.arbiter[locale], [field]: value },
          },
        }
        return next
      })
    },
    [updateForm]
  )

  const updateTimeControlType = useCallback(
    (type: TimeControlFormat) => {
      updateForm((state) => {
        const mainTime = state.settings.timeControl.mainTime
        let timeControl: TournamentSettings['timeControl']

        if (['fischer', 'bronstein', 'delay'].includes(type)) {
          timeControl = {
            type: type as 'fischer' | 'bronstein' | 'delay',
            mainTime,
            increment: 0,
          }
        } else if (type === 'byoyomi') {
          timeControl = { type: 'byoyomi', mainTime, byoyomiTime: 0, byoyomiPeriods: 1 }
        } else if (type === 'canadian') {
          timeControl = { type: 'canadian', mainTime, canadianTime: 0, canadianMoves: 1 }
        } else {
          timeControl = { type: 'absolute', mainTime }
        }

        return {
          ...state,
          settings: { ...state.settings, timeControl },
        }
      })
    },
    [updateForm]
  )

  const updateTimeControlField = useCallback(
    (
      field:
        | 'mainTime'
        | 'increment'
        | 'byoyomiTime'
        | 'byoyomiPeriods'
        | 'canadianTime'
        | 'canadianMoves',
      value: number
    ) => {
      updateForm((state) => ({
        ...state,
        settings: {
          ...state.settings,
          timeControl: {
            ...state.settings.timeControl,
            [field]: value,
          } as TournamentSettings['timeControl'],
        },
      }))
    },
    [updateForm]
  )

  const setTieBreaks = useCallback(
    (tieBreaks: TieBreak[]) => {
      updateForm((state) => ({
        ...state,
        settings: { ...state.settings, tieBreaks },
      }))
    },
    [updateForm]
  )

  const addTieBreak = useCallback(
    (type: TieBreakType) => {
      updateForm((state) => {
        const existing = state.settings.tieBreaks.find(
          (tb) => tb.type === type
        )
        if (existing) return state
        const newTieBreak: TieBreak =
          type === 'buchholz_cut' ? { type, cutCount: 1 } : { type }
        return {
          ...state,
          settings: {
            ...state.settings,
            tieBreaks: [...state.settings.tieBreaks, newTieBreak],
          },
        }
      })
    },
    [updateForm]
  )

  const removeTieBreak = useCallback(
    (index: number) => {
      updateForm((state) => ({
        ...state,
        settings: {
          ...state.settings,
          tieBreaks: state.settings.tieBreaks.filter((_, i) => i !== index),
        },
      }))
    },
    [updateForm]
  )

  const addRound = useCallback(() => {
    updateForm((state) => {
      const numbers = state.schedule.rounds.map((r) => r.number)
      const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
      return {
        ...state,
        schedule: {
          ...state.schedule,
          rounds: [
            ...state.schedule.rounds,
            { number: nextNumber, scheduledAt: new Date() },
          ],
        },
      }
    })
  }, [updateForm])

  const updateRound = useCallback(
    (
      index: number,
      patch: Partial<TournamentSchedule['rounds'][number]>
    ) => {
      updateForm((state) => {
        const rounds = [...state.schedule.rounds]
        rounds[index] = { ...rounds[index], ...patch }
        return {
          ...state,
          schedule: { ...state.schedule, rounds },
        }
      })
    },
    [updateForm]
  )

  const removeRound = useCallback(
    (index: number) => {
      updateForm((state) => ({
        ...state,
        schedule: {
          ...state.schedule,
          rounds: state.schedule.rounds.filter((_, i) => i !== index),
        },
      }))
    },
    [updateForm]
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tournament || !formState) throw new Error('Tournament not loaded')
      const updated = await tournamentService.update({
        ...formStateToUpdateInput(tournament, formState),
        existing: tournament,
      })
      return updated
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([TOURNAMENT_QUERY_KEY, updated.id], updated)
      queryClient.invalidateQueries({ queryKey: ['adminTournaments'] })
      const snapshot = tournamentToFormState(updated)
      setFormState(snapshot)
      setLastSavedSnapshot(JSON.stringify(snapshot))
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!tournament || !formState) throw new Error('Tournament not loaded')
      const candidate = {
        ...tournament,
        locales: formState.locales as Tournament['locales'],
        country: formState.country,
        settings: formState.settings,
        schedule: formState.schedule,
        slug: formState.slug,
        parentEvent: formState.parentEvent,
        hostAssociation: formState.hostAssociation,
        status: 'upcoming' as const,
        isPublic: true,
      }
      publishedTournamentSchema.parse(candidate)
      return tournamentService.publish(tournament.id, tournament)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([TOURNAMENT_QUERY_KEY, updated.id], updated)
      queryClient.invalidateQueries({ queryKey: ['adminTournaments'] })
      const snapshot = tournamentToFormState(updated)
      setFormState(snapshot)
      setLastSavedSnapshot(JSON.stringify(snapshot))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!tournament) throw new Error('Tournament not loaded')
      await tournamentService.delete(tournament.id)
    },
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: [TOURNAMENT_QUERY_KEY, tournamentId],
      })
      queryClient.invalidateQueries({ queryKey: ['adminTournaments'] })
      navigate('/')
    },
  })

  return {
    tournament,
    formState,
    isLoading:
      (isLoadingTournament || tournamentId === 'new') && !createError,
    loadError,
    createError,
    isDirty,
    isSaving: saveMutation.isPending,
    isPublishing: publishMutation.isPending,
    isDeleting: deleteMutation.isPending,
    saveError: saveMutation.error,
    publishError: publishMutation.error,
    deleteError: deleteMutation.error,
    updateLocale,
    updateBasic,
    updateArbiter,
    updateTimeControlType,
    updateTimeControlField,
    setTieBreaks,
    addTieBreak,
    removeTieBreak,
    addRound,
    updateRound,
    removeRound,
    saveDraft: () => saveMutation.mutateAsync(),
    publish: () => publishMutation.mutateAsync(),
    deleteTournament: () => deleteMutation.mutateAsync(),
    clearCreateError,
    retryCreateDraft,
  }
}
