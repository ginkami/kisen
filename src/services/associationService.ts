import { associationSchema, type Association } from '../domain/association.ts'
import { normalizeSlug } from './slugService.ts'
import { uuidv7 } from 'uuidv7'
import {
  FirestoreAssociationRepository,
  firestoreAssociationRepository,
} from './firestoreAssociationRepository.ts'

export class AssociationService {
  private readonly repository: FirestoreAssociationRepository

  constructor(repository: FirestoreAssociationRepository) {
    this.repository = repository
  }

  async getById(id: string): Promise<Association | null> {
    return this.repository.getById(id)
  }

  async listManagedByUser(userId: string): Promise<Association[]> {
    return this.repository.listManagedByUser(userId)
  }

  async create(input: Omit<Association, 'id' | 'slug'> & { desiredSlug?: string }): Promise<Association> {
    const id = uuidv7()
    const slug = normalizeSlug(input.desiredSlug ?? id)

    const association: Association = {
      id,
      slug,
      ...input,
    }
    associationSchema.parse(association)
    return this.repository.create(association)
  }

  async update(input: Partial<Association> & { id: string; existing?: Association }): Promise<Association> {
    const existing = input.existing ?? (await this.repository.getById(input.id))
    if (!existing) throw new Error(`Association with id ${input.id} not found`)

    const updated: Association = {
      ...existing,
      ...input,
    }
    associationSchema.parse(updated)
    return this.repository.update(updated)
  }

  async delete(id: string): Promise<void> {
    return this.repository.delete(id)
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
