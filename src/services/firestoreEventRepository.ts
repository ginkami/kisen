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
  documentId,
} from 'firebase/firestore'
import { db } from './firebaseConfig.ts'
import type { Event } from '../domain/event.ts'
import type { EventRepository, ListEventsFilters } from './repository.ts'
import { supportedLocales } from '../domain/locale.ts'
import { datesToTimestamps, timestampsToDates } from './firestoreHelpers.ts'

/**
 * Split ids into chunks of `size` (Firestore 'in' queries accept at most 30
 * disjunctions).
 */
export function chunkIds(ids: string[], size = 30): string[][] {
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size))
  }
  return chunks
}

const COLLECTION_NAME = 'events'

function toFirestore(event: Event): Record<string, unknown> {
  return datesToTimestamps(event) as Record<string, unknown>
}

function fromFirestore(data: Record<string, unknown>): Event {
  return timestampsToDates(data) as Event
}

export class FirestoreEventRepository implements EventRepository {
  private get collectionRef() {
    return collection(db, COLLECTION_NAME)
  }

  async getById(id: string): Promise<Event | null> {
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

  async getByIds(ids: string[]): Promise<Event[]> {
    // Firestore 'in' queries accept at most 30 disjunctions; chunk large id
    // lists and run the chunks in parallel. Missing docs are skipped.
    const chunks = chunkIds(ids)

    const snapshots = await Promise.all(
      chunks.map((chunk) =>
        getDocs(query(this.collectionRef, where(documentId(), 'in', chunk)))
      )
    )

    const byId = new Map<string, Event>()
    for (const snapshot of snapshots) {
      for (const docSnap of snapshot.docs) {
        byId.set(
          docSnap.id,
          fromFirestore({
            id: docSnap.id,
            ...docSnap.data(),
          } as Record<string, unknown>)
        )
      }
    }

    return ids
      .filter((id, index) => ids.indexOf(id) === index)
      .map((id) => byId.get(id))
      .filter((event): event is Event => event != null)
  }

  async getBySlug(slug: string): Promise<Event | null> {
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

  async list(filters: ListEventsFilters = {}): Promise<Event[]> {
    const constraints: ReturnType<typeof where | typeof orderBy>[] = []

    if (filters.createdBy) {
      constraints.push(where('createdBy', '==', filters.createdBy))
    }
    if (filters.startYearMonth) {
      constraints.push(where('startYearMonth', '==', filters.startYearMonth))
    }
    if (filters.hostAssociation) {
      constraints.push(where('hostAssociation', '==', filters.hostAssociation))
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

  async create(event: Event): Promise<Event> {
    const docRef = doc(db, COLLECTION_NAME, event.id)
    await setDoc(docRef, toFirestore(event))
    return event
  }

  async update(event: Event): Promise<Event> {
    const docRef = doc(db, COLLECTION_NAME, event.id)
    await setDoc(docRef, toFirestore(event))
    return event
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  }

  async slugExists(slug: string): Promise<string | null> {
    const q = query(this.collectionRef, where('slug', '==', slug))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    return snapshot.docs[0].id
  }

  async searchByTitle(prefix: string): Promise<Event[]> {
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
    const merged: Event[] = []

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

export const firestoreEventRepository = new FirestoreEventRepository()
