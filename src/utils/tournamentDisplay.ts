import type { Tournament } from '../domain/tournament.ts'
import type { TimeControl } from '../domain/timeControl.ts'

/**
 * Resolve the "start time" of a tournament:
 * 1. scheduledAt of the round with the minimum number
 * 2. earliest schedule.events[].scheduledAt
 * 3. updatedAt
 */
export function tournamentStart(t: Tournament): Date {
  const rounds = t.schedule.rounds
  if (rounds.length > 0) {
    const sorted = [...rounds].sort((a, b) => a.number - b.number)
    return sorted[0].scheduledAt
  }
  const events = t.schedule.events
  if (events.length > 0) {
    const times = events
      .map((e) => e.scheduledAt)
      .filter((d): d is Date => d instanceof Date)
    if (times.length > 0) {
      return times.reduce((a, b) => (a.getTime() < b.getTime() ? a : b))
    }
  }
  return t.updatedAt
}

/**
 * Collect unique calendar days (midnight) from all rounds + events.
 * Falls back to [updatedAt day] when both are empty.
 */
export function tournamentScheduleDays(t: Tournament): Date[] {
  const days = new Set<number>()
  for (const r of t.schedule.rounds) {
    const d = r.scheduledAt
    days.add(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  }
  for (const e of t.schedule.events) {
    if (!(e.scheduledAt instanceof Date)) continue
    const d = e.scheduledAt
    days.add(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  }
  if (days.size === 0) {
    const d = t.updatedAt
    return [new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))]
  }
  return [...days].sort((a, b) => a - b).map((ts) => new Date(ts))
}

/**
 * Format a list of calendar days as a compact range string.
 * Rules:
 * - unique days sorted ascending
 * - maximal runs of consecutive calendar days: len 1 → "d", len >1 → "d1–d2"
 * - runs joined with ", "
 * - month name appended when the month changes between printed groups
 * - year appended once at the end
 *
 * Examples (ru):
 *   "10 августа 2026"
 *   "10–11 августа 2026"
 *   "10, 12, 25 августа 2026"
 *   "10, 12 августа, 3 сентября 2026"
 *   "25 августа – 5 сентября 2026"
 */
export function formatDayRanges(days: Date[], locale: string): string {
  if (days.length === 0) return ''

  // Deduplicate by UTC midnight timestamp
  const unique = [...new Set(days.map((d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())))]
    .sort((a, b) => a - b)
    .map((ts) => new Date(ts))

  // Group into consecutive-day runs
  type Run = { start: Date; end: Date }
  const runs: Run[] = []
  let current: Run = { start: unique[0], end: unique[0] }

  for (let i = 1; i < unique.length; i++) {
    const prev = current.end
    const nextDay = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate() + 1))
    if (unique[i].getTime() === nextDay.getTime()) {
      current.end = unique[i]
    } else {
      runs.push(current)
      current = { start: unique[i], end: unique[i] }
    }
  }
  runs.push(current)

  // Format each run
  const dayFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' })
  // Combined day+month format: in this context ICU picks the grammatically correct
  // month form (e.g. genitive "августа" for ru), unlike a standalone month-only
  // format which always yields the nominative ("август").
  const dayMonthFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' })
  const yearFmt = new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone: 'UTC' })

  const monthName = (d: Date): string =>
    dayMonthFmt.formatToParts(d).find((p) => p.type === 'month')?.value ?? ''
  // Locale-independent month identity for "has the month changed" checks.
  const monthIndex = (d: Date): number => d.getUTCFullYear() * 12 + d.getUTCMonth()

  const lastYear = yearFmt.format(runs[runs.length - 1].end)

  // Month name is appended to the last printed group of each month
  // (e.g. "10, 12, 25 августа 2026", "10, 12 августа, 3 сентября 2026").
  const parts: string[] = []

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i]
    const startIdx = monthIndex(run.start)
    const endIdx = monthIndex(run.end)
    const nextIdx = i + 1 < runs.length ? monthIndex(runs[i + 1].start) : -1

    if (run.start.getTime() === run.end.getTime()) {
      // Single day
      const day = dayFmt.format(run.start)
      if (endIdx !== nextIdx) {
        parts.push(`${day} ${monthName(run.start)}`)
      } else {
        parts.push(day)
      }
    } else if (startIdx === endIdx) {
      // Range within same month
      const d1 = dayFmt.format(run.start)
      const d2 = dayFmt.format(run.end)
      if (endIdx !== nextIdx) {
        parts.push(`${d1}–${d2} ${monthName(run.start)}`)
      } else {
        parts.push(`${d1}–${d2}`)
      }
    } else {
      // Range across months — both month names printed explicitly
      const d1 = dayFmt.format(run.start)
      const d2 = dayFmt.format(run.end)
      parts.push(`${d1} ${monthName(run.start)} – ${d2} ${monthName(run.end)}`)
    }
  }

  return parts.join(', ') + ' ' + lastYear
}

/**
 * Format time control in a compact human-readable form.
 * Uses i18next `t` function for type names and pluralization.
 *
 * Examples (ru):
 *   "40 минут (Абсолютный)"
 *   "40 минут + 30 секунд (Фишер)"
 *   "40 минут + 30 секунд × 3 (Бёёми)"
 *   "40 минут + 30 секунд / 15 ходов (Канадский)"
 */
export function formatTimeControlShort(
  tc: TimeControl,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const main = `${tc.mainTime} ${t('tournament.view.minutes', { count: tc.mainTime })}`
  const typeName = t(`tournament.timeControl.${tc.type}`)

  let extra = ''
  switch (tc.type) {
    case 'absolute':
      break
    case 'fischer':
    case 'bronstein':
    case 'delay':
      extra = ` + ${tc.increment} ${t('tournament.view.seconds', { count: tc.increment })}`
      break
    case 'byoyomi':
      extra = ` + ${tc.byoyomiTime} ${t('tournament.view.seconds', { count: tc.byoyomiTime })} × ${tc.byoyomiPeriods}`
      break
    case 'canadian':
      extra = ` + ${tc.canadianTime} ${t('tournament.view.seconds', { count: tc.canadianTime })} / ${tc.canadianMoves} ${t('tournament.view.perMoves')}`
      break
  }

  return `${main}${extra} (${typeName})`
}

/**
 * Sort tournaments by start time ascending (stable).
 */
export function sortTournamentsByStart(list: Tournament[]): Tournament[] {
  return [...list].sort((a, b) => {
    const diff = tournamentStart(a).getTime() - tournamentStart(b).getTime()
    if (diff !== 0) return diff
    return a.id.localeCompare(b.id)
  })
}
