import { z } from 'zod'
import { localeSchema } from './locale.ts'

export const regulationLocaleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
})

export type RegulationLocale = z.infer<typeof regulationLocaleSchema>

export const regulationSchema = z.object({
  id: z.string().uuid(),
  createdBy: z.string().min(1),
  association: z.string().uuid().nullable(),
  updatedAt: z.date(),
  locales: localeSchema(regulationLocaleSchema).refine(
    (locales) => Object.keys(locales).length > 0,
    'At least one locale is required'
  ),
})

export type Regulation = z.infer<typeof regulationSchema>

export const draftRegulationSchema = regulationSchema
  .omit({ id: true, createdBy: true, updatedAt: true })
  .extend({
    id: z.string().uuid().optional(),
    createdBy: z.string().min(1).optional(),
    updatedAt: z.date().optional(),
  })
  .partial()

export type DraftRegulation = z.infer<typeof draftRegulationSchema>