import { useState } from 'react'
import { sanitizeTextInput } from '../../utils/sanitize.ts'
import { BsPlus } from 'react-icons/bs'
import { useTranslation } from 'react-i18next'
import { CountrySelect } from '../tournament/CountrySelect.tsx'
import { LocaleTabs } from '../tournament/LocaleTabs.tsx'
import { ExpandableField } from '../tournament/ExpandableField.tsx'
import { AssociationPickerModal } from '../tournament/AssociationPickerModal.tsx'
import type { PlayerFormState, PlayerFormLocaleFields } from '../../hooks/playerFormHelpers.ts'
import type { PlayerRank } from '../../domain/playerRating.ts'
import type { SupportedLocale } from '../../domain/locale.ts'

interface PlayerInfoSectionProps {
  formState: PlayerFormState
  activeLocale: SupportedLocale
  onLocaleChange: (locale: SupportedLocale) => void
  onUpdateLocale: (locale: SupportedLocale, field: keyof PlayerFormLocaleFields, value: string) => void
  onUpdateBasic: <K extends keyof PlayerFormState>(field: K, value: PlayerFormState[K]) => void
  onUpdateRating: (field: 'ratingValue' | 'rank' | 'title', value: string | PlayerRank | null) => void
  onAddAssociation: (id: string) => void
  onRemoveAssociation: (id: string) => void
  canEditAssociations: boolean
  validationErrors?: Record<string, string>
}

export function PlayerInfoSection({
  formState,
  activeLocale,
  onLocaleChange,
  onUpdateLocale,
  onUpdateBasic,
  onUpdateRating,
  onAddAssociation,
  onRemoveAssociation,
  canEditAssociations,
  validationErrors = {},
}: PlayerInfoSectionProps) {
  const { t, i18n } = useTranslation()
  const [showAssociationPicker, setShowAssociationPicker] = useState(false)

  const currentLocale = formState.locales[activeLocale]
  const isRatingEmpty = formState.ratingValue === '' && formState.rank === null
  const [ratingExpanded, setRatingExpanded] = useState(!isRatingEmpty)

  const allAssociationIds = [
    ...(formState.primaryAssociation ? [formState.primaryAssociation] : []),
    ...formState.secondaryAssociations,
  ]

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title">{t('player.edit.info')}</h2>
          <LocaleTabs locale={activeLocale} onChange={onLocaleChange} />
        </div>

        {/* Required: Family name + Given name */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="form-control">
            <label className="label">
              <span className="label-text">
                {t('player.edit.familyName')}
                <span className="text-error ml-1">*</span>
              </span>
            </label>
            <input
              type="text"
              value={currentLocale.familyName}
              onChange={(e) => onUpdateLocale(activeLocale, 'familyName', sanitizeTextInput(e.target.value))}
              className={`input input-bordered w-full ${validationErrors.familyName ? 'input-error' : ''}`}
            />
            {validationErrors.familyName && (
              <span className="text-error text-xs mt-1">{t('common.fieldRequired')}</span>
            )}
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">
                {t('player.edit.givenName')}
                <span className="text-error ml-1">*</span>
              </span>
            </label>
            <input
              type="text"
              value={currentLocale.givenName}
              onChange={(e) => onUpdateLocale(activeLocale, 'givenName', sanitizeTextInput(e.target.value))}
              className={`input input-bordered w-full ${validationErrors.givenName ? 'input-error' : ''}`}
            />
            {validationErrors.givenName && (
              <span className="text-error text-xs mt-1">{t('common.fieldRequired')}</span>
            )}
          </div>
        </div>

        {/* Required: Country */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="form-control">
            <label className="label country">
              <span className="label-text">
                {t('player.edit.country')}
                <span className="text-error ml-1">*</span>
              </span>
            </label>
            <CountrySelect
              value={formState.nationality}
              onChange={(value) => onUpdateBasic('nationality', value)}
              lang={i18n.language === 'ru' ? 'ru' : 'en'}
              placeholder={t('tournament.edit.noCountry')}
            />
            {validationErrors.nationality && (
              <span className="text-error text-xs mt-1">{t('common.fieldRequired')}</span>
            )}
          </div>
          <ExpandableField
            label={t('player.edit.location')}
            value={currentLocale.location}
            onChange={(value) => onUpdateLocale(activeLocale, 'location', value)}
          />
        </div>

        {/* Optional: Residence + Club */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ExpandableField
            label={t('player.edit.residence')}
            isEmpty={!formState.residence}
          >
            <CountrySelect
              value={formState.residence}
              onChange={(value) => onUpdateBasic('residence', value)}
              lang={i18n.language === 'ru' ? 'ru' : 'en'}
              placeholder={t('tournament.edit.noCountry')}
            />
          </ExpandableField>
          <ExpandableField
            label={t('player.edit.club')}
            value={currentLocale.club}
            onChange={(value) => onUpdateLocale(activeLocale, 'club', value)}
          />
        </div>

        {/* Optional: Rating/Rank/Title — grouped */}
        {!ratingExpanded ? (
          <button
            type="button"
            className="btn btn-ghost justify-start px-2 text-primary"
            onClick={() => setRatingExpanded(true)}
          >
            <BsPlus className="h-5 w-5" />
            {t('player.edit.rating')}
          </button>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('player.edit.ratingValue')}</span>
              </label>
              <input
                type="number"
                value={formState.ratingValue}
                onChange={(e) => onUpdateRating('ratingValue', e.target.value)}
                className="input input-bordered w-full"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('player.edit.rank')}</span>
              </label>
              <select
                value={formState.rank ?? ''}
                onChange={(e) => onUpdateRating('rank', e.target.value || null)}
                className="select select-bordered w-full select-rank"
              >
                <option value="">—</option>
                {['20k', '19k', '18k', '17k', '16k', '15k', '14k', '13k', '12k', '11k',
                  '10k', '9k', '8k', '7k', '6k', '5k', '4k', '3k', '2k', '1k'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
                {['1d', '2d', '3d', '4d', '5d', '6d', '7d', '8d', '9d'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <ExpandableField
              label={t('player.edit.title')}
              value={currentLocale.title}
              onChange={(value) => onUpdateLocale(activeLocale, 'title', value)}
            />
          </div>
        )}

        {/* Optional: Gender + Birth date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ExpandableField
            label={t('player.edit.gender')}
            isEmpty={formState.gender === null}
          >
            <select
              value={formState.gender ?? ''}
              onChange={(e) => onUpdateBasic('gender', (e.target.value || null) as 'men' | 'women' | null)}
              className="select select-bordered w-full"
            >
              <option value="">—</option>
              <option value="men">{t('player.edit.genderMen')}</option>
              <option value="women">{t('player.edit.genderWomen')}</option>
            </select>
          </ExpandableField>
          <ExpandableField
            label={t('player.edit.birthDate')}
            isEmpty={!formState.birthDate}
          >
            <input
              type="date"
              value={formState.birthDate}
              onChange={(e) => onUpdateBasic('birthDate', e.target.value)}
              className="input input-bordered w-full"
            />
          </ExpandableField>
        </div>

        {/* Associations */}
        {(canEditAssociations || !canEditAssociations && allAssociationIds.length > 0) && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">{t('player.edit.associations')}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {allAssociationIds.map((id) => (
              <span key={id} className="badge badge-outline gap-2">
                {id.substring(0, 8)}…
                {canEditAssociations && (
                  <button
                    type="button"
                    onClick={() => onRemoveAssociation(id)}
                    className="btn btn-circle btn-ghost btn-xs"
                    aria-label={t('common.remove')}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {canEditAssociations && (
            <button
              type="button"
              className="btn btn-ghost justify-start px-2 text-primary mt-2"
              onClick={() => setShowAssociationPicker(true)}
            >
              <BsPlus className="h-5 w-5" />
              {t('player.edit.addAssociation')}
            </button>
          )}
          {showAssociationPicker && (
            <AssociationPickerModal
              selectedId={null}
              onSelect={(id) => {
                if (id) onAddAssociation(id)
                setShowAssociationPicker(false)
              }}
              onClose={() => setShowAssociationPicker(false)}
            />
          )}
        </div>
        )}
      </div>
    </div>
  )
}