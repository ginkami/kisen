import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TrophyIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface AdminDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminDrawer({ isOpen, onClose }: AdminDrawerProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current == null) return

    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
    const deltaX = endX - touchStartX.current

    if (deltaX < -50) {
      onClose()
    }

    touchStartX.current = null
  }

  return (
    <>
      {/* Desktop push spacer */}
      <div
        className={[
          'hidden lg:block shrink-0 transition-all duration-300 ease-in-out',
          isOpen ? 'w-80' : 'w-0',
        ].join(' ')}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={[
          'fixed top-0 right-0 z-50 h-full w-80 overflow-y-auto bg-base-200 shadow-xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-base-200 px-4 py-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <TrophyIcon className="h-5 w-5" />
            {t('admin.title')}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-ghost btn-sm"
            aria-label={t('common.close')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="accordion">
            <div className="collapse collapse-arrow bg-base-100">
              <input type="radio" name="admin-accordion" defaultChecked />
              <div className="collapse-title font-medium">
                {t('admin.tournaments')}
              </div>
              <div className="collapse-content">
                <p className="text-sm opacity-70">
                  {t('admin.tournamentsPlaceholder')}
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100 mt-2">
              <input type="radio" name="admin-accordion" />
              <div className="collapse-title font-medium">
                {t('admin.events')}
              </div>
              <div className="collapse-content">
                <p className="text-sm opacity-70">
                  {t('admin.eventsPlaceholder')}
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100 mt-2">
              <input type="radio" name="admin-accordion" />
              <div className="collapse-title font-medium">
                {t('admin.associations')}
              </div>
              <div className="collapse-content">
                <p className="text-sm opacity-70">
                  {t('admin.associationsPlaceholder')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
