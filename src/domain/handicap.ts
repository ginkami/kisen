import { z } from 'zod'

export const handicapCodeSchema = z.enum([
  'L',
  'B',
  'R',
  'RL',
  '2p',
  '4p',
  '5p',
  '6p',
  '8p',
  '10p',
])

export type HandicapCode = z.infer<typeof handicapCodeSchema>

export const handicapSchema = z
  .string()
  .regex(
    /^[-+][LBR]|[-+][2-6]p|[-+][8]p|[-+]10p$/,
    'Handicap must be in format [+/-][code]'
  )
  .transform((value) => value as `${'-' | '+'}${HandicapCode}`)

export type Handicap = z.infer<typeof handicapSchema>
