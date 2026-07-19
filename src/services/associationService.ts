import type { Association } from '../domain/association.ts'
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
