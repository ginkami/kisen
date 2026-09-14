import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Game, Participant } from '../domain/tournament.ts'

const DB_NAME = 'kisen-pairing-history'
const DB_VERSION = 1
const STORE_NAME = 'pairingHistory'
const MAX_ENTRIES = 50

/**
 * A pairing-relevant snapshot of the tournament's games state: all games,
 * the number of published rounds, and the participants (composition, player
 * links, starting points — used for restore and change detection).
 */
export interface PairingSnapshot {
  games: Game[]
  publishedRounds: number
  participants: Participant[]
}

export interface PairingHistoryValue {
  entries: PairingSnapshot[]
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

/** Returns the current history for the tournament, or null. */
export async function getPairingHistory(
  tournamentId: string,
): Promise<PairingHistoryValue | null> {
  const db = await getDb()
  if (!db) return null
  return (await db.get(STORE_NAME, tournamentId)) ?? null
}

/**
 * Pushes a snapshot as a new history state. The redo tail is discarded;
 * the oldest entries are evicted beyond MAX_ENTRIES. Pushing a snapshot
 * identical to the current one is a no-op (this makes re-recording after
 * undo/redo or server normalization harmless).
 */
export async function pushPairingState(
  tournamentId: string,
  snapshot: PairingSnapshot,
): Promise<void> {
  const db = await getDb()
  if (!db) return
  const value = (await db.get(STORE_NAME, tournamentId)) ?? { entries: [], index: -1, savedAt: 0 }
  // Skip identical consecutive states BEFORE truncating the redo tail (this
  // makes re-recording an undo/redo application harmless).
  const current = value.index >= 0 ? value.entries[value.index] : undefined
  if (current && sameSnapshot(current, snapshot)) {
    value.savedAt = Date.now()
    await db.put(STORE_NAME, value, tournamentId)
    return
  }
  // Discard the redo tail and append the new state.
  value.entries = value.entries.slice(0, value.index + 1)
  value.entries.push(snapshot)
  if (value.entries.length > MAX_ENTRIES) {
    value.entries.splice(0, value.entries.length - MAX_ENTRIES)
  }
  value.index = value.entries.length - 1
  value.savedAt = Date.now()
  await db.put(STORE_NAME, value, tournamentId)
}

/**
 * Moves one state back and returns the restored snapshot, or null when there
 * is nothing to undo.
 */
export async function undoPairingState(
  tournamentId: string,
): Promise<PairingSnapshot | null> {
  const db = await getDb()
  if (!db) return null
  const value = await db.get(STORE_NAME, tournamentId)
  if (!value || value.index <= 0) return null
  value.index -= 1
  value.savedAt = Date.now()
  await db.put(STORE_NAME, value, tournamentId)
  return value.entries[value.index]
}

/**
 * Moves one state forward and returns the restored snapshot, or null when
 * there is nothing to redo.
 */
export async function redoPairingState(
  tournamentId: string,
): Promise<PairingSnapshot | null> {
  const db = await getDb()
  if (!db) return null
  const value = await db.get(STORE_NAME, tournamentId)
  if (!value || value.index >= value.entries.length - 1) return null
  value.index += 1
  value.savedAt = Date.now()
  await db.put(STORE_NAME, value, tournamentId)
  return value.entries[value.index]
}

/** Structural equality of snapshots (participant order-insensitive). */
function sameSnapshot(a: PairingSnapshot, b: PairingSnapshot): boolean {
  if (a.publishedRounds !== b.publishedRounds) return false
  if (a.games.length !== b.games.length) return false
  if (a.participants.length !== b.participants.length) return false
  const gameKey = (g: Game) => `${g.id}|${g.player1}|${g.player2}|${g.result}|${g.status}|${g.sente}|${g.handicap}`
  const aGames = a.games.map(gameKey).sort()
  const bGames = b.games.map(gameKey).sort()
  for (let i = 0; i < aGames.length; i++) {
    if (aGames[i] !== bGames[i]) return false
  }
  const pKey = (p: Participant) => `${p.id}|${p.player}|${p.startingPoints}`
  const aParticipants = a.participants.map(pKey).sort()
  const bParticipants = b.participants.map(pKey).sort()
  for (let i = 0; i < aParticipants.length; i++) {
    if (aParticipants[i] !== bParticipants[i]) return false
  }
  return true
}
