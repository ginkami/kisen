import { uuidv7 } from 'uuidv7'
import type { Game, GameResult } from '../../../domain/tournament.ts'
import type { TieBreak, TieBreakType } from '../../../domain/tieBreak.ts'
import type { PlayerRank } from '../../../domain/playerRating.ts'
import { calculateParticipantPoints, deriveGameStatus } from '../pairings/pairingsModel.ts'

// ---------------------------------------------------------------------------
// Rank badge colors
// ---------------------------------------------------------------------------

const RANK_COLORS: Record<string, string> = {
  '20k': 'oklch(70.081% 0.164 56.844)',
  '19k': 'oklch(70.081% 0.164 56.844)',
  '18k': 'oklch(70.081% 0.164 56.844)',
  '17k': 'oklch(70.081% 0.164 56.844)',
  '16k': 'oklch(70.081% 0.164 56.844)',
  '15k': 'oklch(70.081% 0.164 56.844)',
  '14k': 'oklch(70.081% 0.164 56.844)',
  '13k': 'oklch(70.081% 0.164 56.844)',
  '12k': 'oklch(70.081% 0.164 56.844)',
  '11k': 'oklch(70.081% 0.164 56.844)',
  '10k': 'oklch(70.081% 0.164 56.844)',
  '9k': 'oklch(60.995% 0.08 174.616)',
  '8k': 'oklch(60.995% 0.08 174.616)',
  '7k': 'oklch(60.995% 0.08 174.616)',
  '6k': 'oklch(45.0% 0.14 250.0)',
  '5k': 'oklch(45.0% 0.14 250.0)',
  '4k': 'oklch(45.0% 0.14 250.0)',
  '3k': 'oklch(43% 0.020 52.190)',
  '2k': 'oklch(43% 0.020 52.190)',
  '1k': 'oklch(43% 0.020 52.190)',
  '1d': '#000',
  '2d': '#000',
  '3d': '#000',
  '4d': 'oklch(40.0% 0.12 25.0)',
  '5d': 'oklch(40.0% 0.12 25.0)',
  '6d': 'oklch(40.0% 0.12 25.0)',
  '7d': 'oklch(40.0% 0.12 25.0)',
  '8d': 'oklch(40.0% 0.12 25.0)',
  '9d': 'oklch(40.0% 0.12 25.0)',
}

export function rankToColor(rank: PlayerRank): string {
  return RANK_COLORS[rank] ?? '#808080'
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StandingRow {
  participantId: number
  place: number
  points: number
  tieBreakValues: Record<TieBreakType, number>
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function opponentIdInGame(game: Game, participantId: number): number | null {
  if (game.player1 === participantId) return game.player2
  if (game.player2 === participantId) return game.player1
  return null
}

function resultForParticipant(game: Game, participantId: number): GameResult | null {
  if (game.player1 === participantId) return game.result
  if (game.player2 === participantId) {
    if (game.result === 'player1_won') return 'player2_won'
    if (game.result === 'player2_won') return 'player1_won'
    return game.result
  }
  return null
}

function resultPoints(r: GameResult | null): number {
  if (r === null) return 0
  if (r === 'player1_won' || r === 'player2_won') return 1
  return 0.5
}

// ---------------------------------------------------------------------------
// Tie-break calculators
// ---------------------------------------------------------------------------

function getOpponentPointsPerGame(
  games: Game[], participantId: number, pointsMap: Map<number, number>, upToRound: number
): number[] {
  const oppPts: number[] = []
  for (const g of games) {
    if (g.round > upToRound) continue
    if (g.status === 'forfeit') continue
    const opp = opponentIdInGame(g, participantId)
    if (opp == null) continue
    oppPts.push(pointsMap.get(opp) ?? 0)
  }
  return oppPts
}

function calcBuchholz(games: Game[], participantId: number, pointsMap: Map<number, number>, upToRound: number): number {
  return getOpponentPointsPerGame(games, participantId, pointsMap, upToRound).reduce((a, b) => a + b, 0)
}

function calcBuchholzCut(games: Game[], participantId: number, pointsMap: Map<number, number>, upToRound: number, cutCount: number): number {
  const oppPts = getOpponentPointsPerGame(games, participantId, pointsMap, upToRound)
  if (oppPts.length === 0) return 0
  const bh = oppPts.reduce((a, b) => a + b, 0)
  const n = Math.min(cutCount, oppPts.length)
  const sorted = [...oppPts].sort((a, b) => a - b)
  return bh - sorted.slice(0, n).reduce((a, b) => a + b, 0)
}

function calcBuchholzMedian(games: Game[], participantId: number, pointsMap: Map<number, number>, upToRound: number): number {
  const oppPts = getOpponentPointsPerGame(games, participantId, pointsMap, upToRound)
  if (oppPts.length <= 1) return oppPts.reduce((a, b) => a + b, 0)
  const bh = oppPts.reduce((a, b) => a + b, 0)
  const sorted = [...oppPts].sort((a, b) => a - b)
  return bh - sorted[0] - sorted[sorted.length - 1]
}

function calcBuchholzPlus(games: Game[], participantId: number, pointsMap: Map<number, number>, upToRound: number): number {
  let sum = 0
  for (const g of games) {
    if (g.round > upToRound) continue
    if (g.status === 'forfeit') continue
    const opp = opponentIdInGame(g, participantId)
    if (opp == null) continue
    sum += (pointsMap.get(opp) ?? 0) + resultPointsForParticipant(g, participantId)
  }
  return sum
}

function calcSonnebornBerger(games: Game[], participantId: number, pointsMap: Map<number, number>, upToRound: number): number {
  let sum = 0
  for (const g of games) {
    if (g.round > upToRound) continue
    if (g.status === 'forfeit') continue
    const opp = opponentIdInGame(g, participantId)
    if (opp == null) continue
    const oppPts = pointsMap.get(opp) ?? 0
    sum += resultPointsForParticipant(g, participantId) * oppPts
  }
  return sum
}

function calcWinsCount(games: Game[], participantId: number, upToRound: number): number {
  let wins = 0
  for (const g of games) {
    if (g.round > upToRound) continue
    if (g.status === 'forfeit') continue
    const isP1 = g.player1 === participantId
    const isP2 = g.player2 === participantId
    if (!isP1 && !isP2) continue
    if (g.status === 'bye' && isP1 && g.result !== 'draw') { wins++; continue }
    if (resultPointsForParticipant(g, participantId) === 1) wins++
  }
  return wins
}

function calcDirectEncounter(games: Game[], participantId: number, pointsMap: Map<number, number>, upToRound: number): number {
  const myPoints = pointsMap.get(participantId) ?? 0
  const tiedOpponentIds = new Set()
  for (const [oppId, oppPts] of pointsMap) {
    if (oppId !== participantId && oppPts === myPoints) tiedOpponentIds.add(oppId)
  }
  if (tiedOpponentIds.size === 0) return 0
  let de = 0
  for (const g of games) {
    if (g.round > upToRound) continue
    if (g.status === 'forfeit') continue
    const opp = opponentIdInGame(g, participantId)
    if (opp == null || !tiedOpponentIds.has(opp)) continue
    de += resultPointsForParticipant(g, participantId)
  }
  return de
}

// ---------------------------------------------------------------------------
// SL Points: score-group position mapping
// ---------------------------------------------------------------------------

const SL_POINTS_BY_POSITION: readonly number[] = [55, 34, 21, 13, 8, 5, 3, 2]

/**
 * Build a map from points value -> SL Points value.
 * Groups participants by equal points, orders groups by points descending,
 * assigns each group the value mapped from the position of its last
 * (lowest-ranked) member in the overall points-descending list
 * (cumulative count of participants with points >= the group points;
 * position >= 9 -> 1).
 */
function buildSlPointsByPointsValue(pointsMap: Map<number, number>): Map<number, number> {
  // Count participants per distinct points value (score group size)
  const groupSizeByPoints = new Map<number, number>()
  for (const pts of pointsMap.values()) {
    groupSizeByPoints.set(pts, (groupSizeByPoints.get(pts) ?? 0) + 1)
  }
  // Walk distinct points values best-to-worst; accumulate group sizes
  const sortedDesc = [...groupSizeByPoints.keys()].sort((a, b) => b - a)
  const result = new Map<number, number>()
  let position = 0 // 1-based position of the current group last member
  for (const pts of sortedDesc) {
    position += groupSizeByPoints.get(pts) ?? 0
    result.set(pts, position <= SL_POINTS_BY_POSITION.length ? SL_POINTS_BY_POSITION[position - 1] : 1)
  }
  return result
}

// ---------------------------------------------------------------------------
// Public: computeStandings
// ---------------------------------------------------------------------------

export function computeStandings(
  allGames: Game[],
  participants: { id: number; startingPoints: number }[],
  tieBreaks: TieBreak[],
  upToRound: number
): StandingRow[] {
  const pointsMap = new Map<number, number>()
  for (const p of participants) {
    pointsMap.set(p.id, calculateParticipantPoints(allGames, p.id, upToRound, p.startingPoints))
  }

  const hasSlPoints = tieBreaks.some((tb) => tb.type === 'sl_points')
  const slByPoints = hasSlPoints ? buildSlPointsByPointsValue(pointsMap) : null

  const rows: StandingRow[] = participants.map((p) => {
    const points = pointsMap.get(p.id) ?? 0
    const tieBreakValues: Record<TieBreakType, number> = {
      points,
      buchholz: 0, buchholz_cut: 0, buchholz_median: 0, buchholz_plus: 0,
      sonneborn_berger: 0, direct_encounter: 0, wins_count: 0, sl_points: 0,
    }
    for (const tb of tieBreaks) {
      if (tb.type === 'points' || tb.type === 'direct_encounter') continue
      switch (tb.type) {
        case 'buchholz': tieBreakValues.buchholz = calcBuchholz(allGames, p.id, pointsMap, upToRound); break
        case 'buchholz_cut': tieBreakValues.buchholz_cut = calcBuchholzCut(allGames, p.id, pointsMap, upToRound, tb.cutCount); break
        case 'buchholz_median': tieBreakValues.buchholz_median = calcBuchholzMedian(allGames, p.id, pointsMap, upToRound); break
        case 'buchholz_plus': tieBreakValues.buchholz_plus = calcBuchholzPlus(allGames, p.id, pointsMap, upToRound); break
        case 'sonneborn_berger': tieBreakValues.sonneborn_berger = calcSonnebornBerger(allGames, p.id, pointsMap, upToRound); break
        case 'wins_count': tieBreakValues.wins_count = calcWinsCount(allGames, p.id, upToRound); break
        case 'sl_points': tieBreakValues.sl_points = slByPoints?.get(points) ?? 1; break
      }
    }
    return { participantId: p.id, place: 0, points, tieBreakValues }
  })

  // Second pass: direct encounter
  for (const row of rows) {
    if (!tieBreaks.some((tb) => tb.type === 'direct_encounter')) continue
    row.tieBreakValues.direct_encounter = calcDirectEncounter(allGames, row.participantId, pointsMap, upToRound)
  }

  rows.sort((a, b) => {
    for (const tb of tieBreaks) {
      const aVal = a.tieBreakValues[tb.type]
      const bVal = b.tieBreakValues[tb.type]
      if (aVal !== bVal) return bVal - aVal
    }
    return a.participantId - b.participantId
  })

  rows.forEach((row, i) => { row.place = i + 1 })
  return rows
}

function resultPointsForParticipant(game: Game, participantId: number): number {
  const raw = game.result
  if (raw === null) return 0
  if (raw === 'draw') return 0.5
  if (raw === 'player1_won' && game.player1 === participantId) return 1
  if (raw === 'player2_won' && game.player2 === participantId) return 1
  return 0
}

// ---------------------------------------------------------------------------
// Inline cell editing: grammar, parsing, serialization, synchronization
// ---------------------------------------------------------------------------

export interface ParsedCell {
  oppPlace: number
  isSente: boolean   // meaningful only when considerSente == true
  result: GameResult | null
  handicap: string | null
}

const HANDICAP_CODE_LIST = ['L', 'B', 'R', 'RL', '2p', '4p', '5p', '6p', '8p', '10p']

function parseHandicap(tail: string): string | null {
  if (tail.length < 2) return null
  const sign = tail[0]
  if (sign !== '-' && sign !== '+') return null
  const code = tail.slice(1)
  if (!HANDICAP_CODE_LIST.includes(code)) return null
  return `${sign}${code}`
}

/**
 * Grammar: '^'? oppNum result? handicap?  |  '+' (bye)  |  '-' (forfeit)
 * Backtracking: result+handicap first, then handicap alone (no result).
 */
export function parseCellInput(
  input: string,
  considerSente: boolean
): ParsedCell | 'bye' | 'forfeit' | null {
  const s = input.trim()
  if (s === '+') return 'bye'
  if (s === '=') return 'bye_draw'
  if (s === '-') return 'forfeit'

  let rest = s
  let isSente = false
  if (rest.startsWith('^')) {
    if (!considerSente) return null
    isSente = true
    rest = rest.slice(1)
  }

  const numMatch = rest.match(/^(\d{1,3})/)
  if (!numMatch) return null
  const oppPlace = parseInt(numMatch[1], 10)
  if (oppPlace === 0) return null
  rest = rest.slice(numMatch[1].length)

  // Try: result? handicap?
  let result: GameResult | null = null
  let handicap: string | null = null
  let tail = rest
  if (tail.length > 0) {
    const c = tail[0]
    if (c === '+' || c === '-' || c === '=') {
      result = c === '+' ? 'player1_won' : c === '-' ? 'player2_won' : 'draw'
      tail = tail.slice(1)
    }
  }
  if (tail.length > 0) {
    handicap = parseHandicap(tail)
    if (handicap == null) {
      // Backtrack: maybe the first char was a handicap sign, not a result
      if (result != null) {
        const altHandicap = parseHandicap(rest)
        if (altHandicap != null) {
          return { oppPlace, isSente, result: null, handicap: altHandicap }
        }
      }
      return null
    }
  }
  if (tail.length === 0 && result == null && rest.length > 0) {
    // 'rest' started with a handicap sign but no result was parsed and tail empty —
    // handled above; here nothing left to do
  }
  return { oppPlace, isSente, result, handicap }
}

/** Normalize all games sente field: player1 when considerSente=true, unknown otherwise.
 *  Returns the same array reference if no changes are needed. */
export function normalizeGamesSente(games: Game[], considerSente: boolean): Game[] {
  const target: Game['sente'] = considerSente ? 'player1' : 'unknown'
  return games.some((g) => g.sente !== target)
    ? games.map((g) => ({ ...g, sente: target }))
    : games
}
/** Prefix regex: every valid partial input for on-the-fly filtering. */
export const CELL_PARTIAL_RE = /^(\+|=|-|\^|\^?\d{1,3}[+\-=]?[-+]?(L|B|R(L)?|[24568]p?|1(0p?)?)?)?$/

/** Serialize button content into input text. */
export function gameToCellInput(
  game: Game | undefined,
  pid: number,
  oppPlace: number | null,
  considerSente: boolean
): string {
  if (!game) return ''
  if (game.status === 'bye' && game.player1 === pid) return game.result === 'draw' ? '=' : '+'
  if (game.status === 'forfeit') return '-'
  const isP1 = game.player1 === pid
  let prefix = ''
  if (considerSente) {
    const playerIsSente = (isP1 && game.sente === 'player1') || (!isP1 && game.sente === 'player2')
    prefix = playerIsSente ? '^' : ''
  }
  const raw = game.result
  let sym = ''
  if (raw === 'draw') sym = '='
  else if ((raw === 'player1_won' && isP1) || (raw === 'player2_won' && !isP1)) sym = '+'
  else if (raw != null) sym = '-'
  const num = oppPlace != null ? String(oppPlace) : ''
  const hc = game.handicap ? handicapForView(game.handicap, isP1) : ''
  return `${prefix}${num}${sym}${hc}`
}

export function handicapForView(handicap: string, isP1: boolean): string {
  if (isP1) return handicap
  const sign = handicap[0] === '-' ? '+' : '-'
  return sign + handicap.slice(1)
}

/**
 * Apply a cell edit with full round synchronization.
 * Returns null when input is invalid/empty (caller keeps previous games).
 */
export function withCellEdited(
  allGames: Game[],
  participants: { id: number; startingPoints: number }[],
  tieBreaks: TieBreak[],
  pid: number,
  round: number,
  input: string,
  considerSente: boolean,
  currentRound: number = 0,
): Game[] | null {
  if (input.trim() === '') return null
  const parsed = parseCellInput(input, considerSente)
  if (parsed === null) return null

  const standings = computeStandings(allGames, participants, tieBreaks, round)
  const idByPlace = new Map<number, number>()
  for (const s of standings) idByPlace.set(s.place, s.participantId)

  const otherRounds = allGames.filter((g) => g.round !== round)
  let roundGames = allGames.filter((g) => g.round === round)

  if (parsed === 'bye' || parsed === 'bye_draw' || parsed === 'forfeit') {
    // Remove the player's current game (former opponent becomes unpaired)
    roundGames = roundGames.filter(
      (g) => !(g.player1 === pid || g.player2 === pid)
    )
    roundGames.push({
      id: uuidv7(),
      player1: pid,
      player2: null,
      sente: considerSente ? 'player1' : 'unknown',
      handicap: null,
      result: parsed === 'forfeit' ? 'player2_won' : parsed === 'bye_draw' ? 'draw' : 'player1_won',
      status: parsed === 'forfeit' ? 'forfeit' : 'bye',
      round,
    })
    return [...otherRounds, ...roundGames]
  }

  // Resolve opponent
  const oppId = idByPlace.get(parsed.oppPlace)
  if (oppId == null || oppId === pid) return null

  // Remove edited player's game and the new opponent's game
  roundGames = roundGames.filter(
    (g) =>
      !(g.player1 === pid || g.player2 === pid) &&
      !(g.player1 === oppId || g.player2 === oppId)
  )

  // player1/player2 by the ^ rule
  const pIsP1 = considerSente ? parsed.isSente : true
  const player1 = pIsP1 ? pid : oppId
  const player2 = pIsP1 ? oppId : pid

  // Result from edited player's perspective → player1 perspective
  let result: GameResult | null = null
  if (parsed.result != null) {
    if (parsed.result === 'draw') result = 'draw'
    else if (pIsP1) result = parsed.result // edited player is player1 — as-is
    else result = parsed.result === 'player1_won' ? 'player2_won' : 'player1_won'
  }

  const sente: Game['sente'] = considerSente ? 'player1' : 'unknown'

  roundGames.push({
    id: uuidv7(),
    player1,
    player2,
    sente,
    handicap: parsed.handicap != null
      ? (pIsP1 ? parsed.handicap : handicapForView(parsed.handicap, false)) as Game['handicap']
      : null,
    result,
    status: deriveGameStatus({ player1: player1, player2: player2, result, status: 'not_started', round } as Game, currentRound),
    round,
  })

  return [...otherRounds, ...roundGames]
}
