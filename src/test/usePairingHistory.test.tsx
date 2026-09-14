import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Participant } from '../domain/tournament.ts'
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

import { usePairingHistory } from '../hooks/usePairingHistory.ts'

function makeSnapshot(n: number): PairingSnapshot {
  const participant: Participant = {
    id: 1,
    player: null,
    locales: { ru: { familyName: 'F1', givenName: 'X' } },
    capturedRating: { value: 1500, rank: null },
    startingPoints: 0,
  }
  return {
    games: [
      {
        id: `g${n}`,
        player1: 1,
        player2: null,
        sente: 'unknown',
        handicap: null,
        result: 'player1_won',
        status: 'bye',
        round: 1,
      },
    ],
    publishedRounds: n > 3 ? 1 : 0,
    participants: [participant],
  }
}

describe('usePairingHistory', () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
  })

  it('starts with disabled undo/redo', async () => {
    const { result } = renderHook(() => usePairingHistory('t1'))
    await waitFor(() => expect(result.current.canUndo).toBe(false))
    expect(result.current.canRedo).toBe(false)
  })

  it('enables undo after a push and redo after undo', async () => {
    const { result } = renderHook(() => usePairingHistory('t1'))
    await act(async () => {
      await result.current.push(makeSnapshot(1))
      await result.current.push(makeSnapshot(2))
    })
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)

    let undone: PairingSnapshot | null = null
    await act(async () => {
      undone = await result.current.undo()
    })
    expect((undone as PairingSnapshot | null)?.games[0]?.id).toBe('g1')
    expect(result.current.canRedo).toBe(true)
    expect(result.current.canUndo).toBe(false)

    await act(async () => {
      await result.current.redo()
    })
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })
})
