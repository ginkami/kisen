import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from './firebaseConfig.ts'
import type { Tournament } from '../domain/tournament.ts'
import type {
  ListTournamentsFilters,
  TournamentRepository,
} from './repository.ts'
import { supportedLocales } from '../domain/locale.ts'
import {
  datesToTimestamps,
  timestampsToDates,
  removeUndefined,
} from './firestoreHelpers.ts'

function withDefaultArbiter(data: Record<string, unknown>): Record<string, unknown> {
  if (data.arbiter) return data
  return {
    ...data,
    arbiter: {
      locales: Object.fromEntries(
        supportedLocales.map((locale) => [
          locale,
          { givenName: '', familyName: '' },
        ])
      ),
    },
  }
}

const COLLECTION_NAME = 'tournaments'

function toFirestore(tournament: Tournament): Record<string, unknown> {
  return removeUndefined(datesToTimestamps(tournament)) as Record<string, unknown>
}

function fromFirestore(data: Record<string, unknown>): Tournament {
  return timestampsToDates(withDefaultArbiter(data)) as Tournament
}

export class FirestoreTournamentRepository implements TournamentRepository {
  private get collectionRef() {
    return collection(db, COLLECTION_NAME)
  }

  async getBySlug(slug: string): Promise<Tournament | null> {
    const q = query(
      this.collectionRef,
      where('slug', '==', slug),
      where('isPublic', '==', true)
    )
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
    const constraints: ReturnType<typeof where | typeof orderBy>[] = []

    if (filters.status) {
      constraints.push(where('status', '==', filters.status))
    }
    if (filters.isPublic !== undefined) {
      constraints.push(where('isPublic', '==', filters.isPublic))
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
    if (filters.startYearMonth) {
      constraints.push(where('startYearMonth', '==', filters.startYearMonth))
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

  async slugExists(slug: string): Promise<string | null> {
    const q = query(
      this.collectionRef,
      where('slug', '==', slug)
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    return snapshot.docs[0].id
  }

  async searchByTitle(prefix: string): Promise<Tournament[]> {
    const MAX_RESULTS = 20

    const perLocaleQueries = supportedLocales.map((locale) => {
      const fieldPath = `locales.${locale}.title`
      const q = query(
        this.collectionRef,
        where(fieldPath, '>=', prefix),
        where(fieldPath, '<=', prefix + '\uf8ff'),
        orderBy(fieldPath),
        limit(MAX_RESULTS)
      )
      return getDocs(q)
    })

    const snapshots = await Promise.all(perLocaleQueries)

    const seen = new Set<string>()
    const merged: Tournament[] = []

    for (const snapshot of snapshots) {
      for (const docSnap of snapshot.docs) {
        const id = docSnap.id
        if (seen.has(id)) continue
        seen.add(id)
        merged.push(
          fromFirestore({
            id,
            ...docSnap.data(),
          } as Record<string, unknown>)
        )
        if (merged.length >= MAX_RESULTS) return merged
      }
    }

    return merged
  }
}

export const firestoreTournamentRepository = new FirestoreTournamentRepository()
