import { PlusIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import { tournamentService } from '../services/tournamentService.ts'
import { supportedLocales } from '../domain/locale.ts'
import type { Tournament } from '../domain/tournament.ts'

function arbiterFromDisplayName(displayName: string | null): Tournament['arbiter'] {
  const trimmed = displayName?.trim() ?? ''
  const parts = trimmed.split(/\s+/).filter(Boolean)
  const givenName = parts.length > 1 ? parts.slice(0, -1).join(' ') : ''
  const familyName = parts.length > 0 ? parts.at(-1) ?? '' : ''

  return {
    locales: Object.fromEntries(
      supportedLocales.map((locale) => [locale, { givenName, familyName }])
    ) as Tournament['arbiter']['locales'],
  }
}

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
        arbiter: arbiterFromDisplayName(firebaseUser.displayName),
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
