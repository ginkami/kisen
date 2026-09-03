import { describe, it, expect } from 'vitest'
import {
  resolveTimeZone,
  resolveLocationTimeZone,
  zonedWallClockToUtc,
  utcToZonedWallClock,
  localTimeToInputValue,
  inputValueToLocalTime,
  type LocalTime,
} from '../utils/scheduleTime.ts'

describe('zonedWallClockToUtc', () => {
  it('converts Europe/Moscow wall clock with its fixed offset (+3)', () => {
    const utc = zonedWallClockToUtc(
      { year: 2026, month: 7, day: 18, hour: 15, minute: 30 },
      'Europe/Moscow'
    )
    expect(utc.toISOString()).toBe('2026-07-18T12:30:00.000Z')
  })

  it('converts Europe/Berlin summer time (CEST, +2)', () => {
    const utc = zonedWallClockToUtc(
      { year: 2026, month: 7, day: 18, hour: 15, minute: 30 },
      'Europe/Berlin'
    )
    expect(utc.toISOString()).toBe('2026-07-18T13:30:00.000Z')
  })

  it('converts Europe/Berlin winter time (CET, +1)', () => {
    const utc = zonedWallClockToUtc(
      { year: 2026, month: 1, day: 15, hour: 15, minute: 30 },
      'Europe/Berlin'
    )
    expect(utc.toISOString()).toBe('2026-01-15T14:30:00.000Z')
  })

  it('converts Asia/Tokyo wall clock (+9, no DST)', () => {
    const utc = zonedWallClockToUtc(
      { year: 2026, month: 7, day: 18, hour: 15, minute: 30 },
      'Asia/Tokyo'
    )
    expect(utc.toISOString()).toBe('2026-07-18T06:30:00.000Z')
  })

  it('treats UTC as a plain passthrough', () => {
    const utc = zonedWallClockToUtc(
      { year: 2026, month: 12, day: 31, hour: 23, minute: 59 },
      'UTC'
    )
    expect(utc.toISOString()).toBe('2026-12-31T23:59:00.000Z')
  })
})

describe('utcToZonedWallClock', () => {
  it('converts a UTC instant into Moscow wall clock', () => {
    const local = utcToZonedWallClock(
      new Date('2026-07-18T12:30:00Z'),
      'Europe/Moscow'
    )
    expect(local).toEqual({ year: 2026, month: 7, day: 18, hour: 15, minute: 30 })
  })

  it('roundtrips UTC wall clock', () => {
    const local: LocalTime = { year: 2026, month: 7, day: 18, hour: 12, minute: 0 }
    const utc = zonedWallClockToUtc(local, 'UTC')
    expect(utcToZonedWallClock(utc, 'UTC')).toEqual(local)
  })

  it('roundtrips Tokyo wall clock', () => {
    const local: LocalTime = { year: 2026, month: 7, day: 18, hour: 15, minute: 30 }
    const utc = zonedWallClockToUtc(local, 'Asia/Tokyo')
    expect(utcToZonedWallClock(utc, 'Asia/Tokyo')).toEqual(local)
  })
})

describe('resolveTimeZone', () => {
  it('resolves Tokyo coordinates', async () => {
    expect(await resolveTimeZone(35.6762, 139.6503)).toBe('Asia/Tokyo')
  })

  it('resolves Moscow coordinates', async () => {
    expect(await resolveTimeZone(55.7558, 37.6173)).toBe('Europe/Moscow')
  })

  it('maps coordinates in open ocean to the nearest zone', async () => {
    // tz-lookup never fails on valid coordinates — ocean areas resolve to
    // the closest land/UTC-offset zone rather than null.
    expect(await resolveTimeZone(0, -160)).toBe('Pacific/Kiritimati')
  })

  it('returns null for invalid coordinates', async () => {
    expect(await resolveTimeZone(Number.NaN, 0)).toBeNull()
    expect(await resolveTimeZone(95, 0)).toBeNull()
    expect(await resolveTimeZone(0, 200)).toBeNull()
  })
})

describe('resolveLocationTimeZone', () => {
  it('returns the persisted timezone', () => {
    expect(
      resolveLocationTimeZone({
        latitude: 35.6762,
        longitude: 139.6503,
        timeZone: 'Europe/Moscow',
      })
    ).toBe('Europe/Moscow')
  })

  it('returns null without a persisted timezone (coordinate lookup is async, on the write path)', () => {
    expect(resolveLocationTimeZone({ latitude: 35.6762, longitude: 139.6503 })).toBeNull()
  })

  it('returns null without timezone and coordinates', () => {
    expect(resolveLocationTimeZone({})).toBeNull()
    expect(resolveLocationTimeZone(null)).toBeNull()
    expect(resolveLocationTimeZone({ latitude: null, longitude: null })).toBeNull()
  })
})

describe('datetime-local input helpers', () => {
  it('formats local components as an input value', () => {
    expect(
      localTimeToInputValue({ year: 2026, month: 7, day: 18, hour: 9, minute: 5 })
    ).toBe('2026-07-18T09:05')
  })

  it('parses an input value without timezone interpretation', () => {
    expect(inputValueToLocalTime('2026-07-18T15:30')).toEqual({
      year: 2026,
      month: 7,
      day: 18,
      hour: 15,
      minute: 30,
    })
  })

  it('rejects malformed and out-of-range values', () => {
    expect(inputValueToLocalTime('')).toBeNull()
    expect(inputValueToLocalTime('2026-07-18')).toBeNull()
    expect(inputValueToLocalTime('2026-13-18T15:30')).toBeNull()
    expect(inputValueToLocalTime('2026-07-32T15:30')).toBeNull()
    expect(inputValueToLocalTime('2026-07-18T24:30')).toBeNull()
    expect(inputValueToLocalTime('2026-07-18T15:60')).toBeNull()
  })
})