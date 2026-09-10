import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as Flags from 'country-flag-icons/react/3x2'
import {
  BsCalendar3,
  BsHourglassSplit,
  BsPencilSquare,
  BsPlayFill,
} from 'react-icons/bs'
import { HiOutlineUserGroup } from 'react-icons/hi2'
import { getCountryName } from '../../utils/countries.ts'
import {
  formatDayRanges,
  formatTimeControlShort,
  tournamentScheduleDays,
} from '../../utils/tournamentDisplay.ts'
import { resolveLocationTimeZone } from '../../utils/scheduleTime.ts'
import { getTournamentLocale, type Tournament } from '../../domain/tournament.ts'
import type { Association } from '../../domain/association.ts'
import type { Event } from '../../domain/event.ts'
import type { SupportedLocale } from '../../domain/locale.ts'

function FlagIcon({ code, className }: { code: string; className?: string }) {
  const Flag = Flags[code.toUpperCase() as keyof typeof Flags]
  if (!Flag) return <span className={className} />
  return <Flag className={className} />
}

interface TournamentCardProps {
  tournament: Tournament
  parentEvent: Event | null
  association: Association | null
  canEdit: boolean
}

export function TournamentCard({
  tournament,
  parentEvent,
  association,
  canEdit,
}: TournamentCardProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'

  const localized = getTournamentLocale(tournament, locale)
  const days = tournamentScheduleDays(
    tournament,
    resolveLocationTimeZone(tournament.location)
  )
  const datesStr = formatDayRanges(days, locale)
  const tcStr = formatTimeControlShort(tournament.settings.timeControl, t)

  const country = localized.country
  const settlement = localized.settlement

  const eventTitle = parentEvent
    ? parentEvent.locales[locale as keyof typeof parentEvent.locales]?.title ??
      parentEvent.slug
    : null
  const associationTitle = association
    ? association.locales[locale as keyof typeof association.locales]?.title ??
      association.slug
    : null

  return (
    <article className="relative rounded-lg border border-base-300 bg-base-100 p-4 transition-colors hover:bg-base-200/40">
      {canEdit && (
        <Link
          to={`/tournaments/${tournament.id}/edit`}
          className="btn btn-ghost btn-sm absolute right-2 top-2"
          aria-label={t('home.editTournament')}
          title={t('home.editTournament')}
        >
          <BsPencilSquare className="h-4 w-4" />
        </Link>
      )}

      <h2 className="pr-8 text-lg font-semibold">
        <Link
          to={`/tournaments/${tournament.slug}`}
          className="link link-hover line-clamp-2"
        >
          {localized.title}
        </Link>
      </h2>

      {parentEvent && eventTitle && (
        <p className="mt-0.5 text-xs opacity-70">
          <Link
            to={`/events/${parentEvent.slug}`}
            className="link link-hover line-clamp-1"
          >
            {eventTitle}
          </Link>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1">
            <BsCalendar3 className="h-4 w-4 shrink-0 opacity-60" />
            {datesStr}
          </span>
          <span className="flex items-center gap-1">
            <BsHourglassSplit className="h-4 w-4 shrink-0 opacity-60" />
            {tcStr}
          </span>
          <span className="flex items-center gap-1">
            <HiOutlineUserGroup className="h-4 w-4 shrink-0 opacity-60" />
            {t('tournament.view.playersCount', {
              count: tournament.participants.length,
            })}
          </span>
          <span className="flex items-center gap-1">
            <BsPlayFill className="h-4 w-4 shrink-0 opacity-60" />
            {t('tournament.view.roundsCount', {
              count: tournament.schedule.rounds.length,
            })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {associationTitle && (
            <span className="badge badge-ghost badge-sm">{associationTitle}</span>
          )}
          {country && (
            <span className="flex items-center gap-1">
              <FlagIcon code={country} className="h-3 w-4 shrink-0 rounded-sm" />
              {getCountryName(country, locale)}
              {settlement && `, ${settlement}`}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
