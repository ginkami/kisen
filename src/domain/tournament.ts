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
  location: z.string().optional(),
  venue: z.string().optional(),
})

export type TournamentLocale = z.infer<typeof tournamentLocaleSchema>

export const publishedTournamentLocaleSchema = tournamentLocaleSchema.extend({
  title: z.string().min(1),
  location: z.string().min(1),
})

export type PublishedTournamentLocale = z.infer<
  typeof publishedTournamentLocaleSchema
>

export const scheduleEventSchema = z.object({
  scheduledAt: z.date(),
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

export const tournamentSettingsSchema = z.object({
  timeControl: timeControlSchema,
  tieBreaks: tieBreaksSchema,
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

export const tournamentSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  createdBy: z.string().min(1),
  hostAssociation: z.string().uuid().nullable(),
  parentEvent: z.string().uuid().nullable(),
  updatedAt: z.date(),
  status: tournamentStatusSchema,
  isPublic: z.boolean(),
  publishedRounds: z.number().int().min(0).default(0),
  startYearMonth: z.string().length(6).regex(/^\d{6}$/),
  locales: localeSchema(tournamentLocaleSchema).refine(
    (locales) => Object.keys(locales).length > 0,
    'At least one locale is required'
  ),
  country: z.string().length(2),
  settings: tournamentSettingsSchema,
  schedule: tournamentScheduleSchema,
  arbiter: arbiterSchema,
  participants: z.array(participantSchema).default([]),
  games: z.array(gameSchema).default([]),
})

export type Tournament = z.infer<typeof tournamentSchema>

export const publishedTournamentSchema = tournamentSchema
  .omit({ locales: true, schedule: true })
  .extend({
    locales: localeSchema(publishedTournamentLocaleSchema).refine(
      (locales) => Object.keys(locales).length > 0,
      'At least one locale is required'
    ),
    schedule: publishedTournamentScheduleSchema,
  })
  .refine((t) => t.status !== 'draft', {
    message: 'Published tournament cannot have draft status',
  })

export type PublishedTournament = z.infer<typeof publishedTournamentSchema>

export const draftTournamentSchema = tournamentSchema
  .omit({ id: true, slug: true, createdBy: true, updatedAt: true })
  .extend({
    id: z.string().uuid().optional(),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
    createdBy: z.string().min(1).optional(),
    updatedAt: z.date().optional(),
  })

export type DraftTournament = z.infer<typeof draftTournamentSchema>

export interface LocalizedTournamentData {
  locale: SupportedLocale
  title: string
  description?: string
  location: string
  venue?: string
}

export function getTournamentLocale(
  tournament: { locales: Record<string, TournamentLocale> },
  preferredLocale: SupportedLocale
): LocalizedTournamentData {
  const locale = tournament.locales[preferredLocale]
    ? preferredLocale
    : (Object.keys(tournament.locales)[0] as SupportedLocale)

  return {
    locale,
    title: tournament.locales[locale].title,
    description: tournament.locales[locale].description,
    location: tournament.locales[locale].location ?? '',
    venue: tournament.locales[locale].venue,
  }
}
