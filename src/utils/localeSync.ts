import { transliterate } from 'transliteration'
import { supportedLocales, type SupportedLocale } from '../domain/locale.ts'

export interface LocalizedFieldPayload {
  value: string
  shouldTransliterate: boolean
}

export function syncLocalizedField<T extends Record<string, unknown>>(
  locales: Record<SupportedLocale, T>,
  activeLocale: SupportedLocale,
  fieldName: keyof T,
  payload: LocalizedFieldPayload
): Record<SupportedLocale, T> {
  const nextLocales = { ...locales }
  const activeEntry = { ...(nextLocales[activeLocale] as T) }
  ;(activeEntry as Record<string, unknown>)[fieldName as string] = payload.value
  nextLocales[activeLocale] = activeEntry

  for (const locale of supportedLocales) {
    if (locale === activeLocale) continue

    const entry = { ...(nextLocales[locale] as T) }
    const currentValue = (entry as Record<string, unknown>)[fieldName as string]

    if (currentValue === undefined || currentValue === null || currentValue === '') {
      let value = payload.value
      if (payload.shouldTransliterate) {
        value = transliterate(payload.value)
      }
      ;(entry as Record<string, unknown>)[fieldName as string] = value as T[keyof T]
      nextLocales[locale] = entry
    }
  }

  return nextLocales
}

export function syncArbiterLocalizedFields(
  locales: Record<SupportedLocale, { familyName: string; givenName: string }>,
  activeLocale: SupportedLocale,
  fieldName: 'familyName' | 'givenName',
  value: string
): Record<SupportedLocale, { familyName: string; givenName: string }> {
  return syncLocalizedField(
    locales,
    activeLocale,
    fieldName,
    { value, shouldTransliterate: true }
  )
}
