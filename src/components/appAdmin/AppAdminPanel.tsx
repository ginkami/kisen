import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.tsx'
import {
  saveAppSettings,
  subscribeAppSettings,
  type AppSettings,
} from '../../services/appSettingsService.ts'

export function AppAdminPanel() {
  const { t } = useTranslation()
  const { user, isAuthenticated, isLoading } = useAuth()

  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [lockLogin, setLockLogin] = useState(false)
  const [loginHash, setLoginHash] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => subscribeAppSettings((settings: AppSettings) => {
    setSettingsLoaded(true)
    setLockLogin(settings.lockLogin)
    setLoginHash(settings.loginHash)
  }), [])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      await saveAppSettings({ lockLogin, loginHash })
      setSaveMessage(t('appAdmin.settings.saved'))
    } catch {
      setSaveMessage(t('appAdmin.settings.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

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
          {!settingsLoaded ? (
            <p className="text-sm opacity-70">{t('appAdmin.settings.loading')}</p>
          ) : (
            <div className="space-y-4">
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    id="app-admin-lock-login"
                    type="checkbox"
                    checked={lockLogin}
                    onChange={(e) => setLockLogin(e.target.checked)}
                    className="toggle toggle-primary"
                    data-testid="app-admin-lock-login"
                  />
                  <span className="label-text">
                    {t('appAdmin.settings.lockLogin')}
                  </span>
                </label>
              </div>
              <div className="form-control">
                <label className="label" htmlFor="app-admin-login-hash">
                  <span className="label-text">{t('appAdmin.settings.loginHash')}</span>
                </label>
                <input
                  id="app-admin-login-hash"
                  type="text"
                  value={loginHash}
                  onChange={(e) => setLoginHash(e.target.value)}
                  className="input input-bordered input-sm w-full font-mono"
                  data-testid="app-admin-login-hash"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="btn btn-primary btn-sm"
              >
                {isSaving && <span className="loading loading-spinner loading-xs" />}
                {t('appAdmin.settings.save')}
              </button>
              {saveMessage && <p className="text-sm opacity-70">{saveMessage}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
