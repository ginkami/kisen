import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { BsDice5, BsX } from 'react-icons/bs'

interface PairingToolsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

// Right-side drawer hosting the pairing-assistant tools for the round being
// prepared (publishedRounds + 1). The drawer chrome mirrors AdminDrawer, but
// it overlays the page content without pushing it (the pairings board is wide).
// The tools themselves are added by a follow-up change; the panel ships empty.
export function PairingToolsDrawer({ isOpen, onClose }: PairingToolsDrawerProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  return (
    <div
      ref={panelRef}
      data-testid="pairing-tools-drawer"
      className={[
        'fixed top-0 right-0 z-50 h-full w-80 overflow-y-auto bg-base-200 shadow-xl transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between bg-base-200 px-4 py-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <BsDice5 className="h-5 w-5" />
          {t('tournament.edit.pairingTools.title')}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-circle btn-ghost"
          aria-label={t('tournament.edit.pairingTools.close')}
        >
          <BsX className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pb-4" />
    </div>
  )
}
