import { z } from 'zod'
import { localeSchema } from './locale.ts'

export const eventLocaleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
})

export type EventLocale = z.infer<typeof eventLocaleSchema>

export const eventSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  createdBy: z.string().min(1),
  hostAssociation: z.string().uuid(),
  updatedAt: z.date(),
  locales: localeSchema(eventLocaleSchema).refine(
    (locales) => Object.keys(locales).length > 0,
    'At least one locale is required'
  ),
})

export type Event = z.infer<typeof eventSchema>
