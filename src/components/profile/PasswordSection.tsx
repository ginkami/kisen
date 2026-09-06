import { useState, type FormEvent } from 'react'
import {
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth'
import type { FirebaseError } from 'firebase/app'
import { useTranslation } from 'react-i18next'
import { updateUserProviders } from '../../services/userService.ts'
import type { User } from '../../types/user.ts'

const MIN_PASSWORD_LENGTH = 6

interface PasswordSectionProps {
  firebaseUser: FirebaseUser
  profile: User
}

interface PasswordFields {
  oldPassword: string
  newPassword: string
  repeatPassword: string
}

function hasPasswordProvider(firebaseUser: FirebaseUser): boolean {
  return firebaseUser.providerData.some((p) => p.providerId === 'password')
}

export function PasswordSection({ firebaseUser, profile }: PasswordSectionProps) {
  const { t } = useTranslation()
  const [fields, setFields] = useState<PasswordFields>({
    oldPassword: '',
    newPassword: '',
    repeatPassword: '',
  })
  const [attempted, setAttempted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [oldPasswordError, setOldPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const isChangeMode = hasPasswordProvider(firebaseUser)

  const oldInvalid = isChangeMode && fields.oldPassword.length === 0
  const newInvalid = fields.newPassword.length < MIN_PASSWORD_LENGTH
  const repeatInvalid = fields.repeatPassword !== fields.newPassword
  const isValid = !oldInvalid && !newInvalid && !repeatInvalid

  const setField = (field: keyof PasswordFields, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }))
    setOldPasswordError(null)
  }

  const showOldError = oldInvalid && (attempted || fields.oldPassword.length > 0)
  const showNewError = newInvalid && (attempted || fields.newPassword.length > 0)
  const showRepeatError =
    repeatInvalid && (attempted || fields.repeatPassword.length > 0)

  const firebaseErrorMessage = (error: FirebaseError): string | null => {
    switch (error.code) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        setOldPasswordError(t('profile.edit.password.errors.wrongPassword'))
        return null
      case 'auth/weak-password':
        return t('profile.edit.password.errors.weakPassword')
      case 'auth/requires-recent-login':
        return t('profile.edit.password.errors.requiresRecentLogin')
      case 'auth/email-already-in-use':
        return t('profile.edit.password.errors.emailAlreadyInUse')
      case 'auth/too-many-requests':
        return t('profile.edit.password.errors.tooManyRequests')
      default:
        return t('profile.edit.password.errors.generic')
    }
  }

  const handleApply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttempted(true)
    setFormError(null)
    if (!isValid || isSubmitting) return

    setIsSubmitting(true)
    try {
      if (isChangeMode) {
        const credential = EmailAuthProvider.credential(
          firebaseUser.email ?? '',
          fields.oldPassword
        )
        await reauthenticateWithCredential(firebaseUser, credential)
        await updatePassword(firebaseUser, fields.newPassword)
      } else {
        const credential = EmailAuthProvider.credential(
          firebaseUser.email ?? '',
          fields.newPassword
        )
        await linkWithCredential(firebaseUser, credential)
        await firebaseUser.reload()
        await updateUserProviders(
          profile.id,
          firebaseUser.providerData.map((p) => ({
            provider: p.providerId,
            externalId: p.uid,
          }))
        )
      }
      setFields({ oldPassword: '', newPassword: '', repeatPassword: '' })
      setAttempted(false)
      setOldPasswordError(null)
      setFormError(t('profile.edit.password.success'))
    } catch (error) {
      const message = firebaseErrorMessage(error as FirebaseError)
      if (message) setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const label = isChangeMode
    ? t('profile.edit.password.change')
    : t('profile.edit.password.add')

  const renderPasswordInput = (
    id: string,
    labelText: string,
    field: keyof PasswordFields,
    autoComplete: string,
    error?: string | false
  ) => (
    <div className="form-control">
      <label className="label" htmlFor={id}>
        <span className="label-text">{labelText}</span>
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={fields[field]}
        onChange={(e) => setField(field, e.target.value)}
        className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
      />
      {error && <span className="text-error mt-1 text-xs">{error}</span>}
    </div>
  )

  return (
    <form onSubmit={handleApply} className="mt-4 space-y-3 border-t border-base-300 pt-4">
      <h3 className="font-semibold">{label}</h3>
      {isChangeMode &&
        renderPasswordInput(
          'profile-password-old',
          t('profile.edit.password.old'),
          'oldPassword',
          'current-password',
          oldPasswordError ?? (showOldError && t('profile.edit.password.errors.oldRequired'))
        )}
      {renderPasswordInput(
        'profile-password-new',
        t('profile.edit.password.new'),
        'newPassword',
        'new-password',
        showNewError && t('profile.edit.password.errors.tooShort')
      )}
      {renderPasswordInput(
        'profile-password-repeat',
        t('profile.edit.password.repeat'),
        'repeatPassword',
        'new-password',
        showRepeatError && t('profile.edit.password.errors.mismatch')
      )}
      {formError && <p className="text-sm text-error">{formError}</p>}
      <button type="submit" disabled={!isValid || isSubmitting} className="btn btn-primary">
        {isSubmitting ? <span className="loading loading-spinner loading-xs" /> : label}
      </button>
    </form>
  )
}
