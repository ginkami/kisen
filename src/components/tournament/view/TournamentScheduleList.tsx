import { useTranslation } from 'react-i18next'
import { BsInfoCircleFill } from 'react-icons/bs'
import { mergeSchedule } from '../../../hooks/useTournamentForm.ts'
import { formatDateTimeShort, formatScheduleDateTime } from '../../../utils/dateTime.ts'
import { resolveLocationTimeZone } from '../../../utils/scheduleTime.ts'
import type { Tournament } from '../../../domain/tournament.ts'
import type { SupportedLocale } from '../../../domain/locale.ts'

interface TournamentScheduleListProps {
  tournament: Tournament
}

export function TournamentScheduleList({ tournament }: TournamentScheduleListProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'
  const timeZone = resolveLocationTimeZone(tournament.location)

  const rows = mergeSchedule(tournament.schedule.events, tournament.schedule.rounds)

  if (rows.length === 0) {
    return <p className="text-sm opacity-60">{t('tournament.view.noSchedule')}</p>
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-3 pb-1 border-b border-b-base-300">
          {row.scheduledAt && timeZone ? (
            <div className="min-w-[8rem] ">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold">
                  {formatScheduleDateTime(row.scheduledAt, i18n.language, timeZone).localTime}
                </span>
                <span
                  className="tooltip"
                  data-tip={t('tournament.view.localTimeHint')}
                >
                  <BsInfoCircleFill
                    className="h-3 w-3 opacity-50"
                    aria-label={t('tournament.view.localTimeHint')}
                  />
                </span>
                <span className="text-[60%] opacity-60">
                  {(() => {
                    const parts = formatScheduleDateTime(row.scheduledAt, i18n.language, timeZone)
                    return `${parts.utcTime} ${t('tournament.view.utcTime')}${parts.utcDateSuffix ? ` ${parts.utcDateSuffix}` : ''}`
                  })()}
                </span>
              </div>
              <div className="text-xs opacity-60">
                {formatScheduleDateTime(row.scheduledAt, i18n.language, timeZone).localWeekdayDate}
              </div>
            </div>
          ) : (
            <span className="text-sm opacity-70 min-w-[8rem]">
              {row.scheduledAt
                ? formatDateTimeShort(row.scheduledAt, i18n.language)
                : '—'}
            </span>
          )}
          {row.kind === 'round' ? (
            <span className="badge badge-info badge-sm">
              {t('tournament.edit.program.round', { n: row.number })}
            </span>
          ) : (
            <span className="text-sm font-medium">
              {row.locales[locale]?.title ||
                row.locales.ru?.title ||
                row.locales.en?.title ||
                ''}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
