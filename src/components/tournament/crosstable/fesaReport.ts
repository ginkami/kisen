import type { Game } from '../../../domain/tournament.ts'
import type { TimeControl } from '../../../domain/timeControl.ts'

export interface FesaParticipant {
  id: number
  familyNameEn: string
  givenNameEn: string
  nationality: string
  startingPoints: number
}

export interface FesaReportInput {
  isFinished: boolean
  tournamentTitleEn: string
  parentEventTitleEn: string | null
  settlementEn: string | null
  timeControl: TimeControl
  /** ISO date (YYYY-MM-DD) per round, indexed by round number − 1; null when unknown. */
  roundDates: (string | null)[]
  roundCount: number
  participants: FesaParticipant[]
  games: Game[]
  /** Crosstable standings (order = report order, points include starting points). */
  standings: { participantId: number; place: number; points: number }[]
}

export interface FesaReport {
  fileName: string
  content: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** ISO date (YYYY-MM-DD) of a round, from scheduledAtLocal or the UTC date. */
function roundDate(round: {
  number: number
  scheduledAt: Date
  scheduledAtLocal?: { year: number; month: number; day: number }
}): string | null {
  const loc = round.scheduledAtLocal
  if (loc) return `${loc.year}-${pad2(loc.month)}-${pad2(loc.day)}`
  if (!(round.scheduledAt instanceof Date) || Number.isNaN(round.scheduledAt.getTime())) return null
  return round.scheduledAt.toISOString().slice(0, 10)
}

export function fesaRoundDates(
  rounds: {
    number: number
    scheduledAt: Date
    scheduledAtLocal?: { year: number; month: number; day: number }
  }[],
  roundCount: number,
): (string | null)[] {
  const dates: (string | null)[] = Array.from({ length: roundCount }, () => null)
  for (const round of rounds) {
    if (round.number >= 1 && round.number <= roundCount) {
      dates[round.number - 1] = roundDate(round)
    }
  }
  return dates
}

function timeControlLine(tc: TimeControl): string {
  const main = `${tc.mainTime}min`
  switch (tc.type) {
    case 'absolute':
      return `[Time control: ${main}]`
    case 'byoyomi':
      return `[Time control: ${main} + ${tc.byoyomiTime}sec]`
    case 'canadian':
      return `[Time control: ${main} + ${tc.canadianTime}sec]`
    default:
      return `[Time control: ${main} + ${tc.increment}sec]` // fischer / bronstein / delay
  }
}

/** `[2026-09-10]`, `[2026-09-10/23]`, `[2026-09-10/10-08]`, `[2026-09-10/2027-01-05]`. */
function dateRangeLine(dates: (string | null)[]): string {
  const known = dates.filter((d): d is string => d != null)
  if (known.length === 0) return '[]'
  const start = known[0]
  const end = known[known.length - 1]
  if (end === start) return `[${start}]`
  if (end.slice(0, 7) === start.slice(0, 7)) return `[${start}/${end.slice(8)}]` // same month → DD
  if (end.slice(0, 4) === start.slice(0, 4)) return `[${start}/${end.slice(5)}]` // same year → MM-DD
  return `[${start}/${end}]`
}

function gameSymbol(g: Game, playerId: number): string {
  if (g.status === 'bye') return '+' // a bye is always a win for the bye player
  if (g.result === 'player1_won') return g.player1 === playerId ? '+' : '-'
  if (g.result === 'player2_won') return g.player2 === playerId ? '+' : '-'
  if (g.status === 'forfeit') return '-' // an undecided forfeit counts as a loss
  return '=' // draw or undecided
}

/**
 * Pure FESA report builder. Returns null when the tournament is not finished.
 * The content uses CRLF line endings and has no trailing newline.
 */
export function buildFesaReport(input: FesaReportInput): FesaReport | null {
  const {
    isFinished,
    tournamentTitleEn,
    parentEventTitleEn,
    settlementEn,
    timeControl,
    roundDates,
    roundCount,
    participants,
    games,
    standings,
  } = input
  if (!isFinished) return null

  const placeById = new Map<number, number>()
  for (const s of standings) placeById.set(s.participantId, s.place)
  const participantById = new Map<number, FesaParticipant>()
  for (const p of participants) participantById.set(p.id, p)

  const spActive = participants.some((p) => p.startingPoints !== 0)

  const title = parentEventTitleEn
    ? `${parentEventTitleEn}: ${tournamentTitleEn}`
    : tournamentTitleEn
  const headerParts = [title, settlementEn ?? null].filter((v): v is string => v !== null && v !== '')
  const lines: string[] = []

  lines.push(`[${headerParts.join(', ')}]`)
  lines.push(dateRangeLine(roundDates))
  lines.push(timeControlLine(timeControl))

  const roundNumbers = Array.from({ length: roundCount }, (_, i) => i + 1).join(' ')
  lines.push(`Nr Name Nat ${roundNumbers} ${spActive ? 'MMSS Pts MMS' : 'Pts'}`)

  for (const s of standings) {
    const p = participantById.get(s.participantId)
    if (!p) continue
    const cells: string[] = []
    for (let round = 1; round <= roundCount; round++) {
      const g = games.find((x) => x.round === round && (x.player1 === p.id || x.player2 === p.id))
      if (!g) {
        cells.push('-')
        continue
      }
      const oppId = g.player1 === p.id ? g.player2 : g.player1
      const sym = gameSymbol(g, p.id)
      const oppNr = oppId != null ? (placeById.get(oppId) ?? 0) : 0
      const cell = `${g.status === 'bye' || g.status === 'forfeit' ? 0 : oppNr}${sym}`
      cells.push(g.handicap != null ? `${cell}(${handicapCell(g.handicap, g.player1 === p.id)})` : cell)
    }
    const ptsWith = s.points
    const ptsWithout = s.points - p.startingPoints
    const tail = spActive
      ? ` [${p.startingPoints}] ${ptsWithout} ${ptsWith}`
      : ` ${ptsWith}`
    lines.push(
      `${s.place} [${p.familyNameEn}] [${p.givenNameEn}] ${p.nationality} [${cells.join(' ')}]${tail}`,
    )
  }

  const endDate = roundDates.filter((d): d is string => d != null).at(-1) ?? ''
  const fileName = `${endDate} ${parentEventTitleEn ? `${parentEventTitleEn} - ` : ''}${tournamentTitleEn}.txt`

  return { fileName, content: lines.join('\r\n') }
}

/** The handicap as seen by the given side, in parentheses. */
function handicapCell(handicap: string, isPlayer1: boolean): string {
  if (isPlayer1) return handicap
  const flipped =
    handicap.startsWith('+') || handicap.startsWith('-')
      ? (handicap[0] === '+' ? '-' : '+') + handicap.slice(1)
      : handicap
  return flipped
}
