import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BsPlus, BsX } from 'react-icons/bs'
import { ConfirmModal } from '../ConfirmModal.tsx'
import { LocaleTabs } from './LocaleTabs.tsx'
import { ParticipantRow } from './ParticipantRow.tsx'
import type { SupportedLocale } from '../../domain/locale.ts'
import type { ParticipantRow as ParticipantRowType } from '../../hooks/useTournamentForm.ts'

interface ParticipantsSectionProps {
  participants: ParticipantRowType[]
  activeLocale: SupportedLocale
  onLocaleChange: (locale: SupportedLocale) => void
  onAdd: (afterRowId?: string) => void
  onUpdate: (rowId: string, patch: Partial<ParticipantRowType>) => void
  onRemove: (rowId: string) => void
}

export function ParticipantsSection({
  participants,
  activeLocale,
  onLocaleChange,
  onAdd,
  onUpdate,
  onRemove,
}: ParticipantsSectionProps) {
  const { t } = useTranslation()
  const [pendingRemoveRowId, setPendingRemoveRowId] = useState<string | null>(null)

  const rows =
    participants.length > 0
      ? participants
      : [
          {
            rowId: 'empty-placeholder',
            id: 0,
            player: null,
            locales: {} as ParticipantRowType['locales'],
            nationality: '',
            residence: '',
            ratingValue: '',
            rank: null,
          },
        ]

  const handleConfirmRemove = () => {
    if (pendingRemoveRowId) {
      onRemove(pendingRemoveRowId)
      setPendingRemoveRowId(null)
    }
  }

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h2 className="card-title">
            {t('tournament.edit.participants.title')}
          </h2>
          <LocaleTabs locale={activeLocale} onChange={onLocaleChange} />
        </div>

        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.rowId} className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                {row.rowId === 'empty-placeholder' ? (
                  <div className="p-4 text-sm opacity-70 rounded-lg border border-dashed border-base-300">
                    {t('tournament.edit.participants.emptyHint')}
                  </div>
                ) : (
                  <ParticipantRow
                    row={row}
                    activeLocale={activeLocale}
                    onUpdate={(patch) => onUpdate(row.rowId, patch)}
                  />
                )}
              </div>
              <div className="flex gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => onAdd(row.rowId === 'empty-placeholder' ? undefined : row.rowId)}
                  className="btn btn-sm btn-circle tooltip"
                  data-tip={t('tournament.edit.participants.add')}
                  aria-label={t('tournament.edit.participants.add')}
                >
                  <BsPlus className="h-4 w-4 text-success" />
                </button>
                {row.rowId !== 'empty-placeholder' && (
                  <button
                    type="button"
                    onClick={() => setPendingRemoveRowId(row.rowId)}
                    className="btn btn-sm btn-circle tooltip"
                    data-tip={t('tournament.edit.participants.remove')}
                    aria-label={t('tournament.edit.participants.remove')}
                  >
                    <BsX className="h-4 w-4 text-error" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={pendingRemoveRowId !== null}
        title={t('tournament.edit.participants.removeConfirmTitle')}
        message={t('tournament.edit.participants.removeConfirm')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="error"
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemoveRowId(null)}
      />
    </div>
  )
}