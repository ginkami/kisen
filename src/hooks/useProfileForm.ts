import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { updateUser } from '../services/userService.ts'
import type { SupportedLocale } from '../domain/locale.ts'
import type { User, UserLocale, UserLocales } from '../types/user.ts'

const LOCALE_FIELDS = ['familyName', 'givenName', 'displayName'] as const
const LOCALES = ['ru', 'en'] as const

function emptyLocale(): UserLocale {
  return { familyName: '', givenName: '', displayName: '' }
}

function cloneLocales(locales: UserLocales): UserLocales {
  return {
    ru: { ...emptyLocale(), ...(locales.ru ?? {}) },
    en: { ...emptyLocale(), ...(locales.en ?? {}) },
  }
}

function areLocalesEqual(a: UserLocales, b: UserLocales): boolean {
  return LOCALES.every((loc) =>
    LOCALE_FIELDS.every((field) => a[loc][field] === b[loc][field])
  )
}

export function useProfileForm(user: User) {
  const queryClient = useQueryClient()
  const [formLocales, setFormLocales] = useState<UserLocales>(() =>
    cloneLocales(user.locales)
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const updateLocale = useCallback(
    (locale: SupportedLocale, field: keyof UserLocale, value: string) => {
      setFormLocales((prev) => ({
        ...prev,
        [locale]: { ...prev[locale], [field]: value },
      }))
    },
    []
  )

  const isDirty = useMemo(
    () => !areLocalesEqual(formLocales, cloneLocales(user.locales)),
    [formLocales, user.locales]
  )

  const clearSaveError = useCallback(() => setSaveError(false), [])

  const save = useCallback(async () => {
    setIsSaving(true)
    setSaveError(false)
    try {
      const updated = await updateUser(user.id, { locales: formLocales })
      queryClient.setQueryData(['authUser', user.id], updated)
    } catch {
      setSaveError(true)
    } finally {
      setIsSaving(false)
    }
  }, [formLocales, queryClient, user.id])

  return {
    locales: formLocales,
    updateLocale,
    isDirty,
    save,
    isSaving,
    saveError,
    clearSaveError,
  }
}
