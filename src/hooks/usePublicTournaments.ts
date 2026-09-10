import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  collection,
  getCountFromServer,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../services/firebaseConfig.ts'
import { tournamentService } from '../services/tournamentService.ts'
import type { PaginatedTournaments } from '../services/repository.ts'

export const PUBLIC_TOURNAMENTS_PAGE_SIZE = 30

export type PublicTournamentStatus = 'finished' | 'ongoing' | 'upcoming'

/**
 * Server-side filters (composite-index backed): country equality and the
 * startAt range. Title and city are applied client-side over loaded pages.
 */
export interface PublicTournamentFilters {
  country?: string
  startFrom?: Date
  startTo?: Date
}

interface UsePublicTournamentsSectionParams {
  status: PublicTournamentStatus
  filters: PublicTournamentFilters
}

export function usePublicTournamentsSection({
  status,
  filters,
}: UsePublicTournamentsSectionParams) {
  const country = filters.country ?? ''
  const startFromISO = filters.startFrom?.toISOString() ?? ''
  const startToISO = filters.startTo?.toISOString() ?? ''

  return useInfiniteQuery({
    queryKey: [
      'publicTournaments',
      status,
      country,
      startFromISO,
      startToISO,
    ],
    queryFn: async ({ pageParam }) => {
      return tournamentService.listPublishedTournaments({
        status,
        country: filters.country || undefined,
        startFrom: filters.startFrom,
        startTo: filters.startTo,
        pageSize: PUBLIC_TOURNAMENTS_PAGE_SIZE,
        cursor: pageParam ?? null,
      })
    },
    initialPageParam: null as PaginatedTournaments['nextCursor'],
    getNextPageParam: (lastPage: PaginatedTournaments) => lastPage.nextCursor,
    staleTime: 60_000,
  })
}

/**
 * Cheap section size via the Firestore count aggregation; honors the
 * server-side filters (country, date range).
 */
export function usePublicTournamentCount({
  status,
  filters,
}: UsePublicTournamentsSectionParams) {
  const country = filters.country ?? ''
  const startFromISO = filters.startFrom?.toISOString() ?? ''
  const startToISO = filters.startTo?.toISOString() ?? ''

  return useQuery({
    queryKey: [
      'publicTournamentsCount',
      status,
      country,
      startFromISO,
      startToISO,
    ],
    queryFn: async () => {
      const constraints = [
        where('isPublic', '==', true),
        where('status', '==', status),
        ...(filters.country
          ? [where('location.country', '==', filters.country)]
          : []),
        ...(filters.startFrom ? [where('startAt', '>=', filters.startFrom)] : []),
        ...(filters.startTo ? [where('startAt', '<=', filters.startTo)] : []),
      ]
      const snapshot = await getCountFromServer(
        query(collection(db, 'tournaments'), ...constraints)
      )
      return snapshot.data().count
    },
    staleTime: 60_000,
  })
}
