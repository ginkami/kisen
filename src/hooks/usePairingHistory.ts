import { useCallback, useEffect, useState } from 'react'
import type { PairingSnapshot } from '../utils/pairingHistoryStorage.ts'
import {
  getPairingHistory,
  pushPairingState,
  redoPairingState,
  undoPairingState,
} from '../utils/pairingHistoryStorage.ts'

/**
 * Tracks the local (IndexedDB) Undo/Redo history of the tournament's
 * pairing-relevant snapshots. `canUndo` / `canRedo` are mirrored in React
 * state for synchronous button disabling; `push` records a new snapshot
 * after the caller applied it to the form state.
 */
export function usePairingHistory(tournamentId: string) {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const refresh = useCallback(async () => {
    const value = await getPairingHistory(tournamentId)
    setCanUndo(value !== null && value.index > 0)
    setCanRedo(value !== null && value.index < value.entries.length - 1)
  }, [tournamentId])

  useEffect(() => {
    let cancelled = false
    void getPairingHistory(tournamentId).then((value) => {
      if (cancelled) return
      setCanUndo(value !== null && value.index > 0)
      setCanRedo(value !== null && value.index < value.entries.length - 1)
    })
    return () => {
      cancelled = true
    }
  }, [tournamentId])

  const push = useCallback(
    async (snapshot: PairingSnapshot) => {
      await pushPairingState(tournamentId, snapshot)
      await refresh()
    },
    [tournamentId, refresh],
  )

  const undo = useCallback(async (): Promise<PairingSnapshot | null> => {
    const snapshot = await undoPairingState(tournamentId)
    await refresh()
    return snapshot
  }, [tournamentId, refresh])

  const redo = useCallback(async (): Promise<PairingSnapshot | null> => {
    const snapshot = await redoPairingState(tournamentId)
    await refresh()
    return snapshot
  }, [tournamentId, refresh])

  return { canUndo, canRedo, push, undo, redo }
}
