import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ConfirmModal } from '../ConfirmModal.tsx'
import { useTranslation } from 'react-i18next'
import { BsSliders2Vertical, BsJournalText, BsPlus, BsX, Bs123, BsGrid3X2, BsInfoCircleFill } from 'react-icons/bs'
import { FaPeopleArrows } from "react-icons/fa";
import { FaUsers } from "react-icons/fa6";
import { RiCalendarScheduleFill } from "react-icons/ri";
import { useAuth } from '../../context/AuthContext.tsx'
import { sanitizeTextInput } from '../../utils/sanitize.ts'
import { useTournamentForm, validateTournamentPublishForm, rowsToParticipants } from '../../hooks/useTournamentForm.ts'
import { usePairingHistory } from '../../hooks/usePairingHistory.ts'
import {
  dateToLocalDatetimeInputValue,
} from '../../utils/dateTime.ts'
import {
  inputValueToLocalTime,
  localTimeToInputValue,
  resolveLocationTimeZone,
  zonedWallClockToUtc,
} from '../../utils/scheduleTime.ts'
import { formatYearMonthToMonthInput } from '../../utils/yearMonth.ts'
import { ParticipantsSection } from './ParticipantsSection.tsx'
import { supportedLocales, type SupportedLocale } from '../../domain/locale.ts'
import { timeControlFormatSchema } from '../../domain/timeControl.ts'
import { tieBreakTypeSchema } from '../../domain/tieBreak.ts'
import type { TournamentFormState, ScheduleRow } from '../../hooks/useTournamentForm.ts'
import type { TimeControl, TimeControlFormat } from '../../domain/timeControl.ts'
import type { TieBreak, TieBreakType } from '../../domain/tieBreak.ts'
import type { TournamentLocale, KnockoutBracketSettings } from '../../domain/tournament.ts'
import type { Event } from '../../domain/event.ts'
import type { Association } from '../../domain/association.ts'
import { useMyAssociations } from '../../hooks/useAssociations.ts'
import { canEditTournament, TournamentConflictError } from '../../domain/tournament.ts'
import { eventService } from '../../services/eventService.ts'
import { regulationService } from '../../services/regulationService.ts'
import { LocaleTabs } from './LocaleTabs.tsx'
import { ExpandableField } from './ExpandableField.tsx'
import { TournamentLocationInput } from './TournamentLocationInput.tsx'
import { PairingsSection } from './PairingsSection.tsx'
import { PairingToolsDrawer } from './PairingToolsDrawer.tsx'
import { PromotionSection } from './PromotionSection.tsx'
import type { LayoutOutletContext } from '../Layout.tsx'
import { CrosstableSection } from './CrosstableSection.tsx'
import { EventPickerModal } from './EventPickerModal.tsx'
import { AssociationPickerModal } from './AssociationPickerModal.tsx'
import { RegulationPickerModal } from './RegulationPickerModal.tsx'

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
  updateLocation,
  updateLocationLocale,
  updateArbiter,
  addRegulation,
  removeRegulation,
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
  updateLocation: (patch: Partial<TournamentFormState['location']>) => void
  updateLocationLocale: (
    locale: SupportedLocale,
    field: 'settlement' | 'venue',
    value: string
  ) => void
  updateArbiter: (
    locale: SupportedLocale,
    field: 'givenName' | 'familyName',
    value: string
  ) => void
  addRegulation: (id: string) => void
  removeRegulation: (id: string) => void
  validationErrors?: Record<string, string>
}) {
  const { t, i18n } = useTranslation()
  const { firebaseUser, user } = useAuth()
  const { data: associations = [] } = useMyAssociations(firebaseUser?.uid)
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(
    (i18n.language as SupportedLocale) ?? 'ru'
  )
  const [showRegulationPicker, setShowRegulationPicker] = useState(false)

  const managedAssociationIds = associations.map((a) => a.id)
  const isAdmin = user?.role === 'admin'
  const { data: editableRegulations = [] } = useQuery({
    queryKey: ['regulations', 'editable', firebaseUser?.uid, managedAssociationIds, isAdmin],
    queryFn: () => regulationService.listEditable(firebaseUser!.uid, managedAssociationIds, isAdmin),
    enabled: !!firebaseUser?.uid,
    staleTime: 30 * 1000,
  })

  const regulationTitleById = (id: string): string => {
    const reg = editableRegulations.find((r) => r.id === id)
    if (!reg) return ''
    return reg.locales[i18n.language as keyof typeof reg.locales]?.title ?? ''
  }

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
              updateLocale(activeLocale, 'title', sanitizeTextInput(e.target.value))
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
          placeholder={t('common.markdownSupported')}
          textarea
          buttonClassName='basic-expandable'
        />

        {/* Regulations */}
        {formState.regulations.length > 0 && (
          <>
            <label className="label">
              <span className="label-text">{t('tournament.edit.regulations')}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {formState.regulations.map((regId) => {
                const title = regulationTitleById(regId)
                return (
                  <span key={regId} className="badge badge-outline gap-2">
                    {title || t('tournament.edit.untitledRegulation', { defaultValue: t('admin.untitledTournament') })}
                    <button
                      type="button"
                      onClick={() => removeRegulation(regId)}
                      className="btn btn-circle btn-ghost btn-xs"
                      aria-label={t('common.remove')}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          </>
        )}
        <button
          type="button"
          className="btn btn-ghost justify-start px-2 text-primary flex items-center gap-0 expandable-field basic-expandable"
          onClick={() => setShowRegulationPicker(true)}
        >
          <BsPlus className="h-5 w-5" />
          {t('tournament.edit.addRegulation')}
        </button>
        {showRegulationPicker && (
          <RegulationPickerModal
            selectedIds={formState.regulations}
            onSelect={(id) => addRegulation(id)}
            onClose={() => setShowRegulationPicker(false)}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TournamentLocationInput
            location={formState.location}
            onChange={(resolved) => {
              updateLocation({
                latitude: resolved.latitude,
                longitude: resolved.longitude,
                country: resolved.country,
                locales: Object.fromEntries(
                  supportedLocales.map((locale) => [
                    locale,
                    {
                      settlement: resolved.settlements[locale] ?? formState.location.locales[locale]?.settlement ?? '',
                      venue: formState.location.locales[locale]?.venue ?? '',
                    },
                  ])
                ) as Record<SupportedLocale, { settlement: string; venue: string }>,
              })
            }}
            activeLocale={activeLocale}
            validationError={validationErrors.location}
          />
          <ExpandableField
            label={t('tournament.edit.venue')}
            value={formState.location.locales[activeLocale]?.venue ?? ''}
            onChange={(value) => updateLocationLocale(activeLocale, 'venue', value)}
            placeholder={t('tournament.edit.venue')}
          />
        </div>

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
                  updateArbiter(activeLocale, 'givenName', sanitizeTextInput(e.target.value))
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
                  updateArbiter(activeLocale, 'familyName', sanitizeTextInput(e.target.value))
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

/** Bracket size slider stops: index 0..9 → 0, 4, 8, … 1024. */
const BRACKET_SIZE_STOPS = [0, 4, 8, 16, 32, 64, 128, 256, 512, 1024]

function AdvancedSettingsSection({
  considerSente,
  onConsiderSenteChange,
  hasKnockoutBracket,
  onHasKnockoutBracketChange,
}: {
  considerSente: boolean
  onConsiderSenteChange: (value: boolean) => void
  hasKnockoutBracket: KnockoutBracketSettings
  onHasKnockoutBracketChange: (value: KnockoutBracketSettings) => void
}) {
  const { t } = useTranslation()
  // Defensive default: documents loaded through paths that bypass the zod
  // schema may lack the field.
  const bracket = hasKnockoutBracket ?? { size: 0, startRound: 0 }
  const sizeIndex = Math.max(
    0,
    BRACKET_SIZE_STOPS.findIndex((v) => v === bracket.size),
  )
  // The collapse starts open when a bracket is already configured.
  const [bracketOpen, setBracketOpen] = useState(bracket.size > 0)

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

        <div
          className={[
            'collapse collapse-arrow bg-base-100',
            bracketOpen ? 'collapse-open' : 'collapse-close',
          ].join(' ')}
          data-testid="knockout-bracket-collapse"
        >
          <div
            className="collapse-title cursor-pointer text-sm font-medium"
            onClick={() => setBracketOpen((o) => !o)}
          >
            {t('tournament.edit.advanced.knockoutBracket.showIfAny')}
          </div>
          <div className="collapse-content">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="form-control">
                <label className="label" htmlFor="knockout-bracket-size-slider">
                  <span className="label-text">{t('tournament.edit.advanced.knockoutBracket.size')}</span>
                  <span className="badge badge-outline" data-testid="knockout-bracket-size-value">
                    {bracket.size === 0
                      ? t('tournament.edit.advanced.knockoutBracket.none')
                      : bracket.size}
                  </span>
                </label>
                <div className="w-full max-w-xs">
                  <input
                    id="knockout-bracket-size-slider"
                    type="range"
                    min={0}
                    max={BRACKET_SIZE_STOPS.length - 1}
                    step={1}
                    value={sizeIndex}
                    onChange={(e) =>
                      onHasKnockoutBracketChange({
                        ...hasKnockoutBracket,
                        size: BRACKET_SIZE_STOPS[Number(e.target.value)],
                      })
                    }
                    className="range range-primary range-sm"
                  />
                  <div className="flex w-full justify-between px-1 text-xs opacity-60">
                    {BRACKET_SIZE_STOPS.map((v) => (
                      <span className="w-1" key={v}>{v === 0 ? '0' : v}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-control">
                <label className="label" htmlFor="knockout-bracket-start-round-slider">
                  <span className="label-text">
                    {t('tournament.edit.advanced.knockoutBracket.startRound')}
                  </span>
                  <span className="badge badge-outline" data-testid="knockout-bracket-start-round-value">
                    {bracket.startRound === 0
                      ? t('tournament.edit.advanced.knockoutBracket.none')
                      : bracket.startRound}
                  </span>
                </label>
                <div className="w-full max-w-xs">
                  <input
                    id="knockout-bracket-start-round-slider"
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={bracket.startRound}
                    onChange={(e) =>
                      onHasKnockoutBracketChange({
                        ...hasKnockoutBracket,
                        startRound: Number(e.target.value),
                      })
                    }
                    className="range range-primary range-sm"
                  />
                  <div className="flex w-full justify-between px-1 text-xs opacity-60">
                    {Array.from({ length: 11 }, (_, i) => (
                      <span className="w-1" key={i}>{i}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {bracket.size > 0 && bracket.startRound === 0 && (
              <div className="mt-1 flex items-start gap-2 text-xs opacity-70">
                <BsInfoCircleFill className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{t('tournament.edit.advanced.knockoutBracket.startRoundHint')}</span>
              </div>
            )}
          </div>
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

  // `selectedType` may reference a type that is no longer available (the
  // initial 'buchholz' is already in the default tie-breaks, or it was just
  // added and dropped from the list). Derive the effective selection instead
  // of letting the select show a phantom option while the state stays stale —
  // that made «Бухгольц усеченный» unaddable without the cut-count field.
  const selectedTypeExists = availableTypes.includes(selectedType)
  const effectiveType: TieBreakType | undefined =
    selectedTypeExists ? selectedType : availableTypes[0]

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
                value={effectiveType ?? ''}
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
            {effectiveType === 'buchholz_cut' && (
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
                if (!effectiveType) return
                onAdd(
                  effectiveType,
                  effectiveType === 'buchholz_cut' ? cutCount : undefined
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
        [activeLocale]: { title: sanitizeTextInput(value) },
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
  timeZone,
  onAdd,
  onUpdate,
  onRemove,
  onSort,
  onLocaleChange,
  validationErrors = {},
}: {
  scheduleRows: ScheduleRow[]
  activeLocale: SupportedLocale
  timeZone: string | null
  onAdd: (afterId?: string) => void
  onUpdate: (id: string, patch: Partial<ScheduleRow>) => void
  onRemove: (id: string) => void
  onSort: () => void
  onLocaleChange: (locale: SupportedLocale) => void
  validationErrors?: Record<string, string>
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
            scheduledAtLocal: null,
            locales: Object.fromEntries(
              supportedLocales.map((locale) => [locale, { title: '' }])
            ) as Record<SupportedLocale, { title: string }>,
          },
        ]

  const roundCount = scheduleRows.filter((r) => r.kind === 'round').length
  const hasScheduleError = !!validationErrors.rounds || !!validationErrors.roundTime

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
          <div className="flex-1 flex items-center gap-1">
            <span>{t('tournament.edit.program.dateTime')}</span>
            {timeZone && (
              <span
                className="tooltip"
                data-tip={t('tournament.edit.program.localTimeHint')}
              >
                <BsInfoCircleFill
                  className="h-3 w-3 opacity-50"
                  aria-label={t('tournament.edit.program.localTimeHint')}
                />
              </span>
            )}
          </div>
          <div className="flex-1">{t('tournament.edit.program.event')}</div>
          <div className="w-16" />
        </div>

        {hasScheduleError && (
          <div className="text-error text-xs space-y-0.5">
            {validationErrors.rounds && (
              <p>{t('tournament.edit.program.roundRequired')}</p>
            )}
            {validationErrors.roundTime && (
              <p>{t('tournament.edit.program.roundTimeRequired')}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-start gap-2">
              <div className="form-control flex-1 min-w-0">
                <input
                  type="datetime-local"
                  value={
                    row.scheduledAtLocal
                      ? localTimeToInputValue(row.scheduledAtLocal)
                      : row.scheduledAt
                        ? dateToLocalDatetimeInputValue(row.scheduledAt)
                        : ''
                  }
                  onChange={(e) => {
                    const value = e.target.value
                    if (!value) {
                      onUpdate(row.id, { scheduledAt: null, scheduledAtLocal: null })
                      return
                    }
                    const local = inputValueToLocalTime(value)
                    if (!local) return
                    // Keep the instant in sync for in-form sorting; when the
                    // venue timezone is unknown, interpret the wall clock in
                    // the browser timezone (pre-change behavior).
                    onUpdate(row.id, {
                      scheduledAtLocal: local,
                      scheduledAt: timeZone
                        ? zonedWallClockToUtc(local, timeZone)
                        : new Date(
                            local.year,
                            local.month - 1,
                            local.day,
                            local.hour,
                            local.minute
                          ),
                    })
                  }}
                  onBlur={onSort}
                  className={`input input-bordered input-sm w-full ${
                    hasScheduleError && row.kind === 'round' && !row.scheduledAt
                      ? 'input-error'
                      : ''
                  }`}
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
  const { isAuthenticated, firebaseUser, user } = useAuth()
  const {
    tournament,
    formState,
    isLoading,
    loadError,
    createError,
    isDirty,
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
    updateLocation,
    updateLocationLocale,
    updateArbiter,
    updateTimeControlType,
    updateTimeControlField,
    addTieBreak,
    removeTieBreak,
    addRegulation,
    removeRegulation,
    updateConsiderSente,
    updateHasKnockoutBracket,
    isFinished,
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
    restorePairingSnapshot,
    updateStartingPoints,
    save,
    publish,
    deleteTournament,
    setValidationErrors,
    slugTaken,
    remoteChanged,
    editingSessions,
    reloadFromServer,
    forceSave,
  } = useTournamentForm(tournamentId)

  const parentEventTitleEn =
    useQuery({
      queryKey: ['event', 'fesaTitle', formState?.parentEvent],
      queryFn: () => eventService.getById(formState!.parentEvent!),
      enabled: !!formState?.parentEvent,
      staleTime: 30 * 1000,
    }).data?.locales.en?.title ?? null

  // Client-side mirror of the Firestore tournament-update rules: admins, the
  // creator, and managers of the host association may edit. Guarding here
  // prevents opening a dead-end editor via a direct URL.
  const { data: associations = [], isLoading: isLoadingMyAssociations } = useMyAssociations(
    firebaseUser?.uid
  )
  const managedAssociationIds = useMemo(() => associations.map((a) => a.id), [associations])
  const isAdmin = user?.role === 'admin'
  const isCheckingAccess = !!tournament && isLoadingMyAssociations
  const canEditThisTournament =
    !tournament ||
    !firebaseUser?.uid ||
    canEditTournament(tournament, firebaseUser.uid, isAdmin, managedAssociationIds)

  type TabId = 'general' | 'settings' | 'schedule' | 'participants' | 'pairings' | 'crosstable'

  // First failing validation area determines the tab the publish pre-check
  // switches the user to.
  const validationErrorTabByKey: Record<string, TabId> = {
    slug: 'general',
    title: 'general',
    location: 'general',
    'arbiter.givenName': 'general',
    'arbiter.familyName': 'general',
    rounds: 'schedule',
    roundTime: 'schedule',
    participants: 'participants',
  }

  const [activeTab, setActiveTab] = useState<TabId>('general')
  // Active round of the pairings tab; null means "not picked yet" — the
  // section falls back to the default round (publishedRounds + 1 when exists).
  const [pairingsRound, setPairingsRound] = useState<number | null>(null)
  const [scheduleLocale, setScheduleLocale] = useState<SupportedLocale>(
    (i18n.language as SupportedLocale) ?? 'ru'
  )
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'publish' | 'delete'
  }>({ isOpen: false, type: 'publish' })

  const { closeAdminDrawer, isPairingToolsOpen, setPairingToolsOpen } =
    useOutletContext<LayoutOutletContext>()

  const togglePairingTools = useCallback(() => {
    const next = !isPairingToolsOpen
    if (next) closeAdminDrawer()
    setPairingToolsOpen(next)
  }, [isPairingToolsOpen, closeAdminDrawer, setPairingToolsOpen])

  // --- Pairing assistant: local Undo/Redo history of the tournament's games state ---
  const pairingHistory = usePairingHistory(tournamentId ?? 'new')

  // Every pairing-relevant change (games in any round, publishedRounds,
  // participant composition / player links / starting points) is recorded as
  // one history snapshot. Internal participant attributes (rating, names...)
  // are not part of the signature and are never recorded or reverted.
  const gamesJson = JSON.stringify(formState?.games ?? [])
  const publishedRoundsValue = formState?.publishedRounds ?? 0
  const participantsProjection = JSON.stringify(
    (formState?.participants ?? [])
      .map((p) => ({ id: p.id, player: p.player, startingPoints: p.startingPoints ?? 0 }))
      .sort((a, b) => a.id - b.id),
  )
  const recordedSnapshotRef = useRef<string | null>(null)
  useEffect(() => {
    if (!formState) return
    const signature = `${publishedRoundsValue}|${gamesJson}|${participantsProjection}`
    if (recordedSnapshotRef.current === signature) return
    recordedSnapshotRef.current = signature
    void pairingHistory.push({
      games: formState.games,
      publishedRounds: formState.publishedRounds,
      participants: rowsToParticipants(formState.participants),
    })
  }, [formState, gamesJson, publishedRoundsValue, participantsProjection, pairingHistory])

  const handlePairingUndo = useCallback(() => {
    void (async () => {
      const snapshot = await pairingHistory.undo()
      if (snapshot) {
        restorePairingSnapshot(snapshot.games, snapshot.publishedRounds, snapshot.participants)
      }
    })()
  }, [pairingHistory, restorePairingSnapshot])

  const handlePairingRedo = useCallback(() => {
    void (async () => {
      const snapshot = await pairingHistory.redo()
      if (snapshot) {
        restorePairingSnapshot(snapshot.games, snapshot.publishedRounds, snapshot.participants)
      }
    })()
  }, [pairingHistory, restorePairingSnapshot])

  // The "Pairing assistant" drawer (and its toggle buttons) is only available
  // on the pairings tab (any active round sub-tab) or the crosstable tab of an
  // ongoing tournament.
  const pairingToolsAvailable =
    tournament?.status === 'ongoing' &&
    (activeTab === 'pairings' || activeTab === 'crosstable') &&
    !!formState

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
      icon: RiCalendarScheduleFill,
    },
    {
      id: 'participants',
      label: t('tournament.edit.tabs.players'),
      icon: FaUsers,
    },
    {
      id: 'pairings',
      label: t('tournament.edit.tabs.pairings'),
      icon: Bs123,
    },
    {
      id: 'crosstable',
      label: t('tournament.edit.tabs.crosstable'),
      icon: BsGrid3X2,
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

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

  // The tournament query has resolved here (isLoading handled above); wait
  // for the user's managed associations before deciding, so a legitimate
  // editor never sees a false "no access" flash.
  if (tournament && isCheckingAccess) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (tournament && !canEditThisTournament) {
    return (
      <div className="alert alert-error" role="alert">
        <p>{t('tournament.edit.errors.noAccess')}</p>
      </div>
    )
  }

  const handlePublish = () => {
    // Surface publish-blocking validation problems before the confirm
    // dialog: switch to the first failing tab with highlighted fields
    // instead of failing silently inside the publish mutation.
    if (formState) {
      const errors = validateTournamentPublishForm(formState)
      if (slugTaken) errors.slug = 'taken'
      if (Object.keys(errors).length > 0) {
        setValidationErrors(
          Object.fromEntries(
            Object.keys(errors).map((key) => [
              key,
              key === 'slug' && errors[key] === 'taken'
                ? t('tournament.edit.slugTaken')
                : t('common.fieldRequired'),
            ])
          )
        )
        const firstKey = Object.keys(errors)[0]
        setActiveTab(validationErrorTabByKey[firstKey] ?? 'general')
        return
      }
    }
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
    <div className="mx-auto max-w-7xl space-y-6">
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
            onClick={save}
            disabled={isSaving || isPublishing || isDeleting || !isDirty}
            className="btn btn-primary"
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              t('tournament.edit.save')
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

      {(remoteChanged || saveError instanceof TournamentConflictError) && (
        <div className="alert alert-warning">
          <div className="flex-1">
            <p className="font-semibold">{t('tournament.edit.conflict.title')}</p>
            <p className="text-sm">{t('tournament.edit.conflict.banner')}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                // Rescue the unsaved form state to the clipboard before it is
                // discarded by the reload.
                if (formState) {
                  void navigator.clipboard
                    ?.writeText(JSON.stringify(formState))
                    .catch(() => {})
                }
                void reloadFromServer()
              }}
            >
              {t('tournament.edit.conflict.reload')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={() => {
                clearSaveError()
                forceSave()
              }}
            >
              {t('tournament.edit.conflict.forceSave')}
            </button>
          </div>
        </div>
      )}
      {editingSessions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm opacity-80">
          <span>{t('tournament.edit.presence.editingNow')}</span>
          {editingSessions.map((s) => (
            <span key={s.userId} className="badge badge-outline">
              {s.displayName}
            </span>
          ))}
        </div>
      )}

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
            updateLocation={updateLocation}
            updateLocationLocale={updateLocationLocale}
            updateArbiter={updateArbiter}
            addRegulation={addRegulation}
            removeRegulation={removeRegulation}
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
            hasKnockoutBracket={formState.settings.hasKnockoutBracket}
            onHasKnockoutBracketChange={updateHasKnockoutBracket}
          />

          {isAdmin && (
            <PromotionSection tournamentId={tournamentId ?? 'new'} />
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <ScheduleSection
          scheduleRows={formState.scheduleRows}
          activeLocale={scheduleLocale}
          timeZone={resolveLocationTimeZone(formState.location)}
          onAdd={addScheduleRow}
          onUpdate={updateScheduleRow}
          onRemove={removeScheduleRow}
          onSort={sortScheduleRows}
          onLocaleChange={setScheduleLocale}
          validationErrors={validationErrors}
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
          publishedRounds={formState.publishedRounds}
          participants={formState.participants}
          scheduleRounds={formState.scheduleRows.filter((r): r is Extract<typeof r, { kind: 'round' }> => r.kind === 'round').map((r) => ({
            number: r.number,
            scheduledAt: r.scheduledAt ?? new Date(),
          }))}
          considerSente={formState.settings.considerSente}
          updateGames={updateGames}
          publishDraw={publishDraw}
          unpublishDraw={unpublishDraw}
          updateStartingPoints={updateStartingPoints}
          activeRound={pairingsRound}
          onActiveRoundChange={setPairingsRound}
          pairingToolsAvailable={pairingToolsAvailable}
          onTogglePairingTools={togglePairingTools}
        />
      )}

      {activeTab === 'crosstable' && (
        <CrosstableSection
          games={formState.games}
          participants={formState.participants}
          roundCount={formState.scheduleRows.filter((r): r is Extract<typeof r, { kind: 'round' }> => r.kind === 'round').length}
          publishedRounds={formState.publishedRounds}
          considerSente={formState.settings.considerSente}
          tieBreaks={formState.settings.tieBreaks}
          updateStartingPoints={updateStartingPoints}
          updateGames={updateGames}
          fesa={{
            isFinished,
            tournamentTitleEn: formState.locales.en?.title ?? formState.locales.ru?.title ?? '',
            parentEventTitleEn,
            settlementEn: formState.location.locales.en?.settlement || null,
            timeControl: formState.settings.timeControl,
            roundDates: formState.scheduleRows
              .filter((r): r is Extract<typeof r, { kind: 'round' }> => r.kind === 'round')
              .map((r) =>
                r.scheduledAtLocal
                  ? `${r.scheduledAtLocal.year}-${String(r.scheduledAtLocal.month).padStart(2, '0')}-${String(r.scheduledAtLocal.day).padStart(2, '0')}`
                  : r.scheduledAt
                    ? r.scheduledAt.toISOString().slice(0, 10)
                    : null,
              ),
          }}
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

      {/* Pairing assistant drawer + its right-side sticky tab */}
      {pairingToolsAvailable && !isPairingToolsOpen && (
        <button
          type="button"
          onClick={togglePairingTools}
          className="tooltip fixed right-0 top-17 z-40 rounded-l-box bg-secondary p-3 text-secondary-content shadow-lg"
          data-tip={t('tournament.edit.pairingTools.open')}
          aria-label={t('tournament.edit.pairingTools.open')}
        >
          <FaPeopleArrows className="h-6 w-6" />
        </button>
      )}
      {pairingToolsAvailable && isPairingToolsOpen && formState && (
        <PairingToolsDrawer
          isOpen
          onClose={() => setPairingToolsOpen(false)}
          tournamentId={tournamentId ?? 'new'}
          round={formState.publishedRounds + 1}
          participants={rowsToParticipants(formState.participants)}
          games={formState.games}
          publishedRounds={formState.publishedRounds}
          considerSente={formState.settings.considerSente}
          canUndo={pairingHistory.canUndo}
          canRedo={pairingHistory.canRedo}
          onUndo={handlePairingUndo}
          onRedo={handlePairingRedo}
          updateGames={updateGames}
        />
      )}
    </div>
  )
}
