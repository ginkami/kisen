import { useTranslation } from 'react-i18next'

export function ProfilePage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
      <p className="opacity-70">{t('profile.placeholder')}</p>
    </div>
  )
}
