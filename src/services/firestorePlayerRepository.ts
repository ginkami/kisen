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
import type { Player } from '../domain/player.ts'
import type { PlayerRepository } from './repository.ts'
import {
  datesToTimestamps,
  timestampsToDates,
  removeUndefined,
} from './firestoreHelpers.ts'

const COLLECTION_NAME = 'players'

function withDefaultRating(data: Record<string, unknown>): Record<string, unknown> {
  if (data.currentRating) return data
  return {
    ...data,
    currentRating: { value: null, rank: null },
  }
}

function toFirestore(player: Player): Record<string, unknown> {
  return removeUndefined(datesToTimestamps(player)) as Record<string, unknown>
}

function fromFirestore(data: Record<string, unknown>): Player {
  return timestampsToDates(withDefaultRating(data)) as Player
}

export class FirestorePlayerRepository implements PlayerRepository {
  private get collectionRef() {
    return collection(db, COLLECTION_NAME)
  }

  async getById(id: string): Promise<Player | null> {
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

  async create(player: Player): Promise<Player> {
    const docRef = doc(db, COLLECTION_NAME, player.id)
    await setDoc(docRef, toFirestore(player))
    return player
  }

  async update(player: Player): Promise<Player> {
    const docRef = doc(db, COLLECTION_NAME, player.id)
    await setDoc(docRef, toFirestore(player))
    return player
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  }

  async listAll(): Promise<Player[]> {
    const snapshot = await getDocs(this.collectionRef)
    return snapshot.docs.map((docSnap) =>
      fromFirestore({
        id: docSnap.id,
        ...docSnap.data(),
      } as Record<string, unknown>)
    )
  }

  async searchByFamilyName(prefix: string, locale: string): Promise<Player[]> {
    const fieldPath = `locales.${locale}.familyName`
    const q = query(
      this.collectionRef,
      where(fieldPath, '>=', prefix),
      where(fieldPath, '<=', prefix + '\uf8ff'),
      orderBy(fieldPath),
      limit(20)
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnap) =>
      fromFirestore({
        id: docSnap.id,
        ...docSnap.data(),
      } as Record<string, unknown>)
    )
  }
}

export const firestorePlayerRepository = new FirestorePlayerRepository()