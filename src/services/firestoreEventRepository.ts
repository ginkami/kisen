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
} from 'firebase/firestore'
import { db } from './firebaseConfig.ts'
import type { Event } from '../domain/event.ts'
import type { EventRepository, ListEventsFilters } from './repository.ts'
import { datesToTimestamps, timestampsToDates } from './firestoreHelpers.ts'

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
}

export const firestoreEventRepository = new FirestoreEventRepository()
