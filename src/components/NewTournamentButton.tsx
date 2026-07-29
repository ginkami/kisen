import { BsPlus } from 'react-icons/bs'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import { ConfirmModal } from './ConfirmModal.tsx'
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
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const shouldCreateAfterConfirm = useRef(false)

  const createTournament = async () => {
    if (!isAuthenticated || !firebaseUser) {
      navigate('/login')
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

  const handleClick = () => {
    if (!isAuthenticated || !firebaseUser) {
      navigate('/login')
      return
    }

    if (hasUnsavedChanges) {
      shouldCreateAfterConfirm.current = true
      setConfirmModalOpen(true)
      return
    }

    void createTournament()
  }

  const handleConfirm = () => {
    setConfirmModalOpen(false)
    if (shouldCreateAfterConfirm.current) {
      shouldCreateAfterConfirm.current = false
      void createTournament()
    }
  }

  const handleCancel = () => {
    setConfirmModalOpen(false)
    shouldCreateAfterConfirm.current = false
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isCreating}
        className={[
          'btn btn-secondary flex items-center gap-0',
          variant === 'header' ? 'btn-sm' : 'btn-block btn-sm',
        ].join(' ')}
      >
        {isCreating ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <BsPlus className="h-5 w-5" />
        )}
        <span className={variant === 'header' ? 'hidden text-sm sm:inline' : 'text-sm'}>
          {t('tournament.new')}
        </span>
      </button>
      {error && (
        <span className="text-error text-xs max-w-[200px]">{error}</span>
      )}

      <ConfirmModal
        isOpen={confirmModalOpen}
        title={t('admin.unsavedChangesConfirmTitle')}
        message={t('admin.unsavedChangesConfirm')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="primary"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  )
}
