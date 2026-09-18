import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { z } from 'zod'
import { db } from './firebaseConfig.ts'
import { datesToTimestamps, timestampsToDates } from './firestoreHelpers.ts'
import type { Promotion } from '../domain/promotion.ts'

export type { Promotion }

const PROMOTIONS_COLLECTION = 'promotions'

export const promotionDocumentSchema = z.object({
  id: z.string().uuid(),
  tournament: z.string().uuid(),
  showOnHome: z.boolean().default(false),
  startedAt: z.date(),
  endedAt: z.date(),
})

const documentToPromotion = (data: Record<string, unknown>): Promotion =>
  promotionDocumentSchema.parse(timestampsToDates(data))

function promotionRef(id: string) {
  return doc(db, PROMOTIONS_COLLECTION, id)
}

export async function listPromotionsByTournament(tournamentId: string): Promise<Promotion[]> {
  const snapshot = await getDocs(collection(db, PROMOTIONS_COLLECTION))
  return snapshot.docs
    .map((d) => documentToPromotion(d.data()))
    .filter((p) => p.tournament === tournamentId)
}

export async function listAllPromotions(): Promise<Promotion[]> {
  const snapshot = await getDocs(collection(db, PROMOTIONS_COLLECTION))
  return snapshot.docs.map((d) => documentToPromotion(d.data()))
}

/** Creates a promotion for the tournament with default window values. */
export async function createPromotion(tournamentId: string): Promise<Promotion> {
  const id = crypto.randomUUID()
  const now = new Date()
  const endedAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const promotion: Promotion = {
    id,
    tournament: tournamentId,
    showOnHome: false,
    startedAt: now,
    endedAt,
  }
  await setDoc(promotionRef(id), datesToTimestamps({ ...promotion } as Record<string, unknown>))
  return promotion
}

export async function updatePromotion(
  id: string,
  patch: Partial<Pick<Promotion, 'showOnHome' | 'startedAt' | 'endedAt'>>
): Promise<void> {
  await updateDoc(
    promotionRef(id),
    datesToTimestamps(patch as { [key: string]: unknown }) as Record<string, unknown>,
  )
}

export async function deletePromotion(id: string): Promise<void> {
  await deleteDoc(promotionRef(id))
}

/** Deletes every promotion referencing the tournament (cascade on tournament removal). */
export async function deletePromotionsByTournament(tournamentId: string): Promise<void> {
  const snapshot = await getDocs(
    query(collection(db, PROMOTIONS_COLLECTION), where('tournament', '==', tournamentId)),
  )
  if (snapshot.empty) return
  const batch = writeBatch(db)
  snapshot.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}
