import { useTranslation } from 'react-i18next'
import { sanitizeTextInput } from '../../utils/sanitize.ts'
import { LocaleTabs } from '../tournament/LocaleTabs.tsx'
import { CountrySelect } from '../tournament/CountrySelect.tsx'
import { ExpandableField } from '../tournament/ExpandableField.tsx'
import type { SupportedLocale } from '../../domain/locale.ts'
import type { AssociationLocale } from '../../domain/association.ts'

interface AssociationInfoSectionProps {
  locales: Record<SupportedLocale, AssociationLocale>
  activeLocale: SupportedLocale
  onLocaleChange: (locale: SupportedLocale) => void
  onUpdateLocale: (locale: SupportedLocale, field: keyof AssociationLocale, value: string) => void
  slug: string
  onUpdateSlug: (slug: string) => void
  country: string
  onUpdateCountry: (country: string) => void
  validationErrors?: Record<string, string>
  slugTaken?: boolean
}

export function AssociationInfoSection({
  locales,
  activeLocale,
  onLocaleChange,
  onUpdateLocale,
  slug,
  onUpdateSlug,
  country,
  onUpdateCountry,
  validationErrors = {},
  slugTaken = false,
}: AssociationInfoSectionProps) {
  const { t, i18n } = useTranslation()
  const currentLocale = locales[activeLocale]

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title">{t('association.edit.info')}</h2>
          <LocaleTabs locale={activeLocale} onChange={onLocaleChange} />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">
              {t('association.edit.title')}
              <span className="text-error ml-1">*</span>
            </span>
          </label>
          <input
            type="text"
            value={currentLocale.title}
            onChange={(e) => onUpdateLocale(activeLocale, 'title', sanitizeTextInput(e.target.value))}
            className={`input input-bordered w-full ${validationErrors.title ? 'input-error' : ''}`}
          />
          {validationErrors.title && (
            <span className="text-error text-xs mt-1">{t('common.fieldRequired')}</span>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">
              {t('association.edit.slug')}
              <span className="text-error ml-1">*</span>
            </span>
          </label>
          <div className="join">
            <span className="bg-base-200 border border-base-300 px-2 flex items-center join-item text-sm">
              shogi.world/assn/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => onUpdateSlug(e.target.value)}
              className={`input input-bordered join-item w-full ${validationErrors.slug ? 'input-error' : ''}`}
            />
          </div>
          {validationErrors.slug && (
            <span className="text-error text-xs mt-1 ml-2">
              {validationErrors.slug === 'taken' ? t('association.edit.slugTaken') : t('common.fieldRequired')}
            </span>
          )}
          {slugTaken && !validationErrors.slug && (
            <span className="text-error text-xs mt-1 ml-2">{t('association.edit.slugTaken')}</span>
          )}
        </div>

        <ExpandableField
          label={t('association.edit.description')}
          value={currentLocale.description ?? ''}
          onChange={(value) => onUpdateLocale(activeLocale, 'description', value)}
          textarea
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ExpandableField
            label={t('association.edit.country')}
            isEmpty={!country}
          >
            <CountrySelect
              value={country}
              onChange={onUpdateCountry}
              lang={i18n.language === 'ru' ? 'ru' : 'en'}
              placeholder={t('tournament.edit.noCountry')}
            />
          </ExpandableField>
          <ExpandableField
            label={t('association.edit.location')}
            value={currentLocale.location ?? ''}
            onChange={(value) => onUpdateLocale(activeLocale, 'location', value)}
          />
        </div>
      </div>
    </div>
  )
}