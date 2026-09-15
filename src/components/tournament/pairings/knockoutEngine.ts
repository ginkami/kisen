// Single-elimination (knockout) engine for the pairing assistant drawer.
//
// Pure module: analyzes whether the published rounds form a strict
// single-elimination bracket and generates canonical knockout rounds for the
// round being prepared. See openspec/specs/knockout-engine/spec.md.
//
// Canonical knockout round from a seeded list:
// - the list is padded abstractly to the next power of two with BOTTOM virtual
//   seeds, then strictly seeded (1 vs last, 2 vs second-last, ...);
// - a real player drawn against a virtual seed gets a bye (`status: 'bye'`,
//   `result: 'player1_won'`) — byes always go to TOP seeds;
// - eliminated players receive a lone forfeit game (`status: 'forfeit'`,
//   `result: 'player2_won'`) in every following round;
// - `{n}` of the «1/{n} финала» label = pairs + byes of the round = bracket
//   size / 2 = number of active players after the round.

import { uuidv7 } from 'uuidv7'
import type { Game, Participant } from '../../../domain/tournament.ts'
import { calculateParticipantPoints } from './pairingsModel.ts'
import { createByeGame, PairingError } from './pairingEngine.ts'

export interface KnockoutRoundInfo {
  /** Pairs + byes of the round (= bracket size / 2) for the «1/{n} финала» label. */
  n: number
  /** true when an existing bracket is continued; false for knockout round 1. */
  continuation: boolean
}

interface SeededPlayer {
  participant: Participant
  points: number
  rating: number
}

interface BracketMatch {
  /** Lower seed of the bracket slot (first player). */
  a: number
  /** Higher seed (second player); null = bye slot (winner is `a`). */
  b: number | null
  /** Winner after the round was played; null while unknown. */
  winner: number | null
}

interface Bracket {
  startRound: number
  /** Matches per knockout round (index 0 = the start round), in bracket order. */
  rounds: BracketMatch[][]
}

function nextPowerOfTwo(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

/** Stable sort by points desc, then rating desc, then id asc. */
function sortSeeded(players: SeededPlayer[]): SeededPlayer[] {
  return [...players].sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points
    if (a.rating !== b.rating) return b.rating - a.rating
    return a.participant.id - b.participant.id
  })
}

/**
 * Verifies that the seeded list forms the canonical knockout round `s` in
 * `games` (strict seeding, byes to top seeds) and returns the depth-0 bracket
 * matches, or null when the round does not match. Lone forfeit games of the
 * round mark players excluded from the bracket before it started (manual
 * eliminations or carried forfeits): they are removed from the seeding, which
 * then covers the remaining participants canonically.
 */
interface StartRoundMatch {
  matches: BracketMatch[]
  /** Players excluded from the bracket via lone forfeit games in round `s`. */
  forfeited: number[]
}

function matchStartRound(
  participants: Participant[],
  games: Game[],
  s: number,
  startingPointsById: Map<number, number>,
  ratingById: Map<number, number>,
): StartRoundMatch | null {
  const roundGames = games.filter((g) => g.round === s)

  // Split off lone forfeit games of players eliminated before the bracket.
  const forfeited = new Set<number>()
  const pairingGames: Game[] = []
  for (const g of roundGames) {
    if (g.status === 'forfeit') {
      if (g.player2 != null || g.result !== 'player2_won') return null
      if (forfeited.has(g.player1)) return null // duplicate forfeit
      forfeited.add(g.player1)
    } else {
      if (forfeited.has(g.player1) || (g.player2 != null && forfeited.has(g.player2))) {
        return null // excluded player in a pairing or bye game
      }
      pairingGames.push(g)
    }
  }

  const seeded = sortSeeded(
    participants
      .filter((p) => !forfeited.has(p.id))
      .map((p) => ({
        participant: p,
        points: calculateParticipantPoints(games, p.id, s - 1, startingPointsById.get(p.id) ?? 0),
        rating: ratingById.get(p.id) ?? 0,
      })),
  )

  const n = seeded.length
  const pad = nextPowerOfTwo(n)
  if (pad < 2) return null

  // Expected: (pad − n) byes for the top seeds, then the real pairs
  // (sorted[i] vs sorted[pad − 1 − i]).
  const pairsCount = pad / 2

  const expectedPairs = new Map<string, [Participant, Participant]>()
  const expectedByes = new Set<number>()
  for (let i = 0; i < pairsCount; i++) {
    const a = seeded[i].participant
    const partnerIndex = pad - 1 - i
    if (partnerIndex >= n) {
      expectedByes.add(a.id)
    } else {
      const b = seeded[partnerIndex].participant
      const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`
      expectedPairs.set(key, [a, b])
    }
  }

  // Verify paired games and byes of the round.
  const actualPairs = new Map<string, Game>()
  const actualByes = new Set<number>()
  for (const g of pairingGames) {
    if (g.player2 != null) {
      const key = g.player1 < g.player2 ? `${g.player1}-${g.player2}` : `${g.player2}-${g.player1}`
      if (actualPairs.has(key)) return null // duplicate pair
      actualPairs.set(key, g)
    } else {
      if (g.status !== 'bye') return null
      if (actualByes.has(g.player1)) return null // duplicate bye
      actualByes.add(g.player1)
    }
  }
  if (actualByes.size !== expectedByes.size || actualPairs.size !== expectedPairs.size) return null
  for (const id of expectedByes) {
    if (!actualByes.has(id)) return null
  }

  // Build depth-0 matches in bracket order.
  const matches: BracketMatch[] = []
  for (let i = 0; i < pairsCount; i++) {
    const a = seeded[i].participant
    const partnerIndex = pad - 1 - i
    if (partnerIndex >= n) {
      matches.push({ a: a.id, b: null, winner: a.id })
    } else {
      const b = seeded[partnerIndex].participant
      const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`
      const g = actualPairs.get(key)
      if (!g) return null
      if (g.result === 'draw') return null // knockout games cannot draw
      matches.push({ a: a.id, b: b.id, winner: g.result === 'player1_won' ? a.id : b.id })
    }
  }
  return { matches, forfeited: [...forfeited] }
}


/**
 * Detects a strict single-elimination bracket in the published rounds.
 * Returns the bracket (start round + matches per knockout round, in bracket
 * order) or null when the history is not a strict bracket.
 */
export function analyzeKnockoutBracket(
  participants: Participant[],
  games: Game[],
  publishedRounds: number,
): Bracket | null {
  if (participants.length < 2 || publishedRounds < 1) return null
  const startingPointsById = new Map(participants.map((p) => [p.id, p.startingPoints ?? 0]))
  const ratingById = new Map(participants.map((p) => [p.id, p.capturedRating?.value ?? 0]))

  for (let start = 1; start <= publishedRounds; start++) {
    const first = matchStartRound(participants, games, start, startingPointsById, ratingById)
    if (!first) continue

    const rounds: BracketMatch[][] = [first.matches]
    let valid = true
    // Players eliminated before the bracket (lone forfeit games in the start
    // round) must keep sitting out — one forfeit game per later round.
    const eliminatedAll = new Set<number>(first.forfeited)
    for (let r = start + 1; r <= publishedRounds; r++) {
      const prev = rounds[rounds.length - 1]
      if (prev.length % 2 !== 0) {
        // A final (single match) must be the last knockout round.
        valid = false
        break
      }
      const roundGames = games.filter((g) => g.round === r)

      // Paired games must be exactly the bracket-adjacent winner pairs.
      const pairKeys = new Set<string>()
      const nextMatches: BracketMatch[] = []
      for (let k = 0; k < prev.length; k += 2) {
        const w1 = prev[k].winner
        const w2 = prev[k + 1].winner
        if (w1 == null || w2 == null) {
          valid = false
          break
        }
        const key = w1 < w2 ? `${w1}-${w2}` : `${w2}-${w1}`
        pairKeys.add(key)
        nextMatches.push({ a: w1, b: w2, winner: null })
      }
      if (!valid) break

      const actualPairKeys = new Set<string>()
      // Every eliminated player (losers of this and all earlier knockout
      // rounds) must have exactly one forfeit game in this round.
      const losersPrev = new Set<number>()
      for (const m of prev) {
        if (m.b != null && m.winner != null) {
          losersPrev.add(m.winner === m.a ? m.b : m.a)
        }
      }
      const expectedForfeits = new Set<number>([...eliminatedAll, ...losersPrev])
      const actualForfeits = new Set<number>()
      for (const g of roundGames) {
        if (g.player2 != null) {
          const key = g.player1 < g.player2 ? `${g.player1}-${g.player2}` : `${g.player2}-${g.player1}`
          if (!pairKeys.has(key) || actualPairKeys.has(key)) {
            valid = false
            break
          }
          actualPairKeys.add(key)
        } else {
          if (g.status !== 'forfeit' || g.result !== 'player2_won') {
            valid = false
            break
          }
          if (!expectedForfeits.has(g.player1) || actualForfeits.has(g.player1)) {
            valid = false
            break
          }
          actualForfeits.add(g.player1)
        }
      }
      if (!valid) break
      if (
        actualForfeits.size !== expectedForfeits.size ||
        actualPairKeys.size !== pairKeys.size
      ) {
        valid = false
        break
      }
      for (const l of losersPrev) eliminatedAll.add(l)

      // Fill winners of the new matches from the round results.
      for (const m of nextMatches) {
        const partner = m.b
        if (partner == null) {
          valid = false
          break
        }
        const key = m.a < partner ? `${m.a}-${partner}` : `${partner}-${m.a}`
        const g = games.find(
          (x) =>
            x.round === r &&
            x.player2 != null &&
            (x.player1 < x.player2
              ? `${x.player1}-${x.player2}`
              : `${x.player2}-${x.player1}`) === key,
        )
        if (!g || g.result === 'draw' || g.result == null) {
          valid = false
          break
        }
        m.winner = g.result === 'player1_won' ? m.a : partner
      }
      if (!valid) break
      rounds.push(nextMatches)
    }

    if (valid) return { startRound: start, rounds }
  }
  return null
}


export interface KnockoutRoundPlan {
  /** Pairs + byes of the round (bracket size / 2) — the «1/{n} финала» label. */
  n: number
  /** true — continuing an existing bracket; false — knockout round 1. */
  continuation: boolean
  /** Manual games of the round, kept unchanged. */
  keptGames: Game[]
  /** Remaining active players to be seeded canonically (in seed order). */
  ordered: Participant[]
  /** Eliminated players needing a generated forfeit game. */
  forfeitTargets: Participant[]
}

/**
 * Computes the knockout round plan for the round being prepared: reconciles
 * the manual games of the round (paired games kept; forfeit games eliminate),
 * continues the existing bracket when valid, otherwise plans canonical
 * knockout round 1 seeded by points (then rating). Throws {@link PairingError}
 * when a participant is placed in several manual games.
 */
export function planKnockoutRound(input: {
  participants: Participant[]
  games: Game[]
  round: number
  publishedRounds: number
}): KnockoutRoundPlan {
  const { participants, games, round, publishedRounds } = input

  // Reconcile the manual games of the round.
  const placed = new Map<number, 'paired' | 'forfeit' | 'bye'>()
  for (const g of games.filter((x) => x.round === round)) {
    const kind: 'paired' | 'forfeit' | 'bye' =
      g.player2 != null ? 'paired' : g.status === 'forfeit' ? 'forfeit' : 'bye'
    const ids = g.player2 != null ? [g.player1, g.player2] : [g.player1]
    for (const id of ids) {
      if (placed.has(id)) throw new PairingError('Participant placed twice in the round')
      placed.set(id, kind)
    }
  }
  const keptGames = games.filter((x) => x.round === round)

  // Bracket continuation when valid with the current manual games.
  const bracket = analyzeKnockoutBracket(participants, games, publishedRounds)
  if (bracket) {
    const lastMatches = bracket.rounds[bracket.rounds.length - 1]
    if (lastMatches.length % 2 === 0 && lastMatches.length > 0) {
      const activeOrder: Participant[] = []
      const activeIds = new Set<number>()
      let consistent = true
      for (const m of lastMatches) {
        const winner = participants.find((p) => p.id === m.winner)
        if (!winner) {
          consistent = false
          break
        }
        activeOrder.push(winner)
        activeIds.add(winner.id)
      }
      if (consistent) {
        for (const [id, kind] of placed) {
          // A manual forfeit must be for an already-eliminated player; paired
          // games and byes must be between active players.
          if (kind === 'forfeit' ? activeIds.has(id) : !activeIds.has(id)) {
            consistent = false
            break
          }
        }
      }
      if (consistent) {
        const ordered = activeOrder.filter((p) => !placed.has(p.id))
        const forfeitTargets = participants.filter(
          (p) => !activeIds.has(p.id) && !placed.has(p.id),
        )
        const pad = nextPowerOfTwo(Math.max(ordered.length, 2))
        return {
          n: pad / 2,
          continuation: true,
          keptGames,
          ordered,
          forfeitTargets,
        }
      }
    }
  }

  // Knockout round 1: seed everyone not placed in a manual game and not yet
  // eliminated. A player is eliminated when their latest published-round game
  // is a lone forfeit (they lost earlier and sit out every following round) —
  // the generated round gives them a fresh forfeit game.
  const latestGameByPlayer = new Map<number, Game>()
  for (const g of games) {
    if (g.round > publishedRounds) continue
    const ids = g.player2 != null ? [g.player1, g.player2] : [g.player1]
    for (const id of ids) {
      const current = latestGameByPlayer.get(id)
      if (!current || g.round > current.round) latestGameByPlayer.set(id, g)
    }
  }
  const eliminatedIds = new Set<number>()
  for (const p of participants) {
    if (placed.has(p.id)) continue
    const latest = latestGameByPlayer.get(p.id)
    if (latest && latest.status === 'forfeit') eliminatedIds.add(p.id)
  }
  const ordered = sortSeeded(
    participants
      .filter((p) => !placed.has(p.id) && !eliminatedIds.has(p.id))
      .map((p) => ({
        participant: p,
        points: calculateParticipantPoints(games, p.id, publishedRounds, p.startingPoints ?? 0),
        rating: p.capturedRating?.value ?? 0,
      })),
  ).map((s) => s.participant)
  const pad = nextPowerOfTwo(Math.max(ordered.length, 2))
  return {
    n: pad / 2,
    continuation: false,
    keptGames,
    ordered,
    forfeitTargets: participants.filter((p) => eliminatedIds.has(p.id)),
  }
}

/**
 * Generates the knockout round for the round being prepared. Returns only the
 * NEW games (pairs, byes, forfeit games) — the caller merges them with the
 * existing round games. Throws {@link PairingError} on impossible input.
 */
export function generateKnockoutPairings(input: {
  participants: Participant[]
  games: Game[]
  round: number
  publishedRounds: number
  considerSente: boolean
}): Game[] {
  const { round, considerSente } = input
  const plan = planKnockoutRound(input)

  const formed: Game[] = []
  if (plan.ordered.length >= 2) {
    const pad = nextPowerOfTwo(plan.ordered.length)
    for (let i = 0; i < pad / 2; i++) {
      const a = plan.ordered[i]
      const partnerIndex = pad - 1 - i
      if (partnerIndex >= plan.ordered.length) {
        formed.push(createByeGame(a.id, round, considerSente))
      } else {
        const b = plan.ordered[partnerIndex]
        const senteId = pickSente(a, b)
        formed.push({
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
    }
  }
  const forfeits = plan.forfeitTargets.map((p) => ({
    id: uuidv7(),
    player1: p.id,
    player2: null,
    sente: considerSente ? 'player1' : 'unknown',
    handicap: null,
    result: 'player2_won',
    status: 'forfeit',
    round,
  }) as Game)
  return [...formed, ...forfeits]
}

/** Higher rating receives sente; tie → smaller id. */
function pickSente(a: Participant, b: Participant): number {
  const ra = a.capturedRating?.value ?? 0
  const rb = b.capturedRating?.value ?? 0
  if (ra !== rb) return ra > rb ? a.id : b.id
  return a.id < b.id ? a.id : b.id
}

// __APPEND__



