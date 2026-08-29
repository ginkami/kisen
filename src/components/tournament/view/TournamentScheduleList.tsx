import { useTranslation } from 'react-i18next'
import { mergeSchedule } from '../../../hooks/useTournamentForm.ts'
import { formatDateTimeShort } from '../../../utils/dateTime.ts'
import type { Tournament } from '../../../domain/tournament.ts'
import type { SupportedLocale } from '../../../domain/locale.ts'

interface TournamentScheduleListProps {
  tournament: Tournament
}

export function TournamentScheduleList({ tournament }: TournamentScheduleListProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'

  const rows = mergeSchedule(tournament.schedule.events, tournament.schedule.rounds)

  if (rows.length === 0) {
    return <p className="text-sm opacity-60">{t('tournament.view.noSchedule')}</p>
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-3">
          <span className="text-sm opacity-70 min-w-[8rem]">
            {row.scheduledAt
              ? formatDateTimeShort(row.scheduledAt, i18n.language)
              : '—'}
          </span>
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
