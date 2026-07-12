import { useTranslation } from 'react-i18next'

export function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">
        {t('home.title', 'Welcome to shogi·world')}
      </h2>
      <p className="text-slate-600">{t('home.description', 'Tournament management for shogi.')}</p>
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary">
          Primary
        </button>
        <button type="button" className="btn btn-secondary">
          Secondary
        </button>
        <button type="button" className="btn btn-accent">
          Accent
        </button>
      </div>
    </div>
  )
}
