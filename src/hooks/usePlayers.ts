import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { playerService } from '../services/playerService.ts'
import type { Player } from '../domain/player.ts'

const PLAYER_SEARCH_KEY = 'players'
const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 3

export function usePlayerSearch(query: string) {
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

  return useQuery<Player[]>({
    queryKey: [PLAYER_SEARCH_KEY, 'search', debouncedQuery],
    queryFn: () => playerService.searchByFamilyName(debouncedQuery),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  })
}
