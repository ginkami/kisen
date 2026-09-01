import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { BsJournalText, BsClock, Bs123, BsGrid3X2 } from 'react-icons/bs'
import { HiOutlineUserGroup } from 'react-icons/hi2'
import { tournamentService } from '../services/tournamentService.ts'
import { eventService } from '../services/eventService.ts'
import { type SupportedLocale } from '../domain/locale.ts'
import { EventTournamentTabs } from '../components/tournament/view/EventTournamentTabs.tsx'
import { TournamentMeta } from '../components/tournament/view/TournamentMeta.tsx'
import { TournamentScheduleList } from '../components/tournament/view/TournamentScheduleList.tsx'
import { PlayersTable } from '../components/tournament/view/PlayersTable.tsx'
import { CrosstableView } from '../components/tournament/view/CrosstableView.tsx'
import { TournamentResultsSection } from '../components/tournament/view/TournamentResultsSection.tsx'
import { TournamentDescriptionSection } from '../components/tournament/view/TournamentDescriptionSection.tsx'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
type TabId = 'description' | 'schedule' | 'players' | 'results' | 'crosstable'

export function TournamentPage() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'
  const isUuid = slug ? UUID_RE.test(slug) : false

  const tournamentQuery = useQuery({
    queryKey: ['tournament', 'view', slug],
    queryFn: () => isUuid ? tournamentService.getById(slug!) : tournamentService.getBySlug(slug!),
    enabled: !!slug,
  })
  const tournament = tournamentQuery.data ?? null
  const isPublic = tournament?.isPublic === true
  const parentEvent = tournament?.parentEvent

  const eventQuery = useQuery({
    queryKey: ['event', 'byId', parentEvent],
    queryFn: () => eventService.getById(parentEvent!),
    enabled: !!parentEvent,
  })
  const siblingsQuery = useQuery({
    queryKey: ['tournaments', 'siblings', parentEvent],
    queryFn: () => tournamentService.list({ parentEvent: parentEvent!, isPublic: true }),
    enabled: !!parentEvent,
  })

  const eventTitle = useMemo(() => {
    const ev = eventQuery.data
    if (!ev) return ''
    return ev.locales[locale]?.title || ev.locales.ru?.title || ev.slug || ''
  }, [eventQuery.data, locale])

  const tournamentTitle = useMemo(() => {
    if (!tournament) return ''
    return tournament.locales[locale]?.title || tournament.locales.ru?.title || ''
  }, [tournament, locale])

  const [activeTab, setActiveTab] = useState<TabId>('description')
  useEffect(() => {
    if (tournament && isPublic) document.title = t('tournament.view.pageTitle', { title: tournamentTitle })
  }, [tournamentTitle, isPublic, t])

  if (tournamentQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (tournamentQuery.isError || !tournament || !isPublic) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 py-8">
        <div className="alert alert-error">
          <span>{tournamentQuery.isError ? t('tournament.view.errors.load') : t('tournament.view.notFound')}</span>
        </div>
      </div>
    )
  }

  const hasParentEvent = !!parentEvent
  const siblings = siblingsQuery.data ?? []
  const roundCount = tournament.schedule.rounds.length

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'description', label: t('tournament.view.tabs.description'), icon: BsJournalText },
    { id: 'schedule', label: t('tournament.view.tabs.schedule'), icon: BsClock },
    { id: 'players', label: t('tournament.view.tabs.players'), icon: HiOutlineUserGroup },
    { id: 'results', label: t('tournament.view.tabs.results'), icon: Bs123 },
    { id: 'crosstable', label: t('tournament.view.tabs.crosstable'), icon: BsGrid3X2 },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {hasParentEvent ? (
        <>
          {eventTitle && <h1 className="text-3xl font-bold">{eventTitle}</h1>}
          {siblings.length > 0 && <EventTournamentTabs siblings={siblings} activeId={tournament.id} />}
          <h2 className="text-2xl font-semibold">{tournamentTitle}</h2>
        </>
      ) : (
        <h1 className="text-3xl font-bold">{tournamentTitle}</h1>
      )}

      <TournamentMeta tournament={tournament} />

      <div className="tabs tabs-box" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} type="button" role="tab" aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={['tab gap-2', isActive ? 'tab-active' : ''].join(' ')}>
              <Icon className="h-5 w-5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {activeTab === 'description' && (
        <TournamentDescriptionSection tournament={tournament} event={eventQuery.data ?? null} />
      )}
      {activeTab === 'schedule' && <TournamentScheduleList tournament={tournament} />}
      {activeTab === 'players' && <PlayersTable participants={tournament.participants} />}
      {activeTab === 'results' && (
        <TournamentResultsSection games={tournament.games} participants={tournament.participants}
          roundCount={roundCount} publishedRounds={tournament.publishedRounds}
          considerSente={tournament.settings.considerSente} />
      )}
      {activeTab === 'crosstable' && (
        <CrosstableView games={tournament.games} participants={tournament.participants}
          publishedRounds={tournament.publishedRounds}
          considerSente={tournament.settings.considerSente} tieBreaks={tournament.settings.tieBreaks} />
      )}
    </div>
  )
}

