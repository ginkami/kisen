import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.tsx'

export function AppAdminPanel() {
  const { t } = useTranslation()
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="alert alert-warning">
          <span>{t('appAdmin.errors.noAccess')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">{t('appAdmin.title')}</h1>

      <div role="tablist" className="tabs tabs-lift">
        <input
          type="radio"
          name="app-admin-tabs"
          role="tab"
          className="tab"
          aria-label={t('appAdmin.tabs.settings')}
          defaultChecked
        />
        <div className="tab-content border-base-300 bg-base-100 p-6">
          <p className="text-sm opacity-70">{t('appAdmin.settings.empty')}</p>
        </div>
      </div>
    </div>
  )
}
