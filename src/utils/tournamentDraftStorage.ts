import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Tournament } from '../domain/tournament.ts'

const DB_NAME = 'kisen-draft-storage'
const DB_VERSION = 1
const STORE_NAME = 'tournamentDrafts'

interface TournamentDraftSnapshot {
  tournament: Tournament
  savedAt: number
}

interface DraftStorageSchema extends DBSchema {
  [STORE_NAME]: {
    key: string
    value: TournamentDraftSnapshot
  }
}

let dbPromise: Promise<IDBPDatabase<DraftStorageSchema>> | null = null

function getDb(): Promise<IDBPDatabase<DraftStorageSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DraftStorageSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      },
    })
  }
  return dbPromise
}

export async function saveTournamentDraft(
  tournamentId: string,
  tournament: Tournament
): Promise<void> {
  const db = await getDb()
  await db.put(STORE_NAME, {
    tournament,
    savedAt: Date.now(),
  }, tournamentId)
}

export async function loadTournamentDraft(
  tournamentId: string
): Promise<TournamentDraftSnapshot | null> {
  const db = await getDb()
  return db.get(STORE_NAME, tournamentId) ?? null
}

export async function removeTournamentDraft(tournamentId: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, tournamentId)
}

export async function hasTournamentDraft(tournamentId: string): Promise<boolean> {
  const draft = await loadTournamentDraft(tournamentId)
  return draft !== null
}
