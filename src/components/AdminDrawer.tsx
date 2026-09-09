import { useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmModal } from './ConfirmModal.tsx'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BsGear, BsX, BsCalendar2, BsPlus, BsFiletypeCsv, BsPeopleFill, BsFunnel, BsSearch } from 'react-icons/bs'
import { useAuth } from '../context/AuthContext.tsx'
import { useAssociationsForPanel } from '../hooks/useAssociations.ts'
import { useTournamentSearch, useEditableTournaments } from '../hooks/useTournaments.ts'
import { useEventSearch, useEventsByIds, useEditableEvents } from '../hooks/useEvents.ts'
import { regulationService } from '../services/regulationService.ts'
import { playerService, type ImportResult } from '../services/playerService.ts'
import { useUserSearch } from '../hooks/useUsers.ts'
import type { User } from '../types/user.ts'
import { BulkImportResultModal } from './BulkImportResultModal.tsx'
import { PlayerSearchPanel } from './player/PlayerSearchPanel.tsx'
import {
  formatDateToYearMonth,
  formatYearMonthToMonthInput,
  parseMonthInputToYearMonth,
} from '../utils/yearMonth.ts'
import { formatDateTimeShort } from '../utils/dateTime.ts'
import { resolveLocationTimeZone } from '../utils/scheduleTime.ts'
import { getTournamentLocale } from '../domain/tournament.ts'
import { NewTournamentButton } from './NewTournamentButton.tsx'
import { canEditPlayer, type Player } from '../domain/player.ts'
import { canEditEvent, type Event } from '../domain/event.ts'
import { canEditTournament } from '../domain/tournament.ts'
import type { Tournament, TournamentStatus } from '../domain/tournament.ts'

interface AdminDrawerProps {
  isOpen: boolean
  onClose: () => void
  hasUnsavedChanges: boolean
}

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

// Same display-name logic as the association managers section:
// locale-specific names with ru → en fallback and displayName as the last resort.
function getUserDisplayName(user: User, locale: 'ru' | 'en'): string {
  const loc = user.locales[locale] ?? user.locales.ru ?? user.locales.en
  return (!loc.familyName || !loc.familyName.trim()) && (!loc.givenName || !loc.givenName.trim())
    ? loc.displayName
    : !loc.familyName || !loc.familyName.trim()
      ? loc.givenName
      : `${loc.familyName}, ${loc.givenName}`
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
  const { isAuthenticated, firebaseUser, user } = useAuth()

  const panelRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  const [selectedYearMonth, setSelectedYearMonth] = useState(() =>
    formatYearMonthToMonthInput(formatDateToYearMonth(new Date()))
  )
  const [selectedEventYearMonth, setSelectedEventYearMonth] = useState(() =>
    formatYearMonthToMonthInput(formatDateToYearMonth(new Date()))
  )
  const [tournamentSearch, setTournamentSearch] = useState('')
  const [eventSearch, setEventSearch] = useState('')
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const pendingNavigation = useRef<string | null>(null)
  const [playerSearch, setPlayerSearch] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  // Users (admin only)
  const [userSearch, setUserSearch] = useState('')
  const {
    data: userResultsData = [],
    isFetching: isFetchingUserSearch,
    error: userSearchError,
  } = useUserSearch(userSearch)
  const userResults = userResultsData ?? []
  const isSearchingUsers = userSearch.trim().length >= 3
  const { data: associationsData = [], isLoading: isLoadingAssociations } = useAssociationsForPanel(
    firebaseUser?.uid,
    user?.role
  )
  // query data can be null (e.g. initial state); default param only covers undefined
  const associations = associationsData ?? []
  const canManagePlayers = user?.role === 'admin' || user?.role === 'manager'
  const canBulkImport = user?.role === 'admin'

  // Associations
  const [associationSearch, setAssociationSearch] = useState('')
  const canManageAssociations = user?.role === 'admin' || user?.role === 'manager' || associations.length > 0

  const canCreateAssociation = user?.role === 'admin' || user?.role === 'manager'
  const filteredAssociations = associations.filter((a) => {
    const title = a.locales[i18n.language as keyof typeof a.locales]?.title ?? ''
    return title.toLowerCase().includes(associationSearch.toLowerCase())
  })
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [showImportResult, setShowImportResult] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    if (deltaX > 50) {
      onClose()
    }

    touchStartX.current = null
  }

  const yearMonth = parseMonthInputToYearMonth(selectedYearMonth)
  const userId = firebaseUser?.uid
  const playerLocale = (i18n.language as 'ru' | 'en') ?? 'ru'

  // Associations the current user manages (creator or invited manager) —
  // drives the regulations list, the tournaments/events month lists, and
  // the edit-access filters below.
  const managedAssociationIds = useMemo(() => associations.map((a) => a.id), [associations])
  const isAdmin = user?.role === 'admin'

  const {
    data: editableTournaments = [],
    isLoading,
    error,
  } = useEditableTournaments(userId, managedAssociationIds, isAdmin)
  // query data can be null (e.g. initial state); default param only covers undefined
  const tournaments = useMemo(
    () => (editableTournaments ?? []).filter((t) => t.startYearMonth === yearMonth),
    [editableTournaments, yearMonth]
  )

  // Events
  const eventYearMonth = parseMonthInputToYearMonth(selectedEventYearMonth)
  // Any authenticated user may create events (owner-based, like tournaments);
  // the month list and search only offer events the user may edit.
  const canManageEvents = isAuthenticated && !!userId

  const { data: editableEvents = [], isLoading: isLoadingEvents } = useEditableEvents(
    userId,
    managedAssociationIds,
    isAdmin
  )
  // query data can be null (e.g. initial state); default param only covers undefined
  const events = useMemo(
    () => (editableEvents ?? []).filter((event) => event.startYearMonth === eventYearMonth),
    [editableEvents, eventYearMonth]
  )

  // Regulations
  const { data: regulationsData = [], isLoading: isLoadingRegulations, error: regulationsError } = useQuery({
    queryKey: ['adminRegulations', userId, managedAssociationIds, isAdmin],
    queryFn: async () => {
      if (!userId) return []
      return regulationService.listEditable(userId, managedAssociationIds, isAdmin)
    },
    enabled: isAuthenticated && !!userId && isOpen,
  })
  // query data can be null (e.g. initial state); default param only covers undefined
  const regulations = regulationsData ?? []

  // The drawer player search only offers players the current user may edit
  // (mirroring the Firestore rules for player updates): admins see all
  // players, managers only players they created or players affiliated with
  // associations they manage.
  const playerFilter = useMemo(() => {
    if (isAdmin || !userId) return undefined
    return (player: Player) => canEditPlayer(player, userId, isAdmin, managedAssociationIds)
  }, [isAdmin, userId, managedAssociationIds])

  const isSearchingTournaments = tournamentSearch.trim().length >= 3
  const {
    data: tournamentSearchResults = [],
    isFetching: isFetchingTournamentSearch,
  } = useTournamentSearch(isSearchingTournaments ? tournamentSearch : '')

  // Drawer tournament search only offers tournaments the current user may
  // edit (mirroring the Firestore rules for tournament updates): admins see
  // all tournaments, other users only tournaments they created or tournaments
  // under associations they manage.
  const tournamentFilter = useMemo(() => {
    if (isAdmin || !userId) return undefined
    return (tournament: Tournament) =>
      canEditTournament(tournament, userId, isAdmin, managedAssociationIds)
  }, [isAdmin, userId, managedAssociationIds])

  const visibleTournamentResults = tournamentFilter
    ? tournamentSearchResults.filter(tournamentFilter)
    : tournamentSearchResults

  const isSearchingEvents = eventSearch.trim().length >= 3
  const {
    data: eventSearchResults = [],
    isFetching: isFetchingEventSearch,
  } = useEventSearch(isSearchingEvents ? eventSearch : '')

  // Drawer event search only offers events the current user may edit
  // (mirroring the Firestore rules for event updates): admins see all
  // events, other users only events they created or events under
  // associations they manage.
  const eventFilter = useMemo(() => {
    if (isAdmin || !userId) return undefined
    return (event: Event) => canEditEvent(event, userId, isAdmin, managedAssociationIds)
  }, [isAdmin, userId, managedAssociationIds])

  const visibleEventResults = eventFilter
    ? eventSearchResults.filter(eventFilter)
    : eventSearchResults

  const sortedTournaments = useMemo(() => {
    return [...(tournaments ?? [])].sort((a, b) => {
      const aStart = a.schedule.rounds[0]?.scheduledAt.getTime() ?? 0
      const bStart = b.schedule.rounds[0]?.scheduledAt.getTime() ?? 0
      return bStart - aStart
    })
  }, [tournaments])

  // Parent event titles shown on tournament cards: batch-load every event
  // referenced by the visible tournament lists (month list + search results).
  const parentEventIds = useMemo(
    () =>
      [...sortedTournaments, ...(isSearchingTournaments ? visibleTournamentResults : [])]
        .map((tournament) => tournament.parentEvent)
        .filter((id): id is string => !!id),
    [sortedTournaments, visibleTournamentResults, isSearchingTournaments]
  )
  const { eventsById } = useEventsByIds(parentEventIds)

  const handleNavigate = (to: string) => {
    if (hasUnsavedChanges && to !== pathname) {
      pendingNavigation.current = to
      setConfirmModalOpen(true)
      return
    }
    navigate(to)
  }

  const handleConfirmNavigation = () => {
    setConfirmModalOpen(false)
    if (pendingNavigation.current) {
      navigate(pendingNavigation.current)
      pendingNavigation.current = null
    }
  }

  const handleCancelNavigation = () => {
    setConfirmModalOpen(false)
    pendingNavigation.current = null
  }

  const handleBulkImport = async (file: File) => {
    if (!firebaseUser) return
    setIsImporting(true)
    setImportError(null)
    setImportResult(null)
    try {
      const result = await playerService.importFromCsv(file, firebaseUser.uid)
      setImportResult(result)
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : t('admin.errors.firestore')
      )
    } finally {
      setIsImporting(false)
      setShowImportResult(true)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleBulkImport(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) void handleBulkImport(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const renderTournamentItem = (tournament: Tournament) => {
    const localized = getTournamentLocale(tournament, i18n.language as 'ru' | 'en')
    const firstRound = tournament.schedule.rounds[0]
    const isActive = tournament.id === activeTournamentId
    const parentEvent = tournament.parentEvent
      ? (eventsById.get(tournament.parentEvent) ?? null)
      : null
    const parentEventTitle = parentEvent
      ? parentEvent.locales[i18n.language as keyof typeof parentEvent.locales]?.title ??
        parentEvent.slug
      : null

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
        {parentEventTitle && (
          <span className="line-clamp-1 text-xs opacity-60">{parentEventTitle}</span>
        )}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="opacity-70">
            {firstRound
              ? formatDateTimeShort(
                  firstRound.scheduledAt,
                  i18n.language,
                  resolveLocationTimeZone(tournament.location)
                )
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
          'fixed top-0 left-0 z-50 h-full w-80 overflow-y-auto bg-base-200 shadow-xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-base-200 px-4 py-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <BsGear className="h-5 w-5" />
            {t('admin.title')}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-ghost"
            aria-label={t('common.close')}
          >
            <BsX className="h-5 w-5" />
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
                  <NewTournamentButton
                    variant="drawer"
                    hasUnsavedChanges={hasUnsavedChanges}
                  />
                    <label className="input input-sm input-bordered flex items-center gap-2">
                      <BsCalendar2 className="h-4 w-4 opacity-70" />
                      <input
                        type="month"
                        value={selectedYearMonth}
                        onChange={(e) => setSelectedYearMonth(e.target.value)}
                        disabled={isSearchingTournaments}
                        className="grow bg-transparent outline-none"
                        aria-label={t('admin.selectMonth')}
                      />
                    </label>
                  <label className="input input-sm input-bordered flex items-center gap-2">
                    <BsSearch className="h-4 w-4 opacity-70" />
                    <input
                      type="text"
                      value={tournamentSearch}
                      onChange={(e) => setTournamentSearch(e.target.value)}
                      placeholder={t('admin.searchTournaments')}
                      className="grow bg-transparent outline-none"
                    />
                  </label>
                </div>

                {isSearchingTournaments && isFetchingTournamentSearch && (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner loading-sm" />
                  </div>
                )}

                {isSearchingTournaments && !isFetchingTournamentSearch && (
                  <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                    {visibleTournamentResults.length === 0 ? (
                      <p className="text-sm opacity-70">
                        {t('admin.noSearchResults')}
                      </p>
                    ) : (
                      visibleTournamentResults.map(renderTournamentItem)
                    )}
                  </div>
                )}

                {!isSearchingTournaments && isLoading && (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner loading-sm" />
                  </div>
                )}

                {!isSearchingTournaments && !isLoading && error && (
                  <p className="text-sm text-error">
                    {t('admin.loadError')}
                  </p>
                )}

                {!isSearchingTournaments && !isLoading && !error && sortedTournaments.length === 0 && (
                  <p className="text-sm opacity-70">
                    {t('admin.noTournamentsForMonth')}
                  </p>
                )}

                {!isSearchingTournaments && !isLoading && !error && sortedTournaments.length > 0 && (
                  <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                    {sortedTournaments.map(renderTournamentItem)}
                  </div>
                )}
              </div>
            </div>

            <div className={`collapse collapse-arrow bg-base-100 mt-2${canManagePlayers ? '' : ' pointer-events-none opacity-50'}`}>
              <input type="radio" name="admin-accordion" disabled={!canManagePlayers} />
              <div className="collapse-title font-medium">
                {t('admin.players')}
              </div>
              <div className="collapse-content">
                {canManagePlayers ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleNavigate('/players/new')}
                        className="btn btn-secondary btn-sm flex-1 flex items-center gap-0"
                      >
                        <BsPlus className="h-5 w-5" />
                        <span className="hidden text-sm sm:inline">{t('admin.newPlayer')}</span>
                      </button>
                    </div>
                    <PlayerSearchPanel
                      query={playerSearch}
                      onQueryChange={(value) => {
                        setPlayerSearch(value)
                        setSelectedPlayerId(null)
                      }}
                      onSelect={(player) => {
                        setSelectedPlayerId(player.id)
                        handleNavigate(`/players/${player.id}/edit`)
                      }}
                      locale={playerLocale}
                      filter={playerFilter}
                      selectedId={selectedPlayerId}
                    />

                    <div className="flex gap-2">
                      {canBulkImport && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm flex-1 flex items-center gap-0"
                          onClick={() => fileInputRef.current?.click()}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                        >
                          {isImporting ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <>
                              <BsPlus className="h-5 w-5" />
                              <BsPeopleFill className="h-5 w-5 mr-2" />
                              <BsFiletypeCsv className="h-5 w-5" />
                            </>
                          )}
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm opacity-70">
                    {t('admin.playersDisabled')}
                  </p>
                )}
              </div>
            </div>

            <div className={`collapse collapse-arrow bg-base-100 mt-2${canManageEvents ? '' : ' pointer-events-none opacity-50'}`}>
              <input type="radio" name="admin-accordion" disabled={!canManageEvents} />
              <div className="collapse-title font-medium">
                {t('admin.events')}
              </div>
              <div className="collapse-content">
                {canManageEvents ? (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleNavigate('/events/new')}
                      className="btn btn-secondary btn-sm flex items-center gap-0"
                    >
                      <BsPlus className="h-5 w-5" />
                      <span className="hidden text-sm sm:inline">{t('admin.newEvent')}</span>
                    </button>
                    <label className="input input-sm input-bordered flex items-center gap-2">
                      <BsCalendar2 className="h-4 w-4 opacity-70" />
                      <input
                        type="month"
                        value={selectedEventYearMonth}
                        onChange={(e) => setSelectedEventYearMonth(e.target.value)}
                        disabled={isSearchingEvents}
                        className="grow bg-transparent outline-none"
                        aria-label={t('admin.selectMonth')}
                      />
                    </label>
                    <label className="input input-sm input-bordered flex items-center gap-2">
                      <BsSearch className="h-4 w-4 opacity-70" />
                      <input
                        type="text"
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                        placeholder={t('admin.searchEvents')}
                        className="grow bg-transparent outline-none"
                      />
                    </label>
                    {isSearchingEvents && isFetchingEventSearch && (
                      <div className="flex justify-center py-4">
                        <span className="loading loading-spinner loading-sm" />
                      </div>
                    )}

                    {isSearchingEvents && !isFetchingEventSearch && (
                      <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                        {visibleEventResults.length === 0 ? (
                          <p className="text-sm opacity-70">
                            {t('admin.noSearchResults')}
                          </p>
                        ) : (
                          visibleEventResults.map((event) => {
                            const title = event.locales[i18n.language as keyof typeof event.locales]?.title ?? event.slug
                            return (
                              <button
                                key={event.id}
                                type="button"
                                onClick={() => handleNavigate(`/events/${event.id}/edit`)}
                                className="group flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors border-base-300 hover:bg-base-200"
                              >
                                <span className="line-clamp-1 font-medium text-sm">
                                  {title}
                                </span>
                              </button>
                            )
                          })
                        )}
                      </div>
                    )}

                    {!isSearchingEvents && isLoadingEvents && (
                      <div className="flex justify-center py-4">
                        <span className="loading loading-spinner loading-sm" />
                      </div>
                    )}

                    {!isSearchingEvents && !isLoadingEvents && events.length === 0 && (
                      <p className="text-sm opacity-70">
                        {t('admin.noEventsForMonth', { defaultValue: t('admin.eventsPlaceholder') })}
                      </p>
                    )}

                    {!isSearchingEvents && !isLoadingEvents && events.length > 0 && (
                      <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                        {events.map((event) => {
                          const title = event.locales[i18n.language as keyof typeof event.locales]?.title ?? event.slug
                          return (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => handleNavigate(`/events/${event.id}/edit`)}
                              className="group flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors border-base-300 hover:bg-base-200"
                            >
                              <span className="line-clamp-1 font-medium text-sm">
                                {title}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm opacity-70">
                    {t('admin.eventsPlaceholder')}
                  </p>
                )}
              </div>
            </div>

            <div className={`collapse collapse-arrow bg-base-100 mt-2${canManageAssociations ? '' : ' pointer-events-none opacity-50'}`}>
              <input type="radio" name="admin-accordion" disabled={!canManageAssociations} />
              <div className="collapse-title font-medium">
                {t('admin.associations')}
              </div>
              <div className="collapse-content">
                {canManageAssociations ? (
                  <div className="flex flex-col gap-2">
                    {canCreateAssociation && (
                      <button
                        type="button"
                        onClick={() => handleNavigate('/assn/new')}
                        className="btn btn-secondary btn-sm flex-1 flex items-center gap-0"
                      >
                        <BsPlus className="h-5 w-5" />
                        <span className="hidden text-sm sm:inline">{t('admin.newAssociation')}</span>
                      </button>
                    )}
                    <label className="input input-sm input-bordered flex items-center gap-2">
                      <BsFunnel className="h-4 w-4 opacity-70" />
                      <input
                        type="text"
                        value={associationSearch}
                        onChange={(e) => setAssociationSearch(e.target.value)}
                        placeholder={t('admin.filterAssociations')}
                        className="grow bg-transparent outline-none"
                      />
                    </label>

                    {isLoadingAssociations && (
                      <div className="flex justify-center py-4">
                        <span className="loading loading-spinner loading-sm" />
                      </div>
                    )}

                    {!isLoadingAssociations && filteredAssociations.length === 0 && (
                      <p className="text-sm opacity-70">
                        {t('admin.noAssociations')}
                      </p>
                    )}

                    {!isLoadingAssociations && filteredAssociations.length > 0 && (
                      <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                        {filteredAssociations.map((association) => {
                          const title = association.locales[i18n.language as keyof typeof association.locales]?.title ?? association.slug
                          return (
                            <button
                              key={association.id}
                              type="button"
                              onClick={() => handleNavigate(`/assn/${association.id}/edit`)}
                              className="group flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors border-base-300 hover:bg-base-200"
                            >
                              <span className="line-clamp-1 font-medium text-sm">
                                {title}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm opacity-70">
                    {t('admin.associationsDisabled')}
                  </p>
                )}
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100 mt-2">
              <input type="radio" name="admin-accordion" />
              <div className="collapse-title font-medium">
                {t('admin.regulations')}
              </div>
              <div className="collapse-content">
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleNavigate('/regulations/new')}
                    className="btn btn-secondary btn-sm flex items-center gap-0"
                  >
                    <BsPlus className="h-5 w-5" />
                    <span className="hidden text-sm sm:inline">{t('admin.newRegulation')}</span>
                  </button>

                  {isLoadingRegulations && (
                    <div className="flex justify-center py-4">
                      <span className="loading loading-spinner loading-sm" />
                    </div>
                  )}

                  {!isLoadingRegulations && regulationsError && (
                    <p className="text-sm text-error">
                      {t('admin.loadError')}
                    </p>
                  )}

                  {!isLoadingRegulations && !regulationsError && regulations.length === 0 && (
                    <p className="text-sm opacity-70">
                      {t('admin.noRegulations')}
                    </p>
                  )}

                  {!isLoadingRegulations && !regulationsError && regulations.length > 0 && (
                    <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                      {regulations.map((regulation) => {
                        const title = regulation.locales[i18n.language as keyof typeof regulation.locales]?.title ?? ''
                        return (
                          <button
                            key={regulation.id}
                            type="button"
                            onClick={() => handleNavigate(`/regulations/${regulation.id}/edit`)}
                            className="group flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors border-base-300 hover:bg-base-200"
                          >
                            <span className="line-clamp-1 font-medium text-sm">
                              {title || t('admin.untitledRegulation', { defaultValue: t('admin.untitledTournament') })}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="collapse collapse-arrow bg-base-100 mt-2">
                <input type="radio" name="admin-accordion" />
                <div className="collapse-title font-medium">
                  {t('admin.users')}
                </div>
                <div className="collapse-content">
                  <div className="flex flex-col gap-2">
                    <label className="input input-sm input-bordered flex items-center gap-2">
                      <BsSearch className="h-4 w-4 opacity-70" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder={t('admin.searchUsers')}
                        className="grow bg-transparent outline-none"
                      />
                    </label>

                    {isSearchingUsers && isFetchingUserSearch && (
                      <div className="flex justify-center py-4">
                        <span className="loading loading-spinner loading-sm" />
                      </div>
                    )}

                    {isSearchingUsers && !isFetchingUserSearch && userSearchError && (
                      <p className="text-sm text-error">
                        {t('admin.loadError')}
                      </p>
                    )}

                    {isSearchingUsers && !isFetchingUserSearch && !userSearchError && userResults.length === 0 && (
                      <p className="text-sm opacity-70">
                        {t('admin.noUsersFound')}
                      </p>
                    )}

                    {isSearchingUsers && !isFetchingUserSearch && !userSearchError && userResults.length > 0 && (
                      <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                        {userResults.map((user) => {
                          const displayName = getUserDisplayName(
                            user,
                            i18n.language as 'ru' | 'en'
                          )
                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleNavigate(`/users/${user.id}/edit`)}
                              className="group flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors border-base-300 hover:bg-base-200"
                            >
                              <span className="flex w-full items-center justify-between gap-2">
                                <span className="line-clamp-1 font-medium text-sm">
                                  {displayName}
                                </span>
                                <span className="flex shrink-0 items-center gap-1">
                                  {user.auth?.isActive === false && (
                                    <span className="badge badge-error badge-sm">
                                      {t('admin.userBlocked')}
                                    </span>
                                  )}
                                  <span className="badge badge-ghost badge-sm">
                                    {t(`user.role.${user.role}`)}
                                  </span>
                                </span>
                              </span>
                              <span className="line-clamp-1 text-xs opacity-70">
                                {user.email}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BulkImportResultModal
        isOpen={showImportResult}
        result={importResult}
        error={importError}
        onClose={() => setShowImportResult(false)}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        title={t('admin.unsavedChangesConfirmTitle')}
        message={t('admin.unsavedChangesConfirm')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="primary"
        onConfirm={handleConfirmNavigation}
        onCancel={handleCancelNavigation}
      />
    </>
  )
}
