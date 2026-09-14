import { act, renderHook, waitFor } from '@testing-library/react'
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

import { usePairingHistory } from '../hooks/usePairingHistory.ts'

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

describe('usePairingHistory', () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
  })

  it('starts with disabled undo/redo', async () => {
    const { result } = renderHook(() => usePairingHistory('t1', 2))
    await waitFor(() => expect(result.current.canUndo).toBe(false))
    expect(result.current.canRedo).toBe(false)
  })

  it('enables undo after a push and redo after undo', async () => {
    const { result } = renderHook(() => usePairingHistory('t1', 2))
    await act(async () => {
      await result.current.push([makeGame(1)])
      await result.current.push([makeGame(2)])
    })
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)

    let undone: Game[] | null = null
    await act(async () => {
      undone = await result.current.undo()
    })
    expect((undone as Game[] | null)?.[0]?.id).toBe('g1')
    expect(result.current.canRedo).toBe(true)
    expect(result.current.canUndo).toBe(false)

    await act(async () => {
      await result.current.redo()
    })
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('clear resets the flags', async () => {
    const { result } = renderHook(() => usePairingHistory('t1', 2))
    await act(async () => {
      await result.current.push([makeGame(1)])
      await result.current.push([makeGame(2)])
    })
    expect(result.current.canUndo).toBe(true)
    await act(async () => {
      await result.current.clear()
    })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })
})
