import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Game } from '../domain/tournament.ts'

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
  clearPairingHistory,
  getPairingHistory,
  pushPairingState,
  redoPairingState,
  undoPairingState,
} from '../utils/pairingHistoryStorage.ts'

function makeGame(n: number): Game {
  return {
    id: `g${n}`,
    player1: n,
    player2: null,
    sente: 'unknown',
    handicap: null,
    result: 'player1_won',
    status: 'bye',
    round: 1,
  }
}

describe('pairingHistoryStorage', () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
  })

  it('pushes states and reports undo/redo availability via the stored value', async () => {
    await pushPairingState('t1', 2, [makeGame(1)])
    let value = await getPairingHistory('t1', 2)
    expect(value).not.toBeNull()
    expect(value?.entries).toHaveLength(1)
    expect(value?.index).toBe(0)
    expect(await undoPairingState('t1', 2)).toBeNull()
    expect(await redoPairingState('t1', 2)).toBeNull()

    await pushPairingState('t1', 2, [makeGame(2)])
    value = await getPairingHistory('t1', 2)
    expect(value?.entries).toHaveLength(2)
    expect(value?.index).toBe(1)
  })

  it('undo/redo move the index and restore games', async () => {
    await pushPairingState('t1', 2, [makeGame(1)])
    await pushPairingState('t1', 2, [makeGame(2)])
    const undone = await undoPairingState('t1', 2)
    expect(undone?.[0]?.id).toBe('g1')
    const redone = await redoPairingState('t1', 2)
    expect(redone?.[0]?.id).toBe('g2')
    expect(await redoPairingState('t1', 2)).toBeNull()
  })

  it('discards the redo tail on a new push', async () => {
    await pushPairingState('t1', 2, [makeGame(1)])
    await pushPairingState('t1', 2, [makeGame(2)])
    await undoPairingState('t1', 2)
    await pushPairingState('t1', 2, [makeGame(3)])
    const value = await getPairingHistory('t1', 2)
    expect(value?.entries).toHaveLength(2)
    expect(value?.entries[1]?.games[0]?.id).toBe('g3')
    expect(await redoPairingState('t1', 2)).toBeNull()
  })

  it('does not duplicate a state identical to the current one', async () => {
    const games = [makeGame(1)]
    await pushPairingState('t1', 2, games)
    await pushPairingState('t1', 2, games)
    const value = await getPairingHistory('t1', 2)
    expect(value?.entries).toHaveLength(1)
    expect(value?.index).toBe(0)
  })

  it('caps the history at 50 entries', async () => {
    for (let i = 0; i < 55; i++) {
      await pushPairingState('t1', 2, [makeGame(i)])
    }
    const value = await getPairingHistory('t1', 2)
    expect(value?.entries).toHaveLength(50)
    expect(value?.index).toBe(49)
    expect(value?.entries[49]?.games[0]?.id).toBe('g54')
    expect(value?.entries[0]?.games[0]?.id).toBe('g5')
  })

  it('keeps rounds isolated and clears all rounds of a tournament', async () => {
    await pushPairingState('t1', 2, [makeGame(1)])
    await pushPairingState('t1', 3, [makeGame(2)])
    await pushPairingState('t2', 2, [makeGame(3)])
    await clearPairingHistory('t1')
    expect(await getPairingHistory('t1', 2)).toBeNull()
    expect(await getPairingHistory('t1', 3)).toBeNull()
    expect(await getPairingHistory('t2', 2)).not.toBeNull()
  })
})
