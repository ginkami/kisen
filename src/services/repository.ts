import type { Tournament } from '../domain/tournament.ts'
import type { Event } from '../domain/event.ts'
import type { Player } from '../domain/player.ts'

export interface ListTournamentsFilters {
  status?: 'draft' | 'upcoming' | 'ongoing' | 'finished' | 'canceled'
  isPublic?: boolean
  hostAssociation?: string
  parentEvent?: string
  createdBy?: string
  startYearMonth?: string
}

export interface TournamentRepository {
  getBySlug(slug: string): Promise<Tournament | null>
  getById(id: string): Promise<Tournament | null>
  list(filters?: ListTournamentsFilters): Promise<Tournament[]>
  create(tournament: Tournament): Promise<Tournament>
  update(tournament: Tournament): Promise<Tournament>
  delete(id: string): Promise<void>
  slugExists(slug: string): Promise<boolean>
}

export const TournamentRepositoryKey = Symbol('TournamentRepository')

export interface ListEventsFilters {
  createdBy?: string
  startYearMonth?: string
  hostAssociation?: string
}

export interface EventRepository {
  getById(id: string): Promise<Event | null>
  getBySlug(slug: string): Promise<Event | null>
  list(filters?: ListEventsFilters): Promise<Event[]>
  create(event: Event): Promise<Event>
  update(event: Event): Promise<Event>
  delete(id: string): Promise<void>
  slugExists(slug: string): Promise<boolean>
}

export interface PlayerRepository {
  getById(id: string): Promise<Player | null>
  listAll(): Promise<Player[]>
  create(player: Player): Promise<Player>
  update(player: Player): Promise<Player>
  delete(id: string): Promise<void>
  searchByFamilyName(prefix: string): Promise<Player[]>
}

export const PlayerRepositoryKey = Symbol('PlayerRepository')

export const EventRepositoryKey = Symbol('EventRepository')
