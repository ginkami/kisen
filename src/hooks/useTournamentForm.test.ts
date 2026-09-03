vi.mock('../services/firebaseConfig.ts', () => ({
  app: {},
  auth: {},
  db: {},
}))

vi.mock('../services/firestoreTournamentRepository.ts', () => ({
  firestoreTournamentRepository: {},
}))

// AuthContext (imported transitively) pulls in userService, which calls
// collection(db, 'users') at module scope — stub it out for these pure tests.
vi.mock('../services/userService.ts', () => ({
  createUser: vi.fn(),
  getUserById: vi.fn(),
}))

import {
  mergeSchedule,
  splitSchedule,
  sortAndRenumber,
  type ScheduleRow,
} from './useTournamentForm.ts'

describe('mergeSchedule', () => {
  it('merges events and rounds into a single sorted array', () => {
    const events = [
      {
        scheduledAt: new Date('2025-07-01T10:00:00Z'),
        locales: { ru: { title: 'Открытие' }, en: { title: 'Opening' } },
      },
    ]
    const rounds = [
      { number: 1, scheduledAt: new Date('2025-07-01T12:00:00Z') },
      { number: 2, scheduledAt: new Date('2025-07-01T14:00:00Z') },
    ]

    const rows = mergeSchedule(events, rounds)

    expect(rows).toHaveLength(3)
    expect(rows[0].kind).toBe('event')
    expect(rows[1].kind).toBe('round')
    expect(rows[2].kind).toBe('round')
  })

  it('handles empty events and rounds', () => {
    const rows = mergeSchedule([], [])
    expect(rows).toHaveLength(0)
  })

  it('derives scheduledAtLocal from the instant in the given timezone', () => {
    const rounds = [
      { number: 1, scheduledAt: new Date('2026-07-18T06:30:00Z') },
    ]

    const rows = mergeSchedule([], rounds, 'Asia/Tokyo')

    expect(rows[0].scheduledAtLocal).toEqual({
      year: 2026,
      month: 7,
      day: 18,
      hour: 15,
      minute: 30,
    })
  })

  it('prefers the stored scheduledAtLocal over the instant derivation', () => {
    const rounds = [
      {
        number: 1,
        scheduledAt: new Date('2026-07-18T06:30:00Z'),
        scheduledAtLocal: { year: 2026, month: 7, day: 18, hour: 20, minute: 0 },
      },
    ]

    const rows = mergeSchedule([], rounds, 'Asia/Tokyo')

    expect(rows[0].scheduledAtLocal).toEqual({
      year: 2026,
      month: 7,
      day: 18,
      hour: 20,
      minute: 0,
    })
  })

  it('leaves scheduledAtLocal null without a timezone', () => {
    const rounds = [
      { number: 1, scheduledAt: new Date('2026-07-18T06:30:00Z') },
    ]

    const rows = mergeSchedule([], rounds)

    expect(rows[0].scheduledAtLocal).toBeNull()
  })
})

describe('splitSchedule', () => {
  it('splits ScheduleRow[] back into events and rounds', () => {
    const rows: ScheduleRow[] = [
      {
        kind: 'event',
        id: '1',
        scheduledAt: new Date('2025-07-01T10:00:00Z'),
scheduledAtLocal: null,
        locales: { ru: { title: 'Открытие' }, en: { title: 'Opening' } },
      },
      {
        kind: 'round',
        id: '2',
        scheduledAt: new Date('2025-07-01T12:00:00Z'),
scheduledAtLocal: null,
        number: 1,
      },
    ]

    const schedule = splitSchedule(rows)

    expect(schedule.events).toHaveLength(1)
    expect(schedule.events[0].locales.ru.title).toBe('Открытие')
    expect(schedule.rounds).toHaveLength(1)
    expect(schedule.rounds[0].number).toBe(1)
  })

  it('filters out rows with no scheduledAt', () => {
    const rows: ScheduleRow[] = [
      {
        kind: 'event',
        id: '1',
        scheduledAt: null,
scheduledAtLocal: null,
        locales: { ru: { title: 'Test' }, en: { title: 'Test' } },
      },
      {
        kind: 'round',
        id: '2',
        scheduledAt: new Date('2025-07-01T12:00:00Z'),
scheduledAtLocal: null,
        number: 1,
      },
    ]

    const schedule = splitSchedule(rows)

    expect(schedule.events).toHaveLength(0)
    expect(schedule.rounds).toHaveLength(1)
  })

  it('filters out events with no title in any locale', () => {
    const rows: ScheduleRow[] = [
      {
        kind: 'event',
        id: '1',
        scheduledAt: new Date('2025-07-01T10:00:00Z'),
scheduledAtLocal: null,
        locales: { ru: { title: '' }, en: { title: '' } },
      },
      {
        kind: 'event',
        id: '2',
        scheduledAt: new Date('2025-07-01T11:00:00Z'),
scheduledAtLocal: null,
        locales: { ru: { title: 'Тест' }, en: { title: '' } },
      },
    ]

    const schedule = splitSchedule(rows)

    expect(schedule.events).toHaveLength(1)
    expect(schedule.events[0].locales.ru.title).toBe('Тест')
    expect(schedule.events[0].locales.en).toBeUndefined()
  })

  it('recomputes the instant from scheduledAtLocal in the location timezone', () => {
    const rows: ScheduleRow[] = [
      {
        kind: 'round',
        id: '1',
        scheduledAt: new Date('2026-07-18T06:30:00Z'),
        scheduledAtLocal: { year: 2026, month: 7, day: 18, hour: 15, minute: 30 },
        number: 1,
      },
    ]

    const schedule = splitSchedule(rows, 'Asia/Tokyo')

    expect(schedule.rounds[0].scheduledAt.toISOString()).toBe(
      '2026-07-18T06:30:00.000Z'
    )
    expect(schedule.rounds[0].scheduledAtLocal).toEqual({
      year: 2026,
      month: 7,
      day: 18,
      hour: 15,
      minute: 30,
    })
  })

  it('shifts instants when the location timezone changes, keeping local times', () => {
    const rows: ScheduleRow[] = [
      {
        kind: 'round',
        id: '1',
        scheduledAt: new Date('2026-07-18T12:30:00Z'),
        scheduledAtLocal: { year: 2026, month: 7, day: 18, hour: 15, minute: 30 },
        number: 1,
      },
    ]

    const moscow = splitSchedule(rows, 'Europe/Moscow')
    expect(moscow.rounds[0].scheduledAt.toISOString()).toBe(
      '2026-07-18T12:30:00.000Z'
    )

    const tokyo = splitSchedule(rows, 'Asia/Tokyo')
    expect(tokyo.rounds[0].scheduledAt.toISOString()).toBe(
      '2026-07-18T06:30:00.000Z'
    )
    expect(tokyo.rounds[0].scheduledAtLocal).toEqual({
      year: 2026,
      month: 7,
      day: 18,
      hour: 15,
      minute: 30,
    })
  })

  it('preserves the existing instant without a timezone', () => {
    const rows: ScheduleRow[] = [
      {
        kind: 'round',
        id: '1',
        scheduledAt: new Date('2026-07-18T06:30:00Z'),
        scheduledAtLocal: { year: 2026, month: 7, day: 18, hour: 15, minute: 30 },
        number: 1,
      },
    ]

    const schedule = splitSchedule(rows)

    expect(schedule.rounds[0].scheduledAt).toEqual(new Date('2026-07-18T06:30:00Z'))
  })
})

describe('sortAndRenumber', () => {
  it('sorts rows chronologically by scheduledAt', () => {
    const rows: ScheduleRow[] = [
      {
        kind: 'round',
        id: '1',
        scheduledAt: new Date('2025-07-01T14:00:00Z'),
scheduledAtLocal: null,
        number: 2,
      },
      {
        kind: 'event',
        id: '2',
        scheduledAt: new Date('2025-07-01T10:00:00Z'),
scheduledAtLocal: null,
        locales: { ru: { title: 'Opening' }, en: { title: 'Opening' } },
      },
      {
        kind: 'round',
        id: '3',
        scheduledAt: new Date('2025-07-01T12:00:00Z'),
scheduledAtLocal: null,
        number: 1,
      },
    ]

    const sorted = sortAndRenumber(rows)

    expect(sorted[0].id).toBe('2')
    expect(sorted[1].id).toBe('3')
    expect(sorted[2].id).toBe('1')
  })

  it('renumbers round rows sequentially after sorting', () => {
    const rows: ScheduleRow[] = [
      {
        kind: 'round',
        id: '1',
        scheduledAt: new Date('2025-07-01T14:00:00Z'),
scheduledAtLocal: null,
        number: 5,
      },
      {
        kind: 'round',
        id: '2',
        scheduledAt: new Date('2025-07-01T12:00:00Z'),
scheduledAtLocal: null,
        number: 3,
      },
      {
        kind: 'round',
        id: '3',
        scheduledAt: new Date('2025-07-01T10:00:00Z'),
scheduledAtLocal: null,
        number: 1,
      },
    ]

    const sorted = sortAndRenumber(rows)

    expect(sorted[0].kind).toBe('round')
    expect((sorted[0] as { number: number }).number).toBe(1)
    expect((sorted[1] as { number: number }).number).toBe(2)
    expect((sorted[2] as { number: number }).number).toBe(3)
  })

  it('handles rows with null scheduledAt (placed at start)', () => {
    const rows: ScheduleRow[] = [
      {
        kind: 'round',
        id: '1',
        scheduledAt: new Date('2025-07-01T12:00:00Z'),
scheduledAtLocal: null,
        number: 1,
      },
      {
        kind: 'event',
        id: '2',
        scheduledAt: null,
scheduledAtLocal: null,
        locales: { ru: { title: '' }, en: { title: '' } },
      },
    ]

    const sorted = sortAndRenumber(rows)

    expect(sorted[0].id).toBe('2')
    expect(sorted[1].id).toBe('1')
  })
})
