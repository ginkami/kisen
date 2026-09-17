// Single-elimination (knockout) engine for the pairing assistant drawer.
//
// Pure module: forms the knockout round chosen by the user in the «Игры
// плей-офф» card — a bracket size and a knockout round. See
// openspec/specs/knockout-engine/spec.md.
//
// Canonical knockout round from a seeded list in a bracket of size 2^x:
// - the list is padded abstractly to 2^x with BOTTOM virtual seeds, then
//   strictly seeded (1 vs last, 2 vs second-last, ...);
// - a real player drawn against a virtual seed gets a bye (`status: 'bye'`,
//   `result: 'player1_won'`) — byes always go to TOP seeds;
// - eliminated players are NOT given any game — they stay unpaired; the
//   engine never creates forfeit games.

import { uuidv7 } from 'uuidv7'
import type { Game, Participant } from '../../../domain/tournament.ts'
import { calculateParticipantPoints } from './pairingsModel.ts'
import { createByeGame, PairingError } from './pairingEngine.ts'

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

function isBracketSize(n: number): boolean {
  return Number.isInteger(n) && n >= 4 && (n & (n - 1)) === 0
}

/**
 * Classic bracket display order of slot indices (0-based seeding positions):
 * recursive seed placement `[0,1] → [0,3,1,2] → [0,7,3,4,1,6,2,5] …` so that
 * adjacent display pairs feed the same next-round slot and the top seeds sit
 * in opposite halves of the bracket.
 */
function bracketSlotOrder(size: number): number[] {
  let order = [0, 1]
  while (order.length < size) {
    const doubled = order.length * 2
    const next: number[] = []
    for (const slot of order) {
      next.push(slot, doubled - 1 - slot)
    }
    order = next
  }
  return order
}

/** Stable sort by points desc, then rating desc, then id asc. */
function sortSeeded(players: SeededPlayer[]): SeededPlayer[] {
  return [...players].sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points
    if (a.rating !== b.rating) return b.rating - a.rating
    return a.participant.id - b.participant.id
  })
}

/** Higher rating receives sente; tie → smaller id. */
function pickSente(a: Participant, b: Participant): number {
  const ra = a.capturedRating?.value ?? 0
  const rb = b.capturedRating?.value ?? 0
  if (ra !== rb) return ra > rb ? a.id : b.id
  return a.id < b.id ? a.id : b.id
}

function createPairGame(a: Participant, b: Participant, round: number, considerSente: boolean): Game {
  const senteId = pickSente(a, b)
  return {
    id: uuidv7(),
    player1: a.id,
    player2: b.id,
    sente: considerSente ? (senteId === a.id ? 'player1' : 'player2') : 'unknown',
    handicap: null,
    result: null,
    status: 'not_started',
    round,
  }
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

/** Bounded lexicographic combinations of k items (lazy). */
function* combinations<T>(items: T[], k: number): Generator<T[]> {
  const n = items.length
  if (k < 0 || k > n) return
  const indices = Array.from({ length: k }, (_, i) => i)
  while (true) {
    yield indices.map((i) => items[i])
    let i = k - 1
    while (i >= 0 && indices[i] === i + n - k) i--
    if (i < 0) return
    indices[i]++
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1
  }
}

/** Hard cap on start-round configurations to keep the search bounded. */
const START_CONFIG_BUDGET = 20000

/**
 * Verifies that round `s` contains a canonical knockout round 1 of the given
 * bracket size. The bracket may be embedded in a round that also contains
 * arbitrary other games (Swiss games, consolation games, forfeits of players
 * outside the bracket): only the bracket's own games are constrained — the
 * bracket's bye games go to the top seeds and its paired games match the
 * strict seeding (1 vs last, 2 vs second-last, ...) of the covered players by
 * points before the round (then rating). Configurations using more of the
 * round's games are preferred; all games outside the configuration are
 * ignored. Returns the depth-0 bracket matches, or null.
 */
function matchStartRound(
  participants: Participant[],
  games: Game[],
  s: number,
  bracketSize: number,
  startingPointsById: Map<number, number>,
  ratingById: Map<number, number>,
): BracketMatch[] | null {
  const byeGames: Game[] = []
  const pairedGames: Game[] = []
  for (const g of games) {
    if (g.round !== s) continue
    if (g.player2 != null) pairedGames.push(g)
    else if (g.status === 'bye') byeGames.push(g)
    // other lone games (forfeits etc.) are never part of the bracket
  }

  let budget = START_CONFIG_BUDGET
  const maxByes = Math.min(byeGames.length, bracketSize / 2)
  for (let byeCount = maxByes; byeCount >= 0; byeCount--) {
    const pairsCount = bracketSize / 2 - byeCount
    if (pairsCount > pairedGames.length) continue
    for (const byes of combinations(byeGames, byeCount)) {
      const byeIds = byes.map((g) => g.player1)
      if (new Set(byeIds).size !== byeIds.length) continue
      for (const pairs of combinations(pairedGames, pairsCount)) {
        if (--budget < 0) return null
        const matches = checkStartConfiguration(
          participants,
          games,
          s,
          bracketSize,
          byeIds,
          pairs,
          startingPointsById,
          ratingById,
        )
        if (matches) return matches
      }
    }
  }
  return null
}

/**
 * Canonical check of one start-round configuration: the bye players plus the
 * chosen pairs' players form the covered set (each exactly once), which must
 * be strictly seeded with the byes on top and the pairs per bracket slots.
 */
function checkStartConfiguration(
  participants: Participant[],
  games: Game[],
  s: number,
  bracketSize: number,
  byeIds: number[],
  pairs: Game[],
  startingPointsById: Map<number, number>,
  ratingById: Map<number, number>,
): BracketMatch[] | null {
  const covered = new Set<number>(byeIds)
  for (const g of pairs) {
    const p2 = g.player2
    if (p2 == null) return null
    if (covered.has(g.player1) || covered.has(p2)) return null // overlap
    covered.add(g.player1)
    covered.add(p2)
  }
  if (covered.size !== bracketSize - byeIds.length) return null
  if (covered.size < 2) return null

  const seeded = sortSeeded(
    participants
      .filter((p) => covered.has(p.id))
      .map((p) => ({
        participant: p,
        points: calculateParticipantPoints(games, p.id, s - 1, startingPointsById.get(p.id) ?? 0),
        rating: ratingById.get(p.id) ?? 0,
      })),
  )

  // Byes must go to the top seeds of the covered set.
  for (let i = 0; i < byeIds.length; i++) {
    if (!byeIds.includes(seeded[i].participant.id)) return null
  }

  const pairByKey = new Map(
    pairs.flatMap((g) =>
      g.player2 == null ? [] : [[pairKey(g.player1, g.player2), g] as const],
    ),
  )
  // Matches are returned in the classic bracket display order so that
  // adjacent matches feed the same next-round slot.
  const order = bracketSlotOrder(bracketSize)
  const matches: BracketMatch[] = []
  for (let j = 0; j < bracketSize / 2; j++) {
    const a = seeded[order[2 * j]].participant
    const partnerIndex = order[2 * j + 1]
    if (partnerIndex >= covered.size) {
      matches.push({ a: a.id, b: null, winner: a.id })
    } else {
      const b = seeded[partnerIndex].participant
      const g = pairByKey.get(pairKey(a.id, b.id))
      if (!g) return null
      // The pair's presence is enough for the structure; the winner is
      // taken from the game's own player order (the stored game may be
      // reversed relative to the canonical seeding).
      matches.push({
        a: a.id,
        b: b.id,
        winner:
          g.result === 'player1_won'
            ? g.player1
            : g.result === 'player2_won'
              ? (g.player2 ?? b.id)
              : null,
      })
    }
  }
  return matches
}


/**
 * Follows the bracket from the start-round matches through the published
 * rounds: every bracket pair of a round contributes its winner when its game
 * has a fixed, non-draw result; undecided or missing bracket pairs end the
 * derivation (the returned rounds stop there — deeper winners are unknown).
 * The bracket may be embedded in rounds with arbitrary other games — games
 * outside the bracket (including games between eliminated players) are
 * ignored.
 */
function followBracket(
  games: Game[],
  startRound: number,
  first: BracketMatch[],
  publishedRounds: number,
): BracketMatch[][] | null {
  const rounds: BracketMatch[][] = [first]
  for (let r = startRound + 1; r <= publishedRounds; r++) {
    const prev = rounds[rounds.length - 1]
    if (prev.length % 2 !== 0) return null // a final (single match) cannot continue

    const nextMatches: BracketMatch[] = []
    for (let k = 0; k < prev.length; k += 2) {
      const w1 = prev[k].winner
      const w2 = prev[k + 1].winner
      if (w1 == null || w2 == null) return rounds // cannot derive deeper rounds
      const g = games.find(
        (x) =>
          x.round === r &&
          x.player2 != null &&
          pairKey(x.player1, x.player2) === pairKey(w1, w2),
      )
      if (!g) {
        // The bracket pair has not been played yet: record the round with
        // undecided winners and stop the derivation.
        nextMatches.push({ a: w1, b: w2, winner: null })
        rounds.push(nextMatches)
        return rounds
      }
      // The winner comes from the game's own player order (the stored game
      // may be reversed relative to the bracket adjacency).
      nextMatches.push({
        a: w1,
        b: w2,
        winner:
          g.result === 'player1_won'
            ? g.player1
            : g.result === 'player2_won'
              ? (g.player2 ?? w2)
              : null,
      })
    }
    rounds.push(nextMatches)
    // A round with an unresolved match ends the derivation: the winners of
    // the next round are unknown.
    if (nextMatches.some((m) => m.winner == null)) return rounds
  }
  return rounds
}


/**
 * Forms the knockout round for the round being prepared (`publishedRounds + 1`)
 * for the bracket size and knockout round chosen by the user. Returns only the
 * NEW games (pairs, and byes in knockout round 1) — the caller merges them with
 * the existing round games. Eliminated players never receive games. Throws
 * {@link PairingError} when the chosen bracket cannot be formed.
 */
export function generateKnockoutRoundGames(input: {
  participants: Participant[]
  games: Game[]
  round: number
  publishedRounds: number
  considerSente: boolean
  /** Bracket size: a power of two ≥ 4. */
  bracketSize: number
  /** Knockout round: 1..publishedRounds + 1. */
  knockoutRound: number
}): Game[] {
  const { participants, games, round, publishedRounds, considerSente, bracketSize, knockoutRound } =
    input
  if (!isBracketSize(bracketSize)) {
    throw new PairingError('Bracket size must be a power of two of at least 4')
  }
  if (
    !Number.isInteger(knockoutRound) ||
    knockoutRound < 1 ||
    knockoutRound > publishedRounds + 1
  ) {
    throw new PairingError('Knockout round is out of range')
  }

  const roundGames = games.filter((g) => g.round === round)
  const placed = new Map<number, Game>()
  for (const g of roundGames) {
    const ids = g.player2 != null ? [g.player1, g.player2] : [g.player1]
    for (const id of ids) {
      if (placed.has(id)) throw new PairingError('Participant placed twice in the round')
      placed.set(id, g)
    }
  }

  if (knockoutRound === 1) {
    // The bracket starts at the round being prepared from the unpaired players.
    const unpaired = participants.filter((p) => !placed.has(p.id))
    const u = unpaired.length
    if (u < bracketSize / 2) {
      throw new PairingError('Too few unpaired players for the chosen bracket size')
    }
    if (u > bracketSize) {
      throw new PairingError('Too many unpaired players for the chosen bracket size')
    }
    const seeded = sortSeeded(
      unpaired.map((p) => ({
        participant: p,
        points: calculateParticipantPoints(games, p.id, publishedRounds, p.startingPoints ?? 0),
        rating: p.capturedRating?.value ?? 0,
      })),
    )
    const formed: Game[] = []
    // Matches are created in the classic bracket display order so that
    // adjacent matches feed the same next-round slot.
    const order = bracketSlotOrder(bracketSize)
    for (let j = 0; j < bracketSize / 2; j++) {
      const a = seeded[order[2 * j]].participant
      const partnerIndex = order[2 * j + 1]
      if (partnerIndex >= u) {
        formed.push(createByeGame(a.id, round, considerSente))
      } else {
        formed.push(createPairGame(a, seeded[partnerIndex].participant, round, considerSente))
      }
    }
    return formed
  }

  // Continuation: the bracket starts at round s and its knockout round
  // `knockoutRound` lands on the round being prepared.
  const s = publishedRounds + 2 - knockoutRound
  if (s < 1) throw new PairingError('Knockout round is out of range')
  const startingPointsById = new Map(participants.map((p) => [p.id, p.startingPoints ?? 0]))
  const ratingById = new Map(participants.map((p) => [p.id, p.capturedRating?.value ?? 0]))

  const first = matchStartRound(participants, games, s, bracketSize, startingPointsById, ratingById)
  if (!first) {
    throw new PairingError('No knockout bracket of the chosen size starts at the chosen round')
  }
  const rounds = followBracket(games, s, first, publishedRounds)
  if (!rounds || rounds.length !== knockoutRound - 1) {
    throw new PairingError('The earlier knockout rounds are not fully played yet')
  }

  const prev = rounds[rounds.length - 1]
  if (prev.length % 2 !== 0) throw new PairingError('The knockout bracket is already finished')

  // Pairs of the round being prepared: winners of adjacent bracket slots.
  const planned: [number, number][] = []
  for (let k = 0; k < prev.length; k += 2) {
    const w1 = prev[k].winner
    const w2 = prev[k + 1].winner
    if (w1 == null || w2 == null) {
      throw new PairingError('The previous knockout round results are not fixed')
    }
    planned.push([w1, w2])
  }

  const participantById = new Map(participants.map((p) => [p.id, p]))
  const formed: Game[] = []
  for (const [a, b] of planned) {
    const ga = placed.get(a)
    const gb = placed.get(b)
    if (ga && ga === gb && ga.player2 != null) continue // manual game already forms this pair
    if (ga || gb) {
      throw new PairingError('Manual games of the round conflict with the knockout bracket')
    }
    formed.push(
      createPairGame(participantById.get(a)!, participantById.get(b)!, round, considerSente),
    )
  }
  return formed
}

// __APPEND__

export interface BracketViewMatch {
  /** First player (participant id); null when the slot is undetermined. */
  a: number | null
  /** Second player; null for a bye slot or an undetermined slot. */
  b: number | null
  /** Known winner; null while the match has not been decided. */
  winner: number | null
  /** True when `b` is a virtual seed (bye slot). */
  bye: boolean
}

export interface BracketViewRound {
  /** Tournament round this knockout round belongs to. */
  round: number
  /** 1-based knockout round (1 = bracket round 1, log2(size) = final). */
  knockoutRound: number
  matches: BracketViewMatch[]
}

export interface BracketView {
  size: number
  startRound: number
  rounds: BracketViewRound[]
  /** True when the final's winner is known. */
  complete: boolean
}

/**
 * Reconstructs the visual bracket for the given bracket size and start round
 * from the published games (same canonical rules as the pairing assistant:
 * embedded brackets supported, games outside the bracket ignored). Rounds that
 * have not been played yet are projected down to the final as placeholder
 * slots. Returns null when the played rounds do not form the requested
 * bracket.
 */
export function buildBracketView(input: {
  participants: Participant[]
  games: Game[]
  publishedRounds: number
  bracketSize: number
  startRound: number
}): BracketView | null {
  const { participants, games, publishedRounds, bracketSize, startRound } = input
  if (!isBracketSize(bracketSize) || startRound < 1 || startRound > publishedRounds) return null
  const startingPointsById = new Map(participants.map((p) => [p.id, p.startingPoints ?? 0]))
  const ratingById = new Map(participants.map((p) => [p.id, p.capturedRating?.value ?? 0]))

  const first = matchStartRound(
    participants,
    games,
    startRound,
    bracketSize,
    startingPointsById,
    ratingById,
  )
  if (!first) return null
  const played = followBracket(games, startRound, first, publishedRounds)
  if (!played) return null

  const rounds: BracketViewRound[] = played.map((matches, i) => ({
    round: startRound + i,
    knockoutRound: i + 1,
    matches: matches.map((m) => ({ a: m.a, b: m.b, winner: m.winner, bye: m.b == null })),
  }))

  // Project the remaining rounds down to the final: winners of adjacent slots
  // (placeholder when a winner is not yet known).
  let prev: BracketViewMatch[] = rounds[rounds.length - 1].matches
  let ko = rounds.length
  while (prev.length > 1) {
    ko++
    const matches: BracketViewMatch[] = []
    for (let k = 0; k + 1 < prev.length; k += 2) {
      matches.push({ a: prev[k].winner, b: prev[k + 1].winner, winner: null, bye: false })
    }
    rounds.push({ round: startRound + ko - 1, knockoutRound: ko, matches })
    prev = matches
  }

  const finalMatches = rounds[rounds.length - 1].matches
  const complete = finalMatches.length === 1 && finalMatches[0].winner != null
  return { size: bracketSize, startRound, rounds, complete }
}


