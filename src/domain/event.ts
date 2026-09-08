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
  hostAssociation: z.string().uuid().nullable(),
  regulations: z.array(z.string().uuid()).default([]),
  updatedAt: z.date(),
  startYearMonth: z.string().length(6).regex(/^\d{6}$/),
  locales: localeSchema(eventLocaleSchema).refine(
    (locales) => Object.keys(locales).length > 0,
    'At least one locale is required'
  ),
})

export type Event = z.infer<typeof eventSchema>

export const draftEventSchema = eventSchema
  .omit({ id: true, slug: true, createdBy: true, updatedAt: true })
  .extend({
    id: z.string().uuid().optional(),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
    createdBy: z.string().min(1).optional(),
    updatedAt: z.date().optional(),
  })
  .partial()

export type DraftEvent = z.infer<typeof draftEventSchema>

/**
 * Client-side mirror of the Firestore rules guarding event updates:
 * admins, the event's creator, and managers of the event's host
 * association may edit.
 */
export function canEditEvent(
  event: Pick<Event, 'createdBy' | 'hostAssociation'>,
  userId: string,
  isAdmin: boolean,
  managedAssociationIds: readonly string[],
): boolean {
  if (isAdmin) return true
  if (event.createdBy === userId) return true
  return (
    event.hostAssociation !== null &&
    managedAssociationIds.includes(event.hostAssociation)
  )
}
