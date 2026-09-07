import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebaseConfig.ts'
import type { Regulation } from '../domain/regulation.ts'
import type { RegulationRepository, ListRegulationsFilters } from './repository.ts'
import { chunkArray, datesToTimestamps, timestampsToDates } from './firestoreHelpers.ts'

const COLLECTION_NAME = 'regulations'

function toFirestore(regulation: Regulation): Record<string, unknown> {
  return datesToTimestamps(regulation) as Record<string, unknown>
}

function fromFirestore(data: Record<string, unknown>): Regulation {
  return timestampsToDates(data) as Regulation
}

export class FirestoreRegulationRepository implements RegulationRepository {
  private get collectionRef() {
    return collection(db, COLLECTION_NAME)
  }

  async getById(id: string): Promise<Regulation | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      return null
    }

    return fromFirestore({
      id: snapshot.id,
      ...snapshot.data(),
    } as Record<string, unknown>)
  }

  async list(filters: ListRegulationsFilters = {}): Promise<Regulation[]> {
    const constraints: ReturnType<typeof where | typeof orderBy>[] = []

    if (filters.createdBy) {
      constraints.push(where('createdBy', '==', filters.createdBy))
    }
    if (filters.association) {
      constraints.push(where('association', '==', filters.association))
    }

    constraints.push(orderBy('updatedAt', 'desc'))

    const q = query(this.collectionRef, ...constraints)
    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnap) =>
      fromFirestore({
        id: docSnap.id,
        ...docSnap.data(),
      } as Record<string, unknown>)
    )
  }

  async create(regulation: Regulation): Promise<Regulation> {
    const docRef = doc(db, COLLECTION_NAME, regulation.id)
    await setDoc(docRef, toFirestore(regulation))
    return regulation
  }

  async update(regulation: Regulation): Promise<Regulation> {
    const docRef = doc(db, COLLECTION_NAME, regulation.id)
    await setDoc(docRef, toFirestore(regulation))
    return regulation
  }

  async updateMany(regulations: Regulation[]): Promise<void> {
    if (regulations.length === 0) return
    for (const chunk of chunkArray(regulations)) {
      const batch = writeBatch(db)
      for (const regulation of chunk) {
        batch.set(doc(db, COLLECTION_NAME, regulation.id), toFirestore(regulation))
      }
      await batch.commit()
    }
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  }
}

export const firestoreRegulationRepository = new FirestoreRegulationRepository()