export function dateToLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function localDatetimeInputValueToUtcDate(value: string): Date {
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) {
    throw new Error(`Invalid datetime-local value: ${value}`)
  }
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}

export function formatDateTimeShort(
  date: Date,
  locale: string | string[] = 'ru-RU',
  timeZone?: string | null
): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(date)
}

export interface ScheduleDateTimeParts {
  /** Venue-local "hh:mm" (24-hour clock). */
  localTime: string
  /** Venue-local abbreviated weekday + date, e.g. «сб, 18.07.2026» / «Sat, 18.07.2026». */
  localWeekdayDate: string
  /** UTC time "hh:mm" (24-hour clock). */
  utcTime: string
  /** UTC "dd.MM" date, present only when the UTC calendar day differs from the venue-local day. */
  utcDateSuffix: string | null
}

/**
 * Format a schedule instant for the venue-local display: the local wall-clock
 * time (24h), a smaller weekday/date line, and the UTC time with the UTC date
 * inserted when the UTC calendar day differs from the local day.
 */
export function formatScheduleDateTime(
  date: Date,
  locale: string,
  timeZone: string
): ScheduleDateTimeParts {
  const localParts = new Intl.DateTimeFormat(locale, {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)
  const get = (type: string) =>
    localParts.find((part) => part.type === type)?.value ?? ''

  const utcParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)
  const getUtc = (type: string) =>
    utcParts.find((part) => part.type === type)?.value ?? ''

  const dayDiffers =
    get('year') !== getUtc('year') ||
    get('month') !== getUtc('month') ||
    get('day') !== getUtc('day')

  return {
    localTime: `${get('hour')}:${get('minute')}`,
    localWeekdayDate: `${get('weekday')}, ${get('day')}.${get('month')}.${get('year')}`,
    utcTime: `${getUtc('hour')}:${getUtc('minute')}`,
    utcDateSuffix: dayDiffers ? `${getUtc('day')}.${getUtc('month')}` : null,
  }
}
