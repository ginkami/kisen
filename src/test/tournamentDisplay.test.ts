import { describe, it, expect } from 'vitest'
import {
  tournamentStart,
  tournamentScheduleDays,
  formatDayRanges,
  formatTimeControlShort,
  sortTournamentsByStart,
} from '../utils/tournamentDisplay.ts'
import type { Tournament } from '../domain/tournament.ts'

function makeT(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: '00000000-0000-7000-0000-000000000001',
    slug: 'test',
    createdBy: 'u1',
    hostAssociation: null,
    parentEvent: null,
    updatedAt: new Date('2026-08-01T00:00:00Z'),
    status: 'upcoming',
    isPublic: true,
    publishedRounds: 0,
    currentRound: 0,
    startYearMonth: '202608',
    locales: { ru: { title: 'Тест' }, en: { title: 'Test' } },
    location: { locales: { ru: {}, en: {} } },
    regulations: [],
    settings: {
      timeControl: { type: 'byoyomi', mainTime: 40, byoyomiTime: 30, byoyomiPeriods: 3 },
      tieBreaks: [{ type: 'points' }],
      considerSente: false,
    },
    schedule: { events: [], rounds: [] },
    arbiter: { locales: { ru: { givenName: '', familyName: '' }, en: { givenName: '', familyName: '' } } },
    participants: [],
    games: [],
    ...overrides,
  } as Tournament
}

const t = ((key: string, opts?: Record<string, unknown>): string => {
  const count = opts?.count as number | undefined
  const map: Record<string, string> = {
    'tournament.timeControl.absolute': 'Абсолютный',
    'tournament.timeControl.fischer': 'Фишер',
    'tournament.timeControl.bronstein': 'Бронштейн',
    'tournament.timeControl.delay': 'Задержка',
    'tournament.timeControl.byoyomi': 'Бёёми',
    'tournament.timeControl.canadian': 'Канадский',
    'tournament.view.minutes': count === 1 ? 'минута' : 'минут',
    'tournament.view.seconds': count === 1 ? 'секунда' : 'секунд',
    'tournament.view.perMoves': 'ходов',
  }
  return map[key] ?? key
}) as (key: string, opts?: Record<string, unknown>) => string

describe('tournamentStart', () => {
  it('returns first round scheduledAt when rounds exist', () => {
    const t1 = makeT({
      schedule: {
        events: [],
        rounds: [
          { number: 2, scheduledAt: new Date('2026-08-12T10:00:00Z') },
          { number: 1, scheduledAt: new Date('2026-08-10T10:00:00Z') },
        ],
      },
    })
    expect(tournamentStart(t1)).toEqual(new Date('2026-08-10T10:00:00Z'))
  })

  it('falls back to earliest event when no rounds', () => {
    const t1 = makeT({
      schedule: {
        events: [
          { scheduledAt: new Date('2026-08-15T10:00:00Z'), locales: { ru: { title: 'A' }, en: { title: 'A' } } },
          { scheduledAt: new Date('2026-08-10T10:00:00Z'), locales: { ru: { title: 'B' }, en: { title: 'B' } } },
        ],
        rounds: [],
      },
    })
    expect(tournamentStart(t1)).toEqual(new Date('2026-08-10T10:00:00Z'))
  })

  it('falls back to updatedAt when no schedule', () => {
    const t1 = makeT({ updatedAt: new Date('2026-08-01T00:00:00Z') })
    expect(tournamentStart(t1)).toEqual(new Date('2026-08-01T00:00:00Z'))
  })
})

describe('tournamentScheduleDays', () => {
  it('returns unique calendar days from rounds and events', () => {
    const t1 = makeT({
      schedule: {
        rounds: [
          { number: 1, scheduledAt: new Date('2026-08-10T10:00:00Z') },
          { number: 2, scheduledAt: new Date('2026-08-10T14:00:00Z') },
          { number: 3, scheduledAt: new Date('2026-08-12T10:00:00Z') },
        ],
        events: [
          { scheduledAt: new Date('2026-08-10T09:00:00Z'), locales: { ru: { title: 'A' }, en: { title: 'A' } } },
        ],
      },
    })
    const days = tournamentScheduleDays(t1)
    expect(days).toHaveLength(2)
    expect(days[0].getUTCDate()).toBe(10)
    expect(days[1].getUTCDate()).toBe(12)
  })

  it('falls back to updatedAt day when no schedule', () => {
    const t1 = makeT({ updatedAt: new Date('2026-08-01T15:00:00Z') })
    const days = tournamentScheduleDays(t1)
    expect(days).toHaveLength(1)
    expect(days[0].getUTCFullYear()).toBe(2026)
    expect(days[0].getUTCMonth()).toBe(7)
    expect(days[0].getUTCDate()).toBe(1)
  })
})

describe('formatDayRanges', () => {
  it('formats a single day', () => {
    const result = formatDayRanges([new Date('2026-08-10T00:00:00Z')], 'ru')
    expect(result).toContain('10')
    expect(result).toContain('2026')
  })

  it('formats consecutive days with en-dash', () => {
    const result = formatDayRanges([
      new Date('2026-08-10T00:00:00Z'),
      new Date('2026-08-11T00:00:00Z'),
    ], 'ru')
    expect(result).toContain('–')
    expect(result).toContain('2026')
  })

  it('formats days with gaps comma-separated', () => {
    const result = formatDayRanges([
      new Date('2026-08-10T00:00:00Z'),
      new Date('2026-08-12T00:00:00Z'),
      new Date('2026-08-25T00:00:00Z'),
    ], 'ru')
    expect(result).toContain(',')
    expect(result).toContain('2026')
  })

  it('formats cross-month range', () => {
    const result = formatDayRanges([
      new Date('2026-08-25T00:00:00Z'),
      new Date('2026-08-26T00:00:00Z'),
      new Date('2026-08-27T00:00:00Z'),
      new Date('2026-08-28T00:00:00Z'),
      new Date('2026-08-29T00:00:00Z'),
      new Date('2026-08-30T00:00:00Z'),
      new Date('2026-08-31T00:00:00Z'),
      new Date('2026-09-01T00:00:00Z'),
      new Date('2026-09-02T00:00:00Z'),
      new Date('2026-09-03T00:00:00Z'),
      new Date('2026-09-04T00:00:00Z'),
      new Date('2026-09-05T00:00:00Z'),
    ], 'ru')
    expect(result).toContain('–')
    expect(result).toContain('2026')
  })

  it('deduplicates same-day entries', () => {
    const result = formatDayRanges([
      new Date('2026-08-10T10:00:00Z'),
      new Date('2026-08-10T14:00:00Z'),
    ], 'ru')
    expect(result).not.toContain(',')
  })

  it('returns empty string for empty input', () => {
    expect(formatDayRanges([], 'ru')).toBe('')
  })
})

describe('formatTimeControlShort', () => {
  it('formats absolute time control', () => {
    const result = formatTimeControlShort({ type: 'absolute', mainTime: 40 }, t)
    expect(result).toContain('40')
    expect(result).toContain('Абсолютный')
  })

  it('formats fischer time control', () => {
    const result = formatTimeControlShort({ type: 'fischer', mainTime: 40, increment: 30 }, t)
    expect(result).toContain('40')
    expect(result).toContain('30')
    expect(result).toContain('Фишер')
  })

  it('formats byoyomi time control', () => {
    const result = formatTimeControlShort(
      { type: 'byoyomi', mainTime: 40, byoyomiTime: 30, byoyomiPeriods: 3 }, t,
    )
    expect(result).toContain('40')
    expect(result).toContain('30')
    expect(result).toContain('× 3')
    expect(result).toContain('Бёёми')
  })

  it('formats canadian time control', () => {
    const result = formatTimeControlShort(
      { type: 'canadian', mainTime: 60, canadianTime: 300, canadianMoves: 15 }, t,
    )
    expect(result).toContain('60')
    expect(result).toContain('300')
    expect(result).toContain('15')
    expect(result).toContain('Канадский')
  })

  it('formats delay time control', () => {
    const result = formatTimeControlShort({ type: 'delay', mainTime: 30, increment: 10 }, t)
    expect(result).toContain('Задержка')
  })

  it('formats bronstein time control', () => {
    const result = formatTimeControlShort({ type: 'bronstein', mainTime: 30, increment: 10 }, t)
    expect(result).toContain('Бронштейн')
  })
})

describe('sortTournamentsByStart', () => {
  it('sorts by start time ascending', () => {
    const t1 = makeT({
      id: '00000000-0000-7000-0000-000000000001',
      schedule: { rounds: [{ number: 1, scheduledAt: new Date('2026-08-12T10:00:00Z') }], events: [] },
    })
    const t2 = makeT({
      id: '00000000-0000-7000-0000-000000000002',
      schedule: { rounds: [{ number: 1, scheduledAt: new Date('2026-08-10T10:00:00Z') }], events: [] },
    })
    const sorted = sortTournamentsByStart([t1, t2])
    expect(sorted[0].id).toBe('00000000-0000-7000-0000-000000000002')
    expect(sorted[1].id).toBe('00000000-0000-7000-0000-000000000001')
  })

  it('is stable when start times are equal', () => {
    const t1 = makeT({
      id: '00000000-0000-7000-0000-000000000001',
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    })
    const t2 = makeT({
      id: '00000000-0000-7000-0000-000000000002',
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    })
    const sorted = sortTournamentsByStart([t1, t2])
    expect(sorted[0].id).toBe('00000000-0000-7000-0000-000000000001')
    expect(sorted[1].id).toBe('00000000-0000-7000-0000-000000000002')
  })

  it('does not mutate the original array', () => {
    const t1 = makeT({
      id: '00000000-0000-7000-0000-000000000002',
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    })
    const t2 = makeT({
      id: '00000000-0000-7000-0000-000000000001',
      updatedAt: new Date('2026-08-02T00:00:00Z'),
    })
    const original = [t1, t2]
    const sorted = sortTournamentsByStart(original)
    expect(original[0].id).toBe('00000000-0000-7000-0000-000000000002')
    // t1 (Aug 1) comes first in sorted order
    expect(sorted[0].id).toBe('00000000-0000-7000-0000-000000000002')
    expect(sorted[1].id).toBe('00000000-0000-7000-0000-000000000001')
  })
})
