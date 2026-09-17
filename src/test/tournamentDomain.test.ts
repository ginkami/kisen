import { describe, it, expect } from 'vitest'
import {
  scheduleEventSchema,
  scheduleRoundSchema,
  tournamentLocationSchema,
  tournamentSettingsSchema,
} from '../domain/tournament.ts'

describe('schedule schema with scheduledAtLocal', () => {
  it('parses an entry with both instant and local components', () => {
    const round = scheduleRoundSchema.parse({
      number: 1,
      scheduledAt: new Date('2026-07-18T06:30:00Z'),
      scheduledAtLocal: { year: 2026, month: 7, day: 18, hour: 15, minute: 30 },
    })
    expect(round.scheduledAt).toEqual(new Date('2026-07-18T06:30:00Z'))
    expect(round.scheduledAtLocal).toEqual({
      year: 2026,
      month: 7,
      day: 18,
      hour: 15,
      minute: 30,
    })
  })

  it('parses a legacy entry without scheduledAtLocal', () => {
    const round = scheduleRoundSchema.parse({
      number: 2,
      scheduledAt: new Date('2026-07-18T06:30:00Z'),
    })
    expect(round.scheduledAtLocal).toBeUndefined()
  })

  it('parses a legacy event without scheduledAtLocal', () => {
    const event = scheduleEventSchema.parse({
      scheduledAt: new Date('2026-07-18T09:00:00Z'),
      locales: { ru: { title: 'Открытие' } },
    })
    expect(event.scheduledAtLocal).toBeUndefined()
  })

  it('rejects out-of-range local components', () => {
    expect(() =>
      scheduleRoundSchema.parse({
        number: 1,
        scheduledAt: new Date('2026-07-18T06:30:00Z'),
        scheduledAtLocal: { year: 2026, month: 13, day: 18, hour: 15, minute: 30 },
      })
    ).toThrow()
    expect(() =>
      scheduleRoundSchema.parse({
        number: 1,
        scheduledAt: new Date('2026-07-18T06:30:00Z'),
        scheduledAtLocal: { year: 2026, month: 7, day: 18, hour: 24, minute: 30 },
      })
    ).toThrow()
  })
})

describe('tournament location schema with timeZone', () => {
  it('accepts an optional IANA timezone string', () => {
    const location = tournamentLocationSchema.parse({
      timeZone: 'Asia/Tokyo',
      locales: { ru: {} },
    })
    expect(location.timeZone).toBe('Asia/Tokyo')
  })

  it('parses a legacy location without timeZone', () => {
    const location = tournamentLocationSchema.parse({
      locales: { ru: { settlement: 'Минск' } },
    })
    expect(location.timeZone).toBeUndefined()
  })

  it('rejects an empty timezone string', () => {
    expect(() =>
      tournamentLocationSchema.parse({ timeZone: '', locales: { ru: {} } })
    ).toThrow()
  })
})

describe('tournament settings knockout bracket defaults', () => {
  it('parses legacy settings without hasKnockoutBracket', () => {
    const settings = tournamentSettingsSchema.parse({
      timeControl: { type: 'absolute', mainTime: 600 },
      tieBreaks: [{ type: 'points' }, { type: 'buchholz' }],
      considerSente: false,
    })
    expect(settings.hasKnockoutBracket).toEqual({ size: 0, startRound: 0 })
  })

  it('keeps the configured bracket geometry', () => {
    const settings = tournamentSettingsSchema.parse({
      timeControl: { type: 'absolute', mainTime: 600 },
      tieBreaks: [{ type: 'points' }, { type: 'buchholz' }],
      considerSente: false,
      hasKnockoutBracket: { size: 8, startRound: 3 },
    })
    expect(settings.hasKnockoutBracket).toEqual({ size: 8, startRound: 3 })
  })
})
