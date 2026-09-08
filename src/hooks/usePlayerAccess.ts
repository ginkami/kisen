import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import { useMyAssociations } from './useAssociations.ts'
import { canEditPlayer, type Player } from '../domain/player.ts'

export interface PlayerEditAccess {
  /** True while the managed-associations verdict is not yet known. */
  isChecking: boolean
  /** True when the player may be edited (or no verdict is possible yet). */
  allowed: boolean
}

/**
 * Shared client-side guard for player edit surfaces (edit page, edit modal).
 * Mirrors the Firestore player-update rules: admins, the creator, and
 * managers of the player's associations may edit.
 */
export function usePlayerEditAccess(
  player: Pick<
    Player,
    'createdBy' | 'primaryAssociation' | 'secondaryAssociations'
  > | null | undefined,
): PlayerEditAccess {
  const { firebaseUser, user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const userId = firebaseUser?.uid
  const { data: myAssociations = [], isLoading } = useMyAssociations(userId)
  const managedAssociationIds = useMemo(
    () => myAssociations.map((a) => a.id),
    [myAssociations]
  )
  const allowed =
    !player || !userId || canEditPlayer(player, userId, isAdmin, managedAssociationIds)
  return { isChecking: !!player && isLoading, allowed }
}