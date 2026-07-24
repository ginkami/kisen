import { useEffect, useRef } from 'react'

export type ConfirmModalVariant = 'primary' | 'error'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  variant?: ConfirmModalVariant
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
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

  const confirmButtonClass =
    variant === 'error' ? 'btn btn-error' : 'btn btn-primary'

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={onCancel}
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="modal-box text-secondary-content">
        <h3 id="confirm-modal-title" className="text-lg font-bold">
          {title}
        </h3>
        <p className="py-4">{message}</p>
        <div className="modal-action">
          <button type="button" onClick={onCancel} className="btn">
            {cancelText}
          </button>
          <button type="button" onClick={onConfirm} className={confirmButtonClass}>
            {confirmText}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label={cancelText}>
          close
        </button>
      </form>
    </dialog>
  )
}
