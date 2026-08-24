import { supportedLocales, type SupportedLocale } from '../domain/locale.ts'

/**
 * Returns true if any value in the fields object is non-empty after trimming.
 */
export function localeHasAnyContent(
  fields: Record<string, string | undefined>
): boolean {
  return Object.values(fields).some(
    (v) => typeof v === 'string' && v.trim() !== ''
  )
}

/**
 * For each locale entry, empty required fields are filled from the first locale
 * (in supportedLocales order) that has a non-empty value for that field.
 * Returns a new object; the original is not mutated.
 */
export function backfillRequiredLocaleFields<
  T extends Record<string, string | undefined>,
>(locales: Record<SupportedLocale, T>, requiredFields: (keyof T & string)[]): Record<SupportedLocale, T> {
  const result = {} as Record<SupportedLocale, T>

  for (const locale of supportedLocales) {
    const entry = locales[locale]
    if (!entry) continue

    const patched = { ...entry }
    for (const field of requiredFields) {
      if (typeof patched[field] === 'string' && patched[field]!.trim() === '') {
        // Find the first locale with a non-empty value for this field
        for (const srcLocale of supportedLocales) {
          const srcEntry = locales[srcLocale]
          if (
            srcEntry &&
            typeof srcEntry[field] === 'string' &&
            srcEntry[field]!.trim() !== ''
          ) {
            patched[field] = srcEntry[field]
            break
          }
        }
      }
    }
    result[locale] = patched
  }

  return result
}