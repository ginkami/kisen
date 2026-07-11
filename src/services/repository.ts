import type { Tournament } from '../domain/tournament.ts'

export interface ListTournamentsFilters {
  status?: 'draft' | 'upcoming' | 'ongoing' | 'finished' | 'canceled'
  hostAssociation?: string
  parentEvent?: string
  createdBy?: string
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
