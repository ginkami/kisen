import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthForm } from '../components/AuthForm.tsx'

export function LoginPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = t('auth.pageTitle')
  }, [t])

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md">
        <AuthForm />
      </div>
    </div>
  )
}
