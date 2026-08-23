import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.tsx'
import { useRegulationForm } from '../../hooks/useRegulationForm.ts'
import { ConfirmModal } from '../ConfirmModal.tsx'
import { LocaleTabs } from '../tournament/LocaleTabs.tsx'
import { ExpandableField } from '../tournament/ExpandableField.tsx'
import { AssociationPickerModal } from '../tournament/AssociationPickerModal.tsx'
import { useMyAssociations } from '../../hooks/useAssociations.ts'
import type { SupportedLocale } from '../../domain/locale.ts'
import type { Association } from '../../domain/association.ts'

interface RegulationEditFormProps {
  regulationId: string | undefined
}

export function RegulationEditForm({ regulationId }: RegulationEditFormProps) {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>((i18n.language as SupportedLocale) ?? 'ru')
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false)
  const [showAssociationPicker, setShowAssociationPicker] = useState(false)

  const {
    regulation, formState, isLoading, loadError, isDirty, isSaving, isDeleting,
    saveError, deleteError, validationErrors, clearSaveError, clearDeleteError,
    updateLocale, updateBasic, save, deleteRegulation, isNew,
  } = useRegulationForm(regulationId)

  const { firebaseUser: authUser, user } = useAuth()
  const { data: associations = [] } = useMyAssociations(authUser?.uid)

  const canDelete = isNew ? false : user?.role === 'admin' || (regulation && authUser?.uid === regulation.createdBy)

  const localizedTitle = formState?.locales[activeLocale]?.title ?? ''
  const displayTitle = localizedTitle || (isNew ? t('regulation.edit.newTitle') : '')

  useEffect(() => {
    document.title = `${displayTitle || t('regulation.edit.newTitle')} — ${t('regulation.edit.managementPanel')} | shogi·world`
  }, [displayTitle, i18n.language, t])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (isLoading || !formState) {
    return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>
  }

  if (loadError) return <p className="text-error">{t('regulation.edit.errors.load')}</p>

  const handleDelete = () => { setConfirmDeleteModal(true) }
  const handleConfirmDelete = async () => { setConfirmDeleteModal(false); await deleteRegulation() }

  const selectedAssociationTitle = (() => {
    if (!formState.association) return t('regulation.edit.noAssociation')
    const association = associations.find((a) => a.id === formState.association)
    if (!association) return t('regulation.edit.noAssociation')
    return association.locales[i18n.language as keyof Association['locales']]?.title ?? association.slug
  })()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-70">{t('regulation.edit.managementPanel')}</div>
          <h1 className="text-2xl font-bold">{displayTitle || t('regulation.edit.newTitle')}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={isSaving || isDeleting || !isDirty} className="btn btn-primary">
            {isSaving ? <span className="loading loading-spinner loading-xs" /> : t('regulation.edit.save')}
          </button>
          {canDelete && (
            <button type="button" onClick={handleDelete} disabled={isDeleting || isSaving} className="btn btn-error btn-outline">
              {isDeleting ? <span className="loading loading-spinner loading-xs" /> : t('regulation.edit.delete')}
            </button>
          )}
        </div>
      </div>

      {saveError && (
        <div className="alert alert-error">
          <p className="flex-1">{t('regulation.edit.errors.save')}</p>
          <button type="button" onClick={clearSaveError} className="btn btn-sm btn-ghost">×</button>
        </div>
      )}
      {deleteError && (
        <div className="alert alert-error">
          <p className="flex-1">{t('regulation.edit.errors.delete')}</p>
          <button type="button" onClick={clearDeleteError} className="btn btn-sm btn-ghost">×</button>
        </div>
      )}

      <div className="card bg-base-200 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title">{t('regulation.edit.info')}</h2>
            <LocaleTabs locale={activeLocale} onChange={setActiveLocale} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('regulation.edit.title')}<span className="text-error ml-1">*</span></span></label>
            <input type="text" value={formState.locales[activeLocale].title} onChange={(e) => updateLocale(activeLocale, 'title', e.target.value)} className={`input input-bordered w-full ${validationErrors.title ? 'input-error' : ''}`} />
            {validationErrors.title && <span className="text-error text-xs mt-1">{t('common.fieldRequired')}</span>}
          </div>
          <ExpandableField label={t('regulation.edit.description')} value={formState.locales[activeLocale].description ?? ''} onChange={(value) => updateLocale(activeLocale, 'description', value)} textarea />
        </div>
      </div>

      <div className="card bg-base-200 shadow-sm">
        <div className="card-body gap-4">
          <h2 className="card-title">{t('regulation.edit.binding')}</h2>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('regulation.edit.association')}</span></label>
            <button type="button" className="btn btn-outline justify-start" onClick={() => setShowAssociationPicker(true)}>{selectedAssociationTitle}</button>
            {showAssociationPicker && (
              <AssociationPickerModal selectedId={formState.association || null} onSelect={(id) => updateBasic('association', id ?? '')} onClose={() => setShowAssociationPicker(false)} />
            )}
          </div>
        </div>
      </div>

      <ConfirmModal isOpen={confirmDeleteModal} title={t('regulation.edit.deleteConfirmTitle')} message={t('regulation.edit.deleteConfirm')} confirmText={t('common.confirm')} cancelText={t('common.cancel')} variant="error" onConfirm={handleConfirmDelete} onCancel={() => setConfirmDeleteModal(false)} />
    </div>
  )
}