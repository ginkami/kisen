import { uuidv7 } from 'uuidv7'
import { eventSchema, type Event } from '../domain/event.ts'
import type { EventRepository } from './repository.ts'
import { firestoreEventRepository } from './firestoreEventRepository.ts'
import { sanitizeDeep } from '../utils/sanitize.ts'
import { firestoreTournamentRepository } from './firestoreTournamentRepository.ts'
import {
  generateRandomSlug,
  isValidSlug,
  normalizeSlug,
  SLUG_MIN_LENGTH,
} from './slugService.ts'
import { formatDateToYearMonth } from '../utils/yearMonth.ts'

export interface CreateEventInput {
  createdBy: string
  hostAssociation: string | null
  locales: Event['locales']
  regulations?: string[]
  desiredSlug?: string
}

export interface UpdateEventInput {
  id: string
  hostAssociation?: string
  locales?: Event['locales']
  regulations?: string[]
  desiredSlug?: string
}

const MAX_SLUG_ATTEMPTS = 10

export class EventService {
  private readonly repository: EventRepository

  constructor(repository: EventRepository) {
    this.repository = repository
  }

  async getById(id: string): Promise<Event | null> {
    return this.repository.getById(id)
  }

  async getBySlug(slug: string): Promise<Event | null> {
    return this.repository.getBySlug(slug)
  }

  async listByYearMonth(
    startYearMonth: string,
    createdBy?: string
  ): Promise<Event[]> {
    return this.repository.list({ startYearMonth, createdBy })
  }

  async create(input: CreateEventInput): Promise<Event> {
    const slug = await this.resolveSlug(input.desiredSlug)
    const now = new Date()

    const candidate = {
      id: uuidv7(),
      slug,
      createdBy: input.createdBy,
      hostAssociation: input.hostAssociation || null,
      updatedAt: now,
      startYearMonth: formatDateToYearMonth(now),
      locales: input.locales,
      regulations: input.regulations ?? [],
    }
    const event = eventSchema.parse(sanitizeDeep(candidate))
    return this.repository.create(event)
  }

  async update(input: UpdateEventInput): Promise<Event> {
    const existing = await this.repository.getById(input.id)
    if (!existing) {
      throw new Error(`Event with id ${input.id} not found`)
    }

    const now = new Date()
    const slug = input.desiredSlug
      ? await this.resolveSlug(input.desiredSlug, existing.id)
      : existing.slug

    const updated: Event = {
      ...existing,
      hostAssociation: input.hostAssociation ?? existing.hostAssociation,
      locales: input.locales ?? existing.locales,
      regulations: input.regulations ?? existing.regulations,
      slug,
      updatedAt: now,
    }

    return this.repository.update(sanitizeDeep(updated))
  }

  async delete(id: string): Promise<void> {
    return this.repository.delete(id)
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const foundId = await this.repository.slugExists(slug)
    return foundId !== null && foundId !== excludeId
  }

  async listMyEvents(userId: string): Promise<Event[]> {
    return this.repository.list({ createdBy: userId })
  }

  async searchByTitle(prefix: string): Promise<Event[]> {
    return this.repository.searchByTitle(prefix)
  }

  async syncStartYearMonth(eventId: string): Promise<void> {
    const event = await this.repository.getById(eventId)
    if (!event) return

    const tournaments = await firestoreTournamentRepository.list({ parentEvent: eventId })
    let startYearMonth: string
    if (tournaments.length > 0) {
      startYearMonth = tournaments.reduce(
        (min, t) => (t.startYearMonth < min ? t.startYearMonth : min),
        tournaments[0].startYearMonth
      )
    } else {
      startYearMonth = formatDateToYearMonth(new Date())
    }

    if (event.startYearMonth !== startYearMonth) {
      await this.repository.update({ ...event, startYearMonth, updatedAt: new Date() })
    }
  }

  private async resolveSlug(
    desiredSlug?: string,
    currentEventId?: string
  ): Promise<string> {
    if (desiredSlug) {
      const normalized = normalizeSlug(desiredSlug)
      if (!isValidSlug(normalized)) {
        throw new Error(
          `Slug must be at least ${SLUG_MIN_LENGTH} lowercase latin letters, numbers or hyphens`
        )
      }
      const existing = await this.repository.getBySlug(normalized)
      if (existing && existing.id !== currentEventId) {
        throw new Error('Slug already in use')
      }
      return normalized
    }

    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
      const candidate = generateRandomSlug()
      const existing = await this.repository.getBySlug(candidate)
      if (!existing) {
        return candidate
      }
    }

    throw new Error('Failed to generate unique slug')
  }
}

export const eventService = new EventService(firestoreEventRepository)
