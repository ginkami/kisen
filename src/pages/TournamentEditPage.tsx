import { useTranslation } from 'react-i18next'

export function TournamentEditPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('tournament.newTitle')}</h1>
      <p className="opacity-70">{t('tournament.formPlaceholder')}</p>
    </div>
  )
}
