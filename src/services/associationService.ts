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
}

export const associationService = new AssociationService(
  firestoreAssociationRepository
)
