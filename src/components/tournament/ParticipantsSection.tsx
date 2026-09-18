import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BsPlus, BsX, BsSortAlphaDown, BsSortAlphaDownAlt, BsSortNumericDown, BsSortNumericDownAlt } from 'react-icons/bs'
import { ConfirmModal } from '../ConfirmModal.tsx'
import { LocaleTabs } from './LocaleTabs.tsx'
import { rankToColor } from './crosstable/crosstableModel.ts'
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
  onSort?: (by: 'name' | 'rating', direction: 'asc' | 'desc') => void
  validationErrors?: Record<string, string>
  canLinkPlayers?: boolean
}

export function ParticipantsSection({
  participants,
  activeLocale,
  onLocaleChange,
  onAdd,
  onUpdate,
  onRemove,
  onSort,
  validationErrors,
  canLinkPlayers = true,
}: ParticipantsSectionProps) {
  const { t } = useTranslation()
  const [pendingRemoveRowId, setPendingRemoveRowId] = useState<string | null>(null)

  // Details elements of the participant collapses (for open-after-add).
  const detailsRefs = useRef(new Map<string, HTMLDetailsElement>())
  const awaitingNewRow = useRef(false)
  const knownRowIds = useRef(new Set(participants.map((r) => r.rowId)))

  const handleAddAfter = (afterRowId?: string) => {
    awaitingNewRow.current = true
    onAdd(afterRowId)
  }

  // When a new participant row appears after an add, open its collapse
  // (the name="participants-accordion" attribute closes the others).
  useEffect(() => {
    const ids = participants.map((r) => r.rowId)
    if (awaitingNewRow.current) {
      const added = ids.find((id) => !knownRowIds.current.has(id))
      if (added) {
        const el = detailsRefs.current.get(added)
        if (el) el.open = true
        awaitingNewRow.current = false
      }
    }
    knownRowIds.current = new Set(ids)
  }, [participants])

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
            startingPoints: 0,
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

        {onSort && participants.length >= 2 && (
          <div className="flex gap-1">
            <button
              type="button"
              className="btn btn-sm btn-ghost tooltip"
              data-tip={t('tournament.edit.participants.sortByName')}
              aria-label={t('tournament.edit.participants.sortByName')}
              onClick={() => onSort('name', 'asc')}
            >
              <BsSortAlphaDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost tooltip"
              data-tip={t('tournament.edit.participants.sortByName')}
              aria-label={t('tournament.edit.participants.sortByName')}
              onClick={() => onSort('name', 'desc')}
            >
              <BsSortAlphaDownAlt className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost tooltip"
              data-tip={t('tournament.edit.participants.sortByRating')}
              aria-label={t('tournament.edit.participants.sortByRating')}
              onClick={() => onSort('rating', 'asc')}
            >
              <BsSortNumericDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost tooltip"
              data-tip={t('tournament.edit.participants.sortByRating')}
              aria-label={t('tournament.edit.participants.sortByRating')}
              onClick={() => onSort('rating', 'desc')}
            >
              <BsSortNumericDownAlt className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-2">
          {rows.map((row) => {
            const nameLoc = row.locales[activeLocale] ?? row.locales['ru'] ?? row.locales['en']
            const summaryName = [nameLoc?.familyName, nameLoc?.givenName]
              .filter((v) => v != null && v !== '')
              .join(', ')
            const summaryRating = row.ratingValue.trim()
            return (
            <details
              key={row.rowId}
              ref={(el) => {
                if (el) detailsRefs.current.set(row.rowId, el)
                else detailsRefs.current.delete(row.rowId)
              }}
              className="collapse bg-base-100 border border-base-300"
              name="participants-accordion"
            >
              <summary className="collapse-title flex justify-between items-center p-1 pe-4">
                <div className="min-w-0 truncate flex items-center gap-1.5 pl-3">
                  <b>{summaryName || '—'}</b>
                  {summaryRating && <span className="opacity-70">{summaryRating}</span>}
                  {row.rank && (
                    <span
                      className="badge badge-xs text-white flex items-center w-fit"
                      style={{ backgroundColor: rankToColor(row.rank) }}
                    >
                      {row.rank}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center gap-1">
                  {row.rowId !== 'empty-placeholder' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setPendingRemoveRowId(row.rowId)
                      }}
                      className="btn btn-sm btn-circle btn-accent tooltip"
                      data-tip={t('tournament.edit.participants.remove')}
                      aria-label={t('tournament.edit.participants.remove')}
                    >
                      <BsX className="h-4 w-4 text-primary-content" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      handleAddAfter(row.rowId === 'empty-placeholder' ? undefined : row.rowId)
                    }}
                    className="btn btn-sm btn-circle btn-success tooltip"
                    data-tip={t('tournament.edit.participants.add')}
                    aria-label={t('tournament.edit.participants.add')}
                  >
                    <BsPlus className="h-4 w-4 text-primary-content" />
                  </button>
                </div>
              </summary>
              <div className="collapse-content flex items-start gap-2">
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
                      validationErrors={validationErrors}
                      canLinkPlayers={canLinkPlayers}
                    />
                  )}
                </div>
              </div>
            </details>
          )
        })}
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