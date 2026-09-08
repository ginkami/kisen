import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BsCalendar2 } from 'react-icons/bs'
import { useAuth } from '../../context/AuthContext.tsx'
import { useMyAssociations } from '../../hooks/useAssociations.ts'
import { useEditableEvents } from '../../hooks/useEvents.ts'
import type { Event } from '../../domain/event.ts'
import {
  formatDateToYearMonth,
  formatYearMonthToMonthInput,
  parseMonthInputToYearMonth,
} from '../../utils/yearMonth.ts'

interface EventPickerModalProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
  onClose: () => void
  defaultMonth?: string
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
  defaultMonth,
}: EventPickerModalProps) {
  const { t, i18n } = useTranslation()
  const { firebaseUser, user } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(
    defaultMonth ?? formatYearMonthToMonthInput(formatDateToYearMonth(new Date()))
  )
  const { data: associations = [] } = useMyAssociations(firebaseUser?.uid)
  const managedAssociationIds = associations.map((a) => a.id)
  const isAdmin = user?.role === 'admin'
  const { data: editableEvents = [], isLoading } = useEditableEvents(
    firebaseUser?.uid,
    managedAssociationIds,
    isAdmin
  )

  // Only offer events the current user may edit (mirroring the Firestore
  // rules for event updates), limited to the month selected in the picker.
  const yearMonth = parseMonthInputToYearMonth(selectedMonth)
  const events = editableEvents.filter((event) => event.startYearMonth === yearMonth)

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4">{t('tournament.edit.selectEvent')}</h3>
        <label className="input input-sm input-bordered flex items-center gap-2 mb-3">
          <BsCalendar2 className="h-4 w-4 opacity-70" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="grow bg-transparent outline-none"
            aria-label={t('admin.selectMonth')}
          />
        </label>
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
