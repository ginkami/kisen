import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthForm } from '../components/AuthForm.tsx'
import { useAppSettings } from '../hooks/useAppSettings.ts'

export function LoginPage() {
  const { t } = useTranslation()
  const settings = useAppSettings()

  useEffect(() => {
    document.title = t('auth.pageTitle')
  }, [t])

  // Wait for the settings snapshot to avoid flashing the form.
  if (settings === null) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  // Testing-mode lock: /login is reachable only with the configured hash
  // fragment (/login#<hash>).
  const hash = window.location.hash.replace(/^#/, '')
  if (settings.lockLogin && (hash === '' || hash !== settings.loginHash)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="alert alert-warning">
          <span>{t('auth.unavailable')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md">
        <AuthForm />
      </div>
    </div>
  )
}
