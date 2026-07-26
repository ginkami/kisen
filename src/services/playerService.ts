import { uuidv7 } from 'uuidv7'
import type { Player } from '../domain/player.ts'
import type { PlayerRepository } from './repository.ts'
import { firestorePlayerRepository } from './firestorePlayerRepository.ts'

export interface CreatePlayerInput {
  createdBy: string
  locales: Player['locales']
  nationality: string
  residence?: string
  gender?: Player['gender']
  currentRating?: Player['currentRating']
  birthDate?: Player['birthDate']
  primaryAssociation?: string | null
  secondaryAssociations?: string[]
}

export interface UpdatePlayerInput {
  id: string
  locales?: Player['locales']
  nationality?: string
  residence?: string
  gender?: Player['gender']
  currentRating?: Player['currentRating']
  birthDate?: Player['birthDate']
  primaryAssociation?: string | null
  secondaryAssociations?: string[]
  existing?: Player
}

export class PlayerService {
  private readonly repository: PlayerRepository

  constructor(repository: PlayerRepository) {
    this.repository = repository
  }

  async getById(id: string): Promise<Player | null> {
    return this.repository.getById(id)
  }

  async create(input: CreatePlayerInput): Promise<Player> {
    const player: Player = {
      id: uuidv7(),
      createdBy: input.createdBy,
      locales: input.locales,
      nationality: input.nationality,
      residence: input.residence,
      gender: input.gender ?? null,
      currentRating: input.currentRating ?? { value: null, rank: null },
      birthDate: input.birthDate ?? null,
      primaryAssociation: input.primaryAssociation ?? null,
      secondaryAssociations: input.secondaryAssociations ?? [],
    }

    return this.repository.create(player)
  }

  async update(input: UpdatePlayerInput): Promise<Player> {
    const existing = input.existing ?? (await this.repository.getById(input.id))
    if (!existing) {
      throw new Error(`Player with id ${input.id} not found`)
    }

    const updated: Player = {
      ...existing,
      locales: input.locales ?? existing.locales,
      nationality: input.nationality ?? existing.nationality,
      residence: input.residence ?? existing.residence,
      gender: input.gender !== undefined ? input.gender : existing.gender,
      currentRating: input.currentRating ?? existing.currentRating,
      birthDate: input.birthDate !== undefined ? input.birthDate : existing.birthDate,
      primaryAssociation:
        input.primaryAssociation !== undefined
          ? input.primaryAssociation
          : existing.primaryAssociation,
      secondaryAssociations:
        input.secondaryAssociations ?? existing.secondaryAssociations,
    }

    return this.repository.update(updated)
  }

  async delete(id: string): Promise<void> {
    return this.repository.delete(id)
  }

  async searchByFamilyName(prefix: string, locale: string): Promise<Player[]> {
    return this.repository.searchByFamilyName(prefix, locale)
  }
}

export const playerService = new PlayerService(firestorePlayerRepository)