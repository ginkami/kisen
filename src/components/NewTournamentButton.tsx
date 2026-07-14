import { PlusIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import { tournamentService } from '../services/tournamentService.ts'

interface NewTournamentButtonProps {
  variant?: 'header' | 'drawer'
}

export function NewTournamentButton({
  variant = 'header',
}: NewTournamentButtonProps) {
  const { t, i18n } = useTranslation()
  const { isAuthenticated, firebaseUser } = useAuth()
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)

  const handleClick = async () => {
    if (!isAuthenticated || !firebaseUser) {
      navigate('/login')
      return
    }

    setIsCreating(true)
    try {
      const tournament = await tournamentService.createDraft({
        createdBy: firebaseUser.uid,
        initialLocale: i18n.language,
      })
      navigate(`/tournaments/${tournament.id}/edit`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isCreating}
      className={[
        'btn btn-secondary',
        variant === 'header' ? 'btn-sm' : 'btn-block btn-sm',
      ].join(' ')}
    >
      {isCreating ? (
        <span className="loading loading-spinner loading-xs" />
      ) : (
        <PlusIcon className="stroke-[3] h-4 w-4" />
      )}
      <span className={variant === 'header' ? 'hidden sm:inline' : ''}>
        {t('tournament.new')}
      </span>
    </button>
  )
}
