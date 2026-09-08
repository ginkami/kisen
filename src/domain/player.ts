import { z } from 'zod'
import { localeSchema } from './locale.ts'
import { playerRatingSchema } from './playerRating.ts'

export const genderSchema = z.enum(['men', 'women'])

export type Gender = z.infer<typeof genderSchema>

export const playerLocaleSchema = z.object({
  familyName: z.string().min(1),
  givenName: z.string().min(1),
  title: z.string().optional(),
  club: z.string().optional(),
  location: z.string().optional(),
})

export type PlayerLocale = z.infer<typeof playerLocaleSchema>

export const playerSchema = z.object({
  id: z.string().uuid(),
  createdBy: z.string().min(1),
  locales: localeSchema(playerLocaleSchema).refine(
    (locales) => Object.keys(locales).length > 0,
    'At least one locale is required'
  ),
  nationality: z.string().length(2),
  residence: z.string().length(2).optional(),
  gender: genderSchema.nullable(),
  currentRating: playerRatingSchema,
  birthDate: z.date().nullable(),
  primaryAssociation: z.string().uuid().nullable(),
  secondaryAssociations: z.array(z.string().uuid()).default([]),
})

export type Player = z.infer<typeof playerSchema>

/**
 * Client-side mirror of the Firestore rules guarding player updates:
 * admins, the player's creator, and managers of the player's
 * primary/secondary associations may edit the player.
 */
export function canEditPlayer(
  player: Pick<Player, 'createdBy' | 'primaryAssociation' | 'secondaryAssociations'>,
  userId: string,
  isAdmin: boolean,
  managedAssociationIds: readonly string[],
): boolean {
  if (isAdmin) return true
  if (player.createdBy === userId) return true
  const managed = new Set(managedAssociationIds)
  return (
    (player.primaryAssociation !== null && managed.has(player.primaryAssociation)) ||
    player.secondaryAssociations.some((id) => managed.has(id))
  )
}
