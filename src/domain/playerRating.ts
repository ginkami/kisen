import { z } from 'zod'

export const kyuRankSchema = z.enum([
  '20k', '19k', '18k', '17k', '16k', '15k', '14k', '13k', '12k', '11k',
  '10k', '9k', '8k', '7k', '6k', '5k', '4k', '3k', '2k', '1k',
])

export const danRankSchema = z.enum([
  '1d', '2d', '3d', '4d', '5d', '6d', '7d', '8d', '9d',
])

export const playerRankSchema = z.union([kyuRankSchema, danRankSchema])

export type PlayerRank = z.infer<typeof playerRankSchema>

export const playerRatingSchema = z.object({
  value: z.number().nullable(),
  rank: playerRankSchema.nullable(),
})

export type PlayerRating = z.infer<typeof playerRatingSchema>
