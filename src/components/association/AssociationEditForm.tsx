import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.tsx'
import { useAssociationForm } from '../../hooks/useAssociationForm.ts'
import { ConfirmModal } from '../ConfirmModal.tsx'
import { AssociationInfoSection } from './AssociationInfoSection.tsx'
import { AssociationManagersSection } from './AssociationManagersSection.tsx'
import type { SupportedLocale } from '../../domain/locale.ts'

interface AssociationEditFormProps {
  associationId: string | undefined
}

export function AssociationEditForm({ associationId }: AssociationEditFormProps) {
  const { t, i18n } = useTranslation()
  const { isAuthenticated, firebaseUser } = useAuth()
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(
    (i18n.language as SupportedLocale) ?? 'ru'
  )
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false)

  const {
    association,
    formState,
    isLoading,
    loadError,
    isDirty,
    isSaving,
    isDeleting,
    saveError,
    deleteError,
    validationErrors,
    clearSaveError,
    clearDeleteError,
    updateLocale,
    updateBasic,
    addManager,
    removeManager,
    addPendingInvite,
    removePendingInvite,
    save,
    deleteAssociation,
    managerProfiles,
    creatorProfile,
    isNew,
    slugTaken,
  } = useAssociationForm(associationId)

  // Compute display title from active locale
  const localizedTitle = formState?.locales[activeLocale]?.title ?? ''
  const displayTitle = localizedTitle || (isNew ? t('association.edit.newTitle') : '')

  // Update document title reactively
  useEffect(() => {
    if (isNew) {
      document.title = `${t('association.edit.newTitle')} — ${t('association.edit.managementPanel')} | shogi·world`
    } else if (displayTitle) {
      document.title = `${displayTitle} — ${t('association.edit.managementPanel')} | shogi·world`
    }
  }, [displayTitle, isNew, i18n.language, t])

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
    return <p className="text-error">{t('association.edit.errors.load')}</p>
  }

  const handleDelete = () => {
    setConfirmDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    setConfirmDeleteModal(false)
    await deleteAssociation()
  }

  // Build excludeUserIds: createdBy + managers (to prevent re-adding)
  const excludeUserIds = [
    association?.createdBy ?? firebaseUser?.uid ?? '',
    ...(formState.managers),
  ].filter(Boolean)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header block */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-70">
            {t('association.edit.managementPanel')}
          </div>
          <h1 className="text-2xl font-bold">
            {displayTitle || t('association.edit.newTitle')}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={isSaving || isDeleting || !isDirty}
            className="btn btn-primary"
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              t('association.edit.save')
            )}
          </button>
          {association && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="btn btn-error btn-outline"
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                t('association.edit.delete')
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error alerts */}
      {saveError && (
        <div className="alert alert-error">
          <p className="flex-1">{t('association.edit.errors.save')}</p>
          <button type="button" onClick={clearSaveError} className="btn btn-sm btn-ghost">
            ×
          </button>
        </div>
      )}
      {deleteError && (
        <div className="alert alert-error">
          <p className="flex-1">{t('association.edit.errors.delete')}</p>
          <button type="button" onClick={clearDeleteError} className="btn btn-sm btn-ghost">
            ×
          </button>
        </div>
      )}

      {/* Association info section */}
      <AssociationInfoSection
        locales={formState.locales}
        activeLocale={activeLocale}
        onLocaleChange={setActiveLocale}
        onUpdateLocale={updateLocale}
        slug={formState.slug}
        onUpdateSlug={(slug) => updateBasic('slug', slug)}
        country={formState.country}
        onUpdateCountry={(country) => updateBasic('country', country)}
        validationErrors={validationErrors}
        slugTaken={slugTaken}
      />

      {/* Managers section */}
      <AssociationManagersSection
        creatorProfile={creatorProfile ?? null}
        managerProfiles={managerProfiles}
        pendingInvites={formState.pendingInvites}
        locale={activeLocale}
        associationCreatedBy={association?.createdBy ?? firebaseUser?.uid ?? ''}
        onAddManager={addManager}
        onRemoveManager={removeManager}
        onAddPendingInvite={addPendingInvite}
        onRemovePendingInvite={removePendingInvite}
        excludeUserIds={excludeUserIds}
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={confirmDeleteModal}
        title={t('association.edit.deleteConfirmTitle')}
        message={t('association.edit.deleteConfirm')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteModal(false)}
      />
    </div>
  )
}