import { z } from 'zod'

export const timeControlFormatSchema = z.enum([
  'absolute',
  'fischer',
  'bronstein',
  'delay',
  'byoyomi',
  'canadian',
])

export type TimeControlFormat = z.infer<typeof timeControlFormatSchema>

const baseTimeControlSchema = z.object({
  type: timeControlFormatSchema,
  mainTime: z.number().int().min(0),
})

export const absoluteTimeControlSchema = baseTimeControlSchema.extend({
  type: z.literal('absolute'),
})

export const incrementTimeControlSchema = baseTimeControlSchema.extend({
  type: z.enum(['fischer', 'bronstein', 'delay']),
  increment: z.number().int().min(0),
})

export const byoyomiTimeControlSchema = baseTimeControlSchema.extend({
  type: z.literal('byoyomi'),
  byoyomiTime: z.number().int().min(0),
  byoyomiPeriods: z.number().int().min(1),
})

export const canadianTimeControlSchema = baseTimeControlSchema.extend({
  type: z.literal('canadian'),
  canadianTime: z.number().int().min(0),
  canadianMoves: z.number().int().min(1),
})

export const timeControlSchema = z.discriminatedUnion('type', [
  absoluteTimeControlSchema,
  incrementTimeControlSchema,
  byoyomiTimeControlSchema,
  canadianTimeControlSchema,
])

export type TimeControl = z.infer<typeof timeControlSchema>
