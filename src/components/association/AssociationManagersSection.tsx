import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BsX } from 'react-icons/bs'
import { useAuth } from '../../context/AuthContext.tsx'
import { ConfirmModal } from '../ConfirmModal.tsx'
import { ManagerInviteInput } from './ManagerInviteInput.tsx'
import type { User } from '../../types/user.ts'
import type { SupportedLocale } from '../../domain/locale.ts'

interface AssociationManagersSectionProps {
  creatorProfile: User | null
  managerProfiles: User[]
  pendingInvites: string[]
  locale: SupportedLocale
  associationCreatedBy: string
  onAddManager: (userId: string) => void
  onRemoveManager: (userId: string) => void
  onAddPendingInvite: (email: string) => void
  onRemovePendingInvite: (email: string) => void
  excludeUserIds: string[]
}

export function AssociationManagersSection({
  creatorProfile,
  managerProfiles,
  pendingInvites,
  locale,
  associationCreatedBy,
  onAddManager,
  onRemoveManager,
  onAddPendingInvite,
  onRemovePendingInvite,
  excludeUserIds,
}: AssociationManagersSectionProps) {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const [confirmModal, setConfirmModal] = useState<{
    type: 'manager' | 'pendingInvite'
    value: string
  } | null>(null)

  const isAdmin = currentUser?.role === 'admin'
  const isCreator = currentUser?.id === associationCreatedBy
  const canRemove = isAdmin || isCreator

  const getUserDisplayName = (user: User) => {
    const loc = user.locales[locale] ?? user.locales.ru ?? user.locales.en
    return `${loc.familyName}, ${loc.givenName}`
  }

  const handleRemoveClick = (type: 'manager' | 'pendingInvite', value: string) => {
    setConfirmModal({ type, value })
  }

  const handleConfirmRemove = () => {
    if (!confirmModal) return
    if (confirmModal.type === 'manager') {
      onRemoveManager(confirmModal.value)
    } else {
      onRemovePendingInvite(confirmModal.value)
    }
    setConfirmModal(null)
  }

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-4">
        <h2 className="card-title">{t('association.edit.managersTitle')}</h2>

        {/* Creator badge */}
        {creatorProfile && (
          <div className="flex flex-wrap gap-2">
            <div className="badge badge-lg badge-primary gap-1">
              {getUserDisplayName(creatorProfile)}
              <span className="text-xs opacity-70 ml-1">
                ({t('association.edit.creator')})
              </span>
            </div>
          </div>
        )}

        {/* Manager badges */}
        {managerProfiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {managerProfiles.map((profile) => (
              <div key={profile.id} className="badge badge-lg badge-ghost gap-1">
                {getUserDisplayName(profile)}
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => handleRemoveClick('manager', profile.id)}
                    className="btn btn-ghost btn-xs"
                    aria-label={t('common.remove')}
                  >
                    <BsX className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pending invite badges */}
        {pendingInvites.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingInvites.map((email) => (
              <div key={email} className="badge badge-lg badge-warning gap-1">
                {email}
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => handleRemoveClick('pendingInvite', email)}
                    className="btn btn-ghost btn-xs"
                    aria-label={t('common.remove')}
                  >
                    <BsX className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Invite input */}
        <ManagerInviteInput
          locale={locale}
          excludeUserIds={excludeUserIds}
          excludeEmails={pendingInvites}
          onAddUser={onAddManager}
          onAddEmail={onAddPendingInvite}
        />
      </div>

      {/* Confirmation modal */}
      <ConfirmModal
        isOpen={confirmModal !== null}
        title={t('association.edit.removeConfirmTitle')}
        message={t('association.edit.removeConfirm')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="error"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  )
}