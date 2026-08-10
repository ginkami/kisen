import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ConfirmModal } from '../ConfirmModal.tsx'
import { useTranslation } from 'react-i18next'
import { BsSliders2Vertical, BsClock, BsJournalText, BsPlus, BsX, Bs123 } from 'react-icons/bs'
import { HiOutlineUserGroup } from "react-icons/hi2";
import { useAuth } from '../../context/AuthContext.tsx'
import { useTournamentForm } from '../../hooks/useTournamentForm.ts'
import {
  dateToLocalDatetimeInputValue,
  localDatetimeInputValueToUtcDate,
} from '../../utils/dateTime.ts'
import { formatYearMonthToMonthInput } from '../../utils/yearMonth.ts'
import { ParticipantsSection } from './ParticipantsSection.tsx'
import { supportedLocales, type SupportedLocale } from '../../domain/locale.ts'
import { timeControlFormatSchema } from '../../domain/timeControl.ts'
import { tieBreakTypeSchema } from '../../domain/tieBreak.ts'
import type { TournamentFormState, ScheduleRow } from '../../hooks/useTournamentForm.ts'
import type { TimeControl, TimeControlFormat } from '../../domain/timeControl.ts'
import type { TieBreak, TieBreakType } from '../../domain/tieBreak.ts'
import type { TournamentLocale } from '../../domain/tournament.ts'
import type { Event } from '../../domain/event.ts'
import type { Association } from '../../domain/association.ts'
import { useMyAssociations } from '../../hooks/useAssociations.ts'
import { eventService } from '../../services/eventService.ts'
import { CountrySelect } from './CountrySelect.tsx'
import { LocaleTabs } from './LocaleTabs.tsx'
import { ExpandableField } from './ExpandableField.tsx'
import { PairingsSection } from './PairingsSection.tsx'
import { EventPickerModal } from './EventPickerModal.tsx'
import { AssociationPickerModal } from './AssociationPickerModal.tsx'

interface TournamentEditFormProps {
  tournamentId: string | undefined
}

function NumberField({
  label,
  value,
  onChange,
  min,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
}) {
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text">{label}</span>
      </label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input input-bordered input-sm w-32"
      />
    </div>
  )
}

function GeneralInfoSection({
  formState,
  updateLocale,
  updateBasic,
  updateArbiter,
  validationErrors = {},
}: {
  formState: TournamentFormState
  updateLocale: (
    locale: SupportedLocale,
    field: keyof TournamentLocale,
    value: string
  ) => void
  updateBasic: <K extends keyof TournamentFormState>(
    field: K,
    value: TournamentFormState[K]
  ) => void
  updateArbiter: (
    locale: SupportedLocale,
    field: 'givenName' | 'familyName',
    value: string
  ) => void
  validationErrors?: Record<string, string>
}) {
  const { t, i18n } = useTranslation()
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(
    (i18n.language as SupportedLocale) ?? 'ru'
  )

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title">{t('tournament.edit.basicInfo')}</h2>
          <LocaleTabs locale={activeLocale} onChange={setActiveLocale} />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">
              {t('tournament.edit.title')}
              <span className="text-error ml-1">*</span>
            </span>
          </label>
          <input
            type="text"
            value={formState.locales[activeLocale].title}
            onChange={(e) =>
              updateLocale(activeLocale, 'title', e.target.value)
            }
            className={`input input-bordered w-full ${validationErrors.title ? 'input-error' : ''}`}
          />
          {validationErrors.title && (
            <span className="text-error text-xs mt-1">{t('common.fieldRequired')}</span>
          )}
        </div>

        <ExpandableField
          label={t('tournament.edit.description')}
          value={formState.locales[activeLocale].description ?? ''}
          onChange={(value) =>
            updateLocale(activeLocale, 'description', value)
          }
          placeholder={t('tournament.edit.description')}
          textarea
          buttonClassName='basic-expandable'
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="form-control">
            <label className="label">
              <span className="label-text">
                {t('tournament.edit.country')}
                <span className="text-error ml-1">*</span>
              </span>
            </label>
            <CountrySelect
              value={formState.country}
              onChange={(value) => updateBasic('country', value)}
              lang={i18n.language === 'ru' ? 'ru' : 'en'}
              placeholder={t('tournament.edit.noCountry')}
            />
            {validationErrors.country && (
              <span className="text-error text-xs mt-1">{t('common.fieldRequired')}</span>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">
                {t('tournament.edit.location')}
                <span className="text-error ml-1">*</span>
              </span>
            </label>
            <input
              type="text"
              value={formState.locales[activeLocale].location ?? ''}
              onChange={(e) =>
                updateLocale(activeLocale, 'location', e.target.value)
              }
              className={`input input-bordered w-full ${validationErrors.location ? 'input-error' : ''}`}
            />
            {validationErrors.location && (
              <span className="text-error text-xs mt-1">{t('common.fieldRequired')}</span>
            )}
          </div>
        </div>

        <ExpandableField
          label={t('tournament.edit.venue')}
          value={formState.locales[activeLocale].venue ?? ''}
          onChange={(value) => updateLocale(activeLocale, 'venue', value)}
          placeholder={t('tournament.edit.venue')}
          buttonClassName='basic-expandable'
        />

        <div className="form-control">
          <label className="label">
            <span className="label-text">
              {t('tournament.edit.arbiter.title')}
              <span className="text-error ml-1">*</span>
            </span>
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">
                  {t('tournament.edit.arbiter.givenName')}
                  <span className="text-error ml-1">*</span>
                </span>
              </label>
              <input
                type="text"
                value={formState.arbiter[activeLocale].givenName}
                onChange={(e) =>
                  updateArbiter(activeLocale, 'givenName', e.target.value)
                }
                className={`input input-bordered w-full ${validationErrors['arbiter.givenName'] ? 'input-error' : ''}`}
              />
              {validationErrors['arbiter.givenName'] && (
                <span className="text-error text-xs mt-1">{t('common.fieldRequired')}</span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">
                  {t('tournament.edit.arbiter.familyName')}
                  <span className="text-error ml-1">*</span>
                </span>
              </label>
              <input
                type="text"
                value={formState.arbiter[activeLocale].familyName}
                onChange={(e) =>
                  updateArbiter(activeLocale, 'familyName', e.target.value)
                }
                className={`input input-bordered w-full ${validationErrors['arbiter.familyName'] ? 'input-error' : ''}`}
              />
              {validationErrors['arbiter.familyName'] && (
                <span className="text-error text-xs mt-1">{t('common.fieldRequired')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BindingSection({
  formState,
  updateBasic,
  validationErrors = {},
  slugTaken = false,
  defaultMonth,
}: {
  formState: TournamentFormState
  updateBasic: <K extends keyof TournamentFormState>(
    field: K,
    value: TournamentFormState[K]
  ) => void
  validationErrors?: Record<string, string>
  slugTaken?: boolean
  defaultMonth?: string
}) {
  const { t, i18n } = useTranslation()
  const { firebaseUser } = useAuth()
  const [showEventPicker, setShowEventPicker] = useState(false)
  const [showAssociationPicker, setShowAssociationPicker] = useState(false)
  const { data: selectedEvent } = useQuery({
    queryKey: ['event', 'byId', formState.parentEvent],
    queryFn: () => eventService.getById(formState.parentEvent!),
    enabled: !!formState.parentEvent,
  })
  const { data: associations = [] } = useMyAssociations(firebaseUser?.uid)

  const selectedEventTitle = useMemo(() => {
    if (!selectedEvent) return t('tournament.edit.noParentEvent')
    return (
      selectedEvent.locales[i18n.language as keyof Event['locales']]?.title ??
      selectedEvent.slug
    )
  }, [selectedEvent, i18n.language, t])

  const selectedAssociationTitle = useMemo(() => {
    if (!formState.hostAssociation)
      return t('tournament.edit.noHostAssociation')
    const association = associations.find(
      (item) => item.id === formState.hostAssociation
    )
    if (!association) return t('tournament.edit.noHostAssociation')
    return (
      association.locales[i18n.language as keyof Association['locales']]
        ?.title ?? association.slug
    )
  }, [formState.hostAssociation, associations, i18n.language, t])

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-4">
        <h2 className="card-title">{t('tournament.edit.binding')}</h2>

        <div className="form-control">
          <label className="label">
            <span className="label-text">
              {t('tournament.edit.slug')}
              <span className="text-error ml-1">*</span>
            </span>
          </label>
          <div className="join">
            <span className="bg-base-200 border border-base-300 px-2 flex items-center join-item">shogi.world/tournaments/</span>
            <input
              type="text"
              value={formState.slug}
              onChange={(e) => updateBasic('slug', e.target.value)}
              className={`input input-bordered join-item w-full ${validationErrors.slug ? 'input-error' : ''}`}
            />
          </div>
          {validationErrors.slug && (
            <span className="text-error text-xs mt-1 ml-2">
              {validationErrors.slug === 'taken' ? t('tournament.edit.slugTaken') : t('common.fieldRequired')}
            </span>
          )}
          {slugTaken && !validationErrors.slug && (
            <span className="text-error text-xs mt-1 ml-2">{t('tournament.edit.slugTaken')}</span>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">
              {t('tournament.edit.parentEvent')}
            </span>
          </label>
          <button
            type="button"
            className="btn btn-outline justify-start"
            onClick={() => setShowEventPicker(true)}
          >
            {selectedEventTitle}
          </button>
          {showEventPicker && (
            <EventPickerModal
              selectedId={formState.parentEvent}
              onSelect={(id) => updateBasic('parentEvent', id)}
              onClose={() => setShowEventPicker(false)}
              defaultMonth={defaultMonth}
            />
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">
              {t('tournament.edit.hostAssociation')}
            </span>
          </label>
          <button
            type="button"
            className="btn btn-outline justify-start"
            onClick={() => setShowAssociationPicker(true)}
          >
            {selectedAssociationTitle}
          </button>
          {showAssociationPicker && (
            <AssociationPickerModal
              selectedId={formState.hostAssociation}
              onSelect={(id) => updateBasic('hostAssociation', id)}
              onClose={() => setShowAssociationPicker(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function TimeControlSection({
  timeControl,
  onTypeChange,
  onFieldChange,
}: {
  timeControl: TimeControl
  onTypeChange: (type: TimeControlFormat) => void
  onFieldChange: (
    field:
      | 'mainTime'
      | 'increment'
      | 'byoyomiTime'
      | 'byoyomiPeriods'
      | 'canadianTime'
      | 'canadianMoves',
    value: number
  ) => void
}) {
  const { t } = useTranslation()
  const formats = timeControlFormatSchema.options

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">{t('tournament.edit.timeControl.title')}</h2>

        <div className="form-control">
          <label className="label">
            <span className="label-text">
              {t('tournament.edit.timeControl.type')}
            </span>
          </label>
          <select
            value={timeControl.type}
            onChange={(e) =>
              onTypeChange(e.target.value as TimeControlFormat)
            }
            className="select select-bordered"
          >
            {formats.map((type) => (
              <option key={type} value={type}>
                {t(`tournament.timeControl.${type}`)}
              </option>
            ))}
          </select>
        </div>

        <NumberField
          label={t('tournament.edit.timeControl.mainTime')}
          value={timeControl.mainTime}
          onChange={(value) => onFieldChange('mainTime', value)}
          min={0}
        />

        {timeControl.type !== 'absolute' && 'increment' in timeControl && (
          <NumberField
            label={t('tournament.edit.timeControl.increment')}
            value={timeControl.increment}
            onChange={(value) => onFieldChange('increment', value)}
            min={0}
          />
        )}

        {timeControl.type === 'byoyomi' && (
          <>
            <NumberField
              label={t('tournament.edit.timeControl.byoyomiTime')}
              value={timeControl.byoyomiTime}
              onChange={(value) => onFieldChange('byoyomiTime', value)}
              min={0}
            />
            <NumberField
              label={t('tournament.edit.timeControl.byoyomiPeriods')}
              value={timeControl.byoyomiPeriods}
              onChange={(value) => onFieldChange('byoyomiPeriods', value)}
              min={1}
            />
          </>
        )}

        {timeControl.type === 'canadian' && (
          <>
            <NumberField
              label={t('tournament.edit.timeControl.canadianTime')}
              value={timeControl.canadianTime}
              onChange={(value) => onFieldChange('canadianTime', value)}
              min={0}
            />
            <NumberField
              label={t('tournament.edit.timeControl.canadianMoves')}
              value={timeControl.canadianMoves}
              onChange={(value) => onFieldChange('canadianMoves', value)}
              min={1}
            />
          </>
        )}
      </div>
    </div>
  )
}

function AdvancedSettingsSection({
  considerSente,
  onConsiderSenteChange,
}: {
  considerSente: boolean
  onConsiderSenteChange: (value: boolean) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">
          {t('tournament.edit.advanced.title')}
        </h2>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              checked={considerSente}
              onChange={(e) => onConsiderSenteChange(e.target.checked)}
              className="toggle toggle-primary"
            />
            <span className="label-text">
              {t('tournament.edit.advanced.considerSente')}
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}

function TieBreaksSection({
  tieBreaks,
  onAdd,
  onRemove,
}: {
  tieBreaks: TieBreak[]
  onAdd: (type: TieBreakType, cutCount?: number) => void
  onRemove: (index: number) => void
}) {
  const { t } = useTranslation()
  const [selectedType, setSelectedType] = useState<TieBreakType>('buchholz')
  const [cutCount, setCutCount] = useState(1)

  const availableTypes = tieBreakTypeSchema.options.filter(
    (type) =>
      type !== 'points' &&
      (type === 'buchholz_cut' || !tieBreaks.some((tb) => tb.type === type))
  )

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">{t('tournament.edit.tieBreaks.title')}</h2>

        <div className="flex flex-wrap gap-2">
          <span className="badge badge-primary">
            {t('tournament.tieBreak.points')}
          </span>
          {tieBreaks.slice(1).map((tb, index) => (
            <span key={index} className="badge badge-outline gap-2">
              {t(`tournament.tieBreak.${tb.type}`)}
              {tb.type === 'buchholz_cut' && ` (${tb.cutCount})`}
              <button
                type="button"
                onClick={() => onRemove(index + 1)}
                className="btn btn-circle btn-ghost btn-xs"
                aria-label={t('common.remove')}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {availableTypes.length > 0 && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="form-control">
              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(e.target.value as TieBreakType)
                }
                className="select select-bordered"
              >
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`tournament.tieBreak.${type}`)}
                  </option>
                ))}
              </select>
            </div>
            {selectedType === 'buchholz_cut' && (
              <NumberField
                label={t('tournament.edit.tieBreaks.cutCount')}
                value={cutCount}
                onChange={setCutCount}
                min={0}
              />
            )}
            <button
              type="button"
              onClick={() => {
                onAdd(
                  selectedType,
                  selectedType === 'buchholz_cut' ? cutCount : undefined
                )
                setCutCount(1)
              }}
              className="btn btn-secondary"
            >
              {t('tournament.edit.tieBreaks.add')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const SCHEDULE_PRESETS = [
  'registration',
  'opening',
  'award',
  'break',
] as const

type SchedulePresetKey = (typeof SCHEDULE_PRESETS)[number]

function ScheduleEventCombobox({
  row,
  activeLocale,
  roundCount,
  onUpdate,
}: {
  row: ScheduleRow
  activeLocale: SupportedLocale
  roundCount: number
  onUpdate: (id: string, patch: Partial<ScheduleRow>) => void
}) {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  if (row.kind === 'round') {
    return (
      <div className="flex-1 flex p-1">
        <span className="badge badge-info">
          {t('tournament.edit.program.round', { n: row.number })}
        </span>
      </div>
    )
  }

  const displayValue = row.locales[activeLocale]?.title ?? ''

  const filterText = displayValue.toLowerCase()

  const filteredPresets = SCHEDULE_PRESETS.filter((key) =>
    t(`tournament.edit.program.preset.${key}`)
      .toLowerCase()
      .includes(filterText)
  )

  const handleTextChange = (value: string) => {
    onUpdate(row.id, {
      locales: {
        ...row.locales,
        [activeLocale]: { title: value },
      },
    })
  }

  const handleSelectPreset = (key: SchedulePresetKey) => {
    const locales = Object.fromEntries(
      supportedLocales.map((locale) => {
        const fixedT = i18n.getFixedT(locale)
        return [locale, { title: fixedT(`tournament.edit.program.preset.${key}`) }]
      })
    ) as ScheduleRow extends { kind: 'event' } ? ScheduleRow['locales'] : never

    onUpdate(row.id, {
      kind: 'event',
      locales,
    })
    setIsOpen(false)
  }

  const handleSelectRound = () => {
    onUpdate(row.id, {
      kind: 'round',
      number: roundCount + 1,
    })
    setIsOpen(false)
  }

  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={displayValue}
        onChange={(e) => handleTextChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className="input input-bordered input-sm w-full"
        role="combobox"
        aria-expanded={isOpen}
        autoComplete="off"
      />
      {isOpen && (
        <ul
          className="dropdown-content z-10 menu p-2 shadow bg-base-100 rounded-box w-full absolute top-full mt-1 max-h-60 overflow-auto"
          role="listbox"
        >
          <li>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelectRound()
              }}
              className="w-full text-left bg-info"
            >
              {t('tournament.edit.program.roundOption')}
            </button>
          </li>
          {filteredPresets.map((key) => (
            <li key={key}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelectPreset(key)
                }}
                className="w-full text-left"
              >
                {t(`tournament.edit.program.preset.${key}`)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ScheduleSection({
  scheduleRows,
  activeLocale,
  onAdd,
  onUpdate,
  onRemove,
  onSort,
  onLocaleChange,
}: {
  scheduleRows: ScheduleRow[]
  activeLocale: SupportedLocale
  onAdd: (afterId?: string) => void
  onUpdate: (id: string, patch: Partial<ScheduleRow>) => void
  onRemove: (id: string) => void
  onSort: () => void
  onLocaleChange: (locale: SupportedLocale) => void
}) {
  const { t } = useTranslation()

  const rows =
    scheduleRows.length > 0
      ? scheduleRows
      : [
          {
            kind: 'event' as const,
            id: 'empty-row',
            scheduledAt: null,
            locales: Object.fromEntries(
              supportedLocales.map((locale) => [locale, { title: '' }])
            ) as Record<SupportedLocale, { title: string }>,
          },
        ]

  const roundCount = scheduleRows.filter((r) => r.kind === 'round').length

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h2 className="card-title">
            {t('tournament.edit.program.title')}
          </h2>
          <LocaleTabs locale={activeLocale} onChange={onLocaleChange} />
        </div>

        <div className="flex items-center gap-2 text-xs text-base-content/60 pb-1">
          <div className="flex-1">{t('tournament.edit.program.dateTime')}</div>
          <div className="flex-1">{t('tournament.edit.program.event')}</div>
          <div className="w-16" />
        </div>

        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-start gap-2">
              <div className="form-control flex-1 min-w-0">
                <input
                  type="datetime-local"
                  value={
                    row.scheduledAt
                      ? dateToLocalDatetimeInputValue(row.scheduledAt)
                      : ''
                  }
                  onChange={(e) =>
                    onUpdate(row.id, {
                      scheduledAt: e.target.value
                        ? localDatetimeInputValueToUtcDate(e.target.value)
                        : null,
                    })
                  }
                  onBlur={onSort}
                  className="input input-bordered input-sm w-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <ScheduleEventCombobox
                  row={row}
                  activeLocale={activeLocale}
                  roundCount={roundCount}
                  onUpdate={onUpdate}
                />
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onAdd(row.id)}
                  className="btn btn-sm btn-circle btn-success tooltip"
                  data-tip={t('tournament.edit.rounds.add')}
                  aria-label={t('tournament.edit.rounds.add')}
                >
                  <BsPlus className="h-4 w-4 text-primary-content" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(row.id)}
                  className="btn btn-sm btn-circle btn-accent tooltip"
                  data-tip={t('tournament.edit.rounds.remove')}
                  aria-label={t('tournament.edit.rounds.remove')}
                >
                  <BsX className="h-4 w-4 text-primary-content" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TournamentEditForm({
  tournamentId,
}: TournamentEditFormProps) {
  const { t, i18n } = useTranslation()
  const { firebaseUser, user } = useAuth()
  const {
    tournament,
    formState,
    isLoading,
    loadError,
    createError,
    isSaving,
    isPublishing,
    isDeleting,
    saveError,
    publishError,
    deleteError,
    validationErrors,
    clearSaveError,
    clearPublishError,
    clearDeleteError,
    clearCreateError,
    retryCreateDraft,
    updateLocale,
    updateBasic,
    updateArbiter,
    updateTimeControlType,
    updateTimeControlField,
    addTieBreak,
    removeTieBreak,
    updateConsiderSente,
    addScheduleRow,
    updateScheduleRow,
    removeScheduleRow,
    sortScheduleRows,
    sortParticipants,
    addParticipant,
    updateParticipant,
    removeParticipant,
    updateGames,
    publishDraw,
    unpublishDraw,
    updateStartingPoints,
    saveDraft,
    publish,
    deleteTournament,
    slugTaken,
  } = useTournamentForm(tournamentId)

  type TabId = 'general' | 'settings' | 'schedule' | 'participants' | 'pairings'

  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [scheduleLocale, setScheduleLocale] = useState<SupportedLocale>(
    (i18n.language as SupportedLocale) ?? 'ru'
  )
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'publish' | 'delete'
  }>({ isOpen: false, type: 'publish' })

  const tabs: {
    id: TabId
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    {
      id: 'general',
      label: t('tournament.edit.tabs.general'),
      icon: BsJournalText,
    },
    {
      id: 'settings',
      label: t('tournament.edit.tabs.settings'),
      icon: BsSliders2Vertical,
    },
    {
      id: 'schedule',
      label: t('tournament.edit.tabs.schedule'),
      icon: BsClock,
    },
    {
      id: 'participants',
      label: t('tournament.edit.tabs.players'),
      icon: HiOutlineUserGroup,
    },
    {
      id: 'pairings',
      label: t('tournament.edit.tabs.pairings'),
      icon: Bs123,
    },
  ]

  const localizedTitle =
    formState?.locales[(i18n.language as SupportedLocale) ?? 'ru']?.title ||
    t('admin.untitledTournament')

  useEffect(() => {
    document.title = t('tournament.edit.pageTitle', {
      title: localizedTitle,
      managementPanel: t('tournament.edit.managementPanel'),
    })
  }, [localizedTitle, i18n.language, t])

  if (isLoading || !formState) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (loadError) {
    return <p className="text-error">{t('tournament.edit.errors.load')}</p>
  }

  const handlePublish = () => {
    setConfirmModal({ isOpen: true, type: 'publish' })
  }

  const handleDelete = () => {
    setConfirmModal({ isOpen: true, type: 'delete' })
  }

  const handleConfirmAction = async () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }))
    if (confirmModal.type === 'publish') {
      await publish()
    } else {
      await deleteTournament()
    }
  }

  const handleCancelAction = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }))
  }

  const canEditBinding =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    tournament?.createdBy === firebaseUser?.uid

  const canLinkPlayers = user?.role === 'admin' || user?.role === 'manager'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {createError && (
        <div className="alert alert-error">
          <div>
            <p>{t('tournament.edit.errors.save')}</p>
            <p className="text-sm">{createError.message}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={retryCreateDraft}
              className="btn btn-sm btn-primary"
            >
              {t('common.retry')}
            </button>
            <button
              type="button"
              onClick={clearCreateError}
              className="btn btn-sm btn-ghost"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-70">
            {t('tournament.edit.managementPanel')}
          </div>
          <h1 className="text-2xl font-bold">{localizedTitle}</h1>
          <span className="badge badge-sm mt-1">
            {t(`tournament.status.${tournament?.status ?? 'draft'}`)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveDraft}
            disabled={isSaving || isPublishing || isDeleting}
            className="btn btn-primary"
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              t('tournament.edit.saveDraft')
            )}
          </button>
          {tournament?.status === 'draft' && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing || isSaving || isDeleting}
              className="btn btn-success"
            >
              {isPublishing ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                t('tournament.edit.publish')
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isSaving || isPublishing}
            className="btn btn-error btn-outline"
          >
            {isDeleting ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              t('tournament.edit.delete')
            )}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="alert alert-error">
          <p className="flex-1">{t('tournament.edit.errors.save')}</p>
          <button type="button" onClick={clearSaveError} className="btn btn-sm btn-ghost">
            ×
          </button>
        </div>
      )}
      {publishError && (
        <div className="alert alert-error">
          <p className="flex-1">{t('tournament.edit.errors.publish')}</p>
          <button type="button" onClick={clearPublishError} className="btn btn-sm btn-ghost">
            ×
          </button>
        </div>
      )}
      {deleteError && (
        <div className="alert alert-error">
          <p className="flex-1">{t('tournament.edit.errors.delete')}</p>
          <button type="button" onClick={clearDeleteError} className="btn btn-sm btn-ghost">
            ×
          </button>
        </div>
      )}

      <div className="tabs tabs-box" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={['tab gap-2', isActive ? 'tab-active' : ''].join(' ')}
            >
              <Icon className="h-5 w-5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {activeTab === 'general' && (
        <div className="space-y-6">
          <GeneralInfoSection
            formState={formState}
            updateLocale={updateLocale}
            updateBasic={updateBasic}
            updateArbiter={updateArbiter}
            validationErrors={validationErrors}
          />

          {canEditBinding && (
            <BindingSection
              formState={formState}
              updateBasic={updateBasic}
              validationErrors={validationErrors}
              slugTaken={slugTaken}
              defaultMonth={
                tournament
                  ? formatYearMonthToMonthInput(tournament.startYearMonth)
                  : undefined
              }
            />
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <TimeControlSection
            timeControl={formState.settings.timeControl}
            onTypeChange={updateTimeControlType}
            onFieldChange={updateTimeControlField}
          />

          <TieBreaksSection
            tieBreaks={formState.settings.tieBreaks}
            onAdd={addTieBreak}
            onRemove={removeTieBreak}
          />

          <AdvancedSettingsSection
            considerSente={formState.settings.considerSente}
            onConsiderSenteChange={updateConsiderSente}
          />
        </div>
      )}

      {activeTab === 'schedule' && (
        <ScheduleSection
          scheduleRows={formState.scheduleRows}
          activeLocale={scheduleLocale}
          onAdd={addScheduleRow}
          onUpdate={updateScheduleRow}
          onRemove={removeScheduleRow}
          onSort={sortScheduleRows}
          onLocaleChange={setScheduleLocale}
        />
      )}

      {activeTab === 'participants' && formState.participants && (
        <ParticipantsSection
          participants={formState.participants}
          activeLocale={scheduleLocale}
          onLocaleChange={setScheduleLocale}
          onAdd={addParticipant}
          onUpdate={updateParticipant}
          onRemove={removeParticipant}
          validationErrors={validationErrors}
          canLinkPlayers={canLinkPlayers}
          onSort={(by, direction) => sortParticipants(by, direction, scheduleLocale)}
        />
      )}

      {activeTab === 'pairings' && (
        <PairingsSection
          games={formState.games}
          currentRound={formState.currentRound}
          participants={formState.participants}
          scheduleRounds={formState.scheduleRows.filter((r): r is Extract<typeof r, { kind: 'round' }> => r.kind === 'round').map((r) => ({
            number: r.number,
            scheduledAt: r.scheduledAt ?? new Date(),
          }))}
          considerSente={formState.settings.considerSente}
          locale={scheduleLocale}
          updateGames={updateGames}
          publishDraw={publishDraw}
          unpublishDraw={unpublishDraw}
          updateStartingPoints={updateStartingPoints}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.type === 'publish'
            ? t('tournament.edit.publishConfirmTitle')
            : t('tournament.edit.deleteConfirmTitle')
        }
        message={
          confirmModal.type === 'publish'
            ? t('tournament.edit.publishConfirm')
            : t('tournament.edit.deleteConfirm')
        }
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant={confirmModal.type === 'delete' ? 'error' : 'primary'}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />
    </div>
  )
}
