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
