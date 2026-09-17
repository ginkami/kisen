import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { FirebaseError } from 'firebase/app'
import { sendPasswordResetEmail } from 'firebase/auth'
import { useAuth } from '../../context/AuthContext.tsx'
import { getUserById, setUserRole, updateUser } from '../../services/userService.ts'
import { auth } from '../../services/firebaseConfig.ts'
import type { LayoutOutletContext } from '../Layout.tsx'
import type { User } from '../../types/user.ts'

const EDITABLE_ROLES = ['manager', 'user'] as const
type EditableRole = (typeof EDITABLE_ROLES)[number]

// Same display-name logic as the admin drawer and the managers section:
// locale-specific names with ru → en fallback and displayName as the last resort.
function getUserDisplayName(user: User, locale: 'ru' | 'en'): string {
  const loc = user.locales[locale] ?? user.locales.ru ?? user.locales.en
  return (!loc.familyName || !loc.familyName.trim()) && (!loc.givenName || !loc.givenName.trim())
    ? loc.displayName
    : !loc.familyName || !loc.familyName.trim()
      ? loc.givenName
      : `${loc.familyName}, ${loc.givenName}`
}

function passwordResetErrorMessage(error: unknown, t: (key: string) => string): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    switch ((error as FirebaseError).code) {
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return t('user.edit.errors.userNotFound')
      case 'auth/too-many-requests':
        return t('user.edit.errors.tooManyRequests')
      default:
        return t('user.edit.errors.resetGeneric')
    }
  }
  return t('user.edit.errors.resetGeneric')
}

interface AccessMessage {
  kind: 'success' | 'error'
  text: string
}

export function UserEditForm({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { setHasUnsavedChanges } = useOutletContext<LayoutOutletContext>()
  const { user: currentUser, isAuthenticated, isLoading: isAuthLoading } = useAuth()

  const isAdmin = isAuthenticated && currentUser?.role === 'admin'
  const isSelf = currentUser?.id === userId

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['users', 'adminEdit', userId],
    queryFn: () => getUserById(userId),
    enabled: isAdmin,
  })
  const user = data ?? null

  // Document title: the target user's display name (unconditional hook).
  useEffect(() => {
    if (user) {
      document.title = t('user.edit.pageTitle', {
        name: getUserDisplayName(user, i18n.language as 'ru' | 'en'),
      })
    }
  }, [user, i18n.language, t])
  const targetIsAdmin = user?.role === 'admin'
  const accessLocked = isSelf || targetIsAdmin

  const [role, setRole] = useState<EditableRole>('user')
  const [blocked, setBlocked] = useState(false)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [accessMessage, setAccessMessage] = useState<AccessMessage | null>(null)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetMessage, setResetMessage] = useState<AccessMessage | null>(null)

  // Sync the editable state with the loaded (or refetched) profile.
  useEffect(() => {
    if (!user) return
    const initialRole = user.role === 'admin' ? 'user' : (user.role as EditableRole)
    const initialBlocked = user.auth?.isActive === false
    setRole(initialRole)
    setBlocked(initialBlocked)
    setSavedSnapshot(JSON.stringify([initialRole, initialBlocked]))
    setAccessMessage(null)
  }, [user])

  const isDirty =
    user !== null &&
    savedSnapshot !== null &&
    JSON.stringify([role, blocked]) !== savedSnapshot

  useEffect(() => {
    setHasUnsavedChanges(isDirty)
  }, [isDirty, setHasUnsavedChanges])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || isSaving || accessLocked) return
    setIsSaving(true)
    setAccessMessage(null)
    try {
      if (role !== user.role) {
        await setUserRole(user.id, role)
      }
      if (blocked !== (user.auth?.isActive === false)) {
        await updateUser(user.id, {
          auth: {
            passwordHash: user.auth?.passwordHash ?? null,
            providers: user.auth?.providers ?? [],
            emailVerified: user.auth?.emailVerified ?? false,
            isActive: !blocked,
          },
        })
      }
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setAccessMessage({ kind: 'success', text: t('user.edit.accessSuccess') })
    } catch {
      setAccessMessage({ kind: 'error', text: t('user.edit.accessError') })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendReset = async () => {
    if (!user || isSendingReset) return
    setIsSendingReset(true)
    setResetMessage(null)
    try {
      await sendPasswordResetEmail(auth, user.email)
      setResetMessage({ kind: 'success', text: t('user.edit.resetSent') })
    } catch (err) {
      setResetMessage({
        kind: 'error',
        text: passwordResetErrorMessage(err, t),
      })
    } finally {
      setIsSendingReset(false)
    }
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="alert alert-warning">
          <span>{t('user.edit.errors.noAccess')}</span>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="alert alert-error">
          <span>
            {error ? t('user.edit.errors.load') : t('user.edit.errors.notFound')}
          </span>
        </div>
      </div>
    )
  }

  const displayName = getUserDisplayName(user, i18n.language as 'ru' | 'en')

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-semibold">{t('user.edit.title')}</h1>
      </div>

      <section className="rounded-lg border border-base-300 bg-base-100 p-4">
        <h2 className="mb-3 font-semibold">{t('user.edit.profileSection')}</h2>
        <div className="flex flex-col gap-1 text-sm">
          <p>
            <span className="opacity-70">{t('user.edit.name')}: </span>
            {displayName}
          </p>
          <p>
            <span className="opacity-70">{t('user.edit.email')}: </span>
            {user.email}
          </p>
        </div>
      </section>

      <form
        onSubmit={handleSave}
        className="mt-4 rounded-lg border border-base-300 bg-base-100 p-4"
      >
        <h2 className="mb-3 font-semibold">{t('user.edit.accessSection')}</h2>

        {isSelf && (
          <p className="mb-3 text-sm opacity-70">{t('user.edit.selfEditHint')}</p>
        )}
        {targetIsAdmin && (
          <p className="mb-3 text-sm opacity-70">{t('user.edit.adminTargetHint')}</p>
        )}

        <div className="form-control">
          <label className="label" htmlFor="user-edit-role">
            <span className="label-text">{t('user.edit.role')}</span>
          </label>
          <select
            id="user-edit-role"
            value={role}
            onChange={(e) => setRole(e.target.value as EditableRole)}
            disabled={accessLocked || isSaving}
            className="select select-bordered select-sm w-full"
          >
            {EDITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`user.role.${r}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            id="user-edit-blocked"
            type="checkbox"
            checked={blocked}
            onChange={(e) => setBlocked(e.target.checked)}
            disabled={accessLocked || isSaving}
            className="checkbox checkbox-error checkbox-sm"
          />
          <label htmlFor="user-edit-blocked" className="label-text cursor-pointer">
            {t('user.edit.blocked')}
          </label>
        </div>

        {accessMessage && (
          <p
            className={`mt-3 text-sm ${
              accessMessage.kind === 'success' ? 'text-success' : 'text-error'
            }`}
          >
            {accessMessage.text}
          </p>
        )}

        <div className="mt-4">
          <button
            type="submit"
            disabled={accessLocked || !isDirty || isSaving}
            className="btn btn-primary btn-sm"
          >
            {isSaving && <span className="loading loading-spinner loading-xs" />}
            {t('user.edit.save')}
          </button>
        </div>
      </form>

      <section className="mt-4 rounded-lg border border-base-300 bg-base-100 p-4">
        <h2 className="mb-1 font-semibold">{t('user.edit.passwordSection')}</h2>
        <p className="mb-3 text-sm opacity-70">{t('user.edit.passwordInfo')}</p>

        {resetMessage && (
          <p
            className={`mb-3 text-sm ${
              resetMessage.kind === 'success' ? 'text-success' : 'text-error'
            }`}
          >
            {resetMessage.text}
          </p>
        )}

        <button
          type="button"
          onClick={handleSendReset}
          disabled={isSendingReset}
          className="btn btn-secondary btn-sm"
        >
          {isSendingReset && <span className="loading loading-spinner loading-xs" />}
          {t('user.edit.sendReset')}
        </button>
      </section>
    </div>
  )
}
