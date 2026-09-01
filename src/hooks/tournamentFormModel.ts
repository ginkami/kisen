import type { Game } from '../domain/tournament.ts'

/**
 * Games left after removing participants from a tournament.
 *
 * Removal rules:
 * - lone games (`player2 = null`) of a removed participant are removed in all rounds;
 * - paired games of a removed participant in rounds not yet published
 *   (`round > currentRound`) are removed;
 * - paired games of a removed participant in published rounds
 *   (`round <= currentRound`) are kept so standings history is not rewritten.
 */
export function gamesWithoutParticipants(
  games: Game[],
  removedParticipantIds: number[],
  currentRound: number
): Game[] {
  if (removedParticipantIds.length === 0) return games
  const removed = new Set(removedParticipantIds)
  return games.filter((game) => {
    if (game.player2 === null) {
      return !removed.has(game.player1)
    }
    if (!removed.has(game.player1) && !removed.has(game.player2)) {
      return true
    }
    // Paired game involving a removed participant: keep only published rounds.
    return game.round <= currentRound
  })
}

/**
 * Late-joiner forfeit games: for rounds 1..currentRound where the participant
 * has no game yet (as player1 or player2), create a forfeit loss. Rounds where
 * the id already has a game are skipped so re-adding an id that was reused
 * never duplicates games.
 */
export function lateJoinerForfeitGames(
  games: Game[],
  participantId: number,
  currentRound: number,
  considerSente: boolean,
  newId: () => string = () => crypto.randomUUID()
): Game[] {
  if (currentRound <= 0) return []
  const roundsWithGames = new Set(
    games
      .filter((g) => g.player1 === participantId || g.player2 === participantId)
      .map((g) => g.round)
  )
  const forfeitGames: Game[] = []
  for (let round = 1; round <= currentRound; round++) {
    if (roundsWithGames.has(round)) continue
    forfeitGames.push({
      id: newId(),
      player1: participantId,
      player2: null,
      sente: considerSente ? 'player1' : 'unknown',
      handicap: null,
      result: 'player2_won',
      status: 'forfeit',
      round,
    })
  }
  return forfeitGames
}

interface ParticipantRowLike {
  id: number
  locales: Record<string, { familyName?: string; givenName?: string } | undefined>
}

/**
 * A participant row counts as empty (and is dropped on save) when no locale
 * has both familyName and givenName filled in.
 */
export function isEmptyParticipantRow(row: ParticipantRowLike): boolean {
  return !Object.values(row.locales).some(
    (locale) =>
      (locale?.familyName ?? '').trim() !== '' &&
      (locale?.givenName ?? '').trim() !== ''
  )
}
