import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.tsx'
import { promotionStatus } from '../../domain/promotion.ts'
import {
  listAllPromotions,
  type Promotion,
} from '../../services/promotionService.ts'
import {
  useAssociationsByIds,
  useMyAssociations,
} from '../../hooks/useAssociations.ts'
import { useEventsByIds } from '../../hooks/useEvents.ts'
import {
  PUBLIC_TOURNAMENTS_PAGE_SIZE,
  usePublicTournamentCount,
  usePublicTournamentsSection,
  type PublicTournamentFilters,
  type PublicTournamentStatus,
} from '../../hooks/usePublicTournaments.ts'
import { canEditTournament, type Tournament } from '../../domain/tournament.ts'
import { tournamentService } from '../../services/tournamentService.ts'
import {
  EMPTY_TOURNAMENT_FILTERS,
  TournamentFiltersForm,
  type TournamentFilterValues,
} from './TournamentFiltersForm.tsx'
import { TournamentCard } from './TournamentCard.tsx'

const SECTION_STATUSES: PublicTournamentStatus[] = [
  'finished',
  'ongoing',
  'upcoming',
]

function matchesClientFilters(
  tournament: Tournament,
  title: string,
  city: string
): boolean {
  if (title !== '') {
    const titles = Object.values(tournament.locales).map((l) =>
      l.title.toLowerCase()
    )
    if (!titles.some((s) => s.includes(title))) return false
  }
  if (city !== '') {
    const settlements = Object.values(tournament.location?.locales ?? {}).map(
      (l) => (l.settlement ?? '').toLowerCase()
    )
    if (!settlements.some((s) => s.includes(city))) return false
  }
  return true
}

interface TournamentSectionProps {
  status: PublicTournamentStatus
  filters: PublicTournamentFilters
  clientTitle: string
  clientCity: string
  canEditTournamentById: (tournament: Tournament) => boolean
}

function TournamentSection({
  status,
  filters,
  clientTitle,
  clientCity,
  canEditTournamentById,
}: TournamentSectionProps) {
  const { t } = useTranslation()
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePublicTournamentsSection({ status, filters })
  const { data: serverCount } = usePublicTournamentCount({ status, filters })

  const items = useMemo(() => {
    const loaded = (data?.pages ?? []).flatMap((page) => page.items)
    return loaded.filter((tournament) =>
      matchesClientFilters(tournament, clientTitle, clientCity)
    )
  }, [data, clientTitle, clientCity])

  const parentEventIds = useMemo(
    () =>
      items
        .map((tournament) => tournament.parentEvent)
        .filter((id): id is string => !!id),
    [items]
  )
  const { eventsById } = useEventsByIds(parentEventIds)

  const hostAssociationIds = useMemo(
    () =>
      items
        .map((tournament) => tournament.hostAssociation)
        .filter((id): id is string => !!id),
    [items]
  )
  const associations = useAssociationsByIds(hostAssociationIds)
  const associationsById = useMemo(
    () => new Map(associations.map((a) => [a.id, a])),
    [associations]
  )

  const hasClientFilters = clientTitle !== '' || clientCity !== ''
  const count = hasClientFilters ? items.length : serverCount
  const label = `${t(`home.tabs.${status}`)} (${count ?? '\u2026'})`

  return (
    <>
      <input
        type="radio"
        name="home-tournaments-tabs"
        role="tab"
        className="tab"
        aria-label={label}
        defaultChecked={status === 'finished'}
      />
      <div className="tab-content border-base-300 bg-base-100 p-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        )}

        {!isLoading && error && (
          <p className="text-sm text-error">{t('home.loadError')}</p>
        )}

        {!isLoading && !error && items.length === 0 && (
          <p className="py-8 text-center text-sm opacity-70">
            {t('home.empty')}
          </p>
        )}

        {!isLoading && !error && items.length > 0 && (
          <div className="flex flex-col gap-3">
            {items.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                parentEvent={
                  tournament.parentEvent
                    ? (eventsById.get(tournament.parentEvent) ?? null)
                    : null
                }
                association={
                  tournament.hostAssociation
                    ? (associationsById.get(tournament.hostAssociation) ?? null)
                    : null
                }
                canEdit={canEditTournamentById(tournament)}
              />
            ))}
          </div>
        )}

        {hasNextPage && !isLoading && !error && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage && (
                <span className="loading loading-spinner loading-xs" />
              )}
              {t('home.showMore', { count: PUBLIC_TOURNAMENTS_PAGE_SIZE })}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
export function PublicTournamentsBoard() {
  const { t } = useTranslation()
  const { isAuthenticated, firebaseUser, user } = useAuth()
  const { data: myAssociations = [] } = useMyAssociations(firebaseUser?.uid)

  const [applied, setApplied] = useState<TournamentFilterValues>(
    EMPTY_TOURNAMENT_FILTERS
  )

  const [promotions, setPromotions] = useState<Promotion[] | null>(null)

  useEffect(() => {
    let cancelled = false
    listAllPromotions()
      .then((list) => {
        if (!cancelled) setPromotions(list)
      })
      .catch(() => {
        if (!cancelled) setPromotions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const now = useMemo(() => new Date(), [])
  const qualifyingPromotions = useMemo(() => {
    if (promotions === null) return null
    return promotions
      .filter(
        (p) =>
          p.showOnHome &&
          promotionStatus(p.startedAt, p.endedAt, now) !== 'finished',
      )
      .sort((a, b) => {
        const statusA = promotionStatus(a.startedAt, a.endedAt, now)
        const statusB = promotionStatus(b.startedAt, b.endedAt, now)
        if (statusA !== statusB) return statusA === 'active' ? -1 : 1
        if (statusA === 'active') return b.startedAt.getTime() - a.startedAt.getTime()
        return a.startedAt.getTime() - b.startedAt.getTime()
      })
  }, [promotions, now])

  const promotedTournamentIds = useMemo(
    () => (qualifyingPromotions ?? []).map((p) => p.tournament),
    [qualifyingPromotions],
  )

  const [promotedTournaments, setPromotedTournaments] = useState<Tournament[] | null>(null)
  useEffect(() => {
    if (promotedTournamentIds === null) return
    if (promotedTournamentIds.length === 0) {
      setPromotedTournaments([])
      return
    }
    let cancelled = false
    tournamentService
      .getByIds(promotedTournamentIds)
      .then((list) => {
        if (cancelled) return
        const byId = new Map(list.map((t) => [t.id, t]))
        setPromotedTournaments(
          promotedTournamentIds
            .map((id) => byId.get(id))
            .filter((x): x is Tournament => !!x),
        )
      })
      .catch(() => {
        if (!cancelled) setPromotedTournaments([])
      })
    return () => {
      cancelled = true
    }
  }, [promotedTournamentIds])

  const promotedReady = qualifyingPromotions !== null && promotedTournaments !== null
  const filters = useMemo<PublicTournamentFilters>(
    () => ({
      country: applied.country || undefined,
      startFrom: applied.startFrom
        ? new Date(`${applied.startFrom}T00:00:00`)
        : undefined,
      startTo: applied.startTo
        ? new Date(`${applied.startTo}T23:59:59.999`)
        : undefined,
    }),
    [applied.country, applied.startFrom, applied.startTo]
  )

  const managedAssociationIds = useMemo(
    () => myAssociations.map((a) => a.id),
    [myAssociations]
  )
  const isAdmin = user?.role === 'admin'
  const userId = firebaseUser?.uid

  const canEditTournamentById = (tournament: Tournament): boolean => {
    if (!isAuthenticated || !userId) return false
    return canEditTournament(tournament, userId, isAdmin, managedAssociationIds)
  }

  const handleApply = (values: TournamentFilterValues) => setApplied(values)
  const handleCancel = () => setApplied(EMPTY_TOURNAMENT_FILTERS)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex gap-6">
        <aside className="hidden w-72 shrink-0 xl:block">
          <div className="sticky top-20 rounded-lg border border-base-300 bg-base-100 p-3">
            <TournamentFiltersForm onApply={handleApply} onCancel={handleCancel} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <h1 className="mb-4 text-2xl font-semibold">{t('home.title')}</h1>

          {promotedReady &&
            promotedTournaments !== null &&
            promotedTournaments.length > 0 && (
              <section className="mb-6 space-y-3">
                {promotedTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    parentEvent={null}
                    association={null}
                    canEdit={canEditTournamentById(tournament)}
                  />
                ))}
              </section>
            )}

          <details className="xl:hidden mb-4">
            <summary className="btn btn-outline btn-sm">
              {t('home.filters.toggle')}
            </summary>
            <div className="mt-2 rounded-lg border border-base-300 bg-base-100 p-3 w-fit">
              <TournamentFiltersForm
                onApply={handleApply}
                onCancel={handleCancel}
              />
            </div>
          </details>

          <div role="tablist" className="tabs tabs-border">
            {SECTION_STATUSES.map((status) => (
              <TournamentSection
                key={status}
                status={status}
                filters={filters}
                clientTitle={applied.title.trim().toLowerCase()}
                clientCity={applied.city.trim().toLowerCase()}
                canEditTournamentById={canEditTournamentById}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
