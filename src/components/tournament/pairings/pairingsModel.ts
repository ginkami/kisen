import { uuidv7 } from 'uuidv7'
import type { Game, GameResult, Participant, Sente } from '../../../domain/tournament.ts'
import type { ParticipantRow } from '../../../hooks/useTournamentForm.ts'
import type { Player } from '../../../domain/player.ts'

// --- Container types ---

export interface Containers {
  unpaired: number[]   // participant ids not in any game for this round (includes forfeit)
  players1: (number | null)[]  // player1 ids per row (null = empty slot)
  players2: (number | null)[]  // player2 ids per row (null = bye or empty)
  games: Game[]        // ordered games for this round (1:1 with players1/players2 rows)
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

  // Sort unpaired by descending cumulative points, then descending rating
  unpaired.sort((a, b) => {
    const aPoints = calculateParticipantPoints(allGames, a, round, startingPointsMap.get(a) ?? 0)
    const bPoints = calculateParticipantPoints(allGames, b, round, startingPointsMap.get(b) ?? 0)
    if (aPoints !== bPoints) return bPoints - aPoints
    const aRating = ratingMap.get(a) ?? -Infinity
    const bRating = ratingMap.get(b) ?? -Infinity
    return bRating - aRating
  })

  const players1: (number | null)[] = pairGames.map((g) => g.player1)
  const players2: (number | null)[] = pairGames.map((g) => g.player2)

  return { unpaired, players1, players2, games: pairGames }
}

export function withParticipantDropped(
  allGames: Game[],
  _participants: Participant[],
  round: number,
  participantId: number,
  targetContainer: 'unpaired' | 'players1' | 'players2',
  targetIndex: number,
  considerSente: boolean
): Game[] {
  const otherRoundsGames = allGames.filter((g) => g.round !== round)
  const roundGames = gamesForRound(allGames, round)

  // Remove participant from any non-forfeit game in this round
  let updatedRoundGames = roundGames
    .filter((g) => g.status !== 'forfeit' || g.player1 !== participantId)
    .map((g) => {
      if (g.player1 === participantId) return { ...g, player1: 0 }
      if (g.player2 === participantId) return { ...g, player2: null, status: 'bye' as const }
      return g
    })
    // Remove games where player1 was zeroed out (card being moved)
    .filter((g) => g.player1 !== 0)

  if (targetContainer === 'unpaired') {
    // Just remove from games — already done above
    return [...otherRoundsGames, ...updatedRoundGames]
  }

  if (targetContainer === 'players1') {
    // Ensure targetIndex row exists
    while (updatedRoundGames.length <= targetIndex) {
      updatedRoundGames.push(createEmptyGame(round, considerSente))
    }
    const target = updatedRoundGames[targetIndex]
    if (target.player1 === 0 || target.player1 == null) {
      // Empty slot — place participant as player1
      updatedRoundGames[targetIndex] = { ...target, player1: participantId }
    } else if (target.player1 !== participantId) {
      // Slot occupied by someone else — append new bye row at end
      updatedRoundGames.push({
        ...createEmptyGame(round, considerSente),
        player1: participantId,
        status: 'bye',
      })
    }
  }

  if (targetContainer === 'players2') {
    while (updatedRoundGames.length <= targetIndex) {
      updatedRoundGames.push(createEmptyGame(round, considerSente))
    }
    const target = updatedRoundGames[targetIndex]
    if (target.player2 == null && target.player1 !== 0 && target.player1 !== participantId) {
      // Pair completion
      updatedRoundGames[targetIndex] = {
        ...target,
        player2: participantId,
        status: 'not_started',
      }
    } else if (target.player2 != null && target.player2 !== participantId) {
      // Slot occupied — append new bye row at end
      updatedRoundGames.push({
        ...createEmptyGame(round, considerSente),
        player1: participantId,
        status: 'bye',
      })
    }
  }

  // Clean up: remove empty games (player1 === 0)
  updatedRoundGames = updatedRoundGames.filter((g) => g.player1 !== 0)

  return [...otherRoundsGames, ...updatedRoundGames]
}

export function withResultCycled(
  allGames: Game[],
  gameId: string
): Game[] {
  const cycle: (GameResult | null)[] = [null, 'player1_won', 'player2_won', 'draw']
  return allGames.map((g) => {
    if (g.id !== gameId) return g
    const currentIdx = cycle.indexOf(g.result)
    const nextIdx = (currentIdx + 1) % cycle.length
    return { ...g, result: cycle[nextIdx] }
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
      // Bye counts as a win
      if (isPlayer1) points += 1
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

  pairGames.sort((a, b) => {
    const aSp1 = startingPointsMap.get(a.player1) ?? 0
    const aSp2 = a.player2 != null ? (startingPointsMap.get(a.player2) ?? 0) : aSp1
    const aMaxPts = Math.max(
      calculateParticipantPoints(allGames, a.player1, round, aSp1, round),
      a.player2 != null ? calculateParticipantPoints(allGames, a.player2, round, aSp2, round) : -Infinity
    )
    const bSp1 = startingPointsMap.get(b.player1) ?? 0
    const bSp2 = b.player2 != null ? (startingPointsMap.get(b.player2) ?? 0) : bSp1
    const bMaxPts = Math.max(
      calculateParticipantPoints(allGames, b.player1, round, bSp1, round),
      b.player2 != null ? calculateParticipantPoints(allGames, b.player2, round, bSp2, round) : -Infinity
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
  })

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
  round: number,
  rowIndex: number
): Game[] {
  const otherRounds = allGames.filter((g) => g.round !== round)
  const roundGames = gamesForRound(allGames, round)
  const forfeits = roundGames.filter((g) => g.status === 'forfeit')
  const pairGames = roundGames.filter((g) => g.status !== 'forfeit')

  if (rowIndex < 0 || rowIndex >= pairGames.length) return allGames
  const game = pairGames[rowIndex]
  if (game.player2 == null) return allGames // bye — nothing to swap

  const flippedSente: Sente =
    game.sente === 'player1' ? 'player2'
    : game.sente === 'player2' ? 'player1'
    : 'unknown'

  let flippedResult = game.result
  if (game.result === 'player1_won') flippedResult = 'player2_won'
  else if (game.result === 'player2_won') flippedResult = 'player1_won'

  // Flip handicap sign: - (player1 gives) ↔ + (player2 gives)
  let flippedHandicap = game.handicap
  if (game.handicap != null) {
    const sign = game.handicap[0] === '-' ? '+' : '-'
    flippedHandicap = `${sign}${game.handicap.slice(1)}` as Game['handicap']
  }

  pairGames[rowIndex] = {
    ...game,
    player1: game.player2,
    player2: game.player1,
    sente: flippedSente,
    result: flippedResult,
    handicap: flippedHandicap,
  }

  return [...otherRounds, ...forfeits, ...pairGames]
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

export function withHandicapCycled(allGames: Game[], gameId: string): Game[] {
  return allGames.map((g) => {
    if (g.id !== gameId) return g
    const currentIdx = HANDICAP_CYCLE.indexOf(g.handicap as string | null)
    const nextIdx = (currentIdx + 1) % HANDICAP_CYCLE.length
    return { ...g, handicap: HANDICAP_CYCLE[nextIdx] as Game['handicap'] }
  })
}