import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { sanitizeTextInput } from '../../utils/sanitize.ts'

import { useQuery } from '@tanstack/react-query'
import { BsPlus } from 'react-icons/bs'
import { useAuth } from '../../context/AuthContext.tsx'
import { useEventForm } from '../../hooks/useEventForm.ts'
import { ConfirmModal } from '../ConfirmModal.tsx'
import { LocaleTabs } from '../tournament/LocaleTabs.tsx'
import { ExpandableField } from '../tournament/ExpandableField.tsx'
import { AssociationPickerModal } from '../tournament/AssociationPickerModal.tsx'
import { RegulationPickerModal } from '../tournament/RegulationPickerModal.tsx'
import { useMyAssociations } from '../../hooks/useAssociations.ts'
import { regulationService } from '../../services/regulationService.ts'
import type { SupportedLocale } from '../../domain/locale.ts'
import type { Association } from '../../domain/association.ts'

interface EventEditFormProps {
  eventId: string | undefined
}

export function EventEditForm({ eventId }: EventEditFormProps) {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(
    (i18n.language as SupportedLocale) ?? 'ru'
  )
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false)
  const [showAssociationPicker, setShowAssociationPicker] = useState(false)

  const {
    event,
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
    save,
    deleteEvent,
    isNew,
    slugTaken,
    addRegulation,
    removeRegulation,
  } = useEventForm(eventId)

  const { firebaseUser: authUser, user } = useAuth()
  const { data: associations = [] } = useMyAssociations(authUser?.uid)

  const [showRegulationPicker, setShowRegulationPicker] = useState(false)
  const managedAssociationIds = associations.map((a) => a.id)
  const isAdmin = user?.role === 'admin'
  const { data: editableRegulations = [] } = useQuery({
    queryKey: ['regulations', 'editable', authUser?.uid, managedAssociationIds, isAdmin],
    queryFn: () => regulationService.listEditable(authUser!.uid, managedAssociationIds, isAdmin),
    enabled: !!authUser?.uid,
    staleTime: 30 * 1000,
  })

  const regulationTitleById = (id: string): string => {
    const reg = editableRegulations.find((r) => r.id === id)
    if (!reg) return ''
    return reg.locales[i18n.language as keyof typeof reg.locales]?.title ?? ''
  }

  const localizedTitle = formState?.locales[activeLocale]?.title ?? ''
  const displayTitle = localizedTitle || (isNew ? t('event.edit.newTitle') : '')

  useEffect(() => {
    document.title = `${displayTitle || t('event.edit.newTitle')} — ${t('event.edit.managementPanel')} | shogi·world`
  }, [displayTitle, i18n.language, t])

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
    return <p className="text-error">{t('event.edit.errors.load')}</p>
  }

  const handleDelete = () => {
    setConfirmDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    setConfirmDeleteModal(false)
    await deleteEvent()
  }

  const selectedAssociationTitle = (() => {
    if (!formState.hostAssociation) return t('event.edit.noHostAssociation')
    const association = associations.find((a) => a.id === formState.hostAssociation)
    if (!association) return t('event.edit.noHostAssociation')
    return association.locales[i18n.language as keyof Association['locales']]?.title ?? association.slug
  })()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header block */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-70">
            {t('event.edit.managementPanel')}
          </div>
          <h1 className="text-2xl font-bold">
            {displayTitle || t('event.edit.newTitle')}
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
              t('event.edit.save')
            )}
          </button>
          {event && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="btn btn-error btn-outline"
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                t('event.edit.delete')
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error alerts */}
      {saveError && (
        <div className="alert alert-error">
          <p className="flex-1">{t('event.edit.errors.save')}</p>
          <button type="button" onClick={clearSaveError} className="btn btn-sm btn-ghost">×</button>
        </div>
      )}
      {deleteError && (
        <div className="alert alert-error">
          <p className="flex-1">{t('event.edit.errors.delete')}</p>
          <button type="button" onClick={clearDeleteError} className="btn btn-sm btn-ghost">×</button>
        </div>
      )}

      {/* Основная информация */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title">{t('event.edit.info')}</h2>
            <LocaleTabs locale={activeLocale} onChange={setActiveLocale} />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">
                {t('event.edit.title')}
                <span className="text-error ml-1">*</span>
              </span>
            </label>
            <input
              type="text"
              value={formState.locales[activeLocale].title}
              onChange={(e) => updateLocale(activeLocale, 'title', sanitizeTextInput(e.target.value))}
              className={`input input-bordered w-full ${validationErrors.title ? 'input-error' : ''}`}
            />
            {validationErrors.title && (
              <span className="text-error text-xs mt-1">{t('common.fieldRequired')}</span>
            )}
          </div>

          <ExpandableField
            label={t('event.edit.description')}
            value={formState.locales[activeLocale].description ?? ''}
            onChange={(value) => updateLocale(activeLocale, 'description', value)}
            textarea
          />

          {/* Regulations */}
          {formState.regulations.length > 0 && (
            <>
              <label className="label">
                <span className="label-text">{t('event.edit.regulations')}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {formState.regulations.map((regId) => {
                  const title = regulationTitleById(regId)
                  return (
                    <span key={regId} className="badge badge-outline gap-2">
                      {title || t('event.edit.untitledRegulation', { defaultValue: t('admin.untitledTournament') })}
                      <button
                        type="button"
                        onClick={() => removeRegulation(regId)}
                        className="btn btn-circle btn-ghost btn-xs"
                        aria-label={t('common.remove')}
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
              </div>
            </>
          )}
          <button
            type="button"
            className="btn btn-ghost justify-start px-2 text-primary flex items-center gap-0 expandable-field basic-expandable"
            onClick={() => setShowRegulationPicker(true)}
          >
            <BsPlus className="h-5 w-5" />
            {t('event.edit.addRegulation')}
          </button>
          {showRegulationPicker && (
            <RegulationPickerModal
              selectedIds={formState.regulations}
              onSelect={(id) => addRegulation(id)}
              onClose={() => setShowRegulationPicker(false)}
            />
          )}
        </div>
      </div>

      {/* Дополнительно */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body gap-4">
          <h2 className="card-title">{t('event.edit.binding')}</h2>

          <div className="form-control">
            <label className="label">
              <span className="label-text">
                {t('event.edit.slug')}
                <span className="text-error ml-1">*</span>
              </span>
            </label>
            <div className="join">
              <span className="bg-base-200 border border-base-300 px-2 flex items-center join-item text-sm">
                shogi.world/events/
              </span>
              <input
                type="text"
                value={formState.slug}
                onChange={(e) => updateBasic('slug', e.target.value)}
                className={`input input-bordered join-item w-full ${validationErrors.slug ? 'input-error' : ''}`}
              />
            </div>
            {validationErrors.slug && (
              <span className="text-error text-xs mt-1 ml-2">
                {validationErrors.slug === 'taken' ? t('event.edit.slugTaken') : t('common.fieldRequired')}
              </span>
            )}
            {slugTaken && !validationErrors.slug && (
              <span className="text-error text-xs mt-1 ml-2">{t('event.edit.slugTaken')}</span>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('event.edit.hostAssociation')}</span>
            </label>
            <button
              type="button"
              className="btn btn-outline justify-start"
              onClick={() => setShowAssociationPicker(true)}
            >
              {selectedAssociationTitle}
            </button>
            {showAssociationPicker && (
              <AssociationPickerModal
                selectedId={formState.hostAssociation || null}
                onSelect={(id) => updateBasic('hostAssociation', id ?? '')}
                onClose={() => setShowAssociationPicker(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={confirmDeleteModal}
        title={t('event.edit.deleteConfirmTitle')}
        message={t('event.edit.deleteConfirm')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteModal(false)}
      />
    </div>
  )
}