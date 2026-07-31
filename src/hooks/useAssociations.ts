import { useQuery } from '@tanstack/react-query'
import { associationService } from '../services/associationService.ts'

export function useMyAssociations(userId: string | undefined) {
  return useQuery({
    queryKey: ['associations', 'my', userId],
    queryFn: () => associationService.listMyAssociations(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

export function useAssociationsForPanel(
  userId: string | undefined,
  role: string | undefined
) {
  const isAdmin = role === 'admin'

  return useQuery({
    queryKey: ['associations', 'panel', userId, role],
    queryFn: () =>
      isAdmin
        ? associationService.listAll()
        : associationService.listMyAssociations(userId!),
    enabled: !!userId && !!role,
    staleTime: 30 * 1000,
  })
}
