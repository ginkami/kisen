import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  TrophyIcon,
  XMarkIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext.tsx'
import { tournamentService } from '../services/tournamentService.ts'
import {
  formatDateToYearMonth,
  formatYearMonthToMonthInput,
  parseMonthInputToYearMonth,
} from '../utils/yearMonth.ts'
import { formatDateTimeShort } from '../utils/dateTime.ts'
import { getTournamentLocale } from '../domain/tournament.ts'
import { NewTournamentButton } from './NewTournamentButton.tsx'
import type { Tournament, TournamentStatus } from '../domain/tournament.ts'

interface AdminDrawerProps {
  isOpen: boolean
  onClose: () => void
  hasUnsavedChanges: boolean
}

const TOURNAMENT_QUERY_KEY = 'adminTournaments'

function statusBadgeClass(status: TournamentStatus): string {
  switch (status) {
    case 'draft':
      return 'badge-ghost'
    case 'upcoming':
      return 'badge-primary'
    case 'ongoing':
      return 'badge-accent'
    case 'finished':
      return 'badge-success'
    case 'canceled':
      return 'badge-error'
    case 'proposed_for_removing':
      return 'badge-warning'
    default:
      return 'badge-ghost'
  }
}

export function AdminDrawer({
  isOpen,
  onClose,
  hasUnsavedChanges,
}: AdminDrawerProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { id: activeTournamentId } = useParams<{ id: string }>()
  const { isAuthenticated, firebaseUser } = useAuth()

  const panelRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  const [selectedYearMonth, setSelectedYearMonth] = useState(() =>
    formatYearMonthToMonthInput(formatDateToYearMonth(new Date()))
  )

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current == null) return

    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
    const deltaX = endX - touchStartX.current

    if (deltaX < -50) {
      onClose()
    }

    touchStartX.current = null
  }

  const yearMonth = parseMonthInputToYearMonth(selectedYearMonth)
  const userId = firebaseUser?.uid

  const {
    data: tournaments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [TOURNAMENT_QUERY_KEY, yearMonth, userId],
    queryFn: async () => {
      if (!userId) return []
      return tournamentService.listByYearMonth(yearMonth, userId)
    },
    enabled: isAuthenticated && !!userId && isOpen,
  })

  const sortedTournaments = useMemo(() => {
    return [...(tournaments ?? [])].sort((a, b) => {
      const aStart = a.schedule.rounds[0]?.scheduledAt.getTime() ?? 0
      const bStart = b.schedule.rounds[0]?.scheduledAt.getTime() ?? 0
      return bStart - aStart
    })
  }, [tournaments])

  const handleNavigate = (to: string) => {
    if (hasUnsavedChanges && to !== pathname) {
      const confirmed = window.confirm(t('admin.unsavedChangesConfirm'))
      if (!confirmed) return
    }
    navigate(to)
    onClose()
  }

  const renderTournamentItem = (tournament: Tournament) => {
    const localized = getTournamentLocale(tournament, i18n.language as 'ru' | 'en')
    const firstRound = tournament.schedule.rounds[0]
    const isActive = tournament.id === activeTournamentId

    return (
      <button
        key={tournament.id}
        type="button"
        onClick={() => handleNavigate(`/tournaments/${tournament.id}/edit`)}
        className={[
          'group flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors',
          isActive
            ? 'border-primary bg-primary/10'
            : 'border-base-300 hover:bg-base-200',
        ].join(' ')}
      >
        <span className="line-clamp-1 font-medium">
          {localized.title || t('admin.untitledTournament')}
        </span>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="opacity-70">
            {firstRound
              ? formatDateTimeShort(firstRound.scheduledAt, i18n.language)
              : t('admin.noDate')}
          </span>
          <span className={['badge badge-sm', statusBadgeClass(tournament.status)].join(' ')}>
            {t(`tournament.status.${tournament.status}`)}
          </span>
        </div>
      </button>
    )
  }

  return (
    <>
      {/* Desktop push spacer */}
      <div
        className={[
          'hidden lg:block shrink-0 transition-all duration-300 ease-in-out',
          isOpen ? 'w-80' : 'w-0',
        ].join(' ')}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={[
          'fixed top-0 right-0 z-50 h-full w-80 overflow-y-auto bg-base-200 shadow-xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-base-200 px-4 py-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <TrophyIcon className="h-5 w-5" />
            {t('admin.title')}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-ghost"
            aria-label={t('common.close')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="accordion">
            <div className="collapse collapse-arrow bg-base-100">
              <input type="radio" name="admin-accordion" defaultChecked />
              <div className="collapse-title font-medium">
                {t('admin.tournaments')}
              </div>
              <div className="collapse-content">
                <div className="mb-3 flex flex-col gap-2">
                  <label className="input input-sm input-bordered flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 opacity-70" />
                    <input
                      type="month"
                      value={selectedYearMonth}
                      onChange={(e) => setSelectedYearMonth(e.target.value)}
                      className="grow bg-transparent outline-none"
                      aria-label={t('admin.selectMonth')}
                    />
                  </label>
                  <NewTournamentButton
                    variant="drawer"
                    hasUnsavedChanges={hasUnsavedChanges}
                  />
                </div>

                {isLoading && (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner loading-sm" />
                  </div>
                )}

                {!isLoading && error && (
                  <p className="text-sm text-error">
                    {t('admin.loadError')}
                  </p>
                )}

                {!isLoading && !error && sortedTournaments.length === 0 && (
                  <p className="text-sm opacity-70">
                    {t('admin.noTournamentsForMonth')}
                  </p>
                )}

                {!isLoading && !error && sortedTournaments.length > 0 && (
                  <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                    {sortedTournaments.map(renderTournamentItem)}
                  </div>
                )}
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100 mt-2">
              <input type="radio" name="admin-accordion" />
              <div className="collapse-title font-medium">
                {t('admin.events')}
              </div>
              <div className="collapse-content">
                <p className="text-sm opacity-70">
                  {t('admin.eventsPlaceholder')}
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100 mt-2">
              <input type="radio" name="admin-accordion" />
              <div className="collapse-title font-medium">
                {t('admin.associations')}
              </div>
              <div className="collapse-content">
                <p className="text-sm opacity-70">
                  {t('admin.associationsPlaceholder')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
