import { z } from 'zod'

export const tieBreakTypeSchema = z.enum([
  'points',
  'buchholz',
  'buchholz_cut',
  'buchholz_median',
  'buchholz_plus',
  'sonneborn_berger',
  'buchholz_sum',
  'direct_encounter',
  'wins_count',
  'sl_points',
])

export type TieBreakType = z.infer<typeof tieBreakTypeSchema>

export const baseTieBreakSchema = z.object({
  type: tieBreakTypeSchema,
  isVisible: z.boolean().optional(),
})

export const buchholzCutTieBreakSchema = baseTieBreakSchema.extend({
  type: z.literal('buchholz_cut'),
  cutCount: z.number().int().min(0).default(1),
})

export const tieBreakSchema = z.discriminatedUnion('type', [
  baseTieBreakSchema.extend({ type: z.literal('points') }),
  baseTieBreakSchema.extend({ type: z.literal('buchholz') }),
  buchholzCutTieBreakSchema,
  baseTieBreakSchema.extend({ type: z.literal('buchholz_median') }),
  baseTieBreakSchema.extend({ type: z.literal('buchholz_plus') }),
  baseTieBreakSchema.extend({ type: z.literal('sonneborn_berger') }),
  baseTieBreakSchema.extend({ type: z.literal('buchholz_sum') }),
  baseTieBreakSchema.extend({ type: z.literal('direct_encounter') }),
  baseTieBreakSchema.extend({ type: z.literal('wins_count') }),
  baseTieBreakSchema.extend({ type: z.literal('sl_points') }),
])

export type TieBreak = z.infer<typeof tieBreakSchema>

export const tieBreaksSchema = z
  .array(tieBreakSchema)
  .min(1)
  .refine(
    (items) => items[0]?.type === 'points',
    'First tie-break must be points'
  )

export type TieBreaks = z.infer<typeof tieBreaksSchema>
