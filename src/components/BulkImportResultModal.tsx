import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ImportResult } from '../services/playerService.ts'

interface BulkImportResultModalProps {
  isOpen: boolean
  result: ImportResult | null
  error: string | null
  onClose: () => void
}

export function BulkImportResultModal({ isOpen, result, error, onClose }: BulkImportResultModalProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <div className="modal-box">
        <h3 className="font-bold text-lg">{t('admin.bulkImportResults')}</h3>

        {error && (
          <div className="alert alert-error mt-4">
            <span>{error}</span>
          </div>
        )}

        {result && !error && (
          <div className="mt-4 space-y-2">
            <p>{t('admin.added')}: <strong>{result.added}</strong></p>
            <p>{t('admin.updated')}: <strong>{result.updated}</strong></p>
            <p>{t('admin.invalid')}: <strong>{result.invalid}</strong></p>

            {result.errors.length > 0 && (
              <div className="mt-4">
                <p className="font-semibold mb-2">{t('common.errors')}:</p>
                <ul className="list-disc list-inside space-y-1 text-sm max-h-48 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-error">{err.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="modal-action">
          <button type="button" onClick={onClose} className="btn">{t('common.close')}</button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label={t('common.close')}>close</button>
      </form>
    </dialog>
  )
}