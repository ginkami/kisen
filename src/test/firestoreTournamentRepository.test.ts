import {
  remapLegacyRounds,
  backfillScheduleLocalTime,
} from '../services/firestoreTournamentRepository.ts'

describe('remapLegacyRounds', () => {
  it('migrates a legacy document with currentRound and zero publishedRounds', () => {
    const doc = { slug: 't1', publishedRounds: 0, currentRound: 3, status: 'ongoing' }
    const result = remapLegacyRounds(doc) as Record<string, unknown>
    expect(result.publishedRounds).toBe(3)
    expect(result).not.toHaveProperty('currentRound')
    expect(result.slug).toBe('t1')
    expect(result.status).toBe('ongoing')
  })

  it('falls back to currentRound when publishedRounds is missing', () => {
    const result = remapLegacyRounds({ slug: 't2', currentRound: 5 })
    expect(result.publishedRounds).toBe(5)
    expect(result).not.toHaveProperty('currentRound')
  })

  it('keeps a non-zero publishedRounds over the legacy currentRound', () => {
    const result = remapLegacyRounds({ slug: 't3', publishedRounds: 2, currentRound: 3 })
    expect(result.publishedRounds).toBe(2)
    expect(result).not.toHaveProperty('currentRound')
  })

  it('leaves new documents without currentRound untouched', () => {
    const doc = { slug: 't4', publishedRounds: 2, status: 'upcoming' }
    expect(remapLegacyRounds(doc)).toBe(doc)
  })

  it('leaves documents without any rounds fields untouched', () => {
    const doc = { slug: 't5', status: 'draft' }
    expect(remapLegacyRounds(doc)).toBe(doc)
  })
})

describe('backfillScheduleLocalTime', () => {
  it('backfills location.timeZone from coordinates', async () => {
    const doc = {
      slug: 't1',
      location: { latitude: 35.6762, longitude: 139.6503, locales: {} },
    }
    const result = (await backfillScheduleLocalTime(doc)) as Record<string, unknown>
    const location = result.location as Record<string, unknown>
    expect(location.timeZone).toBe('Asia/Tokyo')
  })

  it('keeps an existing location.timeZone', async () => {
    const doc = {
      slug: 't2',
      location: {
        latitude: 35.6762,
        longitude: 139.6503,
        timeZone: 'Europe/Moscow',
        locales: {},
      },
    }
    const result = (await backfillScheduleLocalTime(doc)) as Record<string, unknown>
    const location = result.location as Record<string, unknown>
    expect(location.timeZone).toBe('Europe/Moscow')
  })

  it('backfills scheduledAtLocal by interpreting the instant in the location timezone', async () => {
    const doc = {
      slug: 't3',
      location: { timeZone: 'Asia/Tokyo', locales: {} },
      schedule: {
        rounds: [{ number: 1, scheduledAt: new Date('2026-07-18T06:30:00Z') }],
        events: [],
      },
    }
    const result = (await backfillScheduleLocalTime(doc)) as Record<string, unknown>
    const schedule = result.schedule as {
      rounds: Array<Record<string, unknown>>
    }
    expect(schedule.rounds[0].scheduledAtLocal).toEqual({
      year: 2026,
      month: 7,
      day: 18,
      hour: 15,
      minute: 30,
    })
    // The instant itself is never rewritten by the migration
    expect(schedule.rounds[0].scheduledAt).toEqual(new Date('2026-07-18T06:30:00Z'))
  })

  it('accepts Firestore Timestamp-like scheduledAt values', async () => {
    const doc = {
      slug: 't4',
      location: { timeZone: 'Europe/Moscow', locales: {} },
      schedule: {
        rounds: [
          {
            number: 1,
            scheduledAt: { toDate: () => new Date('2026-07-18T12:30:00Z') },
          },
        ],
        events: [],
      },
    }
    const result = (await backfillScheduleLocalTime(doc)) as Record<string, unknown>
    const schedule = result.schedule as {
      rounds: Array<Record<string, unknown>>
    }
    expect(schedule.rounds[0].scheduledAtLocal).toEqual({
      year: 2026,
      month: 7,
      day: 18,
      hour: 15,
      minute: 30,
    })
  })

  it('leaves fields unset when no timezone can be determined', async () => {
    const doc = {
      slug: 't5',
      location: { locales: {} },
      schedule: {
        rounds: [{ number: 1, scheduledAt: new Date('2026-07-18T06:30:00Z') }],
        events: [],
      },
    }
    const result = (await backfillScheduleLocalTime(doc)) as Record<string, unknown>
    const location = result.location as Record<string, unknown>
    expect(location.timeZone).toBeUndefined()
    const schedule = result.schedule as {
      rounds: Array<Record<string, unknown>>
    }
    expect(schedule.rounds[0].scheduledAtLocal).toBeUndefined()
  })

  it('does not overwrite an existing scheduledAtLocal', async () => {
    const doc = {
      slug: 't6',
      location: { timeZone: 'Asia/Tokyo', locales: {} },
      schedule: {
        rounds: [
          {
            number: 1,
            scheduledAt: new Date('2026-07-18T06:30:00Z'),
            scheduledAtLocal: {
              year: 2026,
              month: 7,
              day: 18,
              hour: 20,
              minute: 0,
            },
          },
        ],
        events: [],
      },
    }
    const result = (await backfillScheduleLocalTime(doc)) as Record<string, unknown>
    const schedule = result.schedule as {
      rounds: Array<Record<string, unknown>>
    }
    expect(schedule.rounds[0].scheduledAtLocal).toEqual({
      year: 2026,
      month: 7,
      day: 18,
      hour: 20,
      minute: 0,
    })
  })

  it('leaves documents without location untouched', async () => {
    const doc = { slug: 't7', schedule: { rounds: [], events: [] } }
    expect(await backfillScheduleLocalTime(doc)).toBe(doc)
  })
})
