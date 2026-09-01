import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventService } from '../services/eventService.ts'
import { formatDateToYearMonth } from '../utils/yearMonth.ts'
import type { Event } from '../domain/event.ts'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 3

export function useEventsForMonth(yearMonth?: string) {
  const effectiveYearMonth = yearMonth ?? formatDateToYearMonth(new Date())

  return useQuery({
    queryKey: ['events', 'month', effectiveYearMonth],
    queryFn: () => eventService.listByYearMonth(effectiveYearMonth),
    staleTime: 30 * 1000,
  })
}

export function useEventSearch(query: string) {
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

  return useQuery<Event[]>({
    queryKey: ['events', 'search', debouncedQuery],
    queryFn: () => eventService.searchByTitle(debouncedQuery),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  })
}

/** Batch-load events by id; returns a Map keyed by event id. */
export function useEventsByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids)].sort()
  const key = uniqueIds.join(',')

  const query = useQuery({
    queryKey: ['events', 'byIds', key],
    queryFn: () => eventService.getByIds(uniqueIds),
    enabled: uniqueIds.length > 0,
    staleTime: 30_000,
  })

  const byId = useMemo(() => {
    const m = new Map<string, Event>()
    for (const event of query.data ?? []) m.set(event.id, event)
    return m
  }, [query.data])

  return { eventsById: byId, isLoading: query.isLoading }
}