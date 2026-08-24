import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext.tsx'
import { useMyAssociations } from '../../hooks/useAssociations.ts'
import { regulationService } from '../../services/regulationService.ts'
import type { Regulation } from '../../domain/regulation.ts'

interface RegulationPickerModalProps {
  selectedIds: string[]
  onSelect: (id: string) => void
  onClose: () => void
}

function regulationTitle(regulation: Regulation, lang: string): string {
  return (
    regulation.locales[lang as keyof Regulation['locales']]?.title ??
    regulation.locales.ru?.title ??
    regulation.locales.en?.title ??
    ''
  )
}

export function RegulationPickerModal({
  selectedIds,
  onSelect,
  onClose,
}: RegulationPickerModalProps) {
  const { t, i18n } = useTranslation()
  const { firebaseUser, user } = useAuth()
  const { data: associations = [] } = useMyAssociations(firebaseUser?.uid)

  const managedAssociationIds = associations.map((a) => a.id)
  const isAdmin = user?.role === 'admin'

  const { data: allEditable = [], isLoading } = useQuery({
    queryKey: ['regulations', 'editable', firebaseUser?.uid, managedAssociationIds, isAdmin],
    queryFn: () => regulationService.listEditable(firebaseUser!.uid, managedAssociationIds, isAdmin),
    enabled: !!firebaseUser?.uid,
    staleTime: 30 * 1000,
  })

  const available = allEditable.filter((r) => !selectedIds.includes(r.id))

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4">
          {t('tournament.edit.selectRegulation')}
        </h3>
        {isLoading ? (
          <span className="loading loading-spinner" />
        ) : (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {available.length === 0 ? (
              <p className="text-sm opacity-60">
                {t('tournament.edit.noRegulations')}
              </p>
            ) : (
              available.map((regulation) => (
                <button
                  key={regulation.id}
                  type="button"
                  className="btn btn-ghost justify-start"
                  onClick={() => {
                    onSelect(regulation.id)
                    onClose()
                  }}
                >
                  {regulationTitle(regulation, i18n.language)}
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