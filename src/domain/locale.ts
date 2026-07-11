import { z } from 'zod'

export const supportedLocales = ['ru', 'en'] as const

export type SupportedLocale = (typeof supportedLocales)[number]

export const localizedStringSchema = z.record(z.string(), z.string())

export type LocalizedString = z.infer<typeof localizedStringSchema>

export function localeSchema<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.record(z.string(), valueSchema)
}
