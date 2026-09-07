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
import type { Tournament } from '../domain/tournament.ts'
import type {
  ListTournamentsFilters,
  TournamentRepository,
} from './repository.ts'
import { supportedLocales } from '../domain/locale.ts'
import { resolveTimeZone, utcToZonedWallClock } from '../utils/scheduleTime.ts'
import {
  chunkArray,
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

/**
 * Remap legacy tournament documents that have top-level `country` and
 * `locales.<lang>.location` / `locales.<lang>.venue` into the new
 * `location` object shape. Coordinates are left undefined (will be
 * resolved by IP on form load).
 */
function remapLegacyLocation(data: Record<string, unknown>): Record<string, unknown> {
  if (data.location) return data

  const country = typeof data.country === 'string' ? data.country : undefined
  const locales = data.locales as Record<string, Record<string, unknown>> | undefined

  const locationLocales: Record<string, Record<string, string>> = {}
  if (locales) {
    for (const locale of supportedLocales) {
      const localeData = locales[locale]
      if (!localeData) continue
      const entry: Record<string, string> = {}
      if (typeof localeData.location === 'string' && localeData.location) {
        entry.settlement = localeData.location
      }
      if (typeof localeData.venue === 'string' && localeData.venue) {
        entry.venue = localeData.venue
      }
      if (Object.keys(entry).length > 0) {
        locationLocales[locale] = entry
      }
    }
  }

  // Only create location if we have something to remap
  if (!country && Object.keys(locationLocales).length === 0) return data

  const location: Record<string, unknown> = {
    locales: Object.keys(locationLocales).length > 0
      ? locationLocales
      : Object.fromEntries(supportedLocales.map((l) => [l, {}])),
  }
  if (country) location.country = country

  // Remove legacy fields from the data
  const { country: _country, ...rest } = data

  // Strip legacy locale fields
  if (rest.locales && typeof rest.locales === 'object') {
    const cleanedLocales: Record<string, Record<string, unknown>> = {}
    for (const [key, val] of Object.entries(rest.locales as Record<string, Record<string, unknown>>)) {
      const { location: _loc, venue: _venue, ...localeRest } = val
      cleanedLocales[key] = localeRest
    }
    rest.locales = cleanedLocales
  }

  return { ...rest, location }
}

/**
 * Remap legacy rounds bookkeeping: older documents kept the number of
 * published rounds in `currentRound` (with `publishedRounds` at 0), while
 * new documents only have `publishedRounds`. Semantics mirror the domain
 * schema migration (`migrateLegacyRounds`): a non-zero `publishedRounds`
 * wins, otherwise fall back to the legacy field. `currentRound` is dropped
 * from the result.
 */
export function remapLegacyRounds(data: Record<string, unknown>): Record<string, unknown> {
  const { currentRound, ...rest } = data
  if (typeof currentRound !== 'number') return data
  const publishedRounds =
    typeof rest.publishedRounds === 'number' && rest.publishedRounds > 0
      ? rest.publishedRounds
      : currentRound
  return { ...rest, publishedRounds }
}

const COLLECTION_NAME = 'tournaments'

function toFirestore(tournament: Tournament): Record<string, unknown> {
  return removeUndefined(datesToTimestamps(tournament)) as Record<string, unknown>
}

/**
 * One-time legacy migration on read: backfill `scheduledAtLocal` for schedule
 * entries that lack it, by interpreting the stored instant's wall clock in the
 * location timezone, and backfill `location.timeZone` from the coordinates
 * via an offline lat/lng lookup when it is missing. Purely in-memory —
 * never writes to Firestore. Without a resolvable timezone nothing is
 * reinterpreted, so the legacy instant-based display behavior is preserved.
 */
export async function backfillScheduleLocalTime(
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const location = data.location as Record<string, unknown> | undefined
  if (!location || typeof location !== 'object') return data

  let timeZone =
    typeof location.timeZone === 'string' && location.timeZone
      ? location.timeZone
      : undefined
  const latitude =
    typeof location.latitude === 'number' ? location.latitude : undefined
  const longitude =
    typeof location.longitude === 'number' ? location.longitude : undefined

  if (!timeZone && latitude !== undefined && longitude !== undefined) {
    timeZone = (await resolveTimeZone(latitude, longitude)) ?? undefined
  }

  const next: Record<string, unknown> = { ...data }
  if (timeZone && !location.timeZone) {
    next.location = { ...location, timeZone }
  }
  if (!timeZone) return next

  const schedule = data.schedule as
    | {
        events?: unknown[]
        rounds?: unknown[]
      }
    | undefined
  if (!schedule || typeof schedule !== 'object') return next

  const backfillEntry = (entry: unknown): unknown => {
    if (!entry || typeof entry !== 'object') return entry
    const source = entry as Record<string, unknown>
    if (source.scheduledAtLocal) return source
    const instant = entryInstant(source.scheduledAt)
    if (!instant) return source
    return {
      ...source,
      scheduledAtLocal: utcToZonedWallClock(instant, timeZone as string),
    }
  }

  next.schedule = {
    ...schedule,
    events: Array.isArray(schedule.events)
      ? schedule.events.map(backfillEntry)
      : schedule.events,
    rounds: Array.isArray(schedule.rounds)
      ? schedule.rounds.map(backfillEntry)
      : schedule.rounds,
  }

  return next
}

/**
 * Extract a Date from a schedule entry's `scheduledAt`, which may already be
 * a Date (after timestampsToDates) or still a Firestore Timestamp (which
 * exposes toDate()) at migration time.
 */
function entryInstant(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate()
  }
  return null
}

async function fromFirestore(data: Record<string, unknown>): Promise<Tournament> {
  const remapped = withDefaultArbiter(
    remapLegacyLocation(remapLegacyRounds(data))
  )
  const backfilled = await backfillScheduleLocalTime(remapped)
  return timestampsToDates(backfilled) as Tournament
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

    return Promise.all(
      snapshot.docs.map((docSnap) =>
        fromFirestore({
          id: docSnap.id,
          ...docSnap.data(),
        } as Record<string, unknown>)
      )
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

  async updateMany(tournaments: Tournament[]): Promise<void> {
    if (tournaments.length === 0) return
    for (const chunk of chunkArray(tournaments)) {
      const batch = writeBatch(db)
      for (const tournament of chunk) {
        batch.set(doc(db, COLLECTION_NAME, tournament.id), toFirestore(tournament))
      }
      await batch.commit()
    }
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
          await fromFirestore({
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
