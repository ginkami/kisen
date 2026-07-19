import { useTranslation } from 'react-i18next'
import { useEventsForMonth } from '../../hooks/useEvents.ts'
import type { Event } from '../../domain/event.ts'

interface EventPickerModalProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
  onClose: () => void
}

function eventTitle(event: Event, lang: string): string {
  return (
    event.locales[lang as keyof Event['locales']]?.title ??
    event.locales.en?.title ??
    event.slug
  )
}

export function EventPickerModal({
  selectedId,
  onSelect,
  onClose,
}: EventPickerModalProps) {
  const { t, i18n } = useTranslation()
  const { data: events = [], isLoading } = useEventsForMonth()

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4">{t('tournament.edit.selectEvent')}</h3>
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
              {t('tournament.edit.noParentEvent')}
            </button>
            {events.length === 0 ? (
              <p className="text-sm opacity-60">{t('tournament.edit.noEvents')}</p>
            ) : (
              events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className={`btn btn-ghost justify-start ${selectedId === event.id ? 'btn-active' : ''}`}
                  onClick={() => {
                    onSelect(event.id)
                    onClose()
                  }}
                >
                  {eventTitle(event, i18n.language)}
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
