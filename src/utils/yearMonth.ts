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
  const firstRound = tournament.schedule.rounds.at(0)
  if (firstRound) {
    return formatDateToYearMonth(firstRound.scheduledAt)
  }
  return formatDateToYearMonth(new Date())
}
