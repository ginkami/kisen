import { PlusIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import { tournamentService } from '../services/tournamentService.ts'

interface NewTournamentButtonProps {
  variant?: 'header' | 'drawer'
  hasUnsavedChanges?: boolean
}

export function NewTournamentButton({
  variant = 'header',
  hasUnsavedChanges = false,
}: NewTournamentButtonProps) {
  const { t, i18n } = useTranslation()
  const { isAuthenticated, firebaseUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
  }, [location.pathname])

  const handleClick = async () => {
    if (!isAuthenticated || !firebaseUser) {
      navigate('/login')
      return
    }

    if (
      hasUnsavedChanges &&
      !window.confirm(t('admin.unsavedChangesConfirm'))
    ) {
      return
    }

    setIsCreating(true)
    setError(null)
    try {
      const tournament = await tournamentService.createDraft({
        createdBy: firebaseUser.uid,
        initialLocale: i18n.language,
      })
      navigate(`/tournaments/${tournament.id}/edit`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('tournament.edit.errors.save')
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
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
      {error && (
        <span className="text-error text-xs max-w-[200px]">{error}</span>
      )}
    </div>
  )
}
