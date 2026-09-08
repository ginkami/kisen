import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.tsx'
import { usePlayerForm } from '../../hooks/usePlayerForm.ts'
import { useMyAssociations } from '../../hooks/useAssociations.ts'
import { ConfirmModal } from '../ConfirmModal.tsx'
import { PlayerInfoSection } from './PlayerInfoSection.tsx'
import { canEditPlayer } from '../../domain/player.ts'
import type { SupportedLocale } from '../../domain/locale.ts'

interface PlayerEditFormProps {
  playerId: string | undefined
}

export function PlayerEditForm({ playerId }: PlayerEditFormProps) {
  const { t, i18n } = useTranslation()
  const { isAuthenticated, firebaseUser, user } = useAuth()
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(
    (i18n.language as SupportedLocale) ?? 'ru'
  )
  const [confirmModal, setConfirmModal] = useState(false)

  const {
    player,
    formState,
    isLoading,
    loadError,
    isSaving,
    isDeleting,
    saveError,
    deleteError,
    validationErrors,
    clearSaveError,
    clearDeleteError,
    updateLocale,
    updateBasic,
    updateRating,
    addAssociation,
    removeAssociation,
    savePlayer,
    deletePlayer,
  } = usePlayerForm(playerId)

  const canEditAssociations = user?.role === 'admin' || user?.role === 'manager'

  // Client-side mirror of the Firestore player-update rules: admins, the
  // creator, and managers of the player's associations may edit. Guarding
  // here prevents opening a dead-end editor via a direct URL.
  const isAdmin = user?.role === 'admin'
  const userId = firebaseUser?.uid
  const {
    data: myAssociations = [],
    isLoading: isLoadingMyAssociations,
  } = useMyAssociations(userId)
  const managedAssociationIds = useMemo(
    () => myAssociations.map((a) => a.id),
    [myAssociations]
  )

  // Compute display name from active locale
  const localizedFamilyName = formState?.locales[activeLocale]?.familyName ?? ''
  const localizedGivenName = formState?.locales[activeLocale]?.givenName ?? ''
  const displayName =
    localizedFamilyName && localizedGivenName
      ? `${localizedFamilyName}, ${localizedGivenName}`
      : t('player.new')

  // Update document title reactively
  useEffect(() => {
    document.title = t('player.edit.pageTitle', { name: displayName })
  }, [displayName, i18n.language, t])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isLoading || !formState) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (loadError) {
    return <p className="text-error">{t('player.edit.errors.load')}</p>
  }

  // The player query has resolved here (isLoading handled above); wait for
  // the user's managed associations before deciding, so a legitimate editor
  // never sees a false "no access" flash.
  if (player && isLoadingMyAssociations) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (player && userId && !canEditPlayer(player, userId, isAdmin, managedAssociationIds)) {
    return (
      <div className="alert alert-error" role="alert">
        <p>{t('player.edit.errors.noAccess')}</p>
      </div>
    )
  }

  const handleDelete = () => {
    setConfirmModal(true)
  }

  const handleConfirmDelete = async () => {
    setConfirmModal(false)
    await deletePlayer()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header block */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-70">
            {t('player.edit.managementPanel')}
          </div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={savePlayer}
            disabled={isSaving || isDeleting}
            className="btn btn-primary"
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              t('player.edit.save')
            )}
          </button>
          {player && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="btn btn-error btn-outline"
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                t('player.edit.delete')
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error alerts */}
      {saveError && (
        <div className="alert alert-error">
          <p className="flex-1">{t('player.edit.errors.save')}</p>
          <button type="button" onClick={clearSaveError} className="btn btn-sm btn-ghost">
            ×
          </button>
        </div>
      )}
      {deleteError && (
        <div className="alert alert-error">
          <p className="flex-1">{t('player.edit.errors.delete')}</p>
          <button type="button" onClick={clearDeleteError} className="btn btn-sm btn-ghost">
            ×
          </button>
        </div>
      )}

      {/* Player info section */}
      <PlayerInfoSection
        formState={formState}
        activeLocale={activeLocale}
        onLocaleChange={setActiveLocale}
        onUpdateLocale={updateLocale}
        onUpdateBasic={updateBasic}
        onUpdateRating={updateRating}
        onAddAssociation={addAssociation}
        onRemoveAssociation={removeAssociation}
        canEditAssociations={canEditAssociations}
        validationErrors={validationErrors}
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={confirmModal}
        title={t('player.edit.deleteConfirmTitle')}
        message={t('player.edit.deleteConfirm')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal(false)}
      />
    </div>
  )
}