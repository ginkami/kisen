import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BsSearch } from 'react-icons/bs'
import { searchByFamilyName, getByEmail } from '../../services/userService.ts'
import type { User } from '../../types/user.ts'
import type { SupportedLocale } from '../../domain/locale.ts'

interface ManagerInviteInputProps {
  locale: SupportedLocale
  excludeUserIds: string[]
  excludeEmails: string[]
  onAddUser: (userId: string) => void
  onAddEmail: (email: string) => void
}

export function ManagerInviteInput({
  locale,
  excludeUserIds,
  excludeEmails,
  onAddUser,
  onAddEmail,
}: ManagerInviteInputProps) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const [userResults, setUserResults] = useState<User[]>([])
  const [emailCandidate, setEmailCandidate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const isEmailMode = inputValue.includes('@')

  const handleInputChange = async (value: string) => {
    setInputValue(value)
    setUserResults([])
    setEmailCandidate(null)

    if (isEmailMode) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(value)) {
        if (!excludeEmails.includes(value.toLowerCase())) {
          setEmailCandidate(value.toLowerCase())
          setShowDropdown(true)
        }
      }
      return
    }

    if (value.length >= 3) {
      setIsLoading(true)
      setShowDropdown(true)
      try {
        const results = await searchByFamilyName(value)
        setUserResults(results.filter((u) => !excludeUserIds.includes(u.id)))
      } catch {
        setUserResults([])
      } finally {
        setIsLoading(false)
      }
    } else {
      setShowDropdown(false)
    }
  }

  const handleSelectUser = (user: User) => {
    onAddUser(user.id)
    setInputValue('')
    setShowDropdown(false)
  }

  const handleSelectEmail = async (email: string) => {
    setIsLoading(true)
    try {
      const user = await getByEmail(email)
      if (user) {
        onAddUser(user.id)
      } else {
        onAddEmail(email)
      }
    } catch {
      onAddEmail(email)
    } finally {
      setIsLoading(false)
      setInputValue('')
      setShowDropdown(false)
    }
  }

  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 150)
  }

  const getUserDisplayName = (user: User) => {
    const loc = user.locales[locale] ?? user.locales.ru ?? user.locales.en
    return `${loc.familyName}, ${loc.givenName}`
  }

  return (
    <div className="form-control relative">
      <label className="label">
        <span className="label-text">{t('association.edit.inviteLabel')}</span>
      </label>
      <label className="input input-sm input-bordered flex items-center gap-2">
        <BsSearch className="h-4 w-4 opacity-70" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (inputValue.length >= 3 || isEmailMode) setShowDropdown(true)
          }}
          onBlur={handleBlur}
          placeholder={t('association.edit.invitePlaceholder')}
          className="grow bg-transparent outline-none"
        />
      </label>

      {showDropdown && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-base-100 rounded-lg shadow-lg border border-base-300 p-2 max-h-60 overflow-auto">
          {isLoading && (
            <div className="flex justify-center py-2">
              <span className="loading loading-spinner loading-xs" />
            </div>
          )}

          {!isLoading && userResults.length > 0 && userResults.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-base-200">
              <span className="text-sm">{getUserDisplayName(user)}</span>
              <button
                type="button"
                onClick={() => handleSelectUser(user)}
                className="btn btn-xs btn-primary"
              >
                {t('association.edit.select')}
              </button>
            </div>
          ))}

          {!isLoading && emailCandidate && (
            <div className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-base-200">
              <span className="text-sm">{emailCandidate}</span>
              <button
                type="button"
                onClick={() => handleSelectEmail(emailCandidate)}
                className="btn btn-xs btn-primary"
              >
                {t('association.edit.select')}
              </button>
            </div>
          )}

          {!isLoading && userResults.length === 0 && !emailCandidate && inputValue.length >= 3 && (
            <p className="text-sm opacity-70 px-2 py-1">{t('association.edit.noUsersFound')}</p>
          )}
        </div>
      )}
    </div>
  )
}