import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.tsx'
import { useMyAssociations } from '../../hooks/useAssociations.ts'
import type { Association } from '../../domain/association.ts'

interface AssociationPickerModalProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
  onClose: () => void
}

function associationTitle(association: Association, lang: string): string {
  return (
    association.locales[lang as keyof Association['locales']]?.title ??
    association.locales.en?.title ??
    association.slug
  )
}

export function AssociationPickerModal({
  selectedId,
  onSelect,
  onClose,
}: AssociationPickerModalProps) {
  const { t, i18n } = useTranslation()
  const { firebaseUser } = useAuth()
  const { data: associations = [], isLoading } = useMyAssociations(
    firebaseUser?.uid
  )

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4">
          {t('tournament.edit.selectAssociation')}
        </h3>
        {isLoading ? (
          <span className="loading loading-spinner" />
        ) : (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            <button
              type="button"
              className={`btn btn-ghost justify-start ${selectedId === null ? 'btn-active' : ''}`}
              onClick={() => {
                onSelect(null)
                onClose()
              }}
            >
              {t('tournament.edit.noHostAssociation')}
            </button>
            {associations.length === 0 ? (
              <p className="text-sm opacity-60">
                {t('tournament.edit.noAssociations')}
              </p>
            ) : (
              associations.map((association) => (
                <button
                  key={association.id}
                  type="button"
                  className={`btn btn-ghost justify-start ${selectedId === association.id ? 'btn-active' : ''}`}
                  onClick={() => {
                    onSelect(association.id)
                    onClose()
                  }}
                >
                  {associationTitle(association, i18n.language)}
                </button>
              ))
            )}
          </div>
        )}
        <div className="modal-action">
          <button type="button" className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
