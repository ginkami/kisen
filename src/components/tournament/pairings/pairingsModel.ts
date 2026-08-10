import { uuidv7 } from 'uuidv7'
import type { Game, GameResult, Participant } from '../../../domain/tournament.ts'
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
  // Ensure forfeit participants are in unpaired (they should be, since they're not in pairGames)
  // unpaired already includes them since forfeit games are excluded from pairedIds

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
      // Slot occupied by someone else — swap: move existing player1 to a new bye row, place participant here
      const existingPlayer1 = target.player1
      updatedRoundGames[targetIndex] = { ...target, player1: participantId }
      // Add the displaced player as a new bye game
      updatedRoundGames.push({
        ...createEmptyGame(round, considerSente),
        player1: existingPlayer1,
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
      // Slot occupied — displace existing player2 into a new bye
      const existingPlayer2 = target.player2
      updatedRoundGames[targetIndex] = { ...target, player2: participantId, status: 'not_started' }
      updatedRoundGames.push({
        ...createEmptyGame(round, considerSente),
        player1: existingPlayer2,
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
  startingPoints: number
): number {
  let points = startingPoints
  for (const g of allGames) {
    if (g.round > upToRound) continue
    if (g.status === 'forfeit') continue

    const isPlayer1 = g.player1 === participantId
    const isPlayer2 = g.player2 === participantId
    if (!isPlayer1 && !isPlayer2) continue

    if (g.status === 'bye') {
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