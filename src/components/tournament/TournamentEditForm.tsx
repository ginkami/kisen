import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTournamentForm } from '../../hooks/useTournamentForm.ts'
import { getCountryList } from '../../utils/countries.ts'
import {
  dateToLocalDatetimeInputValue,
  localDatetimeInputValueToUtcDate,
} from '../../utils/dateTime.ts'
import { supportedLocales, type SupportedLocale } from '../../domain/locale.ts'
import { timeControlFormatSchema } from '../../domain/timeControl.ts'
import { tieBreakTypeSchema } from '../../domain/tieBreak.ts'
import type { TournamentFormState } from '../../hooks/useTournamentForm.ts'
import type { TimeControl, TimeControlFormat } from '../../domain/timeControl.ts'
import type { TieBreak, TieBreakType } from '../../domain/tieBreak.ts'
import type { TournamentLocale } from '../../domain/tournament.ts'

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

function BasicInfoSection({
  formState,
  countryList,
  updateLocale,
  updateBasic,
}: {
  formState: TournamentFormState
  countryList: { code: string; name: string }[]
  updateLocale: (
    locale: SupportedLocale,
    field: keyof TournamentLocale,
    value: string
  ) => void
  updateBasic: <K extends keyof TournamentFormState>(
    field: K,
    value: TournamentFormState[K]
  ) => void
}) {
  const { t, i18n } = useTranslation()
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(
    (i18n.language as SupportedLocale) ?? 'ru'
  )

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">{t('tournament.edit.basicInfo')}</h2>

        <div className="form-control">
          <label className="label">
            <span className="label-text">{t('tournament.edit.slug')}</span>
          </label>
          <input
            type="text"
            value={formState.slug}
            onChange={(e) => updateBasic('slug', e.target.value)}
            className="input input-bordered"
          />
        </div>

        <div className="tabs tabs-boxed mt-4 w-fit">
          {supportedLocales.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => setActiveLocale(locale)}
              className={[
                'tab',
                activeLocale === locale ? 'tab-active' : '',
              ].join(' ')}
            >
              {locale.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mt-2 space-y-3">
          {(
            ['title', 'description', 'location', 'venue'] as const
          ).map((field) => (
            <div key={field} className="form-control">
              <label className="label">
                <span className="label-text">
                  {t(`tournament.edit.${field}`)}
                </span>
              </label>
              {field === 'description' ? (
                <textarea
                  value={formState.locales[activeLocale][field] ?? ''}
                  onChange={(e) =>
                    updateLocale(activeLocale, field, e.target.value)
                  }
                  className="textarea textarea-bordered"
                  rows={3}
                />
              ) : (
                <input
                  type="text"
                  value={formState.locales[activeLocale][field] ?? ''}
                  onChange={(e) =>
                    updateLocale(activeLocale, field, e.target.value)
                  }
                  className="input input-bordered"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="label cursor-pointer gap-2">
            <input
              type="checkbox"
              checked={formState.isOnline}
              onChange={(e) => updateBasic('isOnline', e.target.checked)}
              className="checkbox"
            />
            <span className="label-text">{t('tournament.edit.online')}</span>
          </label>
        </div>

        {!formState.isOnline && (
          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text">{t('tournament.edit.country')}</span>
            </label>
            <select
              value={formState.country ?? ''}
              onChange={(e) => updateBasic('country', e.target.value || null)}
              className="select select-bordered"
            >
              <option value="">{t('tournament.edit.noCountry')}</option>
              {countryList.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        )}
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
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">{t('tournament.edit.settings')}</h2>

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
    <div className="card bg-base-100 shadow-sm">
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
                className="select select-bordered select-sm"
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
              className="btn btn-secondary btn-sm"
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
    <div className="card bg-base-100 shadow-sm">
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

  const countryList = useMemo(
    () => getCountryList(i18n.language === 'ru' ? 'ru' : 'en'),
    [i18n.language]
  )

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

  const localizedTitle =
    formState.locales[(i18n.language as SupportedLocale) ?? 'ru']?.title ||
    t('admin.untitledTournament')

  const handlePublish = async () => {
    if (!window.confirm(t('tournament.edit.publishConfirm'))) return
    await publish()
  }

  const handleDelete = async () => {
    if (!window.confirm(t('tournament.edit.deleteConfirm'))) return
    await deleteTournament()
  }

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
            className="btn btn-primary btn-sm"
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
              className="btn btn-success btn-sm"
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
            className="btn btn-error btn-outline btn-sm"
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

      <BasicInfoSection
        formState={formState}
        countryList={countryList}
        updateLocale={updateLocale}
        updateBasic={updateBasic}
      />

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

      <ScheduleSection
        rounds={formState.schedule.rounds}
        onAdd={addRound}
        onUpdate={updateRound}
        onRemove={removeRound}
      />
    </div>
  )
}
