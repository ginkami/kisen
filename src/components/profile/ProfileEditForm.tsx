import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.tsx'
import { useProfileForm } from '../../hooks/useProfileForm.ts'
import { useMyAssociations } from '../../hooks/useAssociations.ts'
import { LocaleTabs } from '../tournament/LocaleTabs.tsx'
import { PasswordSection } from './PasswordSection.tsx'
import type { SupportedLocale } from '../../domain/locale.ts'
import type { Association } from '../../domain/association.ts'
import type { User } from '../../types/user.ts'

const PROVIDER_LABEL_KEYS: Record<string, string> = {
  password: 'profile.edit.providers.password',
}

function providerLabel(providerId: string, t: (key: string) => string): string {
  if (providerId === 'google.com') return 'Google'
  const key = PROVIDER_LABEL_KEYS[providerId]
  return key ? t(key) : providerId
}

interface ProfileEditFormProps {
  profile: User
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const { t, i18n } = useTranslation()
  const { firebaseUser } = useAuth()
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(
    (i18n.language as SupportedLocale) ?? 'ru'
  )

  const { locales, updateLocale, isDirty, save, isSaving, saveError, clearSaveError } =
    useProfileForm(profile)
  const { data: associations = [] } = useMyAssociations(profile.id)

  const activeLocaleData = locales[activeLocale]
  const displayNameInvalid = activeLocaleData.displayName.trim().length === 0
  const headerTitle =
    [activeLocaleData.familyName, activeLocaleData.givenName]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' ') ||
    activeLocaleData.displayName.trim() ||
    t('profile.edit.untitled')

  useEffect(() => {
    document.title = `${headerTitle} — ${t('profile.edit.managementPanel')} | shogi·world`
  }, [headerTitle, i18n.language, t])

  const associationTitle = (association: Association) =>
    association.locales[i18n.language]?.title ?? association.slug

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-70">
            {t('profile.edit.managementPanel')}
          </div>
          <h1 className="text-2xl font-bold">{headerTitle}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save(activeLocale)}
            disabled={isSaving || !isDirty || displayNameInvalid}
            className="btn btn-primary"
          >
            {isSaving ? <span className="loading loading-spinner loading-xs" /> : t('profile.edit.save')}
          </button>
          <button type="button" disabled className="btn btn-error btn-outline">
            {t('profile.edit.delete')}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="alert alert-error">
          <p className="flex-1">{t('profile.edit.errors.save')}</p>
          <button type="button" onClick={clearSaveError} className="btn btn-sm btn-ghost">×</button>
        </div>
      )}

      <div className="card bg-base-200 shadow-sm">
        <div className="card-body gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wider opacity-70">
                {t('profile.edit.email')}
              </div>
              <p className="text-sm break-all">{profile.email}</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider opacity-70">
                {t('profile.edit.role')}
              </div>
              <p className="text-sm">{t(`profile.edit.roles.${profile.role}`)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title">{t('profile.edit.profileData')}</h2>
            <LocaleTabs locale={activeLocale} onChange={setActiveLocale} />
          </div>
          <div className="form-control">
            <label className="label" htmlFor="profile-display-name">
              <span className="label-text">
                {t('profile.edit.displayName')}
                <span className="text-error ml-1">*</span>
              </span>
            </label>
            <input
              id="profile-display-name"
              type="text"
              value={activeLocaleData.displayName}
              onChange={(e) => updateLocale(activeLocale, 'displayName', e.target.value)}
              className={`input input-bordered w-full ${
                displayNameInvalid ? 'input-error' : ''
              }`}
            />
            {displayNameInvalid && (
              <span className="text-error mt-1 text-xs">
                {t('profile.edit.errors.displayNameRequired')}
              </span>
            )}
          </div>
          <div className="form-control">
            <label className="label" htmlFor="profile-family-name">
              <span className="label-text">{t('profile.edit.familyName')}</span>
            </label>
            <input
              id="profile-family-name"
              type="text"
              value={activeLocaleData.familyName}
              onChange={(e) => updateLocale(activeLocale, 'familyName', e.target.value)}
              className="input input-bordered w-full"
            />
          </div>
          <div className="form-control">
            <label className="label" htmlFor="profile-given-name">
              <span className="label-text">{t('profile.edit.givenName')}</span>
            </label>
            <input
              id="profile-given-name"
              type="text"
              value={activeLocaleData.givenName}
              onChange={(e) => updateLocale(activeLocale, 'givenName', e.target.value)}
              className="input input-bordered w-full"
            />
          </div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-sm">
        <div className="card-body gap-4">
          <h2 className="card-title">{t('profile.edit.providers.title')}</h2>
          <div className="flex flex-wrap gap-2">
            {(firebaseUser?.providerData ?? []).map((provider) => (
              <span key={provider.providerId} className="badge badge-sm badge-primary">
                {providerLabel(provider.providerId, t)}
              </span>
            ))}
          </div>
          {firebaseUser && <PasswordSection firebaseUser={firebaseUser} profile={profile} />}
        </div>
      </div>

      <div className="card bg-base-200 shadow-sm">
        <div className="card-body gap-4">
          <h2 className="card-title">{t('profile.edit.associations.title')}</h2>
          {associations.length === 0 ? (
            <p className="text-sm opacity-70">{t('profile.edit.associations.empty')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {associations.map((association) => (
                <Link
                  key={association.id}
                  to={`/assn/${association.id}/edit`}
                  className="badge badge-sm badge-primary gap-1 hover:badge-secondary"
                >
                  {associationTitle(association)}
                  {association.createdBy === profile.id && (
                    <span className="ml-1 text-xs opacity-70">
                      ({t('association.edit.creator')})
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
