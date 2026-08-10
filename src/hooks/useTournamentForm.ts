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
  Participant,
  Game,
} from '../domain/tournament.ts'
import { publishedTournamentSchema } from '../domain/tournament.ts'
import { normalizeSlug } from '../services/slugService.ts'
import { supportedLocales, type SupportedLocale } from '../domain/locale.ts'
import type { TimeControlFormat } from '../domain/timeControl.ts'
import type { TieBreak, TieBreakType } from '../domain/tieBreak.ts'
import type { PlayerRank } from '../domain/playerRating.ts'

export type ScheduleRow =
  | { kind: 'round'; id: string; scheduledAt: Date | null; number: number }
  | {
      kind: 'event'
      id: string
      scheduledAt: Date | null
      locales: Record<SupportedLocale, { title: string }>
    }

function createEmptyEventLocales(): Record<SupportedLocale, { title: string }> {
  return Object.fromEntries(
    supportedLocales.map((locale) => [locale, { title: '' }])
  ) as Record<SupportedLocale, { title: string }>
}

function generateRowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function mergeSchedule(
  events: TournamentSchedule['events'],
  rounds: TournamentSchedule['rounds']
): ScheduleRow[] {
  const rows: ScheduleRow[] = [
    ...events.map((event) => ({
      kind: 'event' as const,
      id: generateRowId(),
      scheduledAt: event.scheduledAt instanceof Date ? event.scheduledAt : null,
      locales: Object.fromEntries(
        supportedLocales.map((locale) => [
          locale,
          { title: event.locales[locale]?.title ?? '' },
        ])
      ) as Record<SupportedLocale, { title: string }>,
    })),
    ...rounds.map((round) => ({
      kind: 'round' as const,
      id: generateRowId(),
      scheduledAt: round.scheduledAt instanceof Date ? round.scheduledAt : null,
      number: round.number,
    })),
  ]
  return rows.sort((a, b) => {
    const aTime = a.scheduledAt?.getTime() ?? 0
    const bTime = b.scheduledAt?.getTime() ?? 0
    return aTime - bTime
  })
}

export function splitSchedule(rows: ScheduleRow[]): TournamentSchedule {
  const events: TournamentSchedule['events'] = []
  const rounds: TournamentSchedule['rounds'] = []

  for (const row of rows) {
    if (!row.scheduledAt) continue

    if (row.kind === 'round') {
      rounds.push({
        number: row.number,
        scheduledAt: row.scheduledAt,
      })
    } else {
      const hasTitle = supportedLocales.some(
        (locale) => row.locales[locale]?.title.trim() !== ''
      )
      if (!hasTitle) continue

      events.push({
        scheduledAt: row.scheduledAt,
        locales: Object.fromEntries(
          supportedLocales
            .filter((locale) => row.locales[locale]?.title.trim() !== '')
            .map((locale) => [
              locale,
              { title: row.locales[locale].title },
            ])
        ) as TournamentSchedule['events'][number]['locales'],
      })
    }
  }

  return { events, rounds }
}

export function sortAndRenumber(rows: ScheduleRow[]): ScheduleRow[] {
  const sorted = [...rows].sort((a, b) => {
    const aTime = a.scheduledAt?.getTime() ?? 0
    const bTime = b.scheduledAt?.getTime() ?? 0
    return aTime - bTime
  })

  return renumberRounds(sorted)
}

function renumberRounds(rows: ScheduleRow[]): ScheduleRow[] {
  let roundNumber = 1
  return rows.map((row) => {
    if (row.kind === 'round') {
      return { ...row, number: roundNumber++ }
    }
    return row
  })
}

export interface ParticipantRow {
  rowId: string
  id: number
  player: string | null
  locales: Record<SupportedLocale, {
    familyName: string
    givenName: string
    title: string
    location: string
  }>
  nationality: string
  residence: string
  ratingValue: string
  rank: PlayerRank | null
  startingPoints: number
}

export interface TournamentFormState {
  slug: string
  parentEvent: string | null
  hostAssociation: string | null
  locales: Record<SupportedLocale, TournamentLocale>
  country: string
  arbiter: Record<SupportedLocale, { givenName: string; familyName: string }>
  settings: TournamentSettings
  scheduleRows: ScheduleRow[]
  participants: ParticipantRow[]
  games: Game[]
  currentRound: number
}

function createEmptyParticipantLocales(): ParticipantRow['locales'] {
  return Object.fromEntries(
    supportedLocales.map((locale) => [
      locale,
      { familyName: '', givenName: '', title: '', location: '' },
    ])
  ) as ParticipantRow['locales']
}

function participantsToRows(participants: Participant[]): ParticipantRow[] {
  return participants.map((p, index) => ({
    rowId: `existing-${index}-${p.id}`,
    id: p.id,
    player: p.player,
    locales: Object.fromEntries(
      supportedLocales.map((locale) => [
        locale,
        {
          familyName: p.locales[locale]?.familyName ?? '',
          givenName: p.locales[locale]?.givenName ?? '',
          title: p.locales[locale]?.title ?? '',
          location: p.locales[locale]?.location ?? '',
        },
      ])
    ) as ParticipantRow['locales'],
    nationality: p.nationality ?? '',
    residence: p.residence ?? '',
    ratingValue: p.capturedRating?.value?.toString() ?? '',
    rank: p.capturedRating?.rank ?? null,
    startingPoints: p.startingPoints ?? 0,
  }))
}

function rowsToParticipants(rows: ParticipantRow[]): Participant[] {
  // Filter out empty participants (no locale with both familyName and givenName)
  const nonEmpty = rows.filter((row) =>
    supportedLocales.some(
      (locale) =>
        row.locales[locale]?.familyName.trim() !== '' &&
        row.locales[locale]?.givenName.trim() !== ''
    )
  )

  const existingIds = nonEmpty.filter((r) => r.id > 0).map((r) => r.id)
  const maxExistingId = existingIds.length > 0 ? Math.max(...existingIds) : 0
  let nextNewId = maxExistingId + 1

  return nonEmpty.map((row) => {
    const id = row.id > 0 ? row.id : nextNewId++
    const locales: Participant['locales'] = Object.fromEntries(
      supportedLocales
        .filter(
          (locale) =>
            row.locales[locale].familyName.trim() !== '' ||
            row.locales[locale].givenName.trim() !== ''
        )
        .map((locale) => [
          locale,
          {
            familyName: row.locales[locale].familyName,
            givenName: row.locales[locale].givenName,
            ...(row.locales[locale].title ? { title: row.locales[locale].title } : {}),
            ...(row.locales[locale].location ? { location: row.locales[locale].location } : {}),
          },
        ])
    ) as Participant['locales']

    return {
      id,
      player: row.player,
      locales,
      nationality: row.nationality || undefined,
      residence: row.residence || undefined,
      capturedRating: {
        value: row.ratingValue ? Number(row.ratingValue) : null,
        rank: row.rank,
      },
    startingPoints: row.startingPoints ?? 0,
    }
  })
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
    scheduleRows: mergeSchedule(
      tournament.schedule.events,
      tournament.schedule.rounds
    ),
    participants: participantsToRows(tournament.participants),
    games: tournament.games,
    currentRound: tournament.currentRound,
  }
}

function formStateToUpdateInput(
  tournament: Tournament,
  state: TournamentFormState
) {
  const schedule = splitSchedule(state.scheduleRows)

  const input: {
    id: string
    locales: Tournament['locales']
    country: string
    settings: TournamentSettings
    schedule: TournamentSchedule
    parentEvent: string | null
    hostAssociation: string | null
    arbiter: Tournament['arbiter']
    participants: Participant[]
    games: Game[]
    currentRound: number
    desiredSlug?: string
  } = {
    id: tournament.id,
    locales: state.locales as Tournament['locales'],
    country: state.country,
    settings: state.settings,
    schedule,
    parentEvent: state.parentEvent,
    hostAssociation: state.hostAssociation,
    arbiter: {
      locales: Object.fromEntries(
        supportedLocales.map((locale) => [
          locale,
          {
            givenName: state.arbiter[locale].givenName,
            familyName: state.arbiter[locale].familyName,
          },
        ])
      ) as Tournament['arbiter']['locales'],
    },
    participants: rowsToParticipants(state.participants),
    games: state.games,
    currentRound: state.currentRound,
  }

  if (state.slug !== tournament.slug) {
    input.desiredSlug = state.slug
  }

  return input
}

function normalizeState(state: TournamentFormState): TournamentFormState {
  return state
}

const TOURNAMENT_QUERY_KEY = 'tournament'

function validateTournamentPublishForm(
  state: TournamentFormState
): Record<string, string> {
  const errors: Record<string, string> = {}

  const hasTitle = supportedLocales.some(
    (locale) => state.locales[locale].title.trim() !== ''
  )
  if (!hasTitle) {
    errors.title = 'required'
  }

  const hasLocation = supportedLocales.some(
    (locale) => (state.locales[locale].location?.trim() ?? '') !== ''
  )
  if (!hasLocation) {
    errors.location = 'required'
  }

  if (!state.country) {
    errors.country = 'required'
  }

  const hasArbiter = supportedLocales.some(
    (locale) =>
      state.arbiter[locale].givenName.trim() !== '' &&
      state.arbiter[locale].familyName.trim() !== ''
  )
  if (!hasArbiter) {
    errors['arbiter.givenName'] = 'required'
    errors['arbiter.familyName'] = 'required'
  }

  const hasRounds = state.scheduleRows.some((row) => row.kind === 'round')
  if (!hasRounds) {
    errors.rounds = 'required'
  }

  const allParticipantsHaveNames = state.participants.every((row) =>
    supportedLocales.some(
      (locale) =>
        row.locales[locale]?.familyName.trim() !== '' &&
        row.locales[locale]?.givenName.trim() !== ''
    )
  )
  if (state.participants.length > 0 && !allParticipantsHaveNames) {
    errors.participants = 'required'
  }

  return errors
}

export function useTournamentForm(tournamentId: string | undefined) {
  const { t, i18n } = useTranslation()
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [initializedTournamentId, setInitializedTournamentId] = useState<string | null>(null)

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
    queryKey: ['tournament', 'slugExists', debouncedSlug],
    queryFn: () => tournamentService.slugExists(debouncedSlug, tournamentId !== 'new' ? tournamentId : undefined),
    enabled: debouncedSlug.trim().length >= 3,
    staleTime: 10_000,
  })

  const slugTaken = slugExistsResult === true

  useEffect(() => {
    if (
      tournamentId === 'new' &&
      firebaseUser &&
      user !== undefined &&
      !creatingDraftRef.current
    ) {
      creatingDraftRef.current = true
      setCreateError(null)

      function arbiterFromDisplayName(displayName: string | null): Tournament['arbiter'] {
        const trimmed = displayName?.trim() ?? ''
        const parts = trimmed.split(/\s+/).filter(Boolean)
        const givenName = parts.length > 1 ? parts.slice(0, -1).join(' ') : ''
        const familyName = parts.length > 0 ? parts.at(-1) ?? '' : ''

        return {
          locales: Object.fromEntries(
            supportedLocales.map((locale) => [locale, { givenName, familyName }])
          ) as Tournament['arbiter']['locales'],
        }
      }

      const arbiter: Tournament['arbiter'] = user?.locales
        ? {
            locales: Object.fromEntries(
              supportedLocales.map((locale) => [
                locale,
                {
                  givenName: user.locales[locale].givenName ?? '',
                  familyName: user.locales[locale].familyName ?? '',
                },
              ])
            ) as Tournament['arbiter']['locales'],
          }
        : arbiterFromDisplayName(firebaseUser.displayName)

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

  // Adjust state during render (React 19 pattern — no useEffect needed)
  if (tournament && initializedTournamentId !== tournament.id) {
    setInitializedTournamentId(tournament.id)
    const initial = tournamentToFormState(tournament)
    setFormState(initial)
    setLastSavedSnapshot(JSON.stringify(initial))
  }

  // Reset createError when tournamentId changes
  const [prevTournamentId, setPrevTournamentId] = useState(tournamentId)
  if (prevTournamentId !== tournamentId) {
    setPrevTournamentId(tournamentId)
    setCreateError(null)
  }

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
      setValidationErrors({})
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
    (type: TieBreakType, cutCount?: number) => {
      updateForm((state) => {
        if (type !== 'buchholz_cut') {
          const existing = state.settings.tieBreaks.find(
            (tb) => tb.type === type
          )
          if (existing) return state
        }
        const newTieBreak: TieBreak =
          type === 'buchholz_cut'
            ? { type, cutCount: cutCount ?? 1 }
            : { type }
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

  const updateConsiderSente = useCallback(
    (value: boolean) => {
      updateForm((state) => ({
        ...state,
        settings: { ...state.settings, considerSente: value },
      }))
    },
    [updateForm]
  )

  const addScheduleRow = useCallback(
    (afterId?: string) => {
      updateForm((state) => {
        const newRow: ScheduleRow = {
          kind: 'event',
          id: generateRowId(),
          scheduledAt: null,
          locales: createEmptyEventLocales(),
        }
        if (!afterId) {
          return {
            ...state,
            scheduleRows: [...state.scheduleRows, newRow],
          }
        }
        const index = state.scheduleRows.findIndex((r) => r.id === afterId)
        if (index === -1) {
          return {
            ...state,
            scheduleRows: [...state.scheduleRows, newRow],
          }
        }
        const newRows = [...state.scheduleRows]
        newRows.splice(index + 1, 0, newRow)
        return {
          ...state,
          scheduleRows: newRows,
        }
      })
    },
    [updateForm]
  )

  const updateScheduleRow = useCallback(
    (id: string, patch: Partial<ScheduleRow>) => {
      updateForm((state) => {
        const exists = state.scheduleRows.some((row) => row.id === id)
        if (!exists) {
          const newRow: ScheduleRow = {
            kind: 'event',
            id,
            scheduledAt: null,
            locales: createEmptyEventLocales(),
            ...patch,
          } as ScheduleRow
          return {
            ...state,
            scheduleRows: renumberRounds([...state.scheduleRows, newRow]),
          }
        }
        const updatedRows = state.scheduleRows.map((row) =>
          row.id === id ? ({ ...row, ...patch } as ScheduleRow) : row
        )
        return {
          ...state,
          scheduleRows: renumberRounds(updatedRows),
        }
      })
    },
    [updateForm]
  )

  const removeScheduleRow = useCallback(
    (id: string) => {
      updateForm((state) => ({
        ...state,
        scheduleRows: state.scheduleRows.filter((r) => r.id !== id),
      }))
    },
    [updateForm]
  )

  const sortScheduleRows = useCallback(() => {
    updateForm((state) => ({
      ...state,
      scheduleRows: sortAndRenumber(state.scheduleRows),
    }))
  }, [updateForm])

  const addParticipant = useCallback(
    (afterRowId?: string) => {
      updateForm((state) => {
        const newRow: ParticipantRow = {
          rowId: generateRowId(),
          id: 0,
          player: null,
          locales: createEmptyParticipantLocales(),
          nationality: '',
          residence: '',
          ratingValue: '',
          rank: null,
          startingPoints: 0,
        }
        if (!afterRowId) {
          return {
            ...state,
            participants: [...state.participants, newRow],
          }
        }
        const index = state.participants.findIndex((r) => r.rowId === afterRowId)
        if (index === -1) {
          return {
            ...state,
            participants: [...state.participants, newRow],
          }
        }
        const newRows = [...state.participants]
        newRows.splice(index + 1, 0, newRow)
        return {
          ...state,
          participants: newRows,
        }
      })
    },
    [updateForm]
  )

  const updateParticipant = useCallback(
    (rowId: string, patch: Partial<ParticipantRow>) => {
      updateForm((state) => ({
        ...state,
        participants: state.participants.map((row) =>
          row.rowId === rowId ? { ...row, ...patch } : row
        ),
      }))
    },
    [updateForm]
  )

  const removeParticipant = useCallback(
    (rowId: string) => {
      updateForm((state) => ({
        ...state,
        participants: state.participants.filter((r) => r.rowId !== rowId),
      }))
    },
    [updateForm]
  )

  const sortParticipants = useCallback(
    (by: 'name' | 'rating', direction: 'asc' | 'desc', locale: SupportedLocale) => {
      updateForm((state) => ({
        ...state,
        participants: [...state.participants].sort((a, b) => {
          let cmp = 0
          if (by === 'name') {
            const aName = a.locales[locale]?.familyName ?? ''
            const bName = b.locales[locale]?.familyName ?? ''
            cmp = aName.localeCompare(bName, undefined, { sensitivity: 'base' })
          } else {
            const aVal = a.ratingValue ? Number(a.ratingValue) : -Infinity
            const bVal = b.ratingValue ? Number(b.ratingValue) : -Infinity
            cmp = aVal - bVal
          }
          return direction === 'asc' ? cmp : -cmp
        }),
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
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['adminEvents'] })
      const snapshot = tournamentToFormState(updated)
      setFormState(snapshot)
      setLastSavedSnapshot(JSON.stringify(snapshot))
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!tournament || !formState) throw new Error('Tournament not loaded')
      const schedule = splitSchedule(formState.scheduleRows)
      const candidate = {
        ...tournament,
        locales: formState.locales as Tournament['locales'],
        country: formState.country,
        settings: formState.settings,
        schedule,
        slug: formState.slug,
        parentEvent: formState.parentEvent,
        hostAssociation: formState.hostAssociation,
        arbiter: {
          locales: Object.fromEntries(
            supportedLocales.map((locale) => [
              locale,
              {
                givenName: formState.arbiter[locale].givenName,
                familyName: formState.arbiter[locale].familyName,
              },
            ])
          ) as Tournament['arbiter']['locales'],
        },
        status: 'upcoming' as const,
        isPublic: true,
      }
      publishedTournamentSchema.parse(candidate)
      return tournamentService.publish(tournament.id, tournament)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([TOURNAMENT_QUERY_KEY, updated.id], updated)
      queryClient.invalidateQueries({ queryKey: ['adminTournaments'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['adminEvents'] })
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
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['adminEvents'] })
      navigate('/')
    },
  })

  const saveDraft = useCallback(() => {
    if (slugTaken) {
      setValidationErrors({ slug: t('tournament.edit.slugTaken') })
      return
    }
    saveMutation.reset()
    saveMutation.mutate()
  }, [saveMutation, slugTaken, t])

  const publish = useCallback(() => {
    if (!formState) return
    const errors = validateTournamentPublishForm(formState)
    if (slugTaken) {
      errors.slug = 'taken'
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(
        Object.fromEntries(
          Object.entries(errors).map(([key]) => {
            if (key === 'slug' && errors[key] === 'taken') return [key, t('tournament.edit.slugTaken')]
            return [key, t('common.fieldRequired')]
          })
        )
      )
      return
    }
    publishMutation.reset()
    publishMutation.mutate()
  }, [formState, publishMutation, t, slugTaken])

  const deleteTournament = useCallback(() => {
    deleteMutation.reset()
    deleteMutation.mutate()
  }, [deleteMutation])

  const updateGames = useCallback(
    (round: number, gamesForRound: Game[]) => {
      updateForm((state) => ({
        ...state,
        games: [
          ...state.games.filter((g) => g.round !== round),
          ...gamesForRound.filter((g) => g.round === round),
        ],
      }))
    },
    [updateForm]
  )

  const publishDraw = useCallback(
    (round: number) => {
      updateForm((state) => ({
        ...state,
        currentRound: round,
      }))
    },
    [updateForm]
  )

  const unpublishDraw = useCallback(() => {
    updateForm((state) => {
      const oldCurrentRound = state.currentRound
      const newCurrentRound = Math.max(0, oldCurrentRound - 1)
      return {
        ...state,
        currentRound: newCurrentRound,
        games: state.games.filter((g) => g.round !== oldCurrentRound + 1),
      }
    })
  }, [updateForm])

  const updateStartingPoints = useCallback(
    (participantId: number, value: number) => {
      updateForm((state) => ({
        ...state,
        participants: state.participants.map((p) =>
          p.id === participantId ? { ...p, startingPoints: value } : p
        ),
      }))
    },
    [updateForm]
  )

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
    validationErrors,
    clearSaveError: saveMutation.reset,
    clearPublishError: publishMutation.reset,
    clearDeleteError: deleteMutation.reset,
    updateLocale,
    updateBasic,
    updateArbiter,
    updateTimeControlType,
    updateTimeControlField,
    setTieBreaks,
    addTieBreak,
    removeTieBreak,
    updateConsiderSente,
    addScheduleRow,
    updateScheduleRow,
    removeScheduleRow,
    sortScheduleRows,
    sortParticipants,
    saveDraft,
    publish,
    deleteTournament,
    clearCreateError,
    retryCreateDraft,
    addParticipant,
    updateParticipant,
    removeParticipant,
    updateGames,
    publishDraw,
    unpublishDraw,
    updateStartingPoints,
    slugTaken,
  }
}
