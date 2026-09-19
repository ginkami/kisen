// Swiss pairing engine: automatic pairing of the unpaired participants of the
// round being prepared via a weighted graph and the Edmonds blossom maximum-
// weight matching algorithm (see ./blossom.ts and the design document).
//
// Weight model (design Decision 2):
// - Score groups dominate exponentially: the penalty for a pair with a points
//   difference of Δ is 2^(16·Δ) (multiplied by two to stay even), so a larger
//   points difference always outweighs any combination of lower-level factors
//   for tournaments of up to ~500 participants.
// - All rating-related penalties are bounded below the smallest non-zero
//   score level: same-half pairing inside a score group costs 10000, the
//   deviation from the ideal upper↔lower alignment costs 100 per position
//   (capped), and a small closeness tie-break costs 2 per 100 rating points.
// - Hard constraints (already met, double skip, color safety) remove the edge
//   from the graph entirely.

import { uuidv7 } from 'uuidv7'
import type { Game, Participant } from '../../../domain/tournament.ts'
import { calculateParticipantPoints } from './pairingsModel.ts'
import { maxWeightMatching, type BlossomEdge } from './blossom.ts'

/** Thrown when no full valid pairing can be produced. */
export class PairingError extends Error {
  constructor(message = 'Cannot generate pairings') {
    super(message)
    this.name = 'PairingError'
  }
}

export interface PairingEngineInput {
  /** All tournament participants. */
  participants: Participant[]
  /** All tournament games (published rounds and the round being prepared). */
  games: Game[]
  /** The round being prepared (publishedRounds + 1). */
  round: number
  publishedRounds: number
  considerSente: boolean
}

const SCORE_PENALTY_EXPONENT = 16
const SENTINEL = -1
const RATING_SAME_HALF_PENALTY = 10000
const RATING_DEV_UNIT = 100
const RATING_DEV_MAX = 90
const RATING_CLOSE_DIVISOR = 200
const RATING_CLOSE_UNIT = 2
/**
 * Down-float pairs (crossing score groups) weight rating closeness much
 * higher than same-group pairs: when a player floats down — most importantly
 * the top board paired against a lower score group — the opponent should be
 * the closest-rated (typically the strongest) available one, per the Swiss
 * rule for upper-board alignment. Bounded: the worst case (3000 rating gap)
 * is 15 · 2 · 50 = 1500, far below the smallest non-zero score level (65536).
 */
const RATING_CLOSE_CROSS_MULTIPLIER = 50
const BYE_EXTRA_EXPONENT = 9
/**
 * Bye recipient rating tie-break: kept strong enough (100 per 100 rating
 * points) that the down-float closeness multiplier cannot push the bye onto a
 * higher-rated player — the bye still goes to the weakest candidate.
 */
const BYE_RATING_DIVISOR = 100
const BYE_RATING_UNIT = 100

export interface PlayerStats {
  id: number
  points: number
  /** Rating for the closeness tie-break (0 when unrated). */
  rating: number
  /** Rating for subgroup ordering (unrated sorts last). */
  ratingSortKey: number
  opponents: Set<number>
  /** True when the player already skipped a published round (bye or forfeit). */
  skipped: boolean
  colorBalance: number
  streakColor: 'sente' | 'gote' | null
  streakLength: number
}

/**
 * Builds per-player statistics over the published rounds only: points,
 * played opponents, skip history and (when considerSente) color history.
 */
export function buildPlayerStats(input: PairingEngineInput): Map<number, PlayerStats> {
  const { participants, games, publishedRounds, considerSente } = input
  const stats = new Map<number, PlayerStats>()
  for (const p of participants) {
    stats.set(p.id, {
      id: p.id,
      points: calculateParticipantPoints(games, p.id, publishedRounds, p.startingPoints ?? 0),
      rating: p.capturedRating?.value ?? 0,
      ratingSortKey: p.capturedRating?.value ?? Number.NEGATIVE_INFINITY,
      opponents: new Set<number>(),
      skipped: false,
      colorBalance: 0,
      streakColor: null,
      streakLength: 0,
    })
  }

  for (const g of games) {
    if (g.round > publishedRounds) continue
    if (g.status === 'bye' || g.status === 'forfeit') {
      const s1 = stats.get(g.player1)
      if (s1) s1.skipped = true
      if (g.player2 != null) {
        const s2 = stats.get(g.player2)
        if (s2) s2.skipped = true
      }
      continue
    }
    const s1 = stats.get(g.player1)
    const s2 = g.player2 != null ? stats.get(g.player2) : undefined
    if (s1 && s2) {
      s1.opponents.add(s2.id)
      s2.opponents.add(s1.id)
    }
  }

  if (considerSente) {
    // Colors require chronological order over published regular games.
    const colorGames = games
      .filter((g) => g.round <= publishedRounds && g.player2 != null && g.sente !== 'unknown')
      .sort((a, b) => a.round - b.round)
    for (const g of colorGames) {
      const senteId = g.sente === 'player1' ? g.player1 : (g.player2 as number)
      const goteId = g.sente === 'player1' ? (g.player2 as number) : g.player1
      const sente = stats.get(senteId)
      const gote = stats.get(goteId)
      if (sente) {
        sente.colorBalance += 1
        if (sente.streakColor === 'sente') sente.streakLength += 1
        else {
          sente.streakColor = 'sente'
          sente.streakLength = 1
        }
      }
      if (gote) {
        gote.colorBalance -= 1
        if (gote.streakColor === 'gote') gote.streakLength += 1
        else {
          gote.streakColor = 'gote'
          gote.streakLength = 1
        }
      }
    }
  }

  return stats
}

/** Exponential penalty for a points difference of Δ between opponents. */
function scorePenalty(pointsDiff: number): number {
  // Multiplied by two so that every weight component stays even and all
  // blossom slacks remain exact integers.
  return 2 * Math.pow(2, SCORE_PENALTY_EXPONENT * pointsDiff)
}

/**
 * Rating-related penalty for a pair inside one score group: pairs inside the
 * same half cost more than any cross-half misalignment.
 */
function ratingGroupPenalty(sameHalf: boolean, deviation: number): number {
  if (sameHalf) return RATING_SAME_HALF_PENALTY
  return Math.min(deviation, RATING_DEV_MAX) * RATING_DEV_UNIT
}

/** Small closeness tie-break: 2 penalty points per 100 rating difference. */
function ratingClosenessPenalty(a: number, b: number): number {
  return Math.floor(Math.abs(a - b) / RATING_CLOSE_DIVISOR) * RATING_CLOSE_UNIT
}

/** Bye penalty: one extra half-point score level plus a rating tie-break. */
function byePenalty(points: number, rating: number): number {
  return (
    2 * Math.pow(2, SCORE_PENALTY_EXPONENT * points + BYE_EXTRA_EXPONENT) +
    Math.floor(rating / BYE_RATING_DIVISOR) * BYE_RATING_UNIT
  )
}

/** True when assigning sente to `player` (and gote to `other`) is legal. */
function isColorLegal(player: PlayerStats, other: PlayerStats): boolean {
  const playerLegal =
    player.colorBalance + 1 <= 2 &&
    !(player.streakColor === 'sente' && player.streakLength >= 2)
  const otherLegal =
    other.colorBalance - 1 >= -2 &&
    !(other.streakColor === 'gote' && other.streakLength >= 2)
  return playerLegal && otherLegal
}

/**
 * Deterministically picks the sente player of a pair (returns the player id).
 * Preference: the only legal orientation; the smaller color balance; the
 * larger same-color streak broken by the assignment; the higher rating; the
 * smaller id.
 */
function pickSentePlayer(a: PlayerStats, b: PlayerStats): number {
  const aLegal = isColorLegal(a, b)
  const bLegal = isColorLegal(b, a)
  if (aLegal && !bLegal) return a.id
  if (bLegal && !aLegal) return b.id
  if (!aLegal || !bLegal) throw new PairingError('Color constraints cannot be satisfied')
  // Both legal: prefer the player with the smaller color balance as sente.
  if (a.colorBalance !== b.colorBalance) return a.colorBalance < b.colorBalance ? a.id : b.id
  // Tie: prefer the player whose streak is broken by receiving sente, with
  // the longer streak first.
  const aBreaks = a.streakColor === 'gote' ? a.streakLength : 0
  const bBreaks = b.streakColor === 'gote' ? b.streakLength : 0
  if (aBreaks !== bBreaks) return aBreaks > bBreaks ? a.id : b.id
  // Then the higher rating; then the smaller id.
  if (a.rating !== b.rating) return a.rating > b.rating ? a.id : b.id
  return a.id < b.id ? a.id : b.id
}

/**
 * Creates a lone bye game (status 'bye', result 'player1_won') following the
 * lone-game invariant.
 */
export function createByeGame(participantId: number, round: number, considerSente: boolean): Game {
  return {
    id: uuidv7(),
    player1: participantId,
    player2: null,
    sente: considerSente ? 'player1' : 'unknown',
    handicap: null,
    result: 'player1_won',
    status: 'bye',
    round,
  }
}

/**
 * Creates a lone forfeit game (status 'forfeit', result 'player2_won') following the
 * lone-game invariant.
 */
export function createForfeitGame(participantId: number, round: number, considerSente: boolean): Game {
  return {
    id: uuidv7(),
    player1: participantId,
    player2: null,
    sente: considerSente ? 'player1' : 'unknown',
    handicap: null,
    result: 'player2_won',
    status: 'forfeit',
    round,
  }
}

/**
 * Generates pairings for the round being prepared. Participants who already
 * have a game in `round` (manual pairs, byes, carried-over forfeits) are
 * locked and never touched. Returns only the newly created games.
 *
 * Throws {@link PairingError} when no full valid pairing exists.
 */
export function generatePairings(input: PairingEngineInput): Game[] {
  const { participants, games, round, considerSente } = input

  // Participants already placed in the round are locked out of the graph.
  const covered = new Set<number>()
  for (const g of games) {
    if (g.round !== round) continue
    covered.add(g.player1)
    if (g.player2 != null) covered.add(g.player2)
  }
  const unpaired = participants.filter((p) => !covered.has(p.id))
  if (unpaired.length === 0) return []

  const statsById = buildPlayerStats(input)
  const players = unpaired.map((p) => {
    const s = statsById.get(p.id)
    if (!s) throw new PairingError(`No stats for participant ${p.id}`)
    return s
  })
  const n = players.length

  // Rating positions inside each score group (1-based, rating descending).
  const groups = new Map<number, PlayerStats[]>()
  for (const player of players) {
    const key = player.points
    const list = groups.get(key)
    if (list) list.push(player)
    else groups.set(key, [player])
  }
  const positionInGroup = new Map<number, number>()
  const groupHalfSize = new Map<number, number>()
  for (const list of groups.values()) {
    list.sort((a, b) => {
      if (a.ratingSortKey !== b.ratingSortKey) return b.ratingSortKey - a.ratingSortKey
      return a.id - b.id
    })
    list.forEach((player, index) => {
      positionInGroup.set(player.id, index + 1)
      groupHalfSize.set(player.id, Math.floor(list.length / 2))
    })
  }

  // Build the weighted graph: vertices are the unpaired players, plus one
  // virtual bye vertex when the count is odd.
  const odd = n % 2 === 1
  const byeVertex = odd ? n : SENTINEL
  const vertexCount = odd ? n + 1 : n

  const edges: BlossomEdge[] = []
  for (let i = 0; i < n; i++) {
    const a = players[i]
    for (let j = i + 1; j < n; j++) {
      const b = players[j]
      // Hard constraint: already met in a published round.
      if (a.opponents.has(b.id)) continue
      // Hard constraint: color safety in both orientations.
      if (considerSente && !isColorLegal(a, b) && !isColorLegal(b, a)) continue

      let penalty = scorePenalty(Math.abs(a.points - b.points))
      const crossGroup = a.points !== b.points
      penalty += ratingClosenessPenalty(a.rating, b.rating) * (crossGroup ? RATING_CLOSE_CROSS_MULTIPLIER : 1)
      if (a.points === b.points) {
        const pi = positionInGroup.get(a.id) as number
        const pj = positionInGroup.get(b.id) as number
        const h = groupHalfSize.get(a.id) as number
        const sameHalf = (pi <= h && pj <= h) || (pi > h && pj > h)
        const deviation = Math.abs(pi - (pj - h))
        penalty += ratingGroupPenalty(sameHalf, deviation)
      }
      edges.push({ u: i, v: j, w: -penalty })
    }
    if (odd && !a.skipped) {
      edges.push({ u: i, v: byeVertex, w: -byePenalty(a.points, a.rating) })
    }
  }

  const mate = maxWeightMatching(vertexCount, edges, true)

  // Every real player must be covered (paired or bye); otherwise the round
  // cannot be drawn and the UI shows the failure alert.
  const newGames: Game[] = []
  for (let i = 0; i < n; i++) {
    const m = mate[i]
    if (m === SENTINEL) throw new PairingError('No full valid pairing exists')
    if (m === byeVertex) {
      newGames.push(createByeGame(players[i].id, round, considerSente))
      continue
    }
    if (m <= i) continue // already emitted from the lower index
    const a = players[i]
    const b = players[m]
    const senteId = considerSente ? pickSentePlayer(a, b) : SENTINEL
    newGames.push({
      id: uuidv7(),
      player1: a.id,
      player2: b.id,
      sente: considerSente ? (senteId === a.id ? 'player1' : 'player2') : 'unknown',
      handicap: null,
      result: null,
      status: 'not_started',
      round,
    })
  }
  return newGames
}
