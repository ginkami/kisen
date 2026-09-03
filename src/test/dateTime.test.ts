import { describe, it, expect } from 'vitest'
import { formatScheduleDateTime, formatDateTimeShort } from '../utils/dateTime.ts'

describe('formatScheduleDateTime', () => {
  // 2026-07-18 12:30 UTC = 15:30 Moscow (Saturday)
  const moscowInstant = new Date('2026-07-18T12:30:00Z')

  it('formats venue-local time, weekday/date and UTC time (ru)', () => {
    const parts = formatScheduleDateTime(moscowInstant, 'ru', 'Europe/Moscow')
    expect(parts.localTime).toBe('15:30')
    expect(parts.localWeekdayDate).toBe('сб, 18.07.2026')
    expect(parts.utcTime).toBe('12:30')
    expect(parts.utcDateSuffix).toBeNull()
  })

  it('formats a localized weekday in en', () => {
    const parts = formatScheduleDateTime(moscowInstant, 'en', 'Europe/Moscow')
    expect(parts.localWeekdayDate).toBe('Sat, 18.07.2026')
  })

  it('omits the UTC date when the UTC day matches the local day (Tokyo)', () => {
    // 15:30 Tokyo = 06:30 UTC, same calendar day
    const parts = formatScheduleDateTime(
      new Date('2026-07-18T06:30:00Z'),
      'ru',
      'Asia/Tokyo'
    )
    expect(parts.localTime).toBe('15:30')
    expect(parts.utcTime).toBe('06:30')
    expect(parts.utcDateSuffix).toBeNull()
  })

  it('inserts the UTC date when the UTC day differs (Moscow after midnight)', () => {
    // 02:30 Moscow on July 18 = 23:30 UTC on July 17
    const parts = formatScheduleDateTime(
      new Date('2026-07-17T23:30:00Z'),
      'ru',
      'Europe/Moscow'
    )
    expect(parts.localTime).toBe('02:30')
    expect(parts.utcTime).toBe('23:30')
    expect(parts.utcDateSuffix).toBe('17.07')
  })
})

describe('formatDateTimeShort with timezone', () => {
  it('formats the instant in the given timezone', () => {
    const formatted = formatDateTimeShort(
      new Date('2026-07-18T12:30:00Z'),
      'ru',
      'Europe/Moscow'
    )
    expect(formatted).toContain('15:30')
  })

  it('falls back to the runtime timezone without one', () => {
    const formatted = formatDateTimeShort(new Date('2026-07-18T12:30:00Z'), 'ru')
    expect(typeof formatted).toBe('string')
    expect(formatted.length).toBeGreaterThan(0)
  })
})