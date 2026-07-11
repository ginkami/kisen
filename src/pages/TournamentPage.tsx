import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function TournamentPage() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">
        {t('tournament.title', 'Tournament')}
      </h2>
      <p className="text-slate-600">
        {t('tournament.slugLabel', 'Slug')}: {slug}
      </p>
    </div>
  )
}
