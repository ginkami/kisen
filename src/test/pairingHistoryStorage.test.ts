import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Game, Participant } from '../domain/tournament.ts'
import type { PairingSnapshot } from '../utils/pairingHistoryStorage.ts'

// In-memory fake of the `idb` API surface used by the storage module.
const store = new Map<string, unknown>()

vi.mock('idb', () => ({
  openDB: vi.fn(async () => ({
    get: async (_name: string, key: string) => store.get(key),
    put: async (_name: string, value: unknown, key: string) => {
      store.set(key, structuredClone(value))
    },
    delete: async (_name: string, key: string) => {
      store.delete(key)
    },
    getAllKeys: async () => [...store.keys()],
  })),
}))

import {
  getPairingHistory,
  pushPairingState,
  redoPairingState,
  undoPairingState,
} from '../utils/pairingHistoryStorage.ts'

function makeSnapshot(n: number): PairingSnapshot {
  const game: Game = {
    id: `g${n}`,
    player1: n,
    player2: null,
    sente: 'unknown',
    handicap: null,
    result: 'player1_won',
    status: 'bye',
    round: 1,
  }
  const participant: Participant = {
    id: n,
    player: null,
    locales: { ru: { familyName: `F${n}`, givenName: 'X' } },
    capturedRating: { value: 1500, rank: null },
    startingPoints: 0,
  }
  return { games: [game], publishedRounds: n > 3 ? 1 : 0, participants: [participant] }
}

describe('pairingHistoryStorage', () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
  })

  it('pushes snapshots and reports undo/redo availability via the stored value', async () => {
    await pushPairingState('t1', makeSnapshot(1))
    const value = await getPairingHistory('t1')
    expect(value).not.toBeNull()
    expect(value?.entries).toHaveLength(1)
    expect(value?.index).toBe(0)
    expect(await undoPairingState('t1')).toBeNull()
    expect(await redoPairingState('t1')).toBeNull()

    await pushPairingState('t1', makeSnapshot(2))
    const updated = await getPairingHistory('t1')
    expect(updated?.entries).toHaveLength(2)
    expect(updated?.index).toBe(1)
  })

  it('undo/redo move the index and restore snapshots', async () => {
    await pushPairingState('t1', makeSnapshot(1))
    await pushPairingState('t1', makeSnapshot(2))
    const undone = await undoPairingState('t1')
    expect(undone?.games[0]?.id).toBe('g1')
    const redone = await redoPairingState('t1')
    expect(redone?.games[0]?.id).toBe('g2')
    expect(await redoPairingState('t1')).toBeNull()
  })

  it('discards the redo tail on a new push', async () => {
    await pushPairingState('t1', makeSnapshot(1))
    await pushPairingState('t1', makeSnapshot(2))
    await undoPairingState('t1')
    await pushPairingState('t1', makeSnapshot(3))
    const value = await getPairingHistory('t1')
    expect(value?.entries).toHaveLength(2)
    expect(value?.entries[1]?.games[0]?.id).toBe('g3')
    expect(await redoPairingState('t1')).toBeNull()
  })

  it('does not duplicate a snapshot identical to the current one', async () => {
    await pushPairingState('t1', makeSnapshot(1))
    await pushPairingState('t1', makeSnapshot(1))
    const value = await getPairingHistory('t1')
    expect(value?.entries).toHaveLength(1)
    expect(value?.index).toBe(0)
  })

  it('dedupes structurally equal snapshots regardless of participant order', async () => {
    const first = makeSnapshot(1)
    await pushPairingState('t1', first)
    const reordered: PairingSnapshot = {
      ...first,
      participants: [...first.participants].reverse(),
    }
    await pushPairingState('t1', reordered)
    const value = await getPairingHistory('t1')
    expect(value?.entries).toHaveLength(1)
  })

  it('caps the history at 50 entries', async () => {
    for (let i = 0; i < 55; i++) {
      await pushPairingState('t1', makeSnapshot(i))
    }
    const value = await getPairingHistory('t1')
    expect(value?.entries).toHaveLength(50)
    expect(value?.index).toBe(49)
    expect(value?.entries[49]?.games[0]?.id).toBe('g54')
    expect(value?.entries[0]?.games[0]?.id).toBe('g5')
  })

  it('keeps per-tournament histories isolated', async () => {
    await pushPairingState('t1', makeSnapshot(1))
    await pushPairingState('t2', makeSnapshot(2))
    await undoPairingState('t1')
    expect((await getPairingHistory('t1'))?.index).toBe(0)
    expect((await getPairingHistory('t2'))?.index).toBe(0)
  })
})
