import type { Game, GameResult } from '../../../domain/tournament.ts'
import type { TieBreak, TieBreakType } from '../../../domain/tieBreak.ts'
import type { PlayerRank } from '../../../domain/playerRating.ts'
import { calculateParticipantPoints } from '../pairings/pairingsModel.ts'

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
// Tie-break abbreviation map (locale-independent column headers)
// ---------------------------------------------------------------------------

export const TIEBREAK_ABBR: Record<TieBreakType, string> = {
  points: 'Pts',
  buchholz: 'BH',
  buchholz_cut: 'BHC',
  buchholz_median: 'BHM',
  buchholz_plus: 'BH+',
  sonneborn_berger: 'SB',
  direct_encounter: 'DE',
  wins_count: 'W',
}

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
    if (g.status === 'bye' && isP1) { wins++; continue }
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

  const rows: StandingRow[] = participants.map((p) => {
    const points = pointsMap.get(p.id) ?? 0
    const tieBreakValues: Record<TieBreakType, number> = {
      points,
      buchholz: 0, buchholz_cut: 0, buchholz_median: 0, buchholz_plus: 0,
      sonneborn_berger: 0, direct_encounter: 0, wins_count: 0,
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
