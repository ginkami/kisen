import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebaseConfig.ts'
import type { Tournament } from '../domain/tournament.ts'
import type {
  ListTournamentsFilters,
  TournamentRepository,
} from './repository.ts'

const COLLECTION_NAME = 'tournaments'

function datesToTimestamps(value: unknown): unknown {
  if (value instanceof Date) {
    return Timestamp.fromDate(value)
  }
  if (Array.isArray(value)) {
    return value.map(datesToTimestamps)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, datesToTimestamps(val)])
    )
  }
  return value
}

function timestampsToDates(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate()
  }
  if (Array.isArray(value)) {
    return value.map(timestampsToDates)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, timestampsToDates(val)])
    )
  }
  return value
}

function toFirestore(tournament: Tournament): Record<string, unknown> {
  return datesToTimestamps(tournament) as Record<string, unknown>
}

function fromFirestore(data: Record<string, unknown>): Tournament {
  return timestampsToDates(data) as Tournament
}

export class FirestoreTournamentRepository implements TournamentRepository {
  private get collectionRef() {
    return collection(db, COLLECTION_NAME)
  }

  async getBySlug(slug: string): Promise<Tournament | null> {
    const q = query(this.collectionRef, where('slug', '==', slug))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    const docSnap = snapshot.docs[0]
    return fromFirestore({
      id: docSnap.id,
      ...docSnap.data(),
    } as Record<string, unknown>)
  }

  async getById(id: string): Promise<Tournament | null> {
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

  async list(filters: ListTournamentsFilters = {}): Promise<Tournament[]> {
    const constraints: ReturnType<typeof where>[] = []

    if (filters.status) {
      constraints.push(where('status', '==', filters.status))
    }
    if (filters.hostAssociation) {
      constraints.push(where('hostAssociation', '==', filters.hostAssociation))
    }
    if (filters.parentEvent) {
      constraints.push(where('parentEvent', '==', filters.parentEvent))
    }
    if (filters.createdBy) {
      constraints.push(where('createdBy', '==', filters.createdBy))
    }

    const q = query(this.collectionRef, ...constraints)
    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnap) =>
      fromFirestore({
        id: docSnap.id,
        ...docSnap.data(),
      } as Record<string, unknown>)
    )
  }

  async create(tournament: Tournament): Promise<Tournament> {
    const docRef = doc(db, COLLECTION_NAME, tournament.id)
    await setDoc(docRef, toFirestore(tournament))
    return tournament
  }

  async update(tournament: Tournament): Promise<Tournament> {
    const docRef = doc(db, COLLECTION_NAME, tournament.id)
    await setDoc(docRef, toFirestore(tournament))
    return tournament
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  }

  async slugExists(slug: string): Promise<boolean> {
    const existing = await this.getBySlug(slug)
    return existing !== null
  }
}

export const firestoreTournamentRepository = new FirestoreTournamentRepository()
