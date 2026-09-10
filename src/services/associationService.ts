import { associationSchema, type Association } from '../domain/association.ts'
import { playerSchema, type Player } from '../domain/player.ts'
import { normalizeSlug } from './slugService.ts'
import { sanitizeDeep } from '../utils/sanitize.ts'
import { uuidv7 } from 'uuidv7'
import type {
  EventRepository,
  PlayerRepository,
  RegulationRepository,
  TournamentRepository,
} from './repository.ts'
import {
  FirestoreAssociationRepository,
  firestoreAssociationRepository,
} from './firestoreAssociationRepository.ts'
import { firestoreTournamentRepository } from './firestoreTournamentRepository.ts'
import { firestoreEventRepository } from './firestoreEventRepository.ts'
import { firestorePlayerRepository } from './firestorePlayerRepository.ts'
import { firestoreRegulationRepository } from './firestoreRegulationRepository.ts'

export class AssociationService {
  private readonly repository: FirestoreAssociationRepository
  private readonly tournamentRepository: TournamentRepository
  private readonly eventRepository: EventRepository
  private readonly playerRepository: PlayerRepository
  private readonly regulationRepository: RegulationRepository

  constructor(
    repository: FirestoreAssociationRepository,
    tournamentRepository: TournamentRepository = firestoreTournamentRepository,
    eventRepository: EventRepository = firestoreEventRepository,
    playerRepository: PlayerRepository = firestorePlayerRepository,
    regulationRepository: RegulationRepository = firestoreRegulationRepository
  ) {
    this.repository = repository
    this.tournamentRepository = tournamentRepository
    this.eventRepository = eventRepository
    this.playerRepository = playerRepository
    this.regulationRepository = regulationRepository
  }

  async getById(id: string): Promise<Association | null> {
    return this.repository.getById(id)
  }

  /** Batch lookup preserving order; missing ids are omitted from the result. */
  async getByIds(ids: string[]): Promise<Association[]> {
    const unique = [...new Set(ids)].filter((id) => id.trim().length > 0)
    if (unique.length === 0) return []

    const results = await Promise.all(
      unique.map(async (id) => {
        try {
          return await this.repository.getById(id)
        } catch {
          return null
        }
      })
    )
    return results.filter((a): a is Association => a !== null)
  }

  async listManagedByUser(userId: string): Promise<Association[]> {
    return this.repository.listManagedByUser(userId)
  }

  async create(input: Omit<Association, 'id' | 'slug'> & { desiredSlug?: string }): Promise<Association> {
    const { desiredSlug, ...rest } = input
    const id = uuidv7()
    const slug = normalizeSlug(desiredSlug ?? id)

    const candidate = {
      id,
      slug,
      ...rest,
    }
    const association = associationSchema.parse(sanitizeDeep(candidate))
    return this.repository.create(association)
  }

  async update(input: Partial<Association> & { id: string; existing?: Association }): Promise<Association> {
    const { existing: existingInput, ...rest } = input
    const existing = existingInput ?? (await this.repository.getById(input.id))
    if (!existing) throw new Error(`Association with id ${input.id} not found`)

    const candidate = {
      ...existing,
      ...rest,
    }
    const updated = associationSchema.parse(sanitizeDeep(candidate))
    return this.repository.update(updated)
  }

  async delete(id: string): Promise<void> {
    // Discover every entity that references the association.
    const [tournaments, events, playersByPrimary, playersBySecondary, regulations] =
      await Promise.all([
        this.tournamentRepository.list({ hostAssociation: id }),
        this.eventRepository.list({ hostAssociation: id }),
        this.playerRepository.list({ primaryAssociation: id }),
        this.playerRepository.list({ secondaryAssociations: id }),
        this.regulationRepository.list({ association: id }),
      ])

    const now = new Date()

    // A player can reference the association both as primary and secondary;
    // merge both query results by id.
    const players = new Map<string, Player>()
    for (const player of [...playersByPrimary, ...playersBySecondary]) {
      players.set(player.id, player)
    }

    // Normalization parity with the regular update paths of each service:
    // sanitizeDeep + refreshed updatedAt (players additionally pass
    // playerSchema.parse, like PlayerService.update does).
    const cleanedTournaments = tournaments.map((tournament) =>
      sanitizeDeep({
        ...tournament,
        hostAssociation:
          tournament.hostAssociation === id ? null : tournament.hostAssociation,
        updatedAt: now,
      })
    )
    const cleanedEvents = events.map((event) =>
      sanitizeDeep({
        ...event,
        hostAssociation: event.hostAssociation === id ? null : event.hostAssociation,
        updatedAt: now,
      })
    )
    const cleanedPlayers = Array.from(players.values()).map((player) =>
      playerSchema.parse(
        sanitizeDeep({
          ...player,
          primaryAssociation:
            player.primaryAssociation === id ? null : player.primaryAssociation,
          secondaryAssociations: player.secondaryAssociations.filter(
            (associationId) => associationId !== id
          ),
          updatedAt: now,
        })
      )
    )
    const cleanedRegulations = regulations.map((regulation) =>
      sanitizeDeep({
        ...regulation,
        association:
          regulation.association === id ? null : regulation.association,
        updatedAt: now,
      })
    )

    // Link cleanups first; the association document is removed only after all
    // of them succeed. On a partial failure the state degrades to dangling
    // links (the pre-cascade status quo) and re-running delete is idempotent:
    // the list filters simply return fewer documents.
    await Promise.all([
      cleanedTournaments.length > 0
        ? this.tournamentRepository.updateMany(cleanedTournaments)
        : undefined,
      cleanedEvents.length > 0
        ? this.eventRepository.updateMany(cleanedEvents)
        : undefined,
      cleanedPlayers.length > 0
        ? this.playerRepository.updateMany(cleanedPlayers)
        : undefined,
      cleanedRegulations.length > 0
        ? this.regulationRepository.updateMany(cleanedRegulations)
        : undefined,
    ])

    await this.repository.delete(id)
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.repository.getBySlug(slug)
    return existing !== null && existing.id !== excludeId
  }

  async listAll(): Promise<Association[]> {
    return this.repository.listAll()
  }

  async listMyAssociations(userId: string): Promise<Association[]> {
    const [managed, created] = await Promise.all([
      this.repository.listManagedByUser(userId),
      this.repository.listCreatedByUser(userId),
    ])
    const byId = new Map<string, Association>()
    for (const association of managed) {
      byId.set(association.id, association)
    }
    for (const association of created) {
      byId.set(association.id, association)
    }
    return Array.from(byId.values())
  }
}

export const associationService = new AssociationService(
  firestoreAssociationRepository
)
