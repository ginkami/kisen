import { uuidv7 } from 'uuidv7'
import { regulationSchema, type Regulation } from '../domain/regulation.ts'
import type { RegulationRepository } from './repository.ts'
import { firestoreRegulationRepository } from './firestoreRegulationRepository.ts'

export interface CreateRegulationInput {
  createdBy: string
  association: string | null
  locales: Regulation['locales']
}

export interface UpdateRegulationInput {
  id: string
  association?: string | null
  locales?: Regulation['locales']
}

export class RegulationService {
  private readonly repository: RegulationRepository

  constructor(repository: RegulationRepository) {
    this.repository = repository
  }

  async getById(id: string): Promise<Regulation | null> {
    return this.repository.getById(id)
  }

  async create(input: CreateRegulationInput): Promise<Regulation> {
    const now = new Date()

    const candidate = {
      id: uuidv7(),
      createdBy: input.createdBy,
      association: input.association || null,
      updatedAt: now,
      locales: input.locales,
    }
    const regulation = regulationSchema.parse(candidate)
    return this.repository.create(regulation)
  }

  async update(input: UpdateRegulationInput): Promise<Regulation> {
    const existing = await this.repository.getById(input.id)
    if (!existing) {
      throw new Error(`Regulation with id ${input.id} not found`)
    }

    const now = new Date()

    const updated: Regulation = {
      ...existing,
      association: input.association !== undefined ? (input.association || null) : existing.association,
      locales: input.locales ?? existing.locales,
      updatedAt: now,
    }

    return this.repository.update(updated)
  }

  async delete(id: string): Promise<void> {
    return this.repository.delete(id)
  }

  async listEditable(
    userId: string,
    managedAssociationIds: string[],
    isAdmin: boolean
  ): Promise<Regulation[]> {
    if (isAdmin) {
      return this.repository.list({})
    }

    const queries: Promise<Regulation[]>[] = [
      this.repository.list({ createdBy: userId }),
    ]
    for (const associationId of managedAssociationIds) {
      queries.push(this.repository.list({ association: associationId }))
    }

    const results = await Promise.all(queries)
    const byId = new Map<string, Regulation>()
    for (const batch of results) {
      for (const regulation of batch) {
        byId.set(regulation.id, regulation)
      }
    }

    return Array.from(byId.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    )
  }
}

export const regulationService = new RegulationService(firestoreRegulationRepository)