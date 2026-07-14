import { PlusIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.tsx'

export function NewTournamentButton() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(isAuthenticated ? '/tournaments/new' : '/login')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-secondary btn-sm newt-btn"
    >
      <PlusIcon className="stroke-[3] h-4 w-4" />
      <span className="hidden sm:inline">{t('tournament.new')}</span>
    </button>
  )
}
