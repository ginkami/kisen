import { uuidv7 } from 'uuidv7'
import type {
  Tournament,
  TournamentStatus,
  TournamentLocale,
  TournamentLocation,
} from '../domain/tournament.ts'
import {
  generateRandomSlug,
  isValidSlug,
  normalizeSlug,
  SLUG_MIN_LENGTH,
} from './slugService.ts'
import type { TournamentRepository, ListTournamentsFilters } from './repository.ts'
import { firestoreTournamentRepository } from './firestoreTournamentRepository.ts'
import { sanitizeDeep } from '../utils/sanitize.ts'
import { eventService } from './eventService.ts'
import { getTournamentStartYearMonth } from '../utils/yearMonth.ts'
import { supportedLocales } from '../domain/locale.ts'
import { resolveLocationByIp, resolvedToTournamentLocation } from './geoService.ts'

export interface CreateTournamentInput {
  createdBy: string
  hostAssociation: string | null
  parentEvent: string | null
  locales: Tournament['locales']
  location?: TournamentLocation
  settings: Tournament['settings']
  schedule: Tournament['schedule']
  arbiter: Tournament['arbiter']
  desiredSlug?: string
}

export interface CreateDraftInput {
  createdBy: string
  hostAssociation?: string | null
  parentEvent?: string | null
  initialLocale?: string
  desiredSlug?: string
  arbiter: Tournament['arbiter']
}

export interface UpdateTournamentInput {
  id: string
  locales?: Tournament['locales']
  location?: TournamentLocation
  settings?: Tournament['settings']
  schedule?: Tournament['schedule']
  arbiter?: Tournament['arbiter']
  participants?: Tournament['participants']
  games?: Tournament['games']
  currentRound?: number
  status?: TournamentStatus
  publishedRounds?: number
  parentEvent?: string | null
  hostAssociation?: string | null
  regulations?: string[]
  desiredSlug?: string
  existing?: Tournament
}

function defaultLocales(): Record<string, TournamentLocale> {
  return Object.fromEntries(
    supportedLocales.map((locale) => [
      locale,
      {
        title: '',
      },
    ])
  )
}

function defaultSettings(): Tournament['settings'] {
  return {
    timeControl: {
      type: 'byoyomi',
      mainTime: 0,
      byoyomiTime: 0,
      byoyomiPeriods: 1,
    },
    tieBreaks: [
      { type: 'points' },
      { type: 'buchholz' },
      { type: 'sonneborn_berger' },
    ],
    considerSente: false,
  }
}

/**
 * Pure function: derive the tournament status from the merged next state.
 * Called by `update()` with the candidate being written (games, currentRound,
 * schedule already merged from input + existing).
 *
 * Rules:
 * - `draft` is sticky (left only via publish which requests `'upcoming'`).
 * - `canceled` / `proposed_for_removing` are sticky (changed only by explicit requested status).
 * - Otherwise: last round has ≥1 game and every game has a fixed outcome → `finished`;
 *   `currentRound ≥ 1` or round-1 games exist or first round start time passed → `ongoing`;
 *   else `upcoming`.
 */
export function computeTournamentStatus({
  requested,
  existingStatus,
  currentRound,
  games,
  scheduleRounds,
  editTime,
}: {
  requested?: TournamentStatus
  existingStatus: TournamentStatus
  currentRound: number
  games: Game[]
  scheduleRounds: { number: number; scheduledAt: Date }[]
  editTime: Date
}): TournamentStatus {
  // Sticky manual statuses: only an explicit requested status can move them
  if (existingStatus === 'draft' && requested !== 'upcoming') return 'draft'
  if (existingStatus === 'canceled' || existingStatus === 'proposed_for_removing') {
    return requested ?? existingStatus
  }

  // --- Data-driven escalation from the merged state ---

  // 1. Last round fixed → finished
  const lastRoundNum = scheduleRounds.reduce((max, r) => Math.max(max, r.number), 0)
  if (lastRoundNum > 0) {
    const lastRoundGames = games.filter((g) => g.round === lastRoundNum)
    if (lastRoundGames.length > 0) {
      const allFixed = lastRoundGames.every(
        (g) => g.result != null || g.status === 'bye' || g.status === 'forfeit'
      )
      if (allFixed) return 'finished'
    }
  }

  // 2. Draw published or round-1 pairings exist or time fallback → ongoing
  const hasRound1Games = games.some((g) => g.round === 1)
  const firstRound = scheduleRounds[0]
  const hasStarted = firstRound ? editTime >= firstRound.scheduledAt : false
  if (currentRound >= 1 || hasRound1Games || hasStarted) return 'ongoing'

  // 3. Default: no data supports ongoing or finished
  return 'upcoming'
}

export class TournamentService {
  private readonly repository: TournamentRepository

  constructor(repository: TournamentRepository) {
    this.repository = repository
  }

  async getBySlug(slug: string): Promise<Tournament | null> {
    return this.repository.getBySlug(slug)
  }

  async getById(id: string): Promise<Tournament | null> {
    return this.repository.getById(id)
  }

  async list(filters?: ListTournamentsFilters): Promise<Tournament[]> {
    return this.repository.list(filters)
  }

  async listPublic(): Promise<Tournament[]> {
    return this.repository.list({
      isPublic: true,
    })
  }

  async listByCreator(createdBy: string): Promise<Tournament[]> {
    return this.repository.list({ createdBy })
  }

  async listByYearMonth(
    startYearMonth: string,
    createdBy?: string
  ): Promise<Tournament[]> {
    return this.repository.list({ startYearMonth, createdBy })
  }

  async create(input: CreateTournamentInput): Promise<Tournament> {
    const slug = await this.resolveSlug(input.desiredSlug)
    const now = new Date()

    const tournament: Tournament = {
      id: uuidv7(),
      slug,
      createdBy: input.createdBy,
      hostAssociation: input.hostAssociation,
      parentEvent: input.parentEvent,
      updatedAt: now,
      status: 'draft',
      isPublic: false,
      publishedRounds: 0,
      currentRound: 0,
      startYearMonth: getTournamentStartYearMonth({
        schedule: input.schedule,
      } as Tournament),
      locales: input.locales,
      location: input.location,
      settings: input.settings,
      schedule: input.schedule,
      arbiter: input.arbiter,
      participants: [],
      games: [],
      regulations: [],
    }

    const result = await this.repository.create(sanitizeDeep(tournament))

    // Sync event startYearMonth if parentEvent is set
    if (result.parentEvent) {
      await eventService.syncStartYearMonth(result.parentEvent).catch((err) => {
        console.warn(`Failed to sync event ${result.parentEvent} startYearMonth:`, err)
      })
    }

    return result
  }

  async createDraft(input: CreateDraftInput): Promise<Tournament> {
    const slug = await this.resolveSlug(input.desiredSlug)
    const now = new Date()
    const resolved = await resolveLocationByIp()
    const location = resolved ? resolvedToTournamentLocation(resolved) : undefined
    const schedule: Tournament['schedule'] = {
      events: [],
      rounds: [],
    }

    const tournament: Tournament = {
      id: uuidv7(),
      slug,
      createdBy: input.createdBy,
      hostAssociation: input.hostAssociation ?? null,
      parentEvent: input.parentEvent ?? null,
      updatedAt: now,
      status: 'draft',
      isPublic: false,
      publishedRounds: 0,
      currentRound: 0,
      startYearMonth: getTournamentStartYearMonth({
        schedule,
      } as Tournament),
      locales: defaultLocales(),
      location,
      settings: defaultSettings(),
      schedule,
      arbiter: input.arbiter,
      participants: [],
      games: [],
      regulations: [],
    }

    const created = await this.repository.create(sanitizeDeep(tournament))

    // Sync event startYearMonth if parentEvent is set
    if (created.parentEvent) {
      await eventService.syncStartYearMonth(created.parentEvent).catch((err) => {
        console.warn(`Failed to sync event ${created.parentEvent} startYearMonth:`, err)
      })
    }

    return created
  }

  async update(input: UpdateTournamentInput): Promise<Tournament> {
    const existing = input.existing ?? (await this.repository.getById(input.id))
    if (!existing) {
      throw new Error(`Tournament with id ${input.id} not found`)
    }

    const now = new Date()
    const slug = input.desiredSlug
      ? await this.resolveSlug(input.desiredSlug, existing.id)
      : existing.slug

    const nextSchedule = input.schedule ?? existing.schedule
    const nextStartYearMonth = getTournamentStartYearMonth({
      ...existing,
      schedule: nextSchedule,
    } as Tournament)

    const nextParentEvent =
      input.parentEvent !== undefined ? input.parentEvent : existing.parentEvent

    const nextGames = input.games ?? existing.games
    const nextCurrentRound = input.currentRound ?? existing.currentRound

    // Merge-before-compute: derive status from the merged state
    const nextStatus = computeTournamentStatus({
      requested: input.status,
      existingStatus: existing.status,
      currentRound: nextCurrentRound,
      games: nextGames,
      scheduleRounds: nextSchedule.rounds,
      editTime: now,
    })

    const isPublic =
      nextStatus !== 'draft' && nextStatus !== 'proposed_for_removing'

    const updated: Tournament = {
      ...existing,
      locales: input.locales ?? existing.locales,
      location: input.location ?? existing.location,
      settings: input.settings ?? existing.settings,
      schedule: nextSchedule,
      arbiter: input.arbiter ?? existing.arbiter,
      participants: input.participants ?? existing.participants,
      games: nextGames,
      currentRound: nextCurrentRound,
      status: nextStatus,
      isPublic,
      publishedRounds: input.publishedRounds ?? existing.publishedRounds,
      startYearMonth: nextStartYearMonth,
      parentEvent: nextParentEvent,
      hostAssociation:
        input.hostAssociation !== undefined
          ? input.hostAssociation
          : existing.hostAssociation,
      regulations: input.regulations ?? existing.regulations,
      slug,
      updatedAt: now,
    }

    const result = await this.repository.update(sanitizeDeep(updated))

    // Sync event startYearMonth if parentEvent changed or schedule changed
    const parentEventChanged = existing.parentEvent !== nextParentEvent
    const startYearMonthChanged = existing.startYearMonth !== nextStartYearMonth

    if (parentEventChanged || startYearMonthChanged) {
      const eventsToSync = new Set<string>()
      if (parentEventChanged && existing.parentEvent) {
        eventsToSync.add(existing.parentEvent)
      }
      if (nextParentEvent) {
        eventsToSync.add(nextParentEvent)
      }
      // Sync in parallel, log errors but don't throw
      await Promise.all(
        Array.from(eventsToSync).map((eventId) =>
          eventService.syncStartYearMonth(eventId).catch((err) => {
            console.warn(`Failed to sync event ${eventId} startYearMonth:`, err)
          })
        )
      )
    }

    return result
  }

  async publish(id: string, existing?: Tournament): Promise<Tournament> {
    return this.update({ id, status: 'upcoming', existing })
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repository.getById(id)
    await this.repository.delete(id)

    // Sync event startYearMonth if tournament had a parentEvent
    if (existing?.parentEvent) {
      await eventService.syncStartYearMonth(existing.parentEvent).catch((err) => {
        console.warn(`Failed to sync event ${existing.parentEvent} startYearMonth:`, err)
      })
    }
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const foundId = await this.repository.slugExists(slug)
    return foundId !== null && foundId !== excludeId
  }

  async searchByTitle(prefix: string): Promise<Tournament[]> {
    return this.repository.searchByTitle(prefix)
  }

  private async resolveSlug(
    desiredSlug?: string,
    currentTournamentId?: string
  ): Promise<string> {
    if (desiredSlug) {
      const normalized = normalizeSlug(desiredSlug)
      if (!isValidSlug(normalized)) {
        throw new Error(
          `Slug must be at least ${SLUG_MIN_LENGTH} lowercase latin letters, numbers or hyphens`
        )
      }
      const foundId = await this.repository.slugExists(normalized)
      if (foundId && foundId !== currentTournamentId) {
        throw new Error('Slug already in use')
      }
      return normalized
    }

    return generateRandomSlug()
  }
}

export const tournamentService = new TournamentService(
  firestoreTournamentRepository
)
