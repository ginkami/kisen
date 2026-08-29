import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { sortTournamentsByStart } from '../../../utils/tournamentDisplay.ts'
import type { Tournament } from '../../../domain/tournament.ts'
import type { SupportedLocale } from '../../../domain/locale.ts'

interface EventTournamentTabsProps {
  siblings: Tournament[]
  activeId: string
}

export function EventTournamentTabs({ siblings, activeId }: EventTournamentTabsProps) {
  const { i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'

  const sorted = sortTournamentsByStart(siblings)

  return (
    <div className="overflow-x-auto">
      <div className="tabs tabs-lift">
        {sorted.map((t) => {
          const title =
            t.locales[locale]?.title ||
            t.locales.ru?.title ||
            t.locales.en?.title ||
            ''
          const isActive = t.id === activeId

          if (isActive) {
            return (
              <a key={t.id} className="tab tab-lift tab-active">
                {title}
              </a>
            )
          }

          return (
            <Link
              key={t.id}
              to={`/tournaments/${t.slug}`}
              className="tab tab-lift"
            >
              {title}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
