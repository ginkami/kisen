import { useEffect, useRef } from 'react'

interface AlertModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  onClose: () => void
}

/** Single-button alert dialog (daisyUI modal), same chrome as ConfirmModal. */
export function AlertModal({
  isOpen,
  title,
  message,
  confirmText,
  onClose,
}: AlertModalProps) {
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
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={onClose}
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div className="modal-box text-secondary-content">
        <h3 id="alert-modal-title" className="text-lg font-bold">
          {title}
        </h3>
        <p className="py-4">{message}</p>
        <div className="modal-action">
          <button type="button" onClick={onClose} className="btn btn-primary">
            {confirmText}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label={confirmText}>
          close
        </button>
      </form>
    </dialog>
  )
}
