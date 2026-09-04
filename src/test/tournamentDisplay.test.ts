import { describe, it, expect } from 'vitest'
import {
  tournamentStart,
  tournamentScheduleDays,
  formatDayRanges,
  formatTimeControlShort,
  sortTournamentsByStart,
  latestTournament,
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

const makeStubT =
  (
    units: { hour: string; minute: string; second: string; perMoves: string },
    suffixes: Record<string, string>
  ) =>
  (key: string, opts?: Record<string, unknown>): string => {
    const count = opts?.count as number | undefined
    const map: Record<string, string> = {
      'tournament.view.hourShort': units.hour,
      'tournament.view.minuteShort': units.minute,
      'tournament.view.secondShort': units.second,
      'tournament.view.perMoves': units.perMoves,
      'tournament.view.tcSuffix.fischer': suffixes.fischer,
      'tournament.view.tcSuffix.bronstein': suffixes.bronstein,
      'tournament.view.tcSuffix.delay': suffixes.delay,
      'tournament.view.tcSuffix.byoyomi': suffixes.byoyomi,
      'tournament.view.tcSuffix.canadian': suffixes.canadian,
    }
    return (map[key] ?? key).replace('{{count}}', String(count ?? ''))
  }

const tRu = makeStubT(
  { hour: '{{count}} ч', minute: '{{count}} мин', second: '{{count}} с', perMoves: 'ходов' },
  { fischer: 'Фишер', bronstein: 'Бронштейн', delay: 'задержка', byoyomi: 'бёёми', canadian: 'канадский' }
) as unknown as (key: string, opts?: Record<string, unknown>) => string

const tEn = makeStubT(
  { hour: '{{count}}h', minute: '{{count}}m', second: '{{count}}s', perMoves: 'moves' },
  { fischer: 'Fischer', bronstein: 'Bronstein', delay: 'Delay', byoyomi: 'Byoyomi', canadian: 'Canadian' }
) as unknown as (key: string, opts?: Record<string, unknown>) => string

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
  it('formats a single day with genitive month in ru', () => {
    const result = formatDayRanges([new Date('2026-08-10T00:00:00Z')], 'ru')
    expect(result).toBe('10 августа 2026')
  })

  it('formats consecutive days with en-dash', () => {
    const result = formatDayRanges([
      new Date('2026-08-10T00:00:00Z'),
      new Date('2026-08-11T00:00:00Z'),
    ], 'ru')
    expect(result).toBe('10–11 августа 2026')
  })

  it('formats days with gaps comma-separated', () => {
    const result = formatDayRanges([
      new Date('2026-08-10T00:00:00Z'),
      new Date('2026-08-12T00:00:00Z'),
      new Date('2026-08-25T00:00:00Z'),
    ], 'ru')
    expect(result).toBe('10, 12, 25 августа 2026')
  })

  it('formats month change with genitive month names in ru', () => {
    const result = formatDayRanges([
      new Date('2026-08-10T00:00:00Z'),
      new Date('2026-08-12T00:00:00Z'),
      new Date('2026-09-03T00:00:00Z'),
    ], 'ru')
    expect(result).toBe('10, 12 августа, 3 сентября 2026')
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
    expect(result).toBe('25 августа – 5 сентября 2026')
  })

  it('formats single day in en unchanged', () => {
    const result = formatDayRanges([new Date('2026-08-10T00:00:00Z')], 'en')
    expect(result).toBe('10 August 2026')
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
  it('formats absolute time control without type suffix (ru)', () => {
    const result = formatTimeControlShort({ type: 'absolute', mainTime: 40 }, tRu)
    expect(result).toBe('40 мин')
  })

  it('formats fischer time control (ru)', () => {
    const result = formatTimeControlShort({ type: 'fischer', mainTime: 40, increment: 30 }, tRu)
    expect(result).toBe('40 мин + 30 с (Фишер)')
  })

  it('decomposes main time into hours and minutes (ru)', () => {
    const result = formatTimeControlShort({ type: 'fischer', mainTime: 90, increment: 60 }, tRu)
    expect(result).toBe('1 ч 30 мин + 60 с (Фишер)')
  })

  it('formats exact hours without minutes (ru)', () => {
    const result = formatTimeControlShort({ type: 'fischer', mainTime: 120, increment: 0 }, tRu)
    expect(result).toBe('2 ч + 0 с (Фишер)')
  })

  it('formats byoyomi time control with periods (ru)', () => {
    const result = formatTimeControlShort(
      { type: 'byoyomi', mainTime: 40, byoyomiTime: 30, byoyomiPeriods: 3 }, tRu,
    )
    expect(result).toBe('40 мин + 30 с × 3 (бёёми)')
  })

  it('omits × 1 for a single byoyomi period (ru)', () => {
    const result = formatTimeControlShort(
      { type: 'byoyomi', mainTime: 40, byoyomiTime: 30, byoyomiPeriods: 1 }, tRu,
    )
    expect(result).toBe('40 мин + 30 с (бёёми)')
  })

  it('formats canadian time control (ru)', () => {
    const result = formatTimeControlShort(
      { type: 'canadian', mainTime: 60, canadianTime: 300, canadianMoves: 15 }, tRu,
    )
    expect(result).toBe('1 ч + 300 с / 15 ходов (канадский)')
  })

  it('formats delay time control (ru)', () => {
    const result = formatTimeControlShort({ type: 'delay', mainTime: 30, increment: 10 }, tRu)
    expect(result).toBe('30 мин + 10 с (задержка)')
  })

  it('formats bronstein time control (ru)', () => {
    const result = formatTimeControlShort({ type: 'bronstein', mainTime: 30, increment: 10 }, tRu)
    expect(result).toBe('30 мин + 10 с (Бронштейн)')
  })

  it('formats english units without space between value and unit (en)', () => {
    expect(formatTimeControlShort({ type: 'absolute', mainTime: 40 }, tEn)).toBe('40m')
    expect(formatTimeControlShort({ type: 'fischer', mainTime: 90, increment: 60 }, tEn)).toBe(
      '1h 30m + 60s (Fischer)',
    )
    expect(formatTimeControlShort({ type: 'byoyomi', mainTime: 40, byoyomiTime: 30, byoyomiPeriods: 1 }, tEn)).toBe(
      '40m + 30s (Byoyomi)',
    )
    expect(
      formatTimeControlShort({ type: 'canadian', mainTime: 60, canadianTime: 300, canadianMoves: 15 }, tEn),
    ).toBe('1h + 300s / 15 moves (Canadian)')
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

describe('latestTournament', () => {
  it('returns null for an empty list', () => {
    expect(latestTournament([])).toBeNull()
  })

  it('returns the single tournament', () => {
    const t1 = makeT({
      schedule: { rounds: [{ number: 1, scheduledAt: new Date('2026-08-10T10:00:00Z') }], events: [] },
    })
    expect(latestTournament([t1])?.id).toBe(t1.id)
  })

  it('returns the tournament with the greatest start time', () => {
    const t1 = makeT({
      id: '00000000-0000-7000-0000-000000000001',
      schedule: { rounds: [{ number: 1, scheduledAt: new Date('2026-08-10T10:00:00Z') }], events: [] },
    })
    const t2 = makeT({
      id: '00000000-0000-7000-0000-000000000002',
      schedule: { rounds: [{ number: 1, scheduledAt: new Date('2026-08-12T10:00:00Z') }], events: [] },
    })
    expect(latestTournament([t1, t2])?.id).toBe('00000000-0000-7000-0000-000000000002')
    expect(latestTournament([t2, t1])?.id).toBe('00000000-0000-7000-0000-000000000002')
  })

  it('tie-breaks by id when start times are equal', () => {
    const t1 = makeT({
      id: '00000000-0000-7000-0000-000000000001',
      schedule: { rounds: [{ number: 1, scheduledAt: new Date('2026-08-10T10:00:00Z') }], events: [] },
    })
    const t2 = makeT({
      id: '00000000-0000-7000-0000-000000000002',
      schedule: { rounds: [{ number: 1, scheduledAt: new Date('2026-08-10T10:00:00Z') }], events: [] },
    })
    expect(latestTournament([t1, t2])?.id).toBe('00000000-0000-7000-0000-000000000002')
  })
})

describe('tournamentScheduleDays with venue timezone', () => {
  it('groups days in the location timezone (Tokyo)', () => {
    // 2026-07-17 15:00 UTC = 2026-07-18 00:00 Tokyo: the venue-local day is
    // July 18 while the UTC day is still July 17.
    const t = makeT({
      location: { locales: { ru: {}, en: {} }, timeZone: 'Asia/Tokyo' },
      schedule: {
        events: [
          { scheduledAt: new Date('2026-07-17T15:00:00Z'), locales: { ru: { title: 'X' } } },
        ],
        rounds: [],
      },
    })

    const days = tournamentScheduleDays(t, 'Asia/Tokyo')
    expect(days).toHaveLength(1)
    expect(days[0].getUTCMonth()).toBe(6)
    expect(days[0].getUTCDate()).toBe(18)

    // Without a timezone the legacy UTC-based grouping keeps July 17
    const utcDays = tournamentScheduleDays(t)
    expect(utcDays).toHaveLength(1)
    expect(utcDays[0].getUTCDate()).toBe(17)
  })
})