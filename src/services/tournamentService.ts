import { uuidv7 } from 'uuidv7'
import type { Tournament, TournamentStatus } from '../domain/tournament.ts'
import { generateRandomSlug, isValidSlug, normalizeSlug } from './slugService.ts'
import type { TournamentRepository } from './repository.ts'
import { firestoreTournamentRepository } from './firestoreTournamentRepository.ts'

export interface CreateTournamentInput {
  createdBy: string
  hostAssociation: string | null
  parentEvent: string | null
  locales: Tournament['locales']
  isOnline: boolean
  country: string | null
  settings: Tournament['settings']
  schedule: Tournament['schedule']
  desiredSlug?: string
}

export interface UpdateTournamentInput {
  id: string
  locales?: Tournament['locales']
  isOnline?: boolean
  country?: string | null
  settings?: Tournament['settings']
  schedule?: Tournament['schedule']
  arbiters?: Tournament['arbiters']
  participants?: Tournament['participants']
  games?: Tournament['games']
  status?: TournamentStatus
  desiredSlug?: string
}

const MAX_SLUG_ATTEMPTS = 10

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
      status: 'upcoming',
    })
  }

  async listByCreator(createdBy: string): Promise<Tournament[]> {
    return this.repository.list({ createdBy })
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
      locales: input.locales,
      isOnline: input.isOnline,
      country: input.country,
      settings: input.settings,
      schedule: input.schedule,
      arbiters: [],
      participants: [],
      games: [],
    }

    return this.repository.create(tournament)
  }

  async update(input: UpdateTournamentInput): Promise<Tournament> {
    const existing = await this.repository.getById(input.id)
    if (!existing) {
      throw new Error(`Tournament with id ${input.id} not found`)
    }

    const now = new Date()
    const slug = input.desiredSlug
      ? await this.resolveSlug(input.desiredSlug, existing.id)
      : existing.slug

    const nextStatus = input.status ?? this.inferStatus(existing, now)

    const updated: Tournament = {
      ...existing,
      locales: input.locales ?? existing.locales,
      isOnline: input.isOnline ?? existing.isOnline,
      country: input.country ?? existing.country,
      settings: input.settings ?? existing.settings,
      schedule: input.schedule ?? existing.schedule,
      arbiters: input.arbiters ?? existing.arbiters,
      participants: input.participants ?? existing.participants,
      games: input.games ?? existing.games,
      status: nextStatus,
      slug,
      updatedAt: now,
    }

    return this.repository.update(updated)
  }

  async publish(id: string): Promise<Tournament> {
    return this.update({ id, status: 'upcoming' })
  }

  async delete(id: string): Promise<void> {
    return this.repository.delete(id)
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
        throw new Error('Invalid slug format')
      }
      const existing = await this.repository.getBySlug(normalized)
      if (existing && existing.id !== currentTournamentId) {
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

export const tournamentService = new TournamentService(
  firestoreTournamentRepository
)
