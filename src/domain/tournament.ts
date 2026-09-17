import { z } from 'zod'
import { localeSchema, type SupportedLocale } from './locale.ts'
import { timeControlSchema } from './timeControl.ts'
import { tieBreaksSchema } from './tieBreak.ts'
import { playerRatingSchema } from './playerRating.ts'
import { handicapSchema } from './handicap.ts'

export const tournamentStatusSchema = z.enum([
  'draft',
  'upcoming',
  'ongoing',
  'finished',
  'canceled',
  'proposed_for_removing',
])

export type TournamentStatus = z.infer<typeof tournamentStatusSchema>

export const tournamentLocaleSchema = z.object({
  title: z.string().default(''),
  description: z.string().optional(),
})

export type TournamentLocale = z.infer<typeof tournamentLocaleSchema>

export const publishedTournamentLocaleSchema = tournamentLocaleSchema.extend({
  title: z.string().min(1),
})

export type PublishedTournamentLocale = z.infer<
  typeof publishedTournamentLocaleSchema
>

export const tournamentLocationLocaleSchema = z.object({
  settlement: z.string().optional(),
  venue: z.string().optional(),
})

export type TournamentLocationLocale = z.infer<
  typeof tournamentLocationLocaleSchema
>

export const tournamentLocationSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  country: z.string().length(2).optional(),
  timeZone: z.string().min(1).optional(),
  locales: localeSchema(tournamentLocationLocaleSchema).refine(
    (locales) => Object.keys(locales).length > 0,
    'At least one locale is required'
  ),
})

export type TournamentLocation = z.infer<typeof tournamentLocationSchema>

export const scheduledAtLocalSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
})

export type ScheduledAtLocal = z.infer<typeof scheduledAtLocalSchema>

export const scheduleEventSchema = z.object({
  scheduledAt: z.date(),
  scheduledAtLocal: scheduledAtLocalSchema.optional(),
  locales: localeSchema(
    z.object({
      title: z.string().min(1),
    })
  ),
})

export type ScheduleEvent = z.infer<typeof scheduleEventSchema>

export const scheduleRoundSchema = z.object({
  number: z.number().int().min(1),
  scheduledAt: z.date(),
  scheduledAtLocal: scheduledAtLocalSchema.optional(),
})

export type ScheduleRound = z.infer<typeof scheduleRoundSchema>

export const arbiterSchema = z.object({
  locales: localeSchema(
    z.object({
      familyName: z.string().min(1),
      givenName: z.string().min(1),
    })
  ),
})

export type Arbiter = z.infer<typeof arbiterSchema>

export const participantSchema = z.object({
  id: z.number().int().positive(),
  player: z.string().uuid().nullable(),
  locales: localeSchema(
    z.object({
      familyName: z.string().min(1),
      givenName: z.string().min(1),
      title: z.string().optional(),
      location: z.string().optional(),
    })
  ),
  nationality: z.string().length(2).optional(),
  residence: z.string().length(2).optional(),
  capturedRating: playerRatingSchema,
  startingPoints: z.number().int().default(0),
})

export type Participant = z.infer<typeof participantSchema>

export const gameStatusSchema = z.enum([
  'not_started',
  'forfeit',
  'bye',
  'live',
  'adjourned',
  'completed',
])

export type GameStatus = z.infer<typeof gameStatusSchema>

export const gameResultSchema = z.enum([
  'draw',
  'player1_won',
  'player2_won',
])

export type GameResult = z.infer<typeof gameResultSchema>

export const senteSchema = z.enum(['unknown', 'player1', 'player2'])

export type Sente = z.infer<typeof senteSchema>

export const gameSchema = z.object({
  id: z.string().uuid(),
  player1: z.number().int().positive(),
  player2: z.number().int().positive().nullable(),
  sente: senteSchema,
  handicap: handicapSchema.nullable(),
  startedAt: z.date().optional(),
  endedAt: z.date().optional(),
  result: gameResultSchema.nullable(),
  status: gameStatusSchema.default('not_started'),
  round: z.number().int().min(1),
})

export type Game = z.infer<typeof gameSchema>

export const knockoutBracketSettingsSchema = z.object({
  /**
   * Bracket size (a power of two), 0 = the tournament has no knockout
   * bracket. Maintained via the edit form's Advanced Settings.
   */
  size: z.number().int().default(0),
  /**
   * The tournament round the knockout round 1 starts at, 0 = unset.
   */
  startRound: z.number().int().default(0),
})

export type KnockoutBracketSettings = z.infer<typeof knockoutBracketSettingsSchema>

export const tournamentSettingsSchema = z.object({
  timeControl: timeControlSchema,
  tieBreaks: tieBreaksSchema,
  considerSente: z.boolean().default(false),
  hasKnockoutBracket: knockoutBracketSettingsSchema.default({
    size: 0,
    startRound: 0,
  }),
})

export type TournamentSettings = z.infer<typeof tournamentSettingsSchema>

export const tournamentScheduleSchema = z.object({
  events: z.array(scheduleEventSchema).default([]),
  rounds: z.array(scheduleRoundSchema).default([]),
})

export type TournamentSchedule = z.infer<typeof tournamentScheduleSchema>

export const publishedTournamentScheduleSchema = z.object({
  events: z.array(scheduleEventSchema).default([]),
  rounds: z.array(scheduleRoundSchema).min(1),
})

export type PublishedTournamentSchedule = z.infer<
  typeof publishedTournamentScheduleSchema
>

const tournamentObjectSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  createdBy: z.string().min(1),
  hostAssociation: z.string().uuid().nullable(),
  parentEvent: z.string().uuid().nullable(),
  updatedAt: z.date(),
  status: tournamentStatusSchema,
  isPublic: z.boolean(),
  publishedRounds: z.number().int().min(0).default(0),
  /**
   * Legacy duplicate of publishedRounds. Kept only so old Firestore documents
   * (where the real value lived in currentRound and publishedRounds was 0)
   * parse correctly; migrated by migrateLegacyRounds and never written anymore.
   */
  currentRound: z.number().int().min(0).optional(),
  startYearMonth: z.string().length(6).regex(/^\d{6}$/),
  /**
   * Precise tournament start (min of rounds/events `scheduledAt`), used for
   * public listing order and date-range filters. Maintained by the service
   * alongside `startYearMonth`; absent on legacy documents (backfilled by
   * scripts/backfill-tournament-start-at.mjs).
   */
  startAt: z.date().optional(),
  locales: localeSchema(tournamentLocaleSchema).refine(
    (locales) => Object.keys(locales).length > 0,
    'At least one locale is required'
  ),
  location: tournamentLocationSchema.optional(),
  regulations: z.array(z.string().uuid()).default([]),
  settings: tournamentSettingsSchema,
  schedule: tournamentScheduleSchema,
  arbiter: arbiterSchema,
  participants: z.array(participantSchema).default([]),
  games: z.array(gameSchema).default([]),
})

/**
 * Legacy data migration: merge the retired `currentRound` field into
 * `publishedRounds`. Existing documents carry `publishedRounds: 0` with the
 * real value in `currentRound`; prefer a non-zero publishedRounds and fall
 * back to the legacy field, then drop `currentRound` from the parsed result.
 */
function migrateLegacyRounds<T extends { publishedRounds: number; currentRound?: number }>(
  t: T
): Omit<T, 'currentRound'> & { publishedRounds: number } {
  const { currentRound: legacyRound, ...rest } = t
  return {
    ...rest,
    publishedRounds: t.publishedRounds > 0 ? t.publishedRounds : (legacyRound ?? 0),
  }
}

export const tournamentSchema = tournamentObjectSchema.transform(migrateLegacyRounds)

export type Tournament = z.infer<typeof tournamentSchema>

export const publishedTournamentSchema = tournamentObjectSchema
  .omit({ locales: true, schedule: true, location: true })
  .extend({
    locales: localeSchema(publishedTournamentLocaleSchema).refine(
      (locales) => Object.keys(locales).length > 0,
      'At least one locale is required'
    ),
    schedule: publishedTournamentScheduleSchema,
    location: tournamentLocationSchema
      .extend({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .refine(
        (loc) => Object.keys(loc.locales).length > 0,
        'At least one locale is required'
      ),
  })
  .refine((t) => t.status !== 'draft', {
    message: 'Published tournament cannot have draft status',
  })
  .transform(migrateLegacyRounds)

export type PublishedTournament = z.infer<typeof publishedTournamentSchema>

export const draftTournamentSchema = tournamentObjectSchema
  .omit({ id: true, slug: true, createdBy: true, updatedAt: true })
  .extend({
    id: z.string().uuid().optional(),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
    createdBy: z.string().min(1).optional(),
    updatedAt: z.date().optional(),
  })
  .transform(migrateLegacyRounds)

export type DraftTournament = z.infer<typeof draftTournamentSchema>

export interface LocalizedTournamentData {
  locale: SupportedLocale
  title: string
  description?: string
  settlement: string
  venue?: string
  country?: string
}

export function getTournamentLocale(
  tournament: {
    locales: Record<string, TournamentLocale>
    location?: TournamentLocation
  },
  preferredLocale: SupportedLocale
): LocalizedTournamentData {
  const locale = tournament.locales[preferredLocale]
    ? preferredLocale
    : (Object.keys(tournament.locales)[0] as SupportedLocale)

  const locationLocale = tournament.location?.locales?.[locale]

  return {
    locale,
    title: tournament.locales[locale].title,
    description: tournament.locales[locale].description,
    settlement: locationLocale?.settlement ?? '',
    venue: locationLocale?.venue,
    country: tournament.location?.country,
  }
}

/**
 * Client-side mirror of the Firestore rules guarding tournament updates:
 * admins, the tournament's creator, and managers of the tournament's host
 * association may edit.
 */
export function canEditTournament(
  tournament: Pick<Tournament, 'createdBy' | 'hostAssociation'>,
  userId: string,
  isAdmin: boolean,
  managedAssociationIds: readonly string[],
): boolean {
  if (isAdmin) return true
  if (tournament.createdBy === userId) return true
  return (
    tournament.hostAssociation !== null &&
    managedAssociationIds.includes(tournament.hostAssociation)
  )
}
