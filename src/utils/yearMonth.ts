import type { Tournament } from '../domain/tournament.ts'

export function formatDateToYearMonth(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}${month}`
}

export function parseYearMonth(value: string): Date {
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6)) - 1
  return new Date(year, month, 1)
}

export function formatYearMonthToMonthInput(value: string): string {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}`
}

export function parseMonthInputToYearMonth(value: string): string {
  return value.replace('-', '')
}

export function getTournamentStartYearMonth(tournament: Tournament): string {
  return formatDateToYearMonth(getTournamentStartDate(tournament) ?? new Date())
}

/**
 * Precise tournament start: the earliest scheduledAt among schedule rounds
 * and events. Returns null when the schedule has no dated entries.
 */
export function getTournamentStartDate(tournament: Tournament): Date | null {
  const allDates: Date[] = []
  for (const round of tournament.schedule.rounds) {
    allDates.push(round.scheduledAt)
  }
  for (const event of tournament.schedule.events) {
    if (event.scheduledAt) allDates.push(event.scheduledAt)
  }
  if (allDates.length === 0) return null
  return new Date(Math.min(...allDates.map((d) => d.getTime())))
}
