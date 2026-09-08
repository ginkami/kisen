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
  ScheduledAtLocal,
} from '../domain/tournament.ts'
import { publishedTournamentSchema } from '../domain/tournament.ts'
import {
  resolveLocationTimeZone,
  resolveTimeZone,
  utcToZonedWallClock,
  zonedWallClockToUtc,
} from '../utils/scheduleTime.ts'
import { normalizeSlug } from '../services/slugService.ts'
import { supportedLocales, type SupportedLocale } from '../domain/locale.ts'
import { backfillRequiredLocaleFields, localeHasAnyContent } from '../utils/locales.ts'
import type { TimeControlFormat } from '../domain/timeControl.ts'
import type { TieBreak, TieBreakType } from '../domain/tieBreak.ts'
import { normalizeGamesSente } from '../components/tournament/crosstable/crosstableModel.ts'
import { normalizeGame, withForfeitsCarriedOver } from '../components/tournament/pairings/pairingsModel.ts'
import {
  gamesWithoutParticipants,
  isEmptyParticipantRow,
  lateJoinerForfeitGames,
} from './tournamentFormModel.ts'
import type { PlayerRank } from '../domain/playerRating.ts'
import { resolveLocationByIp, resolvedToTournamentLocation } from '../services/geoService.ts'

export type ScheduleRow =
  | {
      kind: 'round'
      id: string
      scheduledAt: Date | null
      scheduledAtLocal: ScheduledAtLocal | null
      number: number
    }
  | {
      kind: 'event'
      id: string
      scheduledAt: Date | null
      scheduledAtLocal: ScheduledAtLocal | null
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
  rounds: TournamentSchedule['rounds'],
  timeZone: string | null = null
): ScheduleRow[] {
  const toLocal = (
    scheduledAt: Date | null,
    stored: ScheduledAtLocal | undefined
  ): ScheduledAtLocal | null =>
    stored ??
    (scheduledAt && timeZone ? utcToZonedWallClock(scheduledAt, timeZone) : null)

  const rows: ScheduleRow[] = [
    ...events.map((event) => {
      const scheduledAt =
        event.scheduledAt instanceof Date ? event.scheduledAt : null
      return {
        kind: 'event' as const,
        id: generateRowId(),
        scheduledAt,
        scheduledAtLocal: toLocal(scheduledAt, event.scheduledAtLocal),
        locales: Object.fromEntries(
          supportedLocales.map((locale) => [
            locale,
            { title: event.locales[locale]?.title ?? '' },
          ])
        ) as Record<SupportedLocale, { title: string }>,
      }
    }),
    ...rounds.map((round) => {
      const scheduledAt =
        round.scheduledAt instanceof Date ? round.scheduledAt : null
      return {
        kind: 'round' as const,
        id: generateRowId(),
        scheduledAt,
        scheduledAtLocal: toLocal(scheduledAt, round.scheduledAtLocal),
        number: round.number,
      }
    }),
  ]
  return rows.sort((a, b) => {
    const aTime = a.scheduledAt?.getTime() ?? 0
    const bTime = b.scheduledAt?.getTime() ?? 0
    return aTime - bTime
  })
}

export function splitSchedule(
  rows: ScheduleRow[],
  timeZone: string | null = null
): TournamentSchedule {
  const events: TournamentSchedule['events'] = []
  const rounds: TournamentSchedule['rounds'] = []

  for (const row of rows) {
    // The instant is re-derived from the local wall clock whenever both are
    // available. Without a timezone the instant is preserved as-is (never
    // reinterpreted as a wall clock in the editor's browser timezone).
    const scheduledAt = row.scheduledAtLocal
      ? timeZone
        ? zonedWallClockToUtc(row.scheduledAtLocal, timeZone)
        : row.scheduledAt
      : row.scheduledAt
    if (!scheduledAt) continue

    if (row.kind === 'round') {
      rounds.push({
        number: row.number,
        scheduledAt,
        scheduledAtLocal: row.scheduledAtLocal ?? undefined,
      })
    } else {
      const hasTitle = supportedLocales.some(
        (locale) => row.locales[locale]?.title.trim() !== ''
      )
      if (!hasTitle) continue

      events.push({
        scheduledAt,
        scheduledAtLocal: row.scheduledAtLocal ?? undefined,
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
  location: {
    latitude: number | null
    longitude: number | null
    country: string
    timeZone: string | null
    locales: Record<SupportedLocale, { settlement: string; venue: string }>
  }
  arbiter: Record<SupportedLocale, { givenName: string; familyName: string }>
  settings: TournamentSettings
  scheduleRows: ScheduleRow[]
  participants: ParticipantRow[]
  games: Game[]
  publishedRounds: number
  regulations: string[]
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
  const nonEmpty = rows.filter((row) => !isEmptyParticipantRow(row))

  const existingIds = nonEmpty.filter((r) => r.id > 0).map((r) => r.id)
  const maxExistingId = existingIds.length > 0 ? Math.max(...existingIds) : 0
  let nextNewId = maxExistingId + 1

  return nonEmpty.map((row) => {
    const id = row.id > 0 ? row.id : nextNewId++
    const backfilled = backfillRequiredLocaleFields(row.locales, ['familyName', 'givenName'])
    const locales: Participant['locales'] = Object.fromEntries(
      supportedLocales
        .filter((locale) => localeHasAnyContent(backfilled[locale]))
        .map((locale) => [
          locale,
          {
            familyName: backfilled[locale].familyName,
            givenName: backfilled[locale].givenName,
            ...(backfilled[locale].title ? { title: backfilled[locale].title } : {}),
            ...(backfilled[locale].location ? { location: backfilled[locale].location } : {}),
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
  return { title: '', description: '' }
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

  // Map location
  const locationSource = tournament.location
  const location: TournamentFormState['location'] = {
    latitude: locationSource?.latitude ?? null,
    longitude: locationSource?.longitude ?? null,
    country: locationSource?.country ?? '',
    timeZone: locationSource?.timeZone ?? null,
    locales: Object.fromEntries(
      supportedLocales.map((locale) => [
        locale,
        {
          settlement: locationSource?.locales?.[locale]?.settlement ?? '',
          venue: locationSource?.locales?.[locale]?.venue ?? '',
        },
      ])
    ) as Record<SupportedLocale, { settlement: string; venue: string }>,
  }

  return {
    slug: tournament.slug,
    parentEvent: tournament.parentEvent,
    hostAssociation: tournament.hostAssociation,
    locales,
    location,
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
      tournament.schedule.rounds,
      resolveLocationTimeZone(location)
    ),
    participants: participantsToRows(tournament.participants),
    games: tournament.games,
    publishedRounds: tournament.publishedRounds,
    regulations: tournament.regulations ?? [],
  }
}

function buildLocalesForSave(locales: TournamentFormState['locales']) {
  return backfillRequiredLocaleFields(locales, ['title']) as Tournament['locales']
}

async function buildLocationForSave(
  location: TournamentFormState['location']
): Promise<Tournament['location'] | undefined> {
  // Backfill settlement across location locales
  const backfilled = backfillRequiredLocaleFields(
    location.locales,
    ['settlement']
  )

  const locales: Record<string, { settlement?: string; venue?: string }> = {}
  for (const locale of supportedLocales) {
    const entry = backfilled[locale]
    const loc: { settlement?: string; venue?: string } = {}
    if (entry.settlement?.trim()) loc.settlement = entry.settlement.trim()
    if (entry.venue?.trim()) loc.venue = entry.venue.trim()
    locales[locale] = loc
  }

  const result: Tournament['location'] = { locales }

  if (location.latitude !== null) result.latitude = location.latitude
  if (location.longitude !== null) result.longitude = location.longitude
  if (location.country) result.country = location.country
  // Persist the timezone: keep the stored one, or resolve it once from the
  // coordinates (offline lookup). Lookup failure leaves it unset and never
  // blocks saving.
  if (location.timeZone) {
    result.timeZone = location.timeZone
  } else if (location.latitude !== null && location.longitude !== null) {
    const timeZone = await resolveTimeZone(location.latitude, location.longitude)
    if (timeZone) result.timeZone = timeZone
  }

  return result
}

function buildArbiterForSave(arbiter: TournamentFormState['arbiter']) {
  return backfillRequiredLocaleFields(arbiter, ['givenName', 'familyName']) as Tournament['arbiter']['locales']
}

async function formStateToUpdateInput(
  tournament: Tournament,
  state: TournamentFormState
) {
  const schedule = splitSchedule(
    state.scheduleRows,
    resolveLocationTimeZone(state.location)
  )

  // Participants dropped as empty rows on save: clean up their games the same
  // way removeParticipant does, so orphaned/late-join games never persist.
  const droppedParticipantIds = state.participants
    .filter((row) => isEmptyParticipantRow(row) && row.id > 0)
    .map((row) => row.id)
  const games = gamesWithoutParticipants(
    state.games,
    droppedParticipantIds,
    state.publishedRounds
  )

  const input: {
    id: string
    locales: Tournament['locales']
    location: Tournament['location'] | undefined
    settings: TournamentSettings
    schedule: TournamentSchedule
    parentEvent: string | null
    hostAssociation: string | null
    arbiter: Tournament['arbiter']
    participants: Participant[]
    games: Game[]
    publishedRounds: number
    regulations: string[]
    desiredSlug?: string
  } = {
    id: tournament.id,
    locales: buildLocalesForSave(state.locales),
    location: await buildLocationForSave(state.location),
    settings: state.settings,
    schedule,
    parentEvent: state.parentEvent,
    hostAssociation: state.hostAssociation,
    arbiter: {
      locales: buildArbiterForSave(state.arbiter),
    },
    participants: rowsToParticipants(state.participants),
    games: state.settings.considerSente
      ? games.map((g) => ({ ...g, sente: 'player1' as const }))
      : games,
    publishedRounds: state.publishedRounds,
    regulations: state.regulations,
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

export function validateTournamentPublishForm(
  state: TournamentFormState
): Record<string, string> {
  const errors: Record<string, string> = {}

  const hasTitle = supportedLocales.some(
    (locale) => state.locales[locale].title.trim() !== ''
  )
  if (!hasTitle) {
    errors.title = 'required'
  }

  if (state.location.latitude === null || state.location.longitude === null) {
    errors.location = 'required'
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
  } else {
    // publishedTournamentScheduleSchema requires every round to carry a
    // scheduledAt; splitSchedule silently drops untimed rows, so check them
    // here to surface the problem before publishing.
    const allRoundsHaveTime = state.scheduleRows.every(
      (row) => row.kind !== 'round' || row.scheduledAt !== null
    )
    if (!allRoundsHaveTime) {
      errors.roundTime = 'required'
    }
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
          queryClient.invalidateQueries({ queryKey: ['tournaments'] })
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
    // For Debug
    if (import.meta.env.DEV) (window as any).__tournament = tournament
    setFormState(initial)
    setLastSavedSnapshot(JSON.stringify(initial))
  }

  // Auto-fill location from IP when coordinates are missing (legacy documents)
  useEffect(() => {
    if (!formState || formState.location.latitude !== null) return

    let cancelled = false
    resolveLocationByIp().then((resolved) => {
      if (cancelled || !resolved) return
      const ipLocation = resolvedToTournamentLocation(resolved)
      setFormState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          location: {
            latitude: ipLocation.latitude ?? null,
            longitude: ipLocation.longitude ?? null,
            country: ipLocation.country ?? '',
            timeZone: ipLocation.timeZone ?? null,
            locales: Object.fromEntries(
              supportedLocales.map((locale) => [
                locale,
                {
                  settlement: ipLocation.locales?.[locale]?.settlement ?? prev.location.locales[locale]?.settlement ?? '',
                  venue: prev.location.locales[locale]?.venue ?? '',
                },
              ])
            ) as Record<SupportedLocale, { settlement: string; venue: string }>,
          },
        }
      })
      // Resolve the venue timezone from the fresh coordinates and keep it in
      // the form state so schedule times behave as venue-local right away.
      if (ipLocation.latitude != null && ipLocation.longitude != null) {
        resolveTimeZone(ipLocation.latitude, ipLocation.longitude).then(
          (timeZone) => {
            if (cancelled || !timeZone) return
            setFormState((prev) =>
              prev && !prev.location.timeZone
                ? { ...prev, location: { ...prev.location, timeZone } }
                : prev
            )
          }
        )
      }
    })
    return () => { cancelled = true }
  }, [formState?.location.latitude])

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

  const updateLocation = useCallback(
    (patch: Partial<TournamentFormState['location']>) => {
      updateForm((state) => ({
        ...state,
        location: { ...state.location, ...patch },
      }))
    },
    [updateForm]
  )

  const updateLocationLocale = useCallback(
    (
      locale: SupportedLocale,
      field: 'settlement' | 'venue',
      value: string
    ) => {
      updateForm((state) => ({
        ...state,
        location: {
          ...state.location,
          locales: {
            ...state.location.locales,
            [locale]: { ...state.location.locales[locale], [field]: value },
          },
        },
      }))
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

  const addRegulation = useCallback(
    (id: string) => {
      updateForm((state) => {
        if (state.regulations.includes(id)) return state
        return { ...state, regulations: [...state.regulations, id] }
      })
    },
    [updateForm]
  )

  const removeRegulation = useCallback(
    (id: string) => {
      updateForm((state) => ({
        ...state,
        regulations: state.regulations.filter((r) => r !== id),
      }))
    },
    [updateForm]
  )

  const updateConsiderSente = useCallback(
    (value: boolean) => {
      updateForm((state) => ({
        ...state,
        settings: { ...state.settings, considerSente: value },
        games: normalizeGamesSente(state.games, value),
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
          scheduledAtLocal: null,
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
            scheduledAtLocal: null,
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
        // Generate a unique positive integer id for the new participant.
        // This is needed so forfeit games can reference the participant immediately.
        const existingIds = state.participants.map((p) => p.id).filter((id) => id > 0)
        const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0
        const newId = maxId + 1

        const forfeitGames = lateJoinerForfeitGames(
          state.games,
          newId,
          state.publishedRounds,
          state.settings.considerSente
        )

        const newRow: ParticipantRow = {
          rowId: generateRowId(),
          id: newId,
          player: null,
          locales: createEmptyParticipantLocales(),
          nationality: '',
          residence: '',
          ratingValue: '',
          rank: null,
          startingPoints: 0,
        }
        const updatedGames = [...state.games, ...forfeitGames]
        if (!afterRowId) {
          return {
            ...state,
            participants: [...state.participants, newRow],
            games: updatedGames,
          }
        }
        const index = state.participants.findIndex((r) => r.rowId === afterRowId)
        if (index === -1) {
          return {
            ...state,
            participants: [...state.participants, newRow],
            games: updatedGames,
          }
        }
        const newRows = [...state.participants]
        newRows.splice(index + 1, 0, newRow)
        return {
          ...state,
          participants: newRows,
          games: updatedGames,
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
      updateForm((state) => {
        const removedRow = state.participants.find((r) => r.rowId === rowId)
        if (!removedRow) return state
        return {
          ...state,
          participants: state.participants.filter((r) => r.rowId !== rowId),
          games:
            removedRow.id > 0
              ? gamesWithoutParticipants(state.games, [removedRow.id], state.publishedRounds)
              : state.games,
        }
      })
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
      const input = await formStateToUpdateInput(tournament, formState)

      // IP fallback: if no coordinates, try to resolve by IP
      if (!input.location?.latitude || !input.location?.longitude) {
        const resolved = await resolveLocationByIp()
        if (resolved) {
          const ipLocation = resolvedToTournamentLocation(resolved)
          input.location = {
            ...input.location,
            ...ipLocation,
            locales: {
              ...ipLocation.locales,
              ...input.location?.locales,
            },
          }
        }
      }

      // Resolve the venue timezone once coordinates are known (offline
      // lookup); failure leaves it unset and never blocks saving.
      if (
        input.location?.latitude != null &&
        input.location.longitude != null &&
        !input.location.timeZone
      ) {
        const timeZone = await resolveTimeZone(
          input.location.latitude,
          input.location.longitude
        )
        if (timeZone) input.location.timeZone = timeZone
      }

      const updated = await tournamentService.update({
        ...input,
        existing: tournament,
      })
      return updated
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([TOURNAMENT_QUERY_KEY, updated.id], updated)
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      const snapshot = tournamentToFormState(updated)
      setFormState(snapshot)
      setLastSavedSnapshot(JSON.stringify(snapshot))
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!tournament || !formState) throw new Error('Tournament not loaded')
      const schedule = splitSchedule(
        formState.scheduleRows,
        resolveLocationTimeZone(formState.location)
      )
      const location = await buildLocationForSave(formState.location)

      // IP fallback: if no coordinates, try to resolve by IP
      let resolvedLocation = location
      if (!resolvedLocation?.latitude || !resolvedLocation?.longitude) {
        const resolved = await resolveLocationByIp()
        if (resolved) {
          const ipLocation = resolvedToTournamentLocation(resolved)
          resolvedLocation = {
            ...resolvedLocation,
            ...ipLocation,
            locales: {
              ...ipLocation.locales,
              ...resolvedLocation?.locales,
            },
          }
        }
      }

      // Resolve the venue timezone once coordinates are known (offline
      // lookup); failure leaves it unset and never blocks publishing.
      if (
        resolvedLocation?.latitude != null &&
        resolvedLocation.longitude != null &&
        !resolvedLocation.timeZone
      ) {
        const timeZone = await resolveTimeZone(
          resolvedLocation.latitude,
          resolvedLocation.longitude
        )
        if (timeZone) resolvedLocation = { ...resolvedLocation, timeZone }
      }

      const candidate = {
        ...tournament,
        locales: buildLocalesForSave(formState.locales),
        location: resolvedLocation,
        settings: formState.settings,
        schedule,
        slug: formState.slug,
        parentEvent: formState.parentEvent,
        hostAssociation: formState.hostAssociation,
        arbiter: {
          locales: buildArbiterForSave(formState.arbiter),
        },
        status: 'upcoming' as const,
        isPublic: true,
      }
      publishedTournamentSchema.parse(candidate)
      return tournamentService.publish(tournament.id, tournament)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([TOURNAMENT_QUERY_KEY, updated.id], updated)
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
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
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate('/')
    },
  })

  const save = useCallback(() => {
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
          ...gamesForRound
            .filter((g) => g.round === round)
            .map((g) => normalizeGame(g, state.publishedRounds)),
        ],
      }))
    },
    [updateForm]
  )

  const publishDraw = useCallback(
    (round: number) => {
      updateForm((state) => {
        const maxRound = state.scheduleRows.filter((r) => r.kind === 'round').length
        const normalized = state.games.map((g) => normalizeGame(g, round))
        return {
          ...state,
          publishedRounds: round,
          games: withForfeitsCarriedOver(normalized, round, state.settings.considerSente, maxRound),
        }
      })
    },
    [updateForm]
  )

  const unpublishDraw = useCallback(() => {
    updateForm((state) => {
      const oldPublishedRounds = state.publishedRounds
      const newPublishedRounds = Math.max(0, oldPublishedRounds - 1)
      return {
        ...state,
        publishedRounds: newPublishedRounds,
        games: state.games
          .filter((g) => g.round !== oldPublishedRounds + 1)
          .map((g) => normalizeGame(g, newPublishedRounds)),
      }
    })
  }, [updateForm])

  const updateStartingPoints = useCallback(
    (participantId: number, value: number) => {
      const clamped = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
      updateForm((state) => ({
        ...state,
        participants: state.participants.map((p) =>
          p.id === participantId ? { ...p, startingPoints: clamped } : p
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
    setValidationErrors,
    clearSaveError: saveMutation.reset,
    clearPublishError: publishMutation.reset,
    clearDeleteError: deleteMutation.reset,
    updateLocale,
    updateBasic,
    updateLocation,
    updateLocationLocale,
    updateArbiter,
    updateTimeControlType,
    updateTimeControlField,
    setTieBreaks,
    addTieBreak,
    removeTieBreak,
    addRegulation,
    removeRegulation,
    updateConsiderSente,
    addScheduleRow,
    updateScheduleRow,
    removeScheduleRow,
    sortScheduleRows,
    sortParticipants,
    save,
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
