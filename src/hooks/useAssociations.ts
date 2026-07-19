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
