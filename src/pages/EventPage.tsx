import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { eventService } from '../services/eventService.ts'
import { tournamentService } from '../services/tournamentService.ts'
import { type SupportedLocale } from '../domain/locale.ts'
import { latestTournament } from '../utils/tournamentDisplay.ts'
import { TournamentPage } from './TournamentPage.tsx'
import { EventDescriptionSection } from '../components/event/EventDescriptionSection.tsx'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Public event page at /events/{UUID|slug}: with public tournaments it
 * renders the latest one (by start-time cascade) in place via TournamentPage;
 * without them it renders the event description and regulations.
 */
export function EventPage() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'
  const isUuid = slug ? UUID_RE.test(slug) : false

  const eventQuery = useQuery({
    queryKey: ['event', 'view', slug],
    queryFn: () => isUuid ? eventService.getById(slug!) : eventService.getBySlug(slug!),
    enabled: !!slug,
  })
  const event = eventQuery.data ?? null

  const tournamentsQuery = useQuery({
    queryKey: ['tournaments', 'eventView', event?.id],
    queryFn: () => tournamentService.list({ parentEvent: event!.id, isPublic: true }),
    enabled: !!event,
  })

  const eventTitle = useMemo(() => {
    if (!event) return ''
    return event.locales[locale]?.title || event.locales.ru?.title || event.slug
  }, [event, locale])

  const latest = useMemo(
    () => latestTournament(tournamentsQuery.data ?? []),
    [tournamentsQuery.data]
  )

  // Child-first effect order makes this win over the title set by the
  // embedded TournamentPage — the event URL advertises the event title.
  useEffect(() => {
    if (event) document.title = t('event.view.pageTitle', { title: eventTitle })
  }, [event, eventTitle, t])

  if (eventQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (eventQuery.isError || !event) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 py-8">
        <div className="alert alert-error">
          <span>{eventQuery.isError ? t('event.view.errors.load') : t('event.view.notFound')}</span>
        </div>
      </div>
    )
  }

  if (tournamentsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <h1 className="text-3xl font-bold">{eventTitle}</h1>
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </div>
    )
  }

  if (tournamentsQuery.isError) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 py-8">
        <div className="alert alert-error">
          <span>{t('event.view.errors.load')}</span>
        </div>
      </div>
    )
  }

  if (latest) {
    return <TournamentPage key={latest.id} tournamentId={latest.id} />
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-3xl font-bold">{eventTitle}</h1>
      <EventDescriptionSection event={event} />
    </div>
  )
}