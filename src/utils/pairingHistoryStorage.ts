import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Game } from '../domain/tournament.ts'

const DB_NAME = 'kisen-pairing-history'
const DB_VERSION = 1
const STORE_NAME = 'pairingHistory'
const MAX_ENTRIES = 50

export interface PairingHistoryValue {
  entries: Array<{ games: Game[] }>
  index: number
  savedAt: number
}

interface PairingHistorySchema extends DBSchema {
  [STORE_NAME]: {
    key: string
    value: PairingHistoryValue
  }
}

let dbPromise: Promise<IDBPDatabase<PairingHistorySchema>> | null = null

/**
 * Opens the history database; returns null when IndexedDB is unavailable
 * (private mode, blocked storage) so all history operations degrade to no-ops.
 */
async function getDb(): Promise<IDBPDatabase<PairingHistorySchema> | null> {
  try {
    if (!dbPromise) {
      dbPromise = openDB<PairingHistorySchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME)
          }
        },
      })
    }
    return await dbPromise
  } catch {
    return null
  }
}

/** History key for a tournament's round being prepared. */
export function pairingHistoryKey(tournamentId: string, round: number): string {
  return `${tournamentId}:${round}`
}

/** Returns the current history entry for the round, or null. */
export async function getPairingHistory(
  tournamentId: string,
  round: number,
): Promise<PairingHistoryValue | null> {
  const db = await getDb()
  if (!db) return null
  return (await db.get(STORE_NAME, pairingHistoryKey(tournamentId, round))) ?? null
}

/**
 * Pushes a snapshot of the round's games as a new history state. The redo
 * tail is discarded; the oldest entries are evicted beyond MAX_ENTRIES.
 * Pushing a state identical to the current one is a no-op except for the
 * redo-tail truncation (this makes double-recording after undo/redo
 * harmless).
 */
export async function pushPairingState(
  tournamentId: string,
  round: number,
  games: Game[],
): Promise<void> {
  const db = await getDb()
  if (!db) return
  const key = pairingHistoryKey(tournamentId, round)
  const value = (await db.get(STORE_NAME, key)) ?? { entries: [], index: -1, savedAt: 0 }
  // Skip identical consecutive states BEFORE truncating the redo tail (this
  // makes re-recording an undo/redo application harmless).
  const current = value.index >= 0 ? value.entries[value.index] : undefined
  if (current && JSON.stringify(current.games) === JSON.stringify(games)) {
    value.savedAt = Date.now()
    await db.put(STORE_NAME, value, key)
    return
  }
  // Discard the redo tail and append the new state.
  value.entries = value.entries.slice(0, value.index + 1)
  value.entries.push({ games })
  if (value.entries.length > MAX_ENTRIES) {
    value.entries.splice(0, value.entries.length - MAX_ENTRIES)
  }
  value.index = value.entries.length - 1
  value.savedAt = Date.now()
  await db.put(STORE_NAME, value, key)
}

/**
 * Moves one state back and returns the restored games, or null when there is
 * nothing to undo.
 */
export async function undoPairingState(
  tournamentId: string,
  round: number,
): Promise<Game[] | null> {
  const db = await getDb()
  if (!db) return null
  const key = pairingHistoryKey(tournamentId, round)
  const value = await db.get(STORE_NAME, key)
  if (!value || value.index <= 0) return null
  value.index -= 1
  value.savedAt = Date.now()
  await db.put(STORE_NAME, value, key)
  return value.entries[value.index].games
}

/**
 * Moves one state forward and returns the restored games, or null when there
 * is nothing to redo.
 */
export async function redoPairingState(
  tournamentId: string,
  round: number,
): Promise<Game[] | null> {
  const db = await getDb()
  if (!db) return null
  const key = pairingHistoryKey(tournamentId, round)
  const value = await db.get(STORE_NAME, key)
  if (!value || value.index >= value.entries.length - 1) return null
  value.index += 1
  value.savedAt = Date.now()
  await db.put(STORE_NAME, value, key)
  return value.entries[value.index].games
}

/** Removes all pairing history entries of the tournament (every round). */
export async function clearPairingHistory(tournamentId: string): Promise<void> {
  const db = await getDb()
  if (!db) return
  const keys = await db.getAllKeys(STORE_NAME)
  const prefix = `${tournamentId}:`
  await Promise.all(
    keys.filter((key) => String(key).startsWith(prefix)).map((key) => db.delete(STORE_NAME, key)),
  )
}
