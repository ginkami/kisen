import type { QueryDocumentSnapshot } from 'firebase/firestore'
import type { Tournament } from '../domain/tournament.ts'
import type { Event } from '../domain/event.ts'
import type { Player } from '../domain/player.ts'
import type { Regulation } from '../domain/regulation.ts'

export interface ListTournamentsFilters {
  status?: 'draft' | 'upcoming' | 'ongoing' | 'finished' | 'canceled'
  isPublic?: boolean
  hostAssociation?: string
  parentEvent?: string
  createdBy?: string
  startYearMonth?: string
}

export type PublishedTournamentStatus = 'finished' | 'ongoing' | 'upcoming'

export interface ListPublishedTournamentsParams {
  status: PublishedTournamentStatus
  country?: string
  startFrom?: Date
  startTo?: Date
  pageSize: number
  /** Firestore document snapshot to start after (cursor pagination). */
  cursor?: QueryDocumentSnapshot | null
}

export interface PaginatedTournaments {
  items: Tournament[]
  nextCursor: QueryDocumentSnapshot | null
}

export interface TournamentRepository {
  getBySlug(slug: string): Promise<Tournament | null>
  getById(id: string): Promise<Tournament | null>
  list(filters?: ListTournamentsFilters): Promise<Tournament[]>
  listPublishedTournaments(
    params: ListPublishedTournamentsParams
  ): Promise<PaginatedTournaments>
  create(tournament: Tournament): Promise<Tournament>
  update(tournament: Tournament): Promise<Tournament>
  updateMany(tournaments: Tournament[]): Promise<void>
  delete(id: string): Promise<void>
  slugExists(slug: string): Promise<string | null>
  searchByTitle(prefix: string): Promise<Tournament[]>
}

export interface ListEventsFilters {
  createdBy?: string
  startYearMonth?: string
  hostAssociation?: string
}

export interface EventRepository {
  getById(id: string): Promise<Event | null>
  getByIds(ids: string[]): Promise<Event[]>
  getBySlug(slug: string): Promise<Event | null>
  list(filters?: ListEventsFilters): Promise<Event[]>
  create(event: Event): Promise<Event>
  update(event: Event): Promise<Event>
  updateMany(events: Event[]): Promise<void>
  delete(id: string): Promise<void>
  slugExists(slug: string): Promise<string | null>
  searchByTitle(prefix: string): Promise<Event[]>
}

export interface ListPlayersFilters {
  primaryAssociation?: string
  secondaryAssociations?: string
}

export interface PlayerRepository {
  getById(id: string): Promise<Player | null>
  listAll(): Promise<Player[]>
  list(filters?: ListPlayersFilters): Promise<Player[]>
  create(player: Player): Promise<Player>
  update(player: Player): Promise<Player>
  updateMany(players: Player[]): Promise<void>
  delete(id: string): Promise<void>
  searchByFamilyName(prefix: string): Promise<Player[]>
}

export const PlayerRepositoryKey = Symbol('PlayerRepository')

export const EventRepositoryKey = Symbol('EventRepository')

export interface ListRegulationsFilters {
  createdBy?: string
  association?: string
}

export interface RegulationRepository {
  getById(id: string): Promise<Regulation | null>
  list(filters?: ListRegulationsFilters): Promise<Regulation[]>
  create(regulation: Regulation): Promise<Regulation>
  update(regulation: Regulation): Promise<Regulation>
  updateMany(regulations: Regulation[]): Promise<void>
  delete(id: string): Promise<void>
}

export const RegulationRepositoryKey = Symbol('RegulationRepository')
