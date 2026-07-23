import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AdjustmentsVerticalIcon,
  ClockIcon,
  PencilSquareIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext.tsx'
import { useTournamentForm } from '../../hooks/useTournamentForm.ts'
import {
  dateToLocalDatetimeInputValue,
  localDatetimeInputValueToUtcDate,
} from '../../utils/dateTime.ts'
import type { SupportedLocale } from '../../domain/locale.ts'
import { timeControlFormatSchema } from '../../domain/timeControl.ts'
import { tieBreakTypeSchema } from '../../domain/tieBreak.ts'
import type { TournamentFormState } from '../../hooks/useTournamentForm.ts'
import type { TimeControl, TimeControlFormat } from '../../domain/timeControl.ts'
import type { TieBreak, TieBreakType } from '../../domain/tieBreak.ts'
import type { TournamentLocale } from '../../domain/tournament.ts'
import type { Event } from '../../domain/event.ts'
import type { Association } from '../../domain/association.ts'
import { useEventsForMonth } from '../../hooks/useEvents.ts'
import { useMyAssociations } from '../../hooks/useAssociations.ts'
import { CountrySelect } from './CountrySelect.tsx'
import { LocaleTabs } from './LocaleTabs.tsx'
import { ExpandableField } from './ExpandableField.tsx'
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
            className="input input-bordered w-full"
          />
        </div>

        <ExpandableField
          label={t('tournament.edit.description')}
          value={formState.locales[activeLocale].description ?? ''}
          onChange={(value) =>
            updateLocale(activeLocale, 'description', value)
          }
          placeholder={t('tournament.edit.description')}
          textarea
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
              className="input input-bordered w-full"
            />
          </div>
        </div>

        <ExpandableField
          label={t('tournament.edit.venue')}
          value={formState.locales[activeLocale].venue ?? ''}
          onChange={(value) => updateLocale(activeLocale, 'venue', value)}
          placeholder={t('tournament.edit.venue')}
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
                placeholder={t('tournament.edit.arbiter.givenName')}
                className="input input-bordered w-full"
              />
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
                placeholder={t('tournament.edit.arbiter.familyName')}
                className="input input-bordered w-full"
              />
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
}: {
  formState: TournamentFormState
  updateBasic: <K extends keyof TournamentFormState>(
    field: K,
    value: TournamentFormState[K]
  ) => void
}) {
  const { t, i18n } = useTranslation()
  const { firebaseUser } = useAuth()
  const [showEventPicker, setShowEventPicker] = useState(false)
  const [showAssociationPicker, setShowAssociationPicker] = useState(false)
  const { data: events = [] } = useEventsForMonth()
  const { data: associations = [] } = useMyAssociations(firebaseUser?.uid)

  const selectedEventTitle = useMemo(() => {
    if (!formState.parentEvent) return t('tournament.edit.noParentEvent')
    const event = events.find((item) => item.id === formState.parentEvent)
    if (!event) return t('tournament.edit.noParentEvent')
    return (
      event.locales[i18n.language as keyof Event['locales']]?.title ??
      event.slug
    )
  }, [formState.parentEvent, events, i18n.language, t])

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
              className="input input-bordered join-item w-full"
            />
          </div>


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

function TieBreaksSection({
  tieBreaks,
  onAdd,
  onRemove,
}: {
  tieBreaks: TieBreak[]
  onAdd: (type: TieBreakType) => void
  onRemove: (index: number) => void
}) {
  const { t } = useTranslation()
  const [selectedType, setSelectedType] = useState<TieBreakType>('buchholz')

  const availableTypes = tieBreakTypeSchema.options.filter(
    (type) => type !== 'points' && !tieBreaks.some((tb) => tb.type === type)
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
            <span key={tb.type} className="badge badge-outline gap-2">
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
            <button
              type="button"
              onClick={() => {
                onAdd(selectedType)
                setSelectedType(
                  availableTypes.find((type) => type !== selectedType) ??
                    availableTypes[0] ??
                    'buchholz'
                )
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

function ScheduleSection({
  rounds,
  onAdd,
  onUpdate,
  onRemove,
}: {
  rounds: TournamentFormState['schedule']['rounds']
  onAdd: () => void
  onUpdate: (
    index: number,
    patch: Partial<TournamentFormState['schedule']['rounds'][number]>
  ) => void
  onRemove: (index: number) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">{t('tournament.edit.schedule.title')}</h2>

        <div className="space-y-2">
          {rounds.map((round, index) => (
            <div key={round.number} className="flex flex-wrap items-end gap-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">
                    {t('tournament.edit.rounds.number')}
                  </span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={round.number}
                  onChange={(e) =>
                    onUpdate(index, { number: Number(e.target.value) })
                  }
                  className="input input-bordered input-sm w-20"
                />
              </div>
              <div className="form-control flex-1">
                <label className="label">
                  <span className="label-text">
                    {t('tournament.edit.rounds.date')}
                  </span>
                </label>
                <input
                  type="datetime-local"
                  value={dateToLocalDatetimeInputValue(round.scheduledAt)}
                  onChange={(e) =>
                    onUpdate(index, {
                      scheduledAt: localDatetimeInputValueToUtcDate(
                        e.target.value
                      ),
                    })
                  }
                  className="input input-bordered input-sm min-w-0"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="btn btn-error btn-outline btn-sm"
              >
                {t('tournament.edit.rounds.remove')}
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="btn btn-secondary btn-sm mt-4"
        >
          {t('tournament.edit.rounds.add')}
        </button>
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
    clearCreateError,
    retryCreateDraft,
    updateLocale,
    updateBasic,
    updateArbiter,
    updateTimeControlType,
    updateTimeControlField,
    addTieBreak,
    removeTieBreak,
    addRound,
    updateRound,
    removeRound,
    saveDraft,
    publish,
    deleteTournament,
  } = useTournamentForm(tournamentId)

  type TabId = 'general' | 'settings' | 'schedule' | 'participants'

  const [activeTab, setActiveTab] = useState<TabId>('general')

  const tabs: {
    id: TabId
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    {
      id: 'general',
      label: t('tournament.edit.tabs.general'),
      icon: PencilSquareIcon,
    },
    {
      id: 'settings',
      label: t('tournament.edit.tabs.settings'),
      icon: AdjustmentsVerticalIcon,
    },
    {
      id: 'schedule',
      label: t('tournament.edit.tabs.schedule'),
      icon: ClockIcon,
    },
    {
      id: 'participants',
      label: t('tournament.edit.tabs.participants'),
      icon: UserGroupIcon,
    },
  ]

  const localizedTitle =
    formState?.locales[(i18n.language as SupportedLocale) ?? 'ru']?.title ||
    t('admin.untitledTournament')

  useEffect(() => {
    document.title = t('tournament.edit.pageTitle', { title: localizedTitle })
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

  const handlePublish = async () => {
    if (!window.confirm(t('tournament.edit.publishConfirm'))) return
    await publish()
  }

  const handleDelete = async () => {
    if (!window.confirm(t('tournament.edit.deleteConfirm'))) return
    await deleteTournament()
  }

  const canEditBinding =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    tournament?.createdBy === firebaseUser?.uid

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

      {(saveError || publishError || deleteError) && (
        <div className="alert alert-error">
          {saveError && <p>{t('tournament.edit.errors.save')}</p>}
          {publishError && <p>{t('tournament.edit.errors.publish')}</p>}
          {deleteError && <p>{t('tournament.edit.errors.delete')}</p>}
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
          />

          {canEditBinding && (
            <BindingSection formState={formState} updateBasic={updateBasic} />
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
        </div>
      )}

      {activeTab === 'schedule' && (
        <ScheduleSection
          rounds={formState.schedule.rounds}
          onAdd={addRound}
          onUpdate={updateRound}
          onRemove={removeRound}
        />
      )}

      {activeTab === 'participants' && (
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body opacity-70">
            {t('tournament.edit.tabs.placeholder')}
          </div>
        </div>
      )}
    </div>
  )
}
