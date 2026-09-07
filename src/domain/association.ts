import { z } from 'zod'
import { localeSchema } from './locale.ts'

export const associationLocaleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
})

export type AssociationLocale = z.infer<typeof associationLocaleSchema>

export const emailSchema = z.string().email()

export const associationSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  createdBy: z.string().min(1),
  locales: localeSchema(associationLocaleSchema).refine(
    (locales) => Object.keys(locales).length > 0,
    'At least one locale is required'
  ),
  country: z.string().length(2).optional(),
  managers: z.array(z.string().min(1)).default([]),
  pendingInvites: z.array(emailSchema).default([]),
})

export type Association = z.infer<typeof associationSchema>
