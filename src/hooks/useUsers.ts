import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchByEmailPrefix } from '../services/userService.ts'
import type { User } from '../types/user.ts'

const USER_SEARCH_KEY = 'users'
const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 3

export function useUserSearch(query: string) {
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

  return useQuery<User[]>({
    queryKey: [USER_SEARCH_KEY, 'search', debouncedQuery],
    queryFn: () => searchByEmailPrefix(debouncedQuery),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  })
}
