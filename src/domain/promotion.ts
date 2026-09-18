import { z } from 'zod'

export const promotionSchema = z.object({
  id: z.string().uuid(),
  /** The promoted tournament. */
  tournament: z.string().uuid(),
  showOnHome: z.boolean().default(false),
  startedAt: z.date(),
  endedAt: z.date(),
})

export type Promotion = z.infer<typeof promotionSchema>

export type PromotionStatus = 'notStarted' | 'active' | 'finished'

export function promotionStatus(startedAt: Date, endedAt: Date, now: Date): PromotionStatus {
  if (now < startedAt) return 'notStarted'
  if (now >= endedAt) return 'finished'
  return 'active'
}

/**
 * Promotions sort order: active windows on top (latest start first), then
 * upcoming windows with the nearest start first, then finished windows at the
 * bottom (latest end first).
 */
export function comparePromotions(
  a: { startedAt: Date; endedAt: Date },
  b: { startedAt: Date; endedAt: Date },
  now: Date
): number {
  const statusA = promotionStatus(a.startedAt, a.endedAt, now)
  const statusB = promotionStatus(b.startedAt, b.endedAt, now)
  const rank = (s: PromotionStatus) => (s === 'active' ? 0 : s === 'notStarted' ? 1 : 2)
  if (rank(statusA) !== rank(statusB)) return rank(statusA) - rank(statusB)
  if (statusA === 'active') return b.startedAt.getTime() - a.startedAt.getTime()
  if (statusA === 'notStarted') return a.startedAt.getTime() - b.startedAt.getTime()
  return b.endedAt.getTime() - a.endedAt.getTime()
}
