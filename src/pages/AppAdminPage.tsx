import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AppAdminPanel } from '../components/appAdmin/AppAdminPanel.tsx'

export function AppAdminPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = t('appAdmin.pageTitle', { title: t('appAdmin.title') })
  }, [t])

  return <AppAdminPanel />
}
