import { uuidv7 } from 'uuidv7'
import type { Game, GameResult, GameStatus, Participant } from '../../../domain/tournament.ts'
import type { ParticipantRow } from '../../../hooks/useTournamentForm.ts'
import type { Player } from '../../../domain/player.ts'

// --- Container types ---

export interface Containers {
  unpaired: number[]   // participant ids not in any game for this round (includes forfeit)
  players1: (number | null)[]  // player1 ids per row (null = empty slot)
  players2: (number | null)[]  // player2 ids per row (null = bye or empty)
  games: Game[]        // ordered games for this round (1:1 with players1/players2 rows)
}

// --- Lone-game invariant ---

/**
 * Enforces the lone-game invariant: any game with `player2 == null` that is
 * NOT an auto-forfeit (`status === 'forfeit'`) must carry
 * `status: 'bye'`, `result: 'player1_won'`, `handicap: null`.
 *
 * Forfeit games are exempt — they legitimately have `player2 == null` with
 * `status: 'forfeit'` and `result: 'player2_won'`.
 */
export function applyLoneGameInvariant(game: Game): Game {
  if (game.player2 != null || game.status === 'forfeit') return game
  return {
    ...game,
    status: 'bye',
    result: 'player1_won',
    handicap: null,
  }
}

// --- Game status lifecycle ---

/**
 * Derives the game status from the game's own fields and the tournament's currentRound.
 * - forfeit stays forfeit (stored state)
 * - lone non-forfeit (player2 == null) stays bye (stored state)
 * - paired with result → completed
 * - paired without result in active round → live
 * - paired without result otherwise → not_started
 */
export function deriveGameStatus(game: Game, currentRound: number): GameStatus {
  if (game.status === 'forfeit') return 'forfeit'
  if (game.player2 == null) return 'bye'
  if (game.result != null) return 'completed'
  return game.round === currentRound ? 'live' : 'not_started'
}

/**
 * Normalizes a game: derives status and re-applies the lone-game invariant.
 * Returns the same reference when nothing changes.
 */
export function normalizeGame(game: Game, currentRound: number): Game {
  // Forfeit games: status stays forfeit, no changes needed
  if (game.status === 'forfeit') return game

  // Bye games: enforce lone-game invariant
  if (game.player2 == null) {
    const validByeResult = game.result === 'player1_won' || game.result === 'draw'
    const result: GameResult | null = validByeResult ? game.result : 'player1_won'
    if (game.status !== 'bye' || game.handicap !== null || !validByeResult) {
      return { ...game, status: 'bye', result, handicap: null }
    }
    return game
  }

  // Paired games: derive status
  const derivedStatus: GameStatus =
    game.result != null ? 'completed'
    : game.round === currentRound ? 'live'
    : 'not_started'

  if (derivedStatus !== game.status) {
    return { ...game, status: derivedStatus }
  }
  return game
}

// --- Pure helpers ---

export function gamesForRound(games: Game[], round: number): Game[] {
  return games.filter((g) => g.round === round)
}

export function containersFromGames(
  allGames: Game[],
  participants: Participant[],
  round: number
): Containers {
  const roundGames = gamesForRound(allGames, round)
  // Only non-forfeit games form rows in the pairing board
  const pairGames = roundGames.filter((g) => g.status !== 'forfeit')
  const pairedIds = new Set<number>()
  for (const g of pairGames) {
    pairedIds.add(g.player1)
    if (g.player2 != null) pairedIds.add(g.player2)
  }

  const unpaired: number[] = []
  for (const p of participants) {
    if (!pairedIds.has(p.id)) {
      unpaired.push(p.id)
    }
  }

  // Build lookup maps for sorting
  const ratingMap = new Map<number, number>()
  const startingPointsMap = new Map<number, number>()
  for (const p of participants) {
    ratingMap.set(p.id, p.capturedRating?.value ?? -Infinity)
    startingPointsMap.set(p.id, p.startingPoints ?? 0)
  }

  // Sort unpaired by descending cumulative points (before this round), then descending rating
  unpaired.sort((a, b) => {
    const aPoints = calculateParticipantPoints(allGames, a, round - 1, startingPointsMap.get(a) ?? 0)
    const bPoints = calculateParticipantPoints(allGames, b, round - 1, startingPointsMap.get(b) ?? 0)
    if (aPoints !== bPoints) return bPoints - aPoints
    const aRating = ratingMap.get(a) ?? -Infinity
    const bRating = ratingMap.get(b) ?? -Infinity
    return bRating - aRating
  })

  // Sort paired rows by descending max pair points (before this round), then descending max pair rating
  pairGames.sort((a, b) => comparePairStrength(a, b, allGames, startingPointsMap, ratingMap, round))

  const players1: (number | null)[] = pairGames.map((g) => g.player1)
  const players2: (number | null)[] = pairGames.map((g) => g.player2)

  return { unpaired, players1, players2, games: pairGames }
}

export function withParticipantDropped(
  allGames: Game[],
  participants: Participant[],
  round: number,
  participantId: number,
  targetContainer: 'unpaired' | 'players1' | 'players2',
  targetIndex: number,
  considerSente: boolean,
  currentRound: number = 0,
): Game[] {
  const otherRoundsGames = allGames.filter((g) => g.round !== round)
  const roundGames = gamesForRound(allGames, round)

  // Separate forfeits from non-forfeit games; forfeits stay outside row indexing
  let forfeits = roundGames.filter((g) => g.status === 'forfeit')
  let pairGames = roundGames.filter((g) => g.status !== 'forfeit')

  // Build lookup maps for sorting
  const ratingMap = new Map<number, number>()
  const startingPointsMap = new Map<number, number>()
  for (const p of participants) {
    ratingMap.set(p.id, p.capturedRating?.value ?? -Infinity)
    startingPointsMap.set(p.id, p.startingPoints ?? 0)
  }

  // Sort pair games by pair strength (same comparator as display)
  pairGames.sort((a, b) => comparePairStrength(a, b, allGames, startingPointsMap, ratingMap, round))

  // Remove participant from any existing game.
  // When breaking a pair, the remaining partner stays as a lone game (player1).
  pairGames = pairGames
    .map((g) => {
      if (g.player1 === participantId) {
        if (g.player2 != null) {
          // Breaking a pair: partner becomes player1 of a lone game
          return applyLoneGameInvariant({ ...g, player1: g.player2, player2: null })
        }
        // Removing the only player from a bye game — mark for removal
        return { ...g, player1: 0 }
      }
      if (g.player2 === participantId) {
        // Removing player2 from a pair — game becomes a lone game
        return applyLoneGameInvariant({ ...g, player2: null })
      }
      return g
    })
    // Remove games where player1 was zeroed out (card being moved)
    .filter((g) => g.player1 !== 0)

  if (targetContainer === 'unpaired') {
    // Past-round forfeit: dropping into unpaired of a past round creates a forfeit game
    if (round < currentRound) {
      const hasForfeit = forfeits.some((g) => g.player1 === participantId)
      if (!hasForfeit) {
        forfeits.push({
          id: uuidv7(),
          player1: participantId,
          player2: null,
          sente: considerSente ? 'player1' : 'unknown',
          handicap: null,
          result: 'player2_won',
          status: 'forfeit',
          round,
        })
      }
    }
    return [...otherRoundsGames, ...forfeits, ...pairGames]
  }

  // Joining a pair: remove the participant's forfeit game for this round
  // (a participant cannot have two games in the same round).
  forfeits = forfeits.filter((g) => g.player1 !== participantId)

  if (targetContainer === 'players1') {
    // Ensure targetIndex row exists
    while (pairGames.length <= targetIndex) {
      pairGames.push(createEmptyGame(round, considerSente))
    }
    const target = pairGames[targetIndex]
    if (target.player1 === 0 || target.player1 == null) {
      // Empty slot — place participant as player1 with lone-game invariant
      pairGames[targetIndex] = applyLoneGameInvariant({ ...target, player1: participantId })
    } else if (target.player1 !== participantId) {
      // Slot occupied by someone else — append new bye row at end
      pairGames.push({
        ...createEmptyGame(round, considerSente),
        player1: participantId,
        status: 'bye',
      })
    }
  }

  if (targetContainer === 'players2') {
    while (pairGames.length <= targetIndex) {
      pairGames.push(createEmptyGame(round, considerSente))
    }
    const target = pairGames[targetIndex]
    if ((target.player1 === 0 || target.player1 == null) && target.player1 !== participantId) {
      // Empty row — create lone game with participant as player1
      pairGames[targetIndex] = applyLoneGameInvariant({
        ...target,
        player1: participantId,
      })
    } else if (target.player2 == null && target.player1 !== 0 && target.player1 !== participantId) {
      // Pair completion — reset result to null (clear stale bye result), derive status
      pairGames[targetIndex] = normalizeGame({
        ...target,
        player2: participantId,
        result: null,
      }, currentRound)
    } else if (target.player2 != null && target.player2 !== participantId) {
      // Slot occupied — append new bye row at end
      pairGames.push({
        ...createEmptyGame(round, considerSente),
        player1: participantId,
        status: 'bye',
      })
    }
  }

  // Clean up: remove empty games (player1 === 0)
  pairGames = pairGames.filter((g) => g.player1 !== 0)

  return [...otherRoundsGames, ...forfeits, ...pairGames]
}

export function withResultCycled(
  allGames: Game[],
  gameId: string,
  direction: 1 | -1 = 1,
  currentRound: number = 0,
): Game[] {
  return allGames.map((g) => {
    if (g.id !== gameId) return g

    // Bye rows: cycle only between 'player1_won' and 'draw'
    if (g.player2 == null && g.status !== 'forfeit') {
      const byeCycle: GameResult[] = ['player1_won', 'draw']
      const currentIdx = byeCycle.indexOf(g.result as GameResult)
      const startIdx = currentIdx === -1 ? 0 : currentIdx
      const nextIdx = (startIdx + direction + byeCycle.length) % byeCycle.length
      return normalizeGame({ ...g, result: byeCycle[nextIdx] }, currentRound)
    }

    // Paired rows: 4-state cycle
    const cycle: (GameResult | null)[] = [null, 'player1_won', 'player2_won', 'draw']
    const currentIdx = cycle.indexOf(g.result)
    const startIdx = currentIdx === -1 ? 0 : currentIdx
    const nextIdx = (startIdx + direction + cycle.length) % cycle.length
    return normalizeGame({ ...g, result: cycle[nextIdx] }, currentRound)
  })
}

export function withForfeit(
  allGames: Game[],
  round: number,
  participantId: number,
  forfeit: boolean,
  considerSente: boolean
): Game[] {
  const otherRoundsGames = allGames.filter((g) => g.round !== round)
  let roundGames = gamesForRound(allGames, round)

  if (forfeit) {
    // Remove participant from any existing non-forfeit game
    roundGames = roundGames
      .map((g) => {
        if (g.status === 'forfeit' && g.player1 === participantId) return g
        if (g.player1 === participantId && g.status !== 'forfeit') return null
        if (g.player2 === participantId) return { ...g, player2: null, status: 'bye' as const }
        return g
      })
      .filter((g): g is Game => g !== null)

    // Add forfeit game if not already present
    const hasForfeit = roundGames.some((g) => g.status === 'forfeit' && g.player1 === participantId)
    if (!hasForfeit) {
      roundGames.push({
        id: uuidv7(),
        player1: participantId,
        player2: null,
        sente: considerSente ? 'player1' : 'unknown',
        handicap: null,
        result: null,
        status: 'forfeit',
        round,
      })
    }
  } else {
    // Remove forfeit game for this participant
    roundGames = roundGames.filter(
      (g) => !(g.status === 'forfeit' && g.player1 === participantId)
    )
  }

  return [...otherRoundsGames, ...roundGames]
}

export function isRoundComplete(
  allGames: Game[],
  participants: Participant[],
  round: number
): boolean {
  if (participants.length === 0) return false
  const roundGames = gamesForRound(allGames, round)
  if (roundGames.length === 0) return false

  const covered = new Set<number>()
  for (const g of roundGames) {
    covered.add(g.player1)
    if (g.player2 != null) covered.add(g.player2)
  }

  return participants.every((p) => covered.has(p.id))
}

export function participantRowToPlayerLike(row: ParticipantRow, _locale: string): Player {
  return {
    id: `participant-${row.id}`,
    createdBy: '',
    locales: Object.fromEntries(
      Object.entries(row.locales).map(([loc, data]) => [
        loc,
        {
          familyName: data.familyName,
          givenName: data.givenName,
          ...(data.title ? { title: data.title } : {}),
          ...(data.location ? { location: data.location } : {}),
        },
      ])
    ),
    nationality: row.nationality || 'XX',
    residence: row.residence || undefined,
    gender: null,
    currentRating: {
      value: row.ratingValue ? Number(row.ratingValue) : null,
      rank: row.rank,
    },
    birthDate: null,
    primaryAssociation: null,
    secondaryAssociations: [],
  } as unknown as Player
}

export function participantToPlayerLike(p: Participant, _locale: string): Player {
  return {
    id: `participant-${p.id}`,
    createdBy: '',
    locales: p.locales as unknown as Player['locales'],
    nationality: p.nationality ?? 'XX',
    residence: p.residence ?? undefined,
    gender: null,
    currentRating: p.capturedRating,
    birthDate: null,
    primaryAssociation: null,
    secondaryAssociations: [],
  } as unknown as Player
}

// --- Internal helpers ---

function createEmptyGame(round: number, considerSente: boolean): Game {
  return {
    id: uuidv7(),
    player1: 0,
    player2: null,
    sente: considerSente ? 'player1' : 'unknown',
    handicap: null,
    result: null,
    status: 'bye',
    round,
  }
}

/**
 * Shared comparator for pairing rows: descending max pair points (earned
 * strictly before `round`), then descending max pair rating.
 * Used by both `containersFromGames` (render) and `withParticipantDropped`
 * (mutation) so display and storage order cannot diverge.
 */
export function comparePairStrength(
  a: Game,
  b: Game,
  allGames: Game[],
  startingPointsMap: Map<number, number>,
  ratingMap: Map<number, number>,
  round: number
): number {
  const aSp1 = startingPointsMap.get(a.player1) ?? 0
  const aSp2 = a.player2 != null ? (startingPointsMap.get(a.player2) ?? 0) : aSp1
  const aMaxPts = Math.max(
    calculateParticipantPoints(allGames, a.player1, round - 1, aSp1),
    a.player2 != null ? calculateParticipantPoints(allGames, a.player2, round - 1, aSp2) : -Infinity
  )
  const bSp1 = startingPointsMap.get(b.player1) ?? 0
  const bSp2 = b.player2 != null ? (startingPointsMap.get(b.player2) ?? 0) : bSp1
  const bMaxPts = Math.max(
    calculateParticipantPoints(allGames, b.player1, round - 1, bSp1),
    b.player2 != null ? calculateParticipantPoints(allGames, b.player2, round - 1, bSp2) : -Infinity
  )
  if (aMaxPts !== bMaxPts) return bMaxPts - aMaxPts
  const aMaxRating = Math.max(
    ratingMap.get(a.player1) ?? -Infinity,
    a.player2 != null ? (ratingMap.get(a.player2) ?? -Infinity) : -Infinity
  )
  const bMaxRating = Math.max(
    ratingMap.get(b.player1) ?? -Infinity,
    b.player2 != null ? (ratingMap.get(b.player2) ?? -Infinity) : -Infinity
  )
  return bMaxRating - aMaxRating
}

export function calculateParticipantPoints(
  allGames: Game[],
  participantId: number,
  upToRound: number,
  startingPoints: number,
  excludeByesInRound?: number
): number {
  let points = startingPoints
  for (const g of allGames) {
    if (g.round > upToRound) continue
    if (g.status === 'forfeit') continue

    const isPlayer1 = g.player1 === participantId
    const isPlayer2 = g.player2 === participantId
    if (!isPlayer1 && !isPlayer2) continue

    if (g.status === 'bye') {
      // Skip bye in the excluded round (hypothetical point not yet earned)
      if (excludeByesInRound != null && g.round === excludeByesInRound) continue
      // Bye contributes its result value: draw = 0.5, win/absent = 1
      if (isPlayer1) {
        points += g.result === 'draw' ? 0.5 : 1
      }
      continue
    }

    if (g.result === null) continue

    if (g.result === 'draw') {
      points += 0.5
    } else if (
      (g.result === 'player1_won' && isPlayer1) ||
      (g.result === 'player2_won' && isPlayer2)
    ) {
      points += 1
    }
    // else: loss = 0 points
  }
  return points
}

export function sortRoundGamesByPairStrength(
  allGames: Game[],
  participants: Participant[],
  round: number
): Game[] {
  const otherRounds = allGames.filter((g) => g.round !== round)
  let roundGames = gamesForRound(allGames, round)

  // Separate forfeit from pair games
  const forfeits = roundGames.filter((g) => g.status === 'forfeit')
  const pairGames = roundGames.filter((g) => g.status !== 'forfeit')

  const ratingMap = new Map<number, number>()
  const startingPointsMap = new Map<number, number>()
  for (const p of participants) {
    ratingMap.set(p.id, p.capturedRating?.value ?? -Infinity)
    startingPointsMap.set(p.id, p.startingPoints ?? 0)
  }

  pairGames.sort((a, b) => comparePairStrength(a, b, allGames, startingPointsMap, ratingMap, round))

  return [...otherRounds, ...forfeits, ...pairGames]
}

export const RESULT_SYMBOLS: Record<string, string> = {
  '?': '?',
  '>': '>',
  '<': '<',
  '=': '=',
}

export const RESULT_CYCLE: (GameResult | null)[] = [null, 'player1_won', 'player2_won', 'draw']

export function resultToSymbol(result: GameResult | null): string {
  if (result === null) return '?'
  if (result === 'player1_won') return '>'
  if (result === 'player2_won') return '<'
  return '='
}

// ---------------------------------------------------------------------------
// Swap players within a pairing row
// ---------------------------------------------------------------------------

export function withPlayersSwapped(
  allGames: Game[],
  gameId: string,
): Game[] {
  const target = allGames.find((g) => g.id === gameId)
  if (!target || target.player2 == null) return allGames // bye or not found — nothing to swap

  let flippedResult = target.result
  if (target.result === 'player1_won') flippedResult = 'player2_won'
  else if (target.result === 'player2_won') flippedResult = 'player1_won'

  // Flip handicap sign: - (player1 gives) ↔ + (player2 gives)
  let flippedHandicap = target.handicap
  if (target.handicap != null) {
    const sign = target.handicap[0] === '-' ? '+' : '-'
    flippedHandicap = `${sign}${target.handicap.slice(1)}` as Game['handicap']
  }

  // sente stays attached to the position (unchanged) — under the project invariant
  // (sente ≡ 'player1' when considerSente), the sente holder swaps with the cards.
  const opp = target.player2 // non-null: bye/not-found guarded above
  return allGames.map((g) => {
    if (g.id !== gameId) return g
    return {
      ...g,
      player1: opp,
      player2: target.player1,
      sente: target.sente,
      result: flippedResult,
      handicap: flippedHandicap,
    }
  })
}

// ---------------------------------------------------------------------------
// Handicap cycling
// ---------------------------------------------------------------------------

export const HANDICAP_CODES = ['L', 'B', 'R', 'RL', '2p', '4p', '5p', '6p', '8p', '10p'] as const

export const HANDICAP_CYCLE: (string | null)[] = [
  null,
  ...HANDICAP_CODES.map((c) => `-${c}`),
  ...HANDICAP_CODES.map((c) => `+${c}`),
]

export function handicapToSymbol(handicap: string | null): string {
  return handicap ?? '='
}

export function withHandicapCycled(
  allGames: Game[],
  gameId: string,
  direction: 1 | -1 = 1,
): Game[] {
  return allGames.map((g) => {
    if (g.id !== gameId) return g
    const currentIdx = HANDICAP_CYCLE.indexOf(g.handicap as string | null)
    const startIdx = currentIdx === -1 ? 0 : currentIdx
    const nextIdx = (startIdx + direction + HANDICAP_CYCLE.length) % HANDICAP_CYCLE.length
    return { ...g, handicap: HANDICAP_CYCLE[nextIdx] as Game['handicap'] }
  })
}

export function withHandicapReset(allGames: Game[], gameId: string): Game[] {
  const target = allGames.find((g) => g.id === gameId)
  if (!target || target.handicap === null) return allGames
  return allGames.map((g) => {
    if (g.id !== gameId) return g
    return { ...g, handicap: null }
  })
}

/**
 * Idempotent auto-forfeits for participants with no game in a past round.
 * Returns the same array reference when nothing to add.
 */
export function withAutoForfeits(
  allGames: Game[],
  participants: Participant[],
  round: number,
  currentRound: number,
  considerSente: boolean,
): Game[] {
  // Only applies to past rounds
  if (round >= currentRound) return allGames

  const roundGames = gamesForRound(allGames, round)
  const covered = new Set<number>()
  for (const g of roundGames) {
    covered.add(g.player1)
    if (g.player2 != null) covered.add(g.player2)
  }

  const missing = participants.filter((p) => !covered.has(p.id))
  if (missing.length === 0) return allGames

  const otherRounds = allGames.filter((g) => g.round !== round)
  const newForfeits: Game[] = missing.map((p) => ({
    id: uuidv7(),
    player1: p.id,
    player2: null,
    sente: considerSente ? 'player1' : 'unknown',
    handicap: null,
    result: 'player2_won' as const,
    status: 'forfeit' as const,
    round,
  }))

  return [...otherRounds, ...roundGames, ...newForfeits]
}

/**
 * When publishing a round, carry over forfeit games to the next round.
 * For each participant whose game in `publishedRound` is a forfeit and who
 * has no game in `publishedRound + 1`, creates a lone forfeit game.
 * Returns the same array reference when nothing to add.
 */
export function withForfeitsCarriedOver(
  allGames: Game[],
  publishedRound: number,
  considerSente: boolean,
  maxRound: number,
): Game[] {
  const nextRound = publishedRound + 1
  if (nextRound > maxRound) return allGames

  // Participants with a forfeit game in the published round
  const forfeitedIds = new Set<number>()
  for (const g of allGames) {
    if (g.round !== publishedRound || g.status !== 'forfeit') continue
    forfeitedIds.add(g.player1)
    if (g.player2 != null) forfeitedIds.add(g.player2)
  }
  if (forfeitedIds.size === 0) return allGames

  // Participants already having any game in the next round
  const coveredInNext = new Set<number>()
  for (const g of allGames) {
    if (g.round !== nextRound) continue
    coveredInNext.add(g.player1)
    if (g.player2 != null) coveredInNext.add(g.player2)
  }

  const toAdd: Game[] = []
  for (const pid of forfeitedIds) {
    if (coveredInNext.has(pid)) continue
    toAdd.push({
      id: uuidv7(),
      player1: pid,
      player2: null,
      sente: considerSente ? 'player1' : 'unknown',
      handicap: null,
      result: 'player2_won' as const,
      status: 'forfeit' as const,
      round: nextRound,
    })
  }

  if (toAdd.length === 0) return allGames
  return [...allGames, ...toAdd]
}