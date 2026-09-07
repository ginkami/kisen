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
  limit,
} from 'firebase/firestore'
import { db } from './firebaseConfig.ts'
import type { Player } from '../domain/player.ts'
import type { ListPlayersFilters, PlayerRepository } from './repository.ts'
import { supportedLocales } from '../domain/locale.ts'
import {
  chunkArray,
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

  async updateMany(players: Player[]): Promise<void> {
    if (players.length === 0) return
    for (const chunk of chunkArray(players)) {
      const batch = writeBatch(db)
      for (const player of chunk) {
        batch.set(doc(db, COLLECTION_NAME, player.id), toFirestore(player))
      }
      await batch.commit()
    }
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

  async list(filters: ListPlayersFilters = {}): Promise<Player[]> {
    const constraints: ReturnType<typeof where | typeof orderBy>[] = []

    if (filters.primaryAssociation) {
      constraints.push(where('primaryAssociation', '==', filters.primaryAssociation))
    }
    if (filters.secondaryAssociations) {
      constraints.push(
        where('secondaryAssociations', 'array-contains', filters.secondaryAssociations)
      )
    }

    if (constraints.length === 0) {
      return this.listAll()
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

  async searchByFamilyName(prefix: string): Promise<Player[]> {
    const MAX_RESULTS = 20

    const perLocaleQueries = supportedLocales.map((locale) => {
      const fieldPath = `locales.${locale}.familyName`
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
    const merged: Player[] = []

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

export const firestorePlayerRepository = new FirestorePlayerRepository()