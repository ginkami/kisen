import { useCallback, useEffect, useState } from 'react'
import type { Game } from '../domain/tournament.ts'
import {
  clearPairingHistory,
  getPairingHistory,
  pushPairingState,
  redoPairingState,
  undoPairingState,
} from '../utils/pairingHistoryStorage.ts'

/**
 * Tracks the local (IndexedDB) Undo/Redo history of a round's pairing states.
 * `canUndo` / `canRedo` are mirrored in React state for synchronous button
 * disabling; `push` records a new state after the caller applied it via the
 * form updater.
 */
export function usePairingHistory(tournamentId: string, round: number) {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const refresh = useCallback(async () => {
    const value = await getPairingHistory(tournamentId, round)
    setCanUndo(value !== null && value.index > 0)
    setCanRedo(value !== null && value.index < value.entries.length - 1)
  }, [tournamentId, round])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const push = useCallback(
    async (games: Game[]) => {
      await pushPairingState(tournamentId, round, games)
      await refresh()
    },
    [tournamentId, round, refresh],
  )

  const undo = useCallback(async (): Promise<Game[] | null> => {
    const games = await undoPairingState(tournamentId, round)
    await refresh()
    return games
  }, [tournamentId, round, refresh])

  const redo = useCallback(async (): Promise<Game[] | null> => {
    const games = await redoPairingState(tournamentId, round)
    await refresh()
    return games
  }, [tournamentId, round, refresh])

  const clear = useCallback(async () => {
    await clearPairingHistory(tournamentId)
    await refresh()
  }, [tournamentId, refresh])

  return { canUndo, canRedo, push, undo, redo, clear }
}
