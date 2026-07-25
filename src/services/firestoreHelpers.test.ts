vi.mock('firebase/firestore', () => {
  class MockTimestamp {
    seconds: number
    nanoseconds: number

    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds
      this.nanoseconds = nanoseconds
    }

    static fromDate(date: Date): MockTimestamp {
      const ms = date.getTime()
      return new MockTimestamp(
        Math.floor(ms / 1000),
        (ms % 1000) * 1_000_000
      )
    }

    toDate(): Date {
      return new Date(
        this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000)
      )
    }
  }

  return {
    Timestamp: MockTimestamp,
  }
})

import { Timestamp } from 'firebase/firestore'
import {
  isTimestampLike,
  timestampToDate,
  timestampsToDates,
  datesToTimestamps,
  removeUndefined,
} from './firestoreHelpers.ts'

describe('isTimestampLike', () => {
  it('returns true for a real Timestamp instance', () => {
    const ts = Timestamp.fromDate(new Date('2025-01-01T00:00:00Z'))
    expect(isTimestampLike(ts)).toBe(true)
  })

  it('returns true for an object with toDate method (duck-typing)', () => {
    const obj = { toDate: () => new Date() }
    expect(isTimestampLike(obj)).toBe(true)
  })

  it('returns true for a plain { seconds, nanoseconds } object', () => {
    const obj = { seconds: 1735689600, nanoseconds: 0 }
    expect(isTimestampLike(obj)).toBe(true)
  })

  it('returns false for a Date', () => {
    expect(isTimestampLike(new Date())).toBe(false)
  })

  it('returns false for a string', () => {
    expect(isTimestampLike('2025-01-01')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isTimestampLike(null)).toBe(false)
  })

  it('returns false for a number', () => {
    expect(isTimestampLike(123)).toBe(false)
  })

  it('returns false for an object with seconds but no nanoseconds', () => {
    expect(isTimestampLike({ seconds: 123 })).toBe(false)
  })

  it('returns false for an object with nanoseconds but no seconds', () => {
    expect(isTimestampLike({ nanoseconds: 456 })).toBe(false)
  })
})

describe('timestampToDate', () => {
  it('converts a real Timestamp instance to Date', () => {
    const date = new Date('2025-01-01T12:00:00Z')
    const ts = Timestamp.fromDate(date)
    const result = timestampToDate(ts)
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBe(date.getTime())
  })

  it('converts an object with toDate method to Date', () => {
    const expected = new Date('2025-06-15T10:00:00Z')
    const obj = { toDate: () => expected }
    expect(timestampToDate(obj)).toBe(expected)
  })

  it('converts a plain { seconds, nanoseconds } to Date', () => {
    const obj = { seconds: 1735689600, nanoseconds: 0 }
    const result = timestampToDate(obj)
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBe(1735689600_000)
  })

  it('converts a plain { seconds, nanoseconds } with non-zero nanoseconds', () => {
    const obj = { seconds: 1735689600, nanoseconds: 500_000_000 }
    const result = timestampToDate(obj)
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBe(1735689600_500)
  })
})

describe('timestampsToDates', () => {
  it('converts a single Timestamp to Date', () => {
    const date = new Date('2025-01-01T00:00:00Z')
    const ts = Timestamp.fromDate(date)
    const result = timestampsToDates(ts)
    expect(result).toBeInstanceOf(Date)
    expect((result as Date).getTime()).toBe(date.getTime())
  })

  it('converts Timestamps nested in an object', () => {
    const date = new Date('2025-03-15T10:00:00Z')
    const ts = Timestamp.fromDate(date)
    const input = {
      name: 'test',
      updatedAt: ts,
      nested: {
        createdAt: ts,
      },
    }
    const result = timestampsToDates(input) as Record<string, unknown>
    expect(result.name).toBe('test')
    expect(result.updatedAt).toBeInstanceOf(Date)
    expect((result.updatedAt as Date).getTime()).toBe(date.getTime())
    expect((result.nested as Record<string, unknown>).createdAt).toBeInstanceOf(
      Date
    )
  })

  it('converts Timestamps in arrays', () => {
    const date1 = new Date('2025-01-01T00:00:00Z')
    const date2 = new Date('2025-06-01T00:00:00Z')
    const input = [
      { scheduledAt: Timestamp.fromDate(date1) },
      { scheduledAt: Timestamp.fromDate(date2) },
    ]
    const result = timestampsToDates(input) as Record<string, unknown>[]
    expect(result[0].scheduledAt).toBeInstanceOf(Date)
    expect((result[0].scheduledAt as Date).getTime()).toBe(date1.getTime())
    expect(result[1].scheduledAt).toBeInstanceOf(Date)
    expect((result[1].scheduledAt as Date).getTime()).toBe(date2.getTime())
  })

  it('leaves Date instances unchanged', () => {
    const date = new Date('2025-01-01T00:00:00Z')
    const result = timestampsToDates(date)
    expect(result).toBe(date)
  })

  it('leaves primitives unchanged', () => {
    expect(timestampsToDates('hello')).toBe('hello')
    expect(timestampsToDates(42)).toBe(42)
    expect(timestampsToDates(true)).toBe(true)
    expect(timestampsToDates(null)).toBe(null)
    expect(timestampsToDates(undefined)).toBe(undefined)
  })

  it('converts plain { seconds, nanoseconds } objects without toDate', () => {
    const input = {
      schedule: {
        rounds: [
          { number: 1, scheduledAt: { seconds: 1735689600, nanoseconds: 0 } },
          { number: 2, scheduledAt: { seconds: 1735776000, nanoseconds: 0 } },
        ],
      },
    }
    const result = timestampsToDates(input) as Record<string, unknown>
    const schedule = result.schedule as Record<string, unknown>
    const rounds = schedule.rounds as Record<string, unknown>[]
    expect(rounds[0].scheduledAt).toBeInstanceOf(Date)
    expect((rounds[0].scheduledAt as Date).getTime()).toBe(1735689600_000)
    expect(rounds[1].scheduledAt).toBeInstanceOf(Date)
    expect((rounds[1].scheduledAt as Date).getTime()).toBe(1735776000_000)
  })

  it('handles a complex tournament-like structure with mixed Timestamp types', () => {
    const realDate = new Date('2025-01-01T00:00:00Z')
    const input = {
      id: 'tournament-1',
      updatedAt: Timestamp.fromDate(realDate),
      schedule: {
        events: [
          {
            scheduledAt: { seconds: 1735689600, nanoseconds: 0 },
            locales: { ru: { title: 'Открытие' } },
          },
        ],
        rounds: [
          {
            number: 1,
            scheduledAt: { toDate: () => new Date(1735689600_000) },
          },
        ],
      },
      participants: [],
    }
    const result = timestampsToDates(input) as Record<string, unknown>
    expect(result.id).toBe('tournament-1')
    expect(result.updatedAt).toBeInstanceOf(Date)

    const schedule = result.schedule as Record<string, unknown>
    const events = schedule.events as Record<string, unknown>[]
    expect(events[0].scheduledAt).toBeInstanceOf(Date)

    const rounds = schedule.rounds as Record<string, unknown>[]
    expect(rounds[0].scheduledAt).toBeInstanceOf(Date)
  })
})

describe('datesToTimestamps', () => {
  it('converts a Date to Timestamp', () => {
    const date = new Date('2025-01-01T00:00:00Z')
    const result = datesToTimestamps(date) as Timestamp
    expect(result).toBeInstanceOf(Timestamp)
    expect(result.toDate().getTime()).toBe(date.getTime())
  })

  it('converts Dates nested in an object', () => {
    const date = new Date('2025-01-01T00:00:00Z')
    const input = { name: 'test', updatedAt: date }
    const result = datesToTimestamps(input) as Record<string, unknown>
    expect(result.name).toBe('test')
    expect(result.updatedAt).toBeInstanceOf(Timestamp)
  })

  it('leaves primitives unchanged', () => {
    expect(datesToTimestamps('hello')).toBe('hello')
    expect(datesToTimestamps(42)).toBe(42)
    expect(datesToTimestamps(null)).toBe(null)
  })
})

describe('removeUndefined', () => {
  it('removes undefined values from objects', () => {
    const input = { a: 1, b: undefined, c: 'hello' }
    const result = removeUndefined(input) as Record<string, unknown>
    expect(result).toEqual({ a: 1, c: 'hello' })
    expect('b' in result).toBe(false)
  })

  it('removes undefined values from arrays', () => {
    const input = [1, undefined, 2, undefined, 3]
    const result = removeUndefined(input)
    expect(result).toEqual([1, 2, 3])
  })

  it('handles nested objects', () => {
    const input = { a: { b: 1, c: undefined }, d: undefined }
    const result = removeUndefined(input) as Record<string, unknown>
    expect(result).toEqual({ a: { b: 1 } })
  })

  it('leaves non-undefined primitives unchanged', () => {
    expect(removeUndefined(null)).toBe(null)
    expect(removeUndefined(0)).toBe(0)
    expect(removeUndefined('')).toBe('')
  })
})