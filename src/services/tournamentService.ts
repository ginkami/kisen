import { uuidv7 } from 'uuidv7'
import type {
  Tournament,
  TournamentStatus,
  TournamentLocale,
} from '../domain/tournament.ts'
import {
  generateRandomSlug,
  isValidSlug,
  normalizeSlug,
  SLUG_MIN_LENGTH,
} from './slugService.ts'
import type { TournamentRepository } from './repository.ts'
import { firestoreTournamentRepository } from './firestoreTournamentRepository.ts'
import { eventService } from './eventService.ts'
import { getTournamentStartYearMonth } from '../utils/yearMonth.ts'
import { supportedLocales } from '../domain/locale.ts'

export interface CreateTournamentInput {
  createdBy: string
  hostAssociation: string | null
  parentEvent: string | null
  locales: Tournament['locales']
  country: string
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
  country?: string
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

function defaultLocales(location = ''): Record<string, TournamentLocale> {
  return Object.fromEntries(
    supportedLocales.map((locale) => [
      locale,
      {
        title: '',
        location,
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
      country: input.country,
      settings: input.settings,
      schedule: input.schedule,
      arbiter: input.arbiter,
      participants: [],
      games: [],
      regulations: [],
    }

    const result = await this.repository.create(tournament)

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
    const { country, city } = await this.detectLocationByIp()
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
      locales: defaultLocales(city),
      country,
      settings: defaultSettings(),
      schedule,
      arbiter: input.arbiter,
      participants: [],
      games: [],
      regulations: [],
    }

    const created = await this.repository.create(tournament)

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

    const nextStatus = input.status ?? this.inferStatus(existing, now)
    const isPublic =
      nextStatus !== 'draft' && nextStatus !== 'proposed_for_removing'
    const nextSchedule = input.schedule ?? existing.schedule
    const nextStartYearMonth = getTournamentStartYearMonth({
      ...existing,
      schedule: nextSchedule,
    } as Tournament)

    const nextParentEvent =
      input.parentEvent !== undefined ? input.parentEvent : existing.parentEvent

    const updated: Tournament = {
      ...existing,
      locales: input.locales ?? existing.locales,
      country: input.country ?? existing.country,
      settings: input.settings ?? existing.settings,
      schedule: nextSchedule,
      arbiter: input.arbiter ?? existing.arbiter,
      participants: input.participants ?? existing.participants,
      games: input.games ?? existing.games,
      currentRound: input.currentRound ?? existing.currentRound,
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

    const result = await this.repository.update(updated)

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

  private inferStatus(
    tournament: Tournament,
    editTime: Date
  ): Tournament['status'] {
    if (tournament.status === 'draft') {
      return 'draft'
    }

    const firstRound = tournament.schedule.rounds.at(0)
    if (!firstRound) {
      return tournament.status
    }

    const hasStarted = editTime >= firstRound.scheduledAt
    if (hasStarted && tournament.status === 'upcoming') {
      return 'ongoing'
    }

    return tournament.status
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

  private async detectLocationByIp(): Promise<{ country: string; city: string }> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      const response = await fetch('https://ipwho.is/', {
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) {
        return { country: 'BY', city: '' }
      }

      const data = await response.json()
      const country = typeof data.country_code === 'string'
        ? data.country_code.toUpperCase()
        : 'BY'
      const city = typeof data.city === 'string' ? data.city : ''
      return { country, city }
    } catch {
      return { country: 'BY', city: '' }
    }
  }
}

export const tournamentService = new TournamentService(
  firestoreTournamentRepository
)
