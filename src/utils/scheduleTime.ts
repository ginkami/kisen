/**
 * Venue-local wall-clock date and time, as entered by the organizer.
 * This is the source of truth for schedule times; the `scheduledAt: Date`
 * instant stored alongside it is derived from it (see zonedWallClockToUtc).
 */
export interface LocalTime {
  year: number
  /** 1-12 */
  month: number
  /** 1-31 */
  day: number
  /** 0-23 */
  hour: number
  /** 0-59 */
  minute: number
}

/**
 * Offline lat/lng → IANA timezone lookup (@photostructure/tz-lookup, ~70 KB
 * of data) is loaded lazily via dynamic import so it stays out of the main
 * bundle: it is only needed on the write path (persistence) and in the
 * repository's one-time read migration, both async.
 */
type TzLookup = (latitude: number, longitude: number) => string

let tzLookupPromise: Promise<TzLookup | null> | null = null

function loadTzLookup(): Promise<TzLookup | null> {
  if (!tzLookupPromise) {
    tzLookupPromise = import('@photostructure/tz-lookup')
      .then((module) => module.default as TzLookup)
      .catch(() => null)
  }
  return tzLookupPromise
}

/**
 * Resolve the IANA timezone for coordinates using an offline lat/lng lookup.
 * Returns `null` when the coordinates are invalid or the lookup fails —
 * callers must treat `null` as "timezone unknown" and fall back to the
 * pre-existing display behavior.
 */
export async function resolveTimeZone(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return null
    }
    const tzLookup = await loadTzLookup()
    if (!tzLookup) return null
    return tzLookup(latitude, longitude)
  } catch {
    return null
  }
}

/**
 * The persisted IANA timezone of a tournament location, if any. Synchronous
 * and pure — display code uses it directly, while the coordinate-based
 * lookup happens asynchronously on the write path and in the repository's
 * read migration (which backfills `location.timeZone`).
 */
export function resolveLocationTimeZone(
  location:
    | {
        latitude?: number | null
        longitude?: number | null
        timeZone?: string | null
      }
    | null
    | undefined
): string | null {
  if (!location?.timeZone) return null
  return location.timeZone
}

/**
 * Offset (in minutes) of `timeZone` at the given instant, east of UTC.
 */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  )
  return (asUtc - instant.getTime()) / 60_000
}

/**
 * Interpret a venue-local wall-clock time in an IANA timezone and return the
 * corresponding UTC instant. Uses the two-pass Intl offset trick so DST
 * transitions are handled correctly.
 */
export function zonedWallClockToUtc(local: LocalTime, timeZone: string): Date {
  const naive = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute
  )
  let instant = new Date(naive)
  for (let pass = 0; pass < 2; pass++) {
    const offset = zoneOffsetMinutes(instant, timeZone)
    instant = new Date(naive - offset * 60_000)
  }
  return instant
}

/**
 * Convert a UTC instant into the wall-clock components of an IANA timezone.
 */
export function utcToZonedWallClock(date: Date, timeZone: string): LocalTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

/**
 * Format local time components as a `datetime-local` input value
 * ("yyyy-MM-ddTHH:mm"). Pure string building — no Date interpretation.
 */
export function localTimeToInputValue(local: LocalTime): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${local.year}-${pad(local.month)}-${pad(local.day)}T${pad(local.hour)}:${pad(local.minute)}`
}

/**
 * Parse a `datetime-local` input value into local wall-clock components.
 * Pure parser — never interprets the value in any timezone. Returns `null`
 * for malformed or out-of-range values.
 */
export function inputValueToLocalTime(value: string): LocalTime | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  if (hour > 23 || minute > 59) return null
  return { year, month, day, hour, minute }
}