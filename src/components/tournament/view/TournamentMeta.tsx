import { useTranslation } from 'react-i18next'
import * as Flags from 'country-flag-icons/react/3x2'
import { BsCalendar3, BsGeoAlt, BsHourglassSplit, BsPlayFill } from 'react-icons/bs'
import { FaUsers } from "react-icons/fa6";
import { PiGavelLight } from 'react-icons/pi'
import { getCountryName } from '../../../utils/countries.ts'
import {
  tournamentScheduleDays,
  formatDayRanges,
  formatTimeControlShort,
} from '../../../utils/tournamentDisplay.ts'
import { resolveLocationTimeZone } from '../../../utils/scheduleTime.ts'
import type { Tournament } from '../../../domain/tournament.ts'
import type { SupportedLocale } from '../../../domain/locale.ts'

function FlagIcon({ code, className }: { code: string; className?: string }) {
  const Flag = Flags[code.toUpperCase() as keyof typeof Flags]
  if (!Flag) return <span className={className} />
  return <Flag className={className} />
}

interface TournamentMetaProps {
  tournament: Tournament
}

export function TournamentMeta({ tournament }: TournamentMetaProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'

  const days = tournamentScheduleDays(tournament, resolveLocationTimeZone(tournament.location))
  const datesStr = formatDayRanges(days, locale)

  const loc = tournament.location
  const country = loc?.country
  const settlement =
    loc?.locales?.[locale]?.settlement ||
    Object.values(loc?.locales ?? {}).find((l) => l.settlement)?.settlement ||
    ''
  const venue = loc?.locales?.[locale]?.venue || ''

  const participantCount = tournament.participants.length
  const roundCount = tournament.schedule.rounds.length
  const tc = tournament.settings.timeControl
  const tcStr = formatTimeControlShort(tc, t)

  const arbiterLoc =
    tournament.arbiter?.locales?.[locale] ||
    tournament.arbiter?.locales?.ru ||
    tournament.arbiter?.locales?.en
  const arbiterName = arbiterLoc
    ? `${arbiterLoc.familyName}, ${arbiterLoc.givenName}`
    : ''

  return (
    <div className="space-y-1 text-xs sm:text-sm">
      <div className="flex items-center gap-1 sm:gap-2">
        <BsCalendar3 className="h-4 w-4 opacity-60 shrink-0" />
        <span>{datesStr}</span>
      </div>

      {(country || venue) && (
        <div className="flex items-center gap-1 sm:gap-2">
          {country && (
            <FlagIcon code={country} className="h-3 w-4 rounded-sm shrink-0" />        
          )}
          {country && (
            <span>
              {getCountryName(country, locale)}
              {settlement && `, ${settlement}`}
            </span>          
          )}
          {venue && (
              <BsGeoAlt className="h-4 w-4 opacity-60 shrink-0" />
          )}
          {venue && (
              <span>{venue}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 sm:gap-2">
        <BsHourglassSplit className="h-4 w-4 opacity-60 shrink-0" />
        <span>{tcStr}</span>
        <FaUsers className="h-4 w-4 opacity-60 shrink-0" />
        <span>{t('tournament.view.playersCount', { count: participantCount })}</span>
        <BsPlayFill className="h-4 w-4 opacity-60 shrink-0" />
        <span>{t('tournament.view.roundsCount', { count: roundCount })}</span>
      </div>

      {arbiterName && (
        <div className="flex items-center gap-1 sm:gap-2">
          <PiGavelLight className="h-4 w-4 opacity-60 shrink-0" />
          <span>{arbiterName}</span>
        </div>
      )}
    </div>
  )
}
