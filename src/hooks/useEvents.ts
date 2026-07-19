import { useQuery } from '@tanstack/react-query'
import { eventService } from '../services/eventService.ts'
import { formatDateToYearMonth } from '../utils/yearMonth.ts'

export function useEventsForMonth(yearMonth?: string) {
  const effectiveYearMonth = yearMonth ?? formatDateToYearMonth(new Date())

  return useQuery({
    queryKey: ['events', 'month', effectiveYearMonth],
    queryFn: () => eventService.listByYearMonth(effectiveYearMonth),
    staleTime: 30 * 1000,
  })
}
