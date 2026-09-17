import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PublicTournamentsBoard } from '../components/home/PublicTournamentsBoard.tsx'

export function HomePage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = t('home.pageTitle')
  }, [t])

  return <PublicTournamentsBoard />
}

