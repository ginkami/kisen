import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tournamentService } from '../services/tournamentService.ts'
import type { Tournament } from '../domain/tournament.ts'

const TOURNAMENT_SEARCH_KEY = 'tournaments'
const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 3

export function useTournamentSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [query])

  return useQuery<Tournament[]>({
    queryKey: [TOURNAMENT_SEARCH_KEY, 'search', debouncedQuery],
    queryFn: () => tournamentService.searchByTitle(debouncedQuery),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  })
}
/** Tournaments the current user may edit (creator or managed host association). */
export function useEditableTournaments(
  userId: string | undefined,
  managedAssociationIds: string[],
  isAdmin: boolean
) {
  return useQuery({
    queryKey: ['tournaments', 'editable', userId, managedAssociationIds, isAdmin],
    queryFn: () => tournamentService.listEditable(userId!, managedAssociationIds, isAdmin),
    enabled: !!userId,
    staleTime: 30_000,
  })
}
